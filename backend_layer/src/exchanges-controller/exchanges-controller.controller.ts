import { Controller, Post, Get, Delete, Body, Query, UseGuards, Req, HttpException, HttpStatus, Logger, Headers } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ExchangesControllerService } from './exchanges-controller.service';
import { RequestOrderDto, ExchangeEnum, OrderSideEnum } from './dto/place-order.dto';
import { JWTGuard } from '../guards/jwt.guard';
import { Public } from 'src/decorators/isPublic';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { CredentialHealthService } from '../apicredentials/credential-health.service';
import { GraphWebhookService } from '../graph-webhook/graph-webhook.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@ApiTags('Unified Exchange Controller')
@Controller('exchanges')
// @UseGuards(JWTGuard)
// @ApiBearerAuth('Authorization')
export class ExchangesControllerController {
  private readonly logger = new Logger(ExchangesControllerController.name);

  constructor(
    private readonly exchangesService: ExchangesControllerService,
    private readonly apicredentialsService: ApicredentialsService,
    private readonly credentialHealth: CredentialHealthService,
    private readonly graphWebhookService: GraphWebhookService,
    private readonly configService: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) { }
  @Public()
  @Post('place-order')
  @ApiOperation({
    summary: 'Place order on selected exchange with TP/SL levels',
    description: 'Routes order to appropriate exchange (Binance, Bitget, etc.) based on request. Calculates position size from portfolio percentage and places market/limit order. TP/SL orders coming soon.'
  })
  @ApiResponse({
    status: 201,
    description: 'Order placed successfully',
    schema: {
      example: {
        success: true,
        exchange: 'BINANCE',
        orderId: 12345678,
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: '0.001',
        price: '100000.00',
        status: 'FILLED',
        executedQty: '0.001',
        timestamp: 1701234567890,
        tpLevels: [105000, 110000],
        sl: 95000,
        note: 'TP/SL orders will be placed after main order is filled'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Exchange credentials not found' })
  async placeOrder(@Req() req, @Body() placeOrderDto: RequestOrderDto) {
    try {
      let { symbol, side, sizePct, sizeUsd, tpLevels, sl, type, price }: { symbol: string; side: string; sizePct: number; sizeUsd?: number; tpLevels?: number[]; sl?: number; type?: string; price?: number } = placeOrderDto;

      // =========================================================================
      // SELL SIGNAL REJECTION (Jan 2026 - Safety Block)
      // =========================================================================
      // Block ALL SELL signals from being processed. Manual sells should be done
      // through the UI, not automated signals. This prevents unintended sells.
      // =========================================================================
      if (side === 'SELL') {
        this.logger.warn(`🚫 REJECTED SELL signal for ${symbol} - SELL signals are disabled`);
        return {
          status: 'Rejected',
          data: { reason: 'sell_signals_disabled', symbol, side },
          statusCode: 400,
          message: 'SELL signals are disabled. Use manual sell through the UI.'
        };
      }

      // =========================================================================
      // ORDER TYPE: Always LIMIT (Jan 2026 - Graph Price Priority)
      // =========================================================================
      // All BUY orders are placed as LIMIT orders.
      // If graph provides a price, USE THAT PRICE for the order.
      // Otherwise, service will fetch current exchange price.
      // =========================================================================
      if (!type || type !== 'LIMIT') {
        type = 'LIMIT';
        placeOrderDto.type = 'LIMIT';
      }
      this.logger.log(`📋 Order type: LIMIT for ${symbol} ${price && price > 0 ? `using GRAPH PRICE: $${price}` : '(price from exchange)'}`);

      this.logger.log(`📡 Received order signal: ${side} ${symbol} (size: ${sizePct * 100}%)`);

      // =========================================================================
      // SIGNAL FRESHNESS VALIDATION (Jan 2026 - Prevent Stale Signal Execution)
      // =========================================================================
      // Graph cycles run every ~12 minutes. Reject signals older than 5 minutes
      // to prevent:
      // - Executing stale signals from previous cycles
      // - Price drift causing bad entries
      // - Replay attacks or cached signals
      // =========================================================================
      if (placeOrderDto.signalTimestamp) {
        const signalTime = new Date(placeOrderDto.signalTimestamp).getTime();
        const now = Date.now();
        const ageMinutes = (now - signalTime) / 60000;
        const MAX_SIGNAL_AGE_MINUTES = 5; // 5 minutes

        if (ageMinutes > MAX_SIGNAL_AGE_MINUTES) {
          this.logger.warn(
            `⚠️ REJECTED stale signal: ${symbol} signal is ${ageMinutes.toFixed(1)} min old (max: ${MAX_SIGNAL_AGE_MINUTES} min)`
          );
          return {
            status: 'Rejected',
            data: { reason: 'stale_signal', signal_age_minutes: ageMinutes },
            statusCode: 400,
            message: `Signal is too old (${ageMinutes.toFixed(1)} minutes). Signals must be < ${MAX_SIGNAL_AGE_MINUTES} minutes old.`
          };
        }

        this.logger.log(`✅ Signal is fresh (${ageMinutes.toFixed(1)} min old)`);
      } else {
        this.logger.warn('⚠️ No signalTimestamp provided - skipping freshness check (legacy signal)');
      }

      // Fetch all active trading users with their credentials
      const activeCredentials = await this.apicredentialsService.getActiveTradingCredentials();

      if (activeCredentials.length === 0) {
        this.logger.warn('⚠️ No active trading users found. Using environment credentials fallback.');
        // Fallback to original behavior with environment credentials
        const result = await this.exchangesService.placeOrder(null, placeOrderDto);
        return {
          status: 'Success',
          data: result,
          statusCode: 201,
          message: `Order placed using environment credentials`
        };
      }

      // SMART CREDENTIAL FILTERING: Categorize credentials by health
      type CredentialType = typeof activeCredentials[number];
      const healthyCredentials: CredentialType[] = [];
      const quarantinedCredentials: CredentialType[] = [];
      
      for (const cred of activeCredentials) {
        if (this.credentialHealth.isHealthy(cred.userId, cred.exchange)) {
          healthyCredentials.push(cred);
        } else {
          quarantinedCredentials.push(cred);
        }
      }

      this.logger.log(
        `🎯 Found ${activeCredentials.length} active trading user(s): ` +
        `${healthyCredentials.length} healthy, ${quarantinedCredentials.length} quarantined`
      );

      // Determine which credentials to use for order placement
      let credentialsToUse: CredentialType[] = healthyCredentials;

      if (healthyCredentials.length === 0) {
        this.logger.warn(`⚠️ All credentials are quarantined - attempting with ALL users anyway`);
        // Allow retry with ALL credentials (they might have been fixed or quarantine expired)
        credentialsToUse = activeCredentials;
      }

      this.logger.log(`📤 Placing orders for ${credentialsToUse.length} user(s)...`);

      // Place orders for each user in parallel
      const orderResults = await Promise.allSettled(
        healthyCredentials.map(async (cred) => {
          const userLabel = `[User ${cred.userId.substring(0, 8)}...][${cred.exchange.toUpperCase()}]`;
          this.logger.log(`${userLabel} Placing ${side} ${type || 'type is not provided'} order for ${symbol}...`);

          try {
            // =========================================================================
            // PER-USER POSITION CHECK (Jan 2026 - Multi-User Fix)
            // =========================================================================
            // Check if THIS SPECIFIC USER already has an open position for this symbol.
            // This enables new users to get orders for coins existing users already have.
            // 
            // ENHANCED (Issue #15): Now also checks exchange balance as fallback
            // This prevents duplicate buys after Docker rebuild when DB is empty.
            // =========================================================================
            const hasOpenPosition = await this.exchangesService.hasOpenPosition(
              cred.userId,
              symbol,
              cred.exchange.toUpperCase(),
              cred.apiKey,      // Pass API key for exchange balance check
              cred.secretKey,   // Pass secret key for exchange balance check
              cred.passphrase,  // Pass passphrase for Bitget
            );

            if (hasOpenPosition) {
              this.logger.log(`${userLabel} ⏭️  Skipping ${symbol} - user already has open position`);
              return {
                success: false,
                skipped: true,
                reason: 'user_has_open_position',
                userId: cred.userId,
                exchange: cred.exchange,
                symbol,
              };
            }

            // Create order DTO with user's exchange and credentials
            const userOrderDto = {
              ...placeOrderDto,
              exchange: cred.exchange.toUpperCase() as ExchangeEnum, // Use user's exchange
            };

            // Place order with user's credentials
            const result = await this.exchangesService.placeOrderWithCredentials(
              cred.userId,
              userOrderDto,
              cred.apiKey,
              cred.secretKey,
              cred.passphrase,
            );

            // ✅ SUCCESS: Record healthy credential
            this.credentialHealth.recordSuccess(cred.userId, cred.exchange);

            this.logger.log(`${userLabel} ✅ Order placed: orderId=${result.orderId}`);
            return { success: true, userId: cred.userId, exchange: cred.exchange.toUpperCase(), ...result };
          } catch (error) {
            // ❌ FAILURE: Record failed credential (may trigger quarantine)
            this.credentialHealth.recordFailure(cred.userId, cred.exchange, error.message);

            this.logger.error(`${userLabel} ❌ Failed: ${error.message}`);
            return { success: false, userId: cred.userId, exchange: cred.exchange.toUpperCase(), error: error.message };
          }
        })
      );

      // Process results
      const successfulOrders = orderResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);

      const failedOrders = orderResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !r.value.success)
        .map(r => r.value);

      this.logger.log(`📊 Order Summary: ${successfulOrders.length} succeeded, ${failedOrders.length} failed`);

      return {
        status: 'Success',
        data: {
          symbol,
          side,
          type: type || 'MARKET',
          totalUsers: activeCredentials.length,
          successCount: successfulOrders.length,
          failCount: failedOrders.length,
          orders: successfulOrders,
          failures: failedOrders,
        },
        statusCode: 201,
        message: `Order placed for ${successfulOrders.length}/${activeCredentials.length} active trading users`
      };
    } catch (error) {
      this.logger.error(`Error in placeOrder: ${error.message}`, error.stack);
      throw error;
    }
  }
  @Public()
  @Get('balance')
  @ApiOperation({
    summary: 'Get account balance for specified exchange',
    description: 'Fetch account balances from Binance, Bitget, or other supported exchanges. Returns array of positions with quantities and USD values.'
  })
  @ApiResponse({
    status: 200,
    description: 'Balance fetched successfully',
    schema: {
      example: [
        {
          symbol: 'USDT',
          quantity: 1000,
          valueUsd: 1000,
          pricePerUnit: 1,
          free: 1000,
          locked: 0,
          freeUsd: 1000,
          lockedUsd: 0
        },
        {
          symbol: 'BTC',
          quantity: 0.5,
          valueUsd: 56600,
          pricePerUnit: 113200,
          free: 0.5,
          locked: 0,
          freeUsd: 56600,
          lockedUsd: 0
        }
      ]
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid exchange' })
  @ApiResponse({ status: 500, description: 'Failed to fetch balance from exchange' })
  async getBalance(@Query('exchange') exchange: string) {
    try {
      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Fetching balance for ${exchange}`);

      const result = await this.exchangesService.getBalance(exchange);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        exchange: exchange,
        message: `Balance fetched successfully from ${exchange}`
      };
    } catch (error) {
      this.logger.error(`Error in getBalance: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Get('open-positions')
  @ApiOperation({
    summary: 'Get open positions for specified exchange',
    description: 'Fetch open positions from Binance, Bitget, or other supported exchanges. Returns array of positions with symbol, quantity, and USD values.'
  })
  @ApiResponse({
    status: 200,
    description: 'Open positions fetched successfully',
    schema: {
      example: [
        {
          symbol: 'BTCUSDT',
          free: '0.00100000',
          locked: '0.00000000',
          total: '0.00100000',
          valueUsd: 45000.00
        },
        {
          symbol: 'ETHUSDT',
          free: '0.50000000',
          locked: '0.00000000',
          total: '0.50000000',
          valueUsd: 2500.00
        }
      ]
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid exchange' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid service secret' })
  @ApiResponse({ status: 500, description: 'Failed to fetch open positions from exchange' })
  async getOpenPositions(@Query('exchange') exchange: string, @Headers('x-service-secret') serviceSecret: string) {
    try {
      // SERVICE AUTH CHECK (Jan 2026)
      const validSecret = this.configService.get<string>('SLTP_WEBHOOK_SECRET');

      if (!serviceSecret || serviceSecret !== validSecret) {
        this.logger.warn(`⛔ Unauthorized access attempt to getOpenPositions`);
        throw new HttpException('Unauthorized: Invalid service secret', HttpStatus.UNAUTHORIZED);
      }

      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Fetching open positions for ${exchange}`);

      const result = await this.exchangesService.getOpenPositions(exchange);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        exchange: exchange,
        message: `Open positions fetched successfully from ${exchange}`
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error in getOpenPositions: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Get('open-entry-orders')
  @ApiOperation({
    summary: 'Get open entry orders from database',
    description: 'Fetch FILLED BUY orders that have not been fully closed. Used for position reconciliation to identify positions created by the system.'
  })
  @ApiResponse({
    status: 200,
    description: 'Open entry orders fetched successfully',
    schema: {
      example: [
        {
          symbol: 'BTCUSDT',
          orderId: '12345678',
          price: '42000.50',
          quantity: '0.001',
          filledTimestamp: '2026-01-12T10:30:00Z',
          userId: 'user-uuid'
        }
      ]
    }
  })
  async getOpenEntryOrders(@Query('exchange') exchange: string, @Headers('x-service-secret') serviceSecret: string) {
    try {
      // SERVICE AUTH CHECK (Jan 2026)
      const validSecret = this.configService.get<string>('SLTP_WEBHOOK_SECRET');

      if (!serviceSecret || serviceSecret !== validSecret) {
        throw new HttpException('Unauthorized: Invalid service secret', HttpStatus.UNAUTHORIZED);
      }

      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Fetching open entry orders for ${exchange}`);

      const result = await this.exchangesService.getOpenEntryOrders(exchange);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        exchange: exchange,
        message: `Open entry orders fetched successfully from ${exchange}`
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error in getOpenEntryOrders: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Get('price')
  @ApiOperation({
    summary: 'Get current price for a symbol',
    description: 'Fetch current price for a trading pair from the specified exchange.'
  })
  @ApiResponse({
    status: 200,
    description: 'Price fetched successfully',
    schema: {
      example: {
        status: 'Success',
        data: { price: 42000.50 },
        statusCode: 200,
        exchange: 'BINANCE'
      }
    }
  })
  async getPrice(@Query('exchange') exchange: string, @Query('symbol') symbol: string) {
    try {
      if (!exchange || !symbol) {
        throw new HttpException('Exchange And Symbol parameters are required', HttpStatus.BAD_REQUEST);
      }

      const price = await this.exchangesService.getPrice(exchange, symbol);

      return {
        status: 'Success',
        data: { price },
        statusCode: 200,
        exchange: exchange,
        message: `Price for ${symbol} fetched successfully from ${exchange}`
      };
    } catch (error) {
      this.logger.error(`Error in getPrice: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Get('klines')
  @ApiOperation({
    summary: 'Get OHLCV candlestick data for a symbol',
    description: 'Fetch historical OHLCV (Open, High, Low, Close, Volume) data from the specified exchange. Used by SLTP system for volatility calculations.'
  })
  @ApiResponse({
    status: 200,
    description: 'Klines fetched successfully',
    schema: {
      example: [
        {
          openTime: '2026-01-13T12:00:00Z',
          open: '42000.00',
          high: '42500.00',
          low: '41800.00',
          close: '42300.00',
          volume: '1234.56',
          closeTime: '2026-01-13T12:59:59Z',
          quoteVolume: '52000000.00'
        }
      ]
    }
  })
  async getKlines(
    @Query('exchange') exchange: string,
    @Query('symbol') symbol: string,
    @Query('interval') interval: string = '1h',
    @Query('limit') limit: string = '100'
  ) {
    try {
      if (!exchange || !symbol) {
        throw new HttpException('Exchange and Symbol parameters are required', HttpStatus.BAD_REQUEST);
      }

      const klines = await this.exchangesService.getKlines(exchange, symbol, interval, parseInt(limit));

      return klines;  // Return raw array for Python SLTP integration
    } catch (error) {
      this.logger.error(`Error in getKlines: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('cancel-order')
  @ApiOperation({
    summary: 'Cancel order on specified exchange',
    description: 'Cancel an existing order on Binance, Bitget, or other supported exchanges.'
  })
  @ApiResponse({
    status: 200,
    description: 'Order canceled successfully',
    schema: {
      example: {
        symbol: 'BTCUSDT',
        orderId: 123456789,
        status: 'CANCELED'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 500, description: 'Failed to cancel order' })
  async cancelOrder(
    @Query('exchange') exchange: string,
    @Query('symbol') symbol: string,
    @Query('orderId') orderId: string,
  ) {
    try {
      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }
      if (!symbol) {
        throw new HttpException('Symbol parameter is required', HttpStatus.BAD_REQUEST);
      }
      if (!orderId) {
        throw new HttpException('OrderId parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Canceling order ${orderId} for ${symbol} on ${exchange}`);

      const result = await this.exchangesService.cancelOrder(exchange, symbol, orderId);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        exchange: exchange,
        message: `Order ${orderId} canceled successfully on ${exchange}`
      };
    } catch (error) {
      this.logger.error(`Error in cancelOrder: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('open-orders')
  @ApiOperation({
    summary: 'Get open orders for specified exchange',
    description: 'Fetch open (pending) orders from Binance, Bitget, or other supported exchanges. Returns array of orders that haven\'t been executed yet.'
  })
  @ApiResponse({
    status: 200,
    description: 'Open orders fetched successfully',
    schema: {
      example: [
        {
          symbol: 'BTCUSDT',
          orderId: '123456789',
          clientOrderId: 'myOrder123',
          price: '50000.00',
          quantity: '0.00100000',
          executedQty: '0.00000000',
          status: 'NEW',
          type: 'LIMIT',
          side: 'BUY',
          time: 1701234567890,
          updateTime: 1701234567890,
          exchange: 'BINANCE'
        }
      ]
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid exchange' })
  @ApiResponse({ status: 500, description: 'Failed to fetch open orders from exchange' })
  async getOpenOrders(@Query('exchange') exchange: string, @Query('symbol') symbol?: string) {
    try {
      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Fetching open orders for ${exchange}${symbol ? ` (${symbol})` : ''}`);

      const result = await this.exchangesService.getOpenOrders(exchange, symbol);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        message: `Open orders fetched successfully from ${exchange}`
      };
    } catch (error) {
      this.logger.error(`Error in getOpenOrders: ${error.message}`, error.stack);
      throw error;
    }
  }

  // @Post('place-oco-order')
  // @ApiOperation({
  //   summary: 'Place OCO (One Cancels Other) order on exchange with automatic quantity calculation',
  //   description: 'Place an OCO order with automatic asset quantity calculation based on portfolio percentage. Automatically reduces by configurable slippage buffer (default 1%). Currently supports Binance.'
  // })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       symbol: { type: 'string', example: 'ZECUSDT', description: 'Trading pair symbol' },
  //       sizePct: { type: 'number', example: 1, description: 'Portfolio percentage: 1 = 100%, 0.5 = 50%, etc. Quantity will be calculated and reduced by configurable slippage buffer (default 1%)' },
  //       aboveType: { type: 'string', enum: ['STOP_LOSS_LIMIT', 'STOP_LOSS', 'LIMIT_MAKER', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'TAKE_PROFIT_LIMIT', description: 'Above order type (TP - trigger above current price)' },
  //       abovePrice: { type: 'string', example: '395', description: 'Above order limit price (required for TAKE_PROFIT_LIMIT, LIMIT_MAKER, STOP_LOSS_LIMIT)' },
  //       aboveStopPrice: { type: 'string', example: '395', description: 'Above order stop price (required for STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT)' },
  //       aboveTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Above order time in force (required for STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT)' },
  //       belowType: { type: 'string', enum: ['STOP_LOSS_LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'STOP_LOSS_LIMIT', description: 'Below order type (SL - trigger below current price)' },
  //       belowPrice: { type: 'string', example: '369.90', description: 'Below order limit price (required for TAKE_PROFIT_LIMIT, STOP_LOSS_LIMIT)' },
  //       belowStopPrice: { type: 'string', example: '370', description: 'Below order stop price (required for STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT)' },
  //       belowTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Below order time in force (required for STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT)' },
  //       listClientOrderId: { type: 'string', description: 'Custom order list ID (optional, auto-generated if not provided)' },
  //       newOrderRespType: { type: 'string', enum: ['ACK', 'RESULT', 'FULL'], example: 'RESULT', description: 'Response type (optional, default: RESULT)' },
  //     },
  //     required: ['symbol', 'sizePct', 'aboveType', 'belowType']
  //   }
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'OCO order placed successfully',
  //   schema: {
  //     example: {
  //       status: 'Success',
  //       data: {
  //         orderListId: 1,
  //         contingencyType: 'OCO',
  //         symbol: 'ZECUSDT'
  //       },
  //       statusCode: 201,
  //       exchange: 'BINANCE'
  //     }
  //   }
  // })
  // @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  // @ApiResponse({ status: 500, description: 'Failed to place OCO order' })
  // async placeOCOOrder(
  //   @Query('exchange') exchange: string,
  //   @Body() ocoOrderDto: {
  //     symbol: string;
  //     sizePct: number;
  //     aboveType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'LIMIT_MAKER' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  //     abovePrice?: string;
  //     aboveStopPrice?: string;
  //     aboveTimeInForce?: 'GTC' | 'IOC' | 'FOK';
  //     belowType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  //     belowPrice?: string;
  //     belowStopPrice?: string;
  //     belowTimeInForce?: 'GTC' | 'IOC' | 'FOK';
  //     listClientOrderId?: string;
  //     newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
  //   },
  //   @Req() req
  // ) {
  //   try {
  //     if (!exchange) {
  //       throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
  //     }

  //     this.logger.log(`Fetching active trading users for OCO order on ${exchange}...`);

  //     // 1. Get all active trading credentials
  //     const activeCredentials = await this.apicredentialsService.getActiveTradingCredentials();

  //     if (activeCredentials.length === 0) {
  //       this.logger.warn(`⚠️ No active trading users found. OCO order not placed.`);
  //       return {
  //         status: 'Failed',
  //         statusCode: 400,
  //         message: 'No active trading users found'
  //       };
  //     }

  //     this.logger.log(`🎯 Found ${activeCredentials.length} active trading user(s). Placing OCO orders...`);

  //     // 2. Fan-out execution to all users
  //     const orderResults = await Promise.allSettled(
  //       activeCredentials.map(async (cred) => {
  //         const userLabel = `[User ${cred.userId.substring(0, 8)}...][${cred.exchange.toUpperCase()}]`;
  //         this.logger.log(`${userLabel} Placing OCO order for ${ocoOrderDto.symbol}...`);

  //         try {
  //           // Place order with user's credentials
  //           const result = await this.exchangesService.placeOCOOrder(
  //             cred.exchange.toUpperCase(),
  //             ocoOrderDto,
  //             cred.apiKey,
  //             cred.secretKey
  //           );
  //           this.logger.log(`${userLabel} ✅ OCO Order placed: ${JSON.stringify(result)}`);
  //           return { success: true, userId: cred.userId, exchange: cred.exchange.toUpperCase(), ...result };
  //         } catch (error) {
  //           this.logger.error(`${userLabel} ❌ Failed: ${error.message}`);
  //           return { success: false, userId: cred.userId, exchange: cred.exchange.toUpperCase(), error: error.message };
  //         }
  //       })
  //     );

  //     // Process results
  //     const successfulOrders = orderResults
  //       .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
  //       .map(r => r.value);

  //     const failedOrders = orderResults
  //       .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !r.value.success)
  //       .map(r => r.value);

  //     this.logger.log(`📊 OCO Order Summary: ${successfulOrders.length} succeeded, ${failedOrders.length} failed`);

  //     return {
  //       status: 'Success',
  //       data: {
  //         symbol: ocoOrderDto.symbol,
  //         totalUsers: activeCredentials.length,
  //         successCount: successfulOrders.length,
  //         failCount: failedOrders.length,
  //         orders: successfulOrders,
  //         failures: failedOrders,
  //       },
  //       statusCode: 201,
  //       exchange: exchange,
  //       message: `OCO order placed for ${successfulOrders.length}/${activeCredentials.length} active trading users`
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error in placeOCOOrder: ${error.message}`, error.stack);
  //     throw error;
  //   }
  // }

  @Delete('cancel-all-orders')
  @ApiOperation({
    summary: 'Cancel all open orders on a symbol',
    description: 'Cancel all active orders on a symbol (Binance only). Includes orders that are part of OCO/OTOCO order lists.'
  })
  @ApiResponse({
    status: 200,
    description: 'All orders canceled successfully',
    schema: {
      example: {
        success: true,
        exchange: 'BINANCE',
        symbol: 'BTCUSDT',
        totalCanceled: 3,
        orders: [
          {
            symbol: 'BTCUSDT',
            orderId: '11',
            clientOrderId: 'pXLV6Hz6mprAcVYpVMTGgx',
            price: '0.089853',
            quantity: '0.178622',
            executedQty: '0.000000',
            status: 'CANCELED',
            type: 'LIMIT',
            side: 'BUY',
            time: 1684804350068,
            updateTime: 1684804350068,
            exchange: 'BINANCE'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 501, description: 'Not implemented - feature not available for this exchange' })
  @ApiResponse({ status: 500, description: 'Failed to cancel orders' })
  async cancelAllOrders(
    @Query('exchange') exchange: string,
    @Query('symbol') symbol: string,
  ) {
    try {
      if (!exchange) {
        throw new HttpException('Exchange parameter is required', HttpStatus.BAD_REQUEST);
      }
      if (!symbol) {
        throw new HttpException('Symbol parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Canceling all open orders for ${symbol} on ${exchange}`);

      const result = await this.exchangesService.cancelAllOrders(exchange, symbol);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        exchange: exchange,
        message: `All open orders for ${symbol} canceled successfully on ${exchange}`
      };
    } catch (error) {
      this.logger.error(`Error in cancelAllOrders: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JWTGuard)
  @ApiBearerAuth('Authorization')
  @Get('trades')
  @ApiOperation({
    summary: 'Get all trades with PnL calculations for the authenticated user',
    description: 'Returns organized trade data grouped by order_group_id. Each trade includes entry order and its TP/SL orders with calculated realized/unrealized PnL. Only returns orders belonging to the authenticated user.'
  })
  @ApiResponse({
    status: 200,
    description: 'Trades fetched successfully',
    schema: {
      example: {
        status: 'Success',
        data: {
          trades: [
            {
              tradeId: 'a5b8c916-3656-4741-8f64-51239583c051',
              entryOrder: {
                orderId: 3680313453,
                symbol: 'ZECUSDT',
                side: 'BUY',
                quantity: 0.031,
                price: 449.10,
                status: 'FILLED',
                filledAt: '2025-12-09T21:02:37.545Z'
              },
              exitOrders: [
                {
                  orderId: 3680314948,
                  role: 'TP1',
                  quantity: 0.016,
                  price: 451.35,
                  status: 'EXPIRED'
                },
                {
                  orderId: 3680314947,
                  role: 'SL',
                  quantity: 0.016,
                  price: 446.85,
                  status: 'FILLED',
                  filledAt: '2025-12-09T21:03:44.448Z'
                }
              ],
              pnl: {
                realized: -0.36,
                unrealized: 0.33,
                total: -0.03,
                realizedPercent: -0.5,
                unrealizedPercent: 0.5,
                isComplete: false
              }
            }
          ],
          summary: {
            totalTrades: 1,
            completedTrades: 0,
            activeTrades: 1,
            totalRealizedPnl: -0.36,
            totalUnrealizedPnl: 0.33
          }
        },
        statusCode: 200
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Failed to fetch trades' })
  async getTrades(@Req() req, @Query('exchange') exchange?: string, @Query('symbol') symbol?: string) {
    try {
      // Extract user ID from JWT token
      const userId = req.user?.id;

      if (!userId) {
        this.logger.warn('⚠️ No user ID found in request - returning empty trades');
        return {
          status: 'Success',
          data: { trades: [], summary: { totalTrades: 0, completedTrades: 0, activeTrades: 0, totalRealizedPnl: 0, totalUnrealizedPnl: 0 } },
          statusCode: 200,
          message: 'No user ID found'
        };
      }

      // this.logger.log(`Fetching trades for user ${userId.substring(0, 8)}... - Exchange: ${exchange || 'ALL'}, Symbol: ${symbol || 'ALL'}`);

      const result = await this.exchangesService.getTradesWithPnL(userId, exchange, symbol);

      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        message: 'Trades fetched successfully'
      };
    } catch (error) {
      this.logger.error(`Error in getTrades: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // MANUAL SELL: Close position manually (Jan 2026)
  // =============================================================================

  @UseGuards(JWTGuard)
  @ApiBearerAuth('Authorization')
  @Post('manual-sell')
  @ApiOperation({
    summary: 'Manually sell a position and close the trade',
    description: 'Cancels all open orders (TP/SL) for the given order group and places a market sell order. Updates database to mark the trade as complete. Used when user wants to exit a position manually instead of waiting for TP/SL triggers.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderGroupId: { type: 'string', example: 'a5b8c916-3656-4741-8f64-51239583c051', description: 'The order group ID (tradeId) to close' },
        exchange: { type: 'string', enum: ['BINANCE', 'BITGET'], example: 'BINANCE', description: 'Exchange where the trade is placed' },
        symbol: { type: 'string', example: 'BTCUSDT', description: 'Trading pair symbol' },
      },
      required: ['orderGroupId', 'exchange', 'symbol']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Manual sell executed successfully',
    schema: {
      example: {
        status: 'Success',
        data: {
          orderGroupId: 'a5b8c916-3656-4741-8f64-51239583c051',
          symbol: 'BTCUSDT',
          exchange: 'BINANCE',
          canceledOrders: 2,
          sellOrder: {
            orderId: 12345678,
            status: 'FILLED',
            executedQty: '0.001',
            price: '100000.00'
          },
          pnl: {
            realized: 5.50,
            realizedPercent: 2.5
          },
          isComplete: true
        },
        statusCode: 201,
        message: 'Trade closed successfully via manual sell'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing parameters or no position to sell' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Order group not found' })
  @ApiResponse({ status: 500, description: 'Failed to execute manual sell' })
  async manualSell(
    @Req() req,
    @Body() manualSellDto: {
      orderGroupId: string;
      exchange: string;
      symbol: string;
    }
  ) {
    try {
      const userId = req.user?.id;
      const { orderGroupId, exchange, symbol } = manualSellDto;

      if (!userId) {
        throw new HttpException('User ID not found in request', HttpStatus.UNAUTHORIZED);
      }

      if (!orderGroupId || !exchange || !symbol) {
        throw new HttpException('Missing required fields: orderGroupId, exchange, symbol', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`📤 Manual sell requested: User ${userId.substring(0, 8)}... | OrderGroup ${orderGroupId} | ${symbol} on ${exchange}`);

      // Execute manual sell via the service
      const result = await this.exchangesService.manualSell(
        userId,
        orderGroupId,
        exchange.toUpperCase(),
        symbol
      );

      return {
        status: 'Success',
        data: result,
        statusCode: 201,
        message: 'Trade closed successfully via manual sell'
      };

    } catch (error) {
      this.logger.error(`Error in manualSell: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // DYNAMIC SLTP INTEGRATION: Webhook Endpoint (Dec 2025)
  // =============================================================================

  @Public()
  @Post('sltp-trigger')
  @ApiOperation({
    summary: 'Webhook: SLTP trigger event from SF app',
    description: 'Called by SF SLTP Manager when SL/TP conditions are met. Executes market SELL order to close/reduce position. Used for dynamic SLTP integration between SF app and Graph pipeline.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'BTCUSDT', description: 'Trading pair symbol' },
        trigger_type: { type: 'string', enum: ['SL_HIT', 'TP1_HIT', 'TP2_HIT', 'TRAIL_HIT', 'TIME_EXIT'], example: 'TP1_HIT', description: 'Type of SLTP trigger (max 2 TPs)' },
        triggered_price: { type: 'number', example: 99500.0, description: 'Price at which trigger occurred' },
        triggered_at: { type: 'string', example: '2025-12-22T12:45:30Z', description: 'ISO timestamp of trigger' },
        graph_position_id: { type: 'string', example: 'BTCUSDT:Position:12345678', description: 'Graph Position node ID' },
        sell_fraction: { type: 'number', example: 0.5, description: 'Fraction of position to sell (0.5 = 50%, 1.0 = 100%)' },
        reason: { type: 'string', example: 'Take Profit 1 reached at 1.2R', description: 'Human-readable reason for trigger' }
      },
      required: ['symbol', 'trigger_type', 'triggered_price', 'triggered_at', 'sell_fraction']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'SLTP trigger processed successfully',
    schema: {
      example: {
        status: 'executed',
        trigger_type: 'TP1_HIT',
        symbol: 'BTCUSDT',
        triggered_price: 99500.0,
        sell_fraction: 0.5,
        order_result: { orderId: 87654321, status: 'FILLED' },
        message: 'TP1 partial exit completed'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  @ApiResponse({ status: 500, description: 'Failed to execute SLTP trigger' })
  async handleSLTPTrigger(@Body() triggerDto: {
    symbol: string;
    trigger_type: 'SL_HIT' | 'TP1_HIT' | 'TP2_HIT' | 'TRAIL_HIT' | 'TIME_EXIT';
    triggered_price: number;
    triggered_at: string;
    graph_position_id?: string;
    sell_fraction: number;
    reason?: string;
  }) {
    try {
      const { symbol, trigger_type, triggered_price, triggered_at, graph_position_id, sell_fraction, reason } = triggerDto;

      this.logger.log(`🎯 SLTP TRIGGER RECEIVED: ${symbol} - ${trigger_type} @ ${triggered_price}`);
      this.logger.log(`   Sell fraction: ${sell_fraction * 100}%, Reason: ${reason || 'N/A'}`);

      // Validate required fields
      if (!symbol || !trigger_type || triggered_price === undefined || sell_fraction === undefined) {
        throw new HttpException('Missing required fields: symbol, trigger_type, triggered_price, sell_fraction', HttpStatus.BAD_REQUEST);
      }

      // Determine side based on trigger type (always SELL to close long position)
      const side = 'SELL';

      // Fetch all active trading users with their credentials
      const activeCredentials = await this.apicredentialsService.getActiveTradingCredentials();

      if (activeCredentials.length === 0) {
        this.logger.warn('⚠️ No active trading users found. Cannot execute SLTP trigger.');
        return {
          status: 'warning',
          message: 'No active trading users - SLTP trigger logged but not executed',
          trigger_type,
          symbol,
          triggered_price
        };
      }

      this.logger.log(`🎯 Executing SLTP ${trigger_type} for ${activeCredentials.length} user(s)...`);

      // Execute SELL order for each active user
      const orderResults = await Promise.allSettled(
        activeCredentials.map(async (cred) => {
          const userLabel = `[User ${cred.userId.substring(0, 8)}...][${cred.exchange.toUpperCase()}]`;

          try {
            // Create SELL order DTO
            const sellOrderDto: RequestOrderDto = {
              exchange: cred.exchange.toUpperCase() as ExchangeEnum,
              symbol,
              side: OrderSideEnum.SELL,
              type: 'MARKET',
              sizePct: sell_fraction,
              sizeUsd: undefined,
              tpLevels: [],
              sl: 0,
            };

            const result = await this.exchangesService.placeOrderWithCredentials(
              cred.userId,
              sellOrderDto,
              cred.apiKey,
              cred.secretKey,
              cred.passphrase
            );

            this.logger.log(`${userLabel} ✅ SLTP SELL executed: orderId=${result.orderId}`);
            return { success: true, userId: cred.userId, exchange: cred.exchange.toUpperCase(), ...result };
          } catch (error) {
            this.logger.error(`${userLabel} ❌ SLTP SELL failed: ${error.message}`);
            return { success: false, userId: cred.userId, exchange: cred.exchange.toUpperCase(), error: error.message };
          }
        })
      );

      // Process results
      const successfulOrders = orderResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);

      const failedOrders = orderResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !r.value.success)
        .map(r => r.value);

      this.logger.log(`🎯 SLTP Trigger Summary: ${successfulOrders.length} succeeded, ${failedOrders.length} failed`);

      // CRITICAL: Notify graph to close position (for RL + chatbot)
      // Only if full exit (sell_fraction = 1.0 or SL_HIT) and at least one order succeeded
      const isFullExit = sell_fraction >= 1.0 || trigger_type === 'SL_HIT' || trigger_type === 'TP2_HIT';
      if (isFullExit && successfulOrders.length > 0) {
        try {
          // Construct position ID from graph_position_id or fallback
          const positionId = graph_position_id || `${symbol}:Position:unknown`;

          // Determine close reason based on trigger type
          const closeReason = trigger_type === 'SL_HIT' ? 'sl_hit' : 'tp_full';

          await this.graphWebhookService.notifyPositionClosed({
            positionId: positionId,
            exitPrice: triggered_price,
            realizedPnl: 0, // Will be calculated by Python position_service from entry price
            closeReason: closeReason,
            timestamp: new Date(),
            policyVersion: 'sltp_v1',
          });

          this.logger.log(`📡 Graph webhook sent: Position ${positionId} closed (${closeReason})`);
        } catch (webhookError) {
          // Non-blocking: Log but don't fail the SLTP execution
          this.logger.warn(`⚠️ Graph webhook failed (non-blocking): ${webhookError.message}`);
        }
      }

      return {
        status: successfulOrders.length > 0 ? 'executed' : 'failed',
        trigger_type,
        symbol,
        triggered_price,
        triggered_at,
        sell_fraction,
        graph_position_id,
        reason,
        totalUsers: activeCredentials.length,
        successCount: successfulOrders.length,
        failCount: failedOrders.length,
        orders: successfulOrders,
        failures: failedOrders,
        message: `SLTP ${trigger_type} executed for ${successfulOrders.length}/${activeCredentials.length} users`
      };

    } catch (error) {
      this.logger.error(`Error in handleSLTPTrigger: ${error.message}`, error.stack);
      throw new HttpException(
        { status: 'error', error_code: 'SLTP_EXECUTION_FAILED', message: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================================================
  // ORCHESTRATOR TRADE HISTORY (Dec 2025): Public endpoint for entry price recovery
  // =============================================================================
  // ENHANCED (Jan 24, 2026): Smart Credential Health System
  // - Auto-quarantines bad credentials after failures
  // - Prioritizes healthy credentials
  // - Graceful degradation when all credentials fail
  @Public()
  @Get('binance-trades')
  @ApiOperation({
    summary: 'Get recent Binance trades for a symbol (public, for orchestrator)',
    description: 'Fetches trade history from Binance for entry price recovery. Uses smart credential fallback with auto-quarantine for invalid API keys.'
  })
  @ApiResponse({ status: 200, description: 'Trades fetched successfully' })
  async getBinanceTrades(
    @Query('exchange') exchange: string,
    @Query('symbol') symbol: string,
    @Query('userId') userId: string,
    @Query('limit') limit: number = 50
  ) {
    try {
      if (!symbol) {
        throw new HttpException('Symbol parameter is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`📜 Fetching Binance trades for ${symbol} (limit: ${limit}, userId: ${userId?.substring(0, 8) || 'ANY'})`);

      const activeCredentials = await this.apicredentialsService.getActiveTradingCredentials();
      const binanceCredentials = activeCredentials.filter(c => c.exchange.toLowerCase() === 'binance');

      if (binanceCredentials.length === 0) {
        return { status: 'Success', data: [], message: 'No active Binance credentials' };
      }

      // SMART CREDENTIAL SELECTION: Sort by health, prefer specified userId
      const healthyCredential = this.credentialHealth.selectHealthyCredential(
        binanceCredentials,
        userId
      );

      if (!healthyCredential) {
        this.logger.error(`❌ All ${binanceCredentials.length} Binance credentials are quarantined`);
        return { status: 'Success', data: [], message: 'All credentials quarantined - please check API keys' };
      }

      // Get health-sorted credentials for fallback
      const sortedCredentials = this.credentialHealth.sortByHealth(binanceCredentials);

      for (const { credential, priority, health } of sortedCredentials) {
        // Skip actively quarantined credentials if healthier options exist
        if (priority >= 1000 && sortedCredentials.some(s => s.priority < 100)) {
          this.logger.debug(`⏭️ Skipping quarantined credential ${credential.userId.substring(0, 8)}...`);
          continue;
        }

        try {
          const trades = await this.exchangesService.getBinanceTradesForSymbol(
            symbol,
            limit,
            credential.apiKey,
            credential.secretKey
          );

          // Success! Record it
          this.credentialHealth.recordSuccess(credential.userId, credential.exchange);

          return {
            status: 'Success',
            data: trades,
            statusCode: 200,
            message: `Fetched ${trades.length} trades for ${symbol} (via user ${credential.userId.substring(0, 8)})`
          };

        } catch (credError) {
          // Record failure (may trigger quarantine)
          this.credentialHealth.recordFailure(credential.userId, credential.exchange, credError.message);
          this.logger.warn(`⚠️ Credential ${credential.userId.substring(0, 8)} failed for ${symbol}: ${credError.message}`);
          // Continue to next credential
        }
      }

      // All credentials failed
      this.logger.error(`❌ All ${binanceCredentials.length} Binance credentials failed for ${symbol}`);
      return { status: 'Success', data: [], message: 'All credentials failed' };
    } catch (error) {
      this.logger.error(`Error fetching Binance trades: ${error.message}`);
      throw error;
    }
  }

  // =========================================================================
  // ADMIN: Clear stale position records
  // =========================================================================
  @Public()
  @Post('admin/clear-stale-position')
  @ApiOperation({
    summary: 'Clear stale position record for a user',
    description: 'Creates a synthetic SELL order to close a stale position in the database. ' +
      'Use when DB shows open position but user has no actual holdings. ' +
      'This allows the system to place new BUY orders for the symbol.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID (full UUID or first 8 chars)' },
        symbol: { type: 'string', description: 'Trading symbol (e.g., MUBARAKUSDT)' },
        exchange: { type: 'string', description: 'Exchange name (e.g., BINANCE)' },
      },
      required: ['userId', 'symbol', 'exchange'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stale position cleared',
    schema: {
      example: {
        status: 'Success',
        data: {
          ordersFound: 1,
          syntheticSellCreated: true,
          orderGroupId: '4995f151-c7e7-4fc2-aba4-7d9784f01946',
        },
        message: 'Stale position cleared for MUBARAKUSDT',
      },
    },
  })
  async clearStalePosition(
    @Body() body: { userId: string; symbol: string; exchange: string },
  ) {
    const { userId, symbol, exchange } = body;

    if (!userId || !symbol || !exchange) {
      throw new HttpException(
        'userId, symbol, and exchange are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`🧹 Admin: Clearing stale position for ${userId.substring(0, 8)}.../${symbol} on ${exchange}`);

    try {
      const result = await this.exchangesService.clearStalePosition(userId, symbol, exchange);
      return {
        status: 'Success',
        data: result,
        statusCode: 200,
        message: `Stale position cleared for ${symbol}`,
      };
    } catch (error) {
      this.logger.error(`Error clearing stale position: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // =========================================================================
  // ADMIN: List open positions in DB
  // =========================================================================
  @Public()
  @Get('admin/open-positions-db')
  @ApiOperation({
    summary: 'List all open positions in the database',
    description: 'Returns all BUY orders without matching SELL orders. ' +
      'Useful for debugging stale position issues.',
  })
  @ApiResponse({
    status: 200,
    description: 'Open positions in database',
    schema: {
      example: {
        status: 'Success',
        data: [
          {
            userId: '2d7ca37d-xxxx',
            symbol: 'MUBARAKUSDT',
            exchange: 'BINANCE',
            orderId: 371723899,
            orderGroupId: '4995f151-c7e7-4fc2-aba4-7d9784f01946',
            filledTimestamp: '2026-01-10T10:00:00Z',
          },
        ],
        count: 1,
      },
    },
  })
  async listOpenPositionsDb(
    @Query('exchange') exchange?: string,
    @Query('userId') userId?: string,
  ) {
    this.logger.log(`🔍 Admin: Listing open positions in DB (exchange: ${exchange || 'all'}, userId: ${userId || 'all'})`);

    try {
      const result = await this.exchangesService.listOpenPositionsInDb(exchange, userId);
      return {
        status: 'Success',
        data: result,
        count: result.length,
        statusCode: 200,
        message: `Found ${result.length} open positions in database`,
      };
    } catch (error) {
      this.logger.error(`Error listing open positions: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // =========================================================================
  // ADMIN: Credential Health Status (Jan 24, 2026)
  // =========================================================================
  @Public()
  @Get('admin/credential-health')
  @ApiOperation({
    summary: 'Get credential health status',
    description: 'Returns health status of all credentials including quarantine state, failure counts, and last errors. Useful for diagnosing API key issues.'
  })
  @ApiResponse({
    status: 200,
    description: 'Credential health summary',
    schema: {
      example: {
        status: 'Success',
        data: {
          total: 3,
          healthy: 2,
          quarantined: 1,
          credentials: [
            {
              userId: '2d7ca37d-xxxx',
              exchange: 'binance',
              isQuarantined: false,
              consecutiveFailures: 0,
              totalSuccesses: 45,
              totalFailures: 2,
              lastSuccess: '2026-01-24T10:45:00Z',
              lastError: null
            },
            {
              userId: '36dca376-xxxx',
              exchange: 'binance',
              isQuarantined: true,
              quarantineReason: 'Authentication error: Invalid API-key',
              consecutiveFailures: 5,
              totalSuccesses: 0,
              totalFailures: 5,
              lastFailure: '2026-01-24T10:44:00Z',
              lastError: 'Invalid API-key, IP, or permissions for action.'
            }
          ]
        }
      }
    }
  })
  async getCredentialHealth() {
    this.logger.log('🏥 Admin: Fetching credential health status');

    try {
      const summary = this.credentialHealth.getHealthSummary();
      
      // Format credentials for display (hide full UUIDs for security)
      const formattedCredentials = summary.credentials.map(c => ({
        userId: `${c.userId.substring(0, 8)}...`,
        exchange: c.exchange,
        isQuarantined: c.isQuarantined,
        quarantineReason: c.quarantineReason,
        quarantinedAt: c.quarantinedAt?.toISOString() || null,
        consecutiveFailures: c.consecutiveFailures,
        totalSuccesses: c.totalSuccesses,
        totalFailures: c.totalFailures,
        lastSuccess: c.lastSuccess?.toISOString() || null,
        lastFailure: c.lastFailure?.toISOString() || null,
        lastError: c.lastError
      }));

      return {
        status: 'Success',
        data: {
          total: summary.total,
          healthy: summary.healthy,
          quarantined: summary.quarantined,
          credentials: formattedCredentials
        },
        statusCode: 200,
        message: `${summary.healthy}/${summary.total} credentials healthy, ${summary.quarantined} quarantined`
      };
    } catch (error) {
      this.logger.error(`Error fetching credential health: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // =========================================================================
  // ADMIN: Reset Credential Health (for when user updates their API keys)
  // =========================================================================
  @Public()
  @Post('admin/reset-credential-health')
  @ApiOperation({
    summary: 'Reset credential health status',
    description: 'Clears quarantine and failure counts for a credential. Use after user updates their API keys.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID (full UUID or first 8 chars)' },
        exchange: { type: 'string', description: 'Exchange name (e.g., BINANCE, BITGET)' },
      },
      required: ['userId', 'exchange'],
    },
  })
  @ApiResponse({ status: 200, description: 'Credential health reset' })
  async resetCredentialHealth(
    @Body() body: { userId: string; exchange: string }
  ) {
    this.logger.log(`🔄 Admin: Resetting credential health for ${body.userId?.substring(0, 8)}...[${body.exchange}]`);

    try {
      // Find matching credential (support partial userId)
      const allCredentials = await this.apicredentialsService.getActiveTradingCredentials();
      const matchingCred = allCredentials.find(c => 
        c.userId.startsWith(body.userId) && 
        c.exchange.toLowerCase() === body.exchange.toLowerCase()
      );

      if (!matchingCred) {
        return {
          status: 'Error',
          statusCode: 404,
          message: `No credential found for user ${body.userId} on ${body.exchange}`
        };
      }

      this.credentialHealth.resetHealth(matchingCred.userId, matchingCred.exchange);

      return {
        status: 'Success',
        statusCode: 200,
        message: `Credential health reset for ${matchingCred.userId.substring(0, 8)}...[${matchingCred.exchange}]`
      };
    } catch (error) {
      this.logger.error(`Error resetting credential health: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
