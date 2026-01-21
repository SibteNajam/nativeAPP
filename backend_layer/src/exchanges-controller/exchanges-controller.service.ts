import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { BinanceSignedService } from '../binance/binance.signed.service';
import { BinanceService } from '../binance/binance.service';
import { OrderService as BitgetOrderService } from '../bitget/services/orders.service';
import { AccountService as BitgetAccountService } from '../bitget/services/account.service';
import { BitgetService } from '../bitget/services/market.service';
import { BitgetGateway } from '../bitget/websocket/bitget.gateway';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { RequestOrderDto, ExchangeEnum } from './dto/place-order.dto';
import { normalizeBinanceOrder, normalizeBitgetOrder, normalizeBinanceBalance, normalizeBitgetBalance } from './utils/order-normalizer';
import { Order } from './entities/order.entity';
import { v4 as uuidv4 } from 'uuid';
import { Console } from 'console';

@Injectable()
export class ExchangesControllerService {
  private readonly logger = new Logger(ExchangesControllerService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly binanceSignedService: BinanceSignedService,
    private readonly binanceService: BinanceService,
    private readonly bitgetOrderService: BitgetOrderService,
    private readonly bitgetAccountService: BitgetAccountService,
    private readonly bitgetService: BitgetService,
    private readonly bitgetGateway: BitgetGateway,
    private readonly apiCredentialsService: ApicredentialsService,
  ) { }

  /**
   * Truncate a number to a specific number of decimal places (floor, not round)
   * Example: truncateToDecimals(0.0425263, 3) = 0.042
   */
  private truncateToDecimals(num: number, decimals: number): string {
    const factor = Math.pow(10, decimals);
    return (Math.floor(num * factor) / factor).toFixed(decimals);
  }

  /**
   * Check if a user has open orders (NEW or PARTIALLY_FILLED) for a specific symbol
   * Used to prevent placing new trades when user already has active position/orders
   * @param userId - User ID to check
   * @param symbol - Trading symbol to check
   * @param exchange - Exchange to filter by (optional)
   * @returns true if user has open orders, false otherwise
   */
  async hasOpenOrdersForSymbol(userId: string, symbol: string, exchange?: string): Promise<boolean> {
    try {
      const whereConditions: any = {
        userId,
        symbol,
        status: 'NEW', // Only check NEW orders (open TP/SL)
      };

      if (exchange) {
        whereConditions.exchange = exchange.toUpperCase();
      }

      const openOrders = await this.orderRepository.find({
        where: whereConditions,
        take: 1, // Only need to know if at least one exists
      });

      if (openOrders.length > 0) {
        this.logger.log(`⚠️ User ${userId.substring(0, 8)}... has ${openOrders.length}+ open orders for ${symbol} - skipping new trade`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking open orders for user ${userId}: ${error.message}`);
      return false; // On error, allow the trade (fail-open)
    }
  }

  /**
   * Save entry order to database when it's first placed
   */
  async saveEntryOrder(orderData: {
    orderId: number | bigint;
    clientOrderId: string;
    exchange: string;
    symbol: string;
    side: string;
    type: string;
    quantity: string;
    price?: string;
    status: string;
    executedQty: string;
    orderTimestamp: number;
    tpLevels?: number[];
    slPrice?: number;
    note?: string;
    userId?: string; // Changed to string for UUID
    finalSignalId?: string;
    portfolioId?: string;
  }): Promise<Order> {
    try {
      // Generate order group ID for linking TP/SL orders later
      const orderGroupId = uuidv4();

      // Build metadata object for TP/SL levels and signal tracking
      const metadata: any = {};
      if (orderData.tpLevels && orderData.tpLevels.length > 0) {
        metadata.tp1 = orderData.tpLevels[0];
        if (orderData.tpLevels.length > 1) {
          metadata.tp2 = orderData.tpLevels[1];
        }
      }
      if (orderData.slPrice) {
        metadata.sl = orderData.slPrice;
      }
      if (orderData.finalSignalId) {
        metadata.finalSignalId = orderData.finalSignalId;
      }
      if (orderData.portfolioId) {
        metadata.portfolioId = orderData.portfolioId;
      }

      const order = this.orderRepository.create({
        orderId: orderData.orderId,
        clientOrderId: orderData.clientOrderId,
        exchange: orderData.exchange,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.quantity,
        price: orderData.price,
        executedQty: orderData.executedQty || '0',
        status: orderData.status,
        orderTimestamp: new Date(orderData.orderTimestamp), // Convert Unix timestamp to Date
        orderGroupId,
        orderRole: 'ENTRY',
        tpLevels: orderData.tpLevels,
        slPrice: orderData.slPrice ? orderData.slPrice.toString() : null,
        note: orderData.note,
        userId: orderData.userId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      const savedOrder = await this.orderRepository.save(order);
      this.logger.log(`✅ Saved ENTRY order to DB: orderId=${savedOrder.orderId}, groupId=${orderGroupId}`);
      if (Object.keys(metadata).length > 0) {
        this.logger.log(`   Metadata: ${JSON.stringify(metadata)}`);
      }

      return savedOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to save entry order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update order status when it gets filled (called from WebSocket)
   * @param userId - Optional user ID (UUID) to associate with the order
   */
  async updateOrderStatus(
    orderId: number,
    exchange: string,
    status: string,
    executedQty?: string,
    filledTimestamp?: number,
    userId?: string,
    avgPrice?: number,
  ): Promise<Order | null> {
    try {
      const order = await this.orderRepository.findOne({
        where: { orderId, exchange },
      });

      if (!order) {
        this.logger.warn(`⚠️ Order not found in DB: orderId=${orderId}, exchange=${exchange}`);
        return null;
      }

      // Update status and other fields
      order.status = status;
      if (executedQty) order.executedQty = executedQty;
      if (filledTimestamp) order.filledTimestamp = new Date(filledTimestamp);

      // Update price if average price is provided (crucial for MARKET orders)
      if (avgPrice && avgPrice > 0) {
        if (order.price === '0' || order.price === '0.00000000' || parseFloat(order.price) === 0) {
          order.price = avgPrice.toString();
          this.logger.log(`💰 Updated order ${orderId} price to ${avgPrice} (was 0)`);
        }
      }
      // Update userId if provided and order doesn't have one yet
      if (userId && !order.userId) {
        order.userId = userId;
        this.logger.log(`📌 Associated order ${orderId} with user ${userId.substring(0, 8)}...`);
      }

      const updatedOrder = await this.orderRepository.save(order);
      this.logger.log(`✅ Updated order status in DB: orderId=${orderId}, status=${status}${userId ? `, userId=${userId.substring(0, 8)}...` : ''}`);

      return updatedOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to update order status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Link TP/SL orders to the parent entry order
   */
  // async linkTpSlOrders(
  //   entryOrderId: number,
  //   exchange: string,
  //   tpSlOrders: Array<{
  //     orderId: number;
  //     clientOrderId: string;
  //     symbol: string;
  //     side: string;
  //     type: string;
  //     price: string;
  //     quantity: string;
  //     status: string;
  //     orderTimestamp: number;
  //     role: 'TP1' | 'TP2' | 'SL';
  //   }>,
  // ): Promise<Order[]> {
  //   try {
  //     // Get the parent order to retrieve orderGroupId
  //     const parentOrder = await this.orderRepository.findOne({
  //       where: { orderId: entryOrderId, exchange },
  //     });

  //     if (!parentOrder) {
  //       throw new Error(`Parent order not found: orderId=${entryOrderId}`);
  //     }

  //     const savedOrders: Order[] = [];

  //     for (const tpSlOrder of tpSlOrders) {
  //       const order = this.orderRepository.create({
  //         orderId: tpSlOrder.orderId,
  //         clientOrderId: tpSlOrder.clientOrderId,
  //         exchange,
  //         symbol: tpSlOrder.symbol,
  //         side: tpSlOrder.side,
  //         type: tpSlOrder.type,
  //         quantity: tpSlOrder.quantity,
  //         price: tpSlOrder.price,
  //         executedQty: '0',
  //         status: tpSlOrder.status,
  //         orderTimestamp: new Date(tpSlOrder.orderTimestamp),
  //         parentOrderId: entryOrderId,
  //         orderGroupId: parentOrder.orderGroupId,
  //         orderRole: tpSlOrder.role,
  //         userId: parentOrder.userId, // Inherit userId from parent entry order
  //       });

  //       const savedOrder = await this.orderRepository.save(order);
  //       savedOrders.push(savedOrder);
  //       const userLabel = parentOrder.userId ? `[User ${parentOrder.userId.substring(0, 8)}...]` : '';
  //       this.logger.log(`✅ ${userLabel} Linked ${tpSlOrder.role} order to entry order: orderId=${tpSlOrder.orderId}`);
  //     }

  //     return savedOrders;
  //   } catch (error) {
  //     this.logger.error(`❌ Failed to link TP/SL orders: ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * Get current price for a symbol on a specific exchange
   */
  async getPrice(exchange: string, symbol: string): Promise<number> {
    try {
      if (exchange === ExchangeEnum.BINANCE) {
        const priceData = await this.binanceService.getSymbolPrice(symbol);
        return parseFloat(priceData[0]?.price || '0');
      } else if (exchange === ExchangeEnum.BITGET) {
        const coinInfo = await this.bitgetService.getCoinInfo(symbol);
        return parseFloat(coinInfo.lastPrice);
      }
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get price for ${symbol} on ${exchange}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get OHLCV klines data for a symbol
   * 
   * ADDED (Jan 2026): Support for SLTP volatility calculations.
   * Returns candlestick data with open/high/low/close/volume.
   */
  async getKlines(exchange: string, symbol: string, interval: string, limit: number): Promise<any[]> {
    try {
      if (exchange.toUpperCase() === ExchangeEnum.BINANCE) {
        const klines = await this.binanceService.getKlines(symbol, interval, limit);
        return klines;
      } else if (exchange.toUpperCase() === ExchangeEnum.BITGET) {
        // TODO: Add Bitget klines support if needed
        this.logger.warn(`Klines not implemented for Bitget, returning empty`);
        return [];
      }
      return [];
    } catch (error) {
      this.logger.error(`Failed to get klines for ${symbol} on ${exchange}: ${error.message}`);
      throw new HttpException(`Failed to fetch klines: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get all orders for a specific order group
   */
  async getOrderGroup(orderGroupId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { orderGroupId },
      order: { orderTimestamp: 'DESC' },
    });
  }

  /**
   * Check if a specific user has an open position for a symbol
   * 
   * Logic: A position is OPEN if there's a FILLED BUY order WITHOUT a corresponding FILLED SELL order
   * in the same orderGroupId. This prevents duplicate BUY orders when SLTP hasn't closed the position yet.
   * 
   * CRITICAL FIX (Jan 2026 - Issue #15): Also checks EXCHANGE BALANCE as fallback
   * This prevents duplicate buys after Docker rebuild when DB is empty but exchange has assets.
   * 
   * Used by multi-user order placement to skip symbols the user already holds.
   * This enables new users to get orders for coins existing users already have.
   * 
   * @param userId - User ID to check
   * @param symbol - Trading symbol (e.g., BTCUSDT)
   * @param exchange - Exchange name (BINANCE, BITGET)
   * @param apiKey - Optional API key for exchange balance check
   * @param secretKey - Optional secret key for exchange balance check
   * @param passphrase - Optional passphrase for Bitget
   * @returns True if user has an open position (BUY filled but no SELL filled in same group, OR has exchange balance)
   */
  async hasOpenPosition(
    userId: string,
    symbol: string,
    exchange: string,
    apiKey?: string,
    secretKey?: string,
    passphrase?: string,
  ): Promise<boolean> {
    const userLabel = `[User ${userId.substring(0, 8)}...]`;

    try {
      // Step 1: Find the most recent FILLED BUY order (ENTRY role)
      const latestBuyOrder = await this.orderRepository.findOne({
        where: {
          userId,
          symbol,
          exchange,
          orderRole: 'ENTRY',
          side: 'BUY',
          status: 'FILLED',
        },
        order: { filledTimestamp: 'DESC' },
      });

      // If no BUY order in DB, check exchange balance as fallback (Issue #15 fix)
      if (!latestBuyOrder) {
        // =========================================================================
        // EXCHANGE BALANCE FALLBACK (Issue #15 - Post-Docker Rebuild Safety)
        // =========================================================================
        // If DB has no record, user might still have assets on exchange from before
        // Docker rebuild. Check exchange balance to prevent duplicate buys.
        // =========================================================================
        if (apiKey && secretKey) {
          const hasBalance = await this.checkExchangeAssetBalance(
            exchange, symbol, apiKey, secretKey, passphrase
          );
          if (hasBalance) {
            this.logger.warn(
              `${userLabel}[hasOpenPosition] NO DB RECORD but EXCHANGE HAS BALANCE for ${symbol}. ` +
              `Blocking duplicate buy (post-rebuild safety).`
            );
            return true; // Block the buy - user already holds this asset
          }
        }
        return false;
      }

      // If orderGroupId is null, we can't verify if position is closed
      // Treat as open to prevent duplicate orders
      if (!latestBuyOrder.orderGroupId) {
        this.logger.warn(
          `[hasOpenPosition] BUY order ${latestBuyOrder.orderId} has no orderGroupId - treating as OPEN`
        );
        return true;
      }

      // Step 2: Check if there's a FILLED SELL order in the same orderGroupId
      // SELL orders are placed by SLTP with the same orderGroupId as the BUY
      const sellOrder = await this.orderRepository.findOne({
        where: {
          userId,
          symbol,
          exchange,
          orderGroupId: latestBuyOrder.orderGroupId, // Now guaranteed to be non-null
          side: 'SELL',
          status: 'FILLED',
        },
      });

      // If SELL order exists and is FILLED, position is CLOSED
      if (sellOrder) {
        this.logger.debug(
          `[hasOpenPosition] Position CLOSED for ${userId.substring(0, 8)}.../${symbol}: ` +
          `BUY order ${latestBuyOrder.orderId} has matching SELL order ${sellOrder.orderId} in group ${latestBuyOrder.orderGroupId}`
        );
        return false;
      }

      // If BUY is FILLED but no SELL exists, position is OPEN
      this.logger.debug(
        `[hasOpenPosition] Position OPEN for ${userId.substring(0, 8)}.../${symbol}: ` +
        `BUY order ${latestBuyOrder.orderId} in group ${latestBuyOrder.orderGroupId} has no matching SELL`
      );
      return true;

    } catch (error) {
      // CRITICAL FIX (Jan 10, 2026): Return TRUE on error to PREVENT duplicate buys
      // Previous behavior returned false, allowing duplicate orders when DB queries failed
      this.logger.error(
        `🔴 CRITICAL: Error checking open position for ${userId}/${symbol}: ${error.message}. ` +
        `Returning TRUE to prevent duplicate buy.`
      );
      return true; // Safe default: assume position exists, prevent duplicate
    }
  }

  /**
   * Check if user has balance for a specific asset on the exchange
   * Used as fallback when DB is empty (e.g., after Docker rebuild)
   * 
   * @param exchange - Exchange name (BINANCE, BITGET)
   * @param symbol - Trading symbol (e.g., BTCUSDT)
   * @param apiKey - API key
   * @param secretKey - Secret key
   * @param passphrase - Optional passphrase for Bitget
   * @returns True if user has non-zero balance for the asset
   */
  private async checkExchangeAssetBalance(
    exchange: string,
    symbol: string,
    apiKey: string,
    secretKey: string,
    passphrase?: string,
  ): Promise<boolean> {
    const baseAsset = symbol.replace('USDT', '');
    // Minimum balance threshold - consider anything > $1 worth as "has position"
    const MIN_BALANCE_THRESHOLD = 0.0001; // Very small threshold to catch any dust

    try {
      if (exchange.toUpperCase() === 'BINANCE') {
        const balances = await this.binanceSignedService.getBalances(apiKey, secretKey);
        const assetBalance = balances.find((b: any) => b.asset === baseAsset);
        const free = parseFloat(assetBalance?.free || '0');
        const locked = parseFloat(assetBalance?.locked || '0');
        const total = free + locked;

        if (total > MIN_BALANCE_THRESHOLD) {
          this.logger.debug(`[checkExchangeAssetBalance] ${baseAsset} balance on Binance: ${total}`);
          return true;
        }
      } else if (exchange.toUpperCase() === 'BITGET') {
        const balances = await this.bitgetAccountService.getSpotAccount(apiKey, secretKey, passphrase);
        const assetBalance = balances.find((b: any) => b.coin === baseAsset);
        const available = parseFloat(assetBalance?.available || '0');
        const frozen = parseFloat(assetBalance?.frozen || '0');
        const total = available + frozen;

        if (total > MIN_BALANCE_THRESHOLD) {
          this.logger.debug(`[checkExchangeAssetBalance] ${baseAsset} balance on Bitget: ${total}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      // On error, log and return false (don't block trades due to balance check failure)
      // The DB check is still the primary mechanism
      this.logger.warn(`[checkExchangeAssetBalance] Failed to check ${baseAsset} balance: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate order quantity based on portfolio percentage
   * @param price - Price to use for quantity calculation (from graph signal)
   */
  private async calculateOrderQuantity(
    userId: string,
    exchange: ExchangeEnum,
    symbol: string,
    sizePct: number,
    side: 'BUY' | 'SELL',
    apiKey: string,
    secretKey: string,
    passphrase?: string,
    price?: number,
  ): Promise<{ quantity: string; estimatedValue: number }> {
    try {
      // For BUY orders, use USDT balance and provided price
      if (!price || price <= 0) {
        throw new HttpException('Price is required for BUY order quantity calculation', HttpStatus.BAD_REQUEST);
      }

      let accountBalance = 0;

      if (exchange === ExchangeEnum.BINANCE) {
        const balances = await this.binanceSignedService.getBalances(apiKey, secretKey);
        const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
        accountBalance = parseFloat(usdtBalance?.free || '0');
      } else if (exchange === ExchangeEnum.BITGET) {
        const balances = await this.bitgetAccountService.getSpotAccount(apiKey, secretKey, passphrase);
        const usdtBalance = balances.find((b: any) => b.coin === 'USDT');
        accountBalance = parseFloat(usdtBalance?.available || '0');
      }

      if (accountBalance === 0) {
        throw new HttpException('Insufficient USDT balance or unable to fetch balance', HttpStatus.BAD_REQUEST);
      }

      // Calculate position size in USDT with slippage buffer
      const slippageBuffer = 1 - parseFloat(process.env.SLIPPAGE_BUFFER_PCT || '0.01');
      const positionSizeUSDT = accountBalance * sizePct * slippageBuffer;

      this.logger.log(`BUY: USDT balance: $${accountBalance}, Position size (${sizePct * 100}%): $${positionSizeUSDT}, Price: $${price}`);

      // Calculate quantity using the provided price
      const quantity = positionSizeUSDT / price;

      return {
        quantity: quantity.toString(),
        estimatedValue: positionSizeUSDT
      };
    } catch (error) {
      this.logger.error(`Error calculating order quantity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Place order using environment credentials (fallback method)
   * @deprecated Use placeOrderWithCredentials for multi-user support
   */
  async placeOrder(userId: string | null, orderDto: RequestOrderDto): Promise<any> {
    const { exchange, symbol, side, sizePct, sizeUsd, tpLevels, sl, type = 'MARKET', price } = orderDto;

    this.logger.log(`📡 [ENV] Placing ${side} order for ${symbol} on ${exchange}`);

    // Route to appropriate exchange with environment credentials
    switch (exchange) {
      case ExchangeEnum.BINANCE:
        return this.placeBinanceOrderWithCredentials(
          null, symbol, side, type, sizePct, price, tpLevels, sl, sizeUsd,
          process.env.BINANCE_API_KEY || '',
          process.env.BINANCE_SECRET_KEY || '',
        );

      case ExchangeEnum.BITGET:
        return this.placeBitgetOrderWithCredentials(
          null, symbol, side, type, sizePct, price, tpLevels, sl, sizeUsd,
          process.env.BITGET_API_KEY || '',
          process.env.BITGET_SECRET_KEY || '',
          process.env.BITGET_PASSPHRASE || '',
        );

      default:
        throw new HttpException(`Exchange ${exchange} not supported yet`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Place order for a single user with their specific credentials
   * Called by the controller for each active trading user
   */
  async placeOrderWithCredentials(
    userId: string,
    orderDto: RequestOrderDto,
    apiKey: string,
    secretKey: string,
    passphrase?: string,
  ): Promise<any> {
    const { exchange, symbol, side, sizePct, sizeUsd, tpLevels, sl, type = 'MARKET', price } = orderDto;
    const userLabel = `[User ${userId.substring(0, 8)}...][${exchange}]`;

    this.logger.log(`${userLabel} Placing ${side} ${type} order for ${symbol}`);

    // Route to appropriate exchange handler with user's credentials
    switch (exchange) {
      case ExchangeEnum.BINANCE:
        return this.placeBinanceOrderWithCredentials(
          userId, symbol, side, type, sizePct, price, tpLevels, sl, sizeUsd,
          apiKey, secretKey,
        );

      case ExchangeEnum.BITGET:
        return this.placeBitgetOrderWithCredentials(
          userId, symbol, side, type, sizePct, price, tpLevels, sl, sizeUsd,
          apiKey, secretKey, passphrase,
        );

      default:
        throw new HttpException(`Exchange ${exchange} not supported yet`, HttpStatus.BAD_REQUEST);
    }
  }


  /**
   * Place order on Binance with specific user credentials
   */
  private async placeBinanceOrderWithCredentials(
    userId: string | null,
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    sizePct: number,
    price: number | undefined,
    tpLevels: number[] | undefined,  // Can be undefined when Graph doesn't send TP levels
    sl: number | undefined,           // Can be undefined when Graph doesn't send SL
    sizeUsd: number | undefined,
    apiKey: string,
    secretKey: string,
  ): Promise<any> {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '[ENV]';

    if (!apiKey || !secretKey) {
      throw new HttpException(
        `${userLabel} Binance credentials not found`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let quantity: string;
    let estimatedValue: number;

    // =========================================================================
    // PRICE DETERMINATION (Jan 2026 - Graph Price Priority)
    // =========================================================================
    // If price is provided from graph signal, USE THAT PRICE for the LIMIT order.
    // This ensures we buy at the exact price the graph analysis determined.
    // Only fetch exchange price if no price is provided (fallback).
    // =========================================================================
    let priceForCalc: number;

    if (price && price > 0) {
      // Use graph price - this is the price the graph analysis determined is optimal
      priceForCalc = price;
      this.logger.log(`${userLabel} 📊 Using GRAPH PRICE for ${symbol}: $${priceForCalc} (from signal)`);
    } else {
      // Fallback: Fetch current price from exchange
      const priceData = await this.binanceService.getSymbolPrice(symbol);
      priceForCalc = parseFloat(priceData[0]?.price || '0');
      this.logger.log(`${userLabel} Using EXCHANGE PRICE for ${symbol}: $${priceForCalc} (no graph price provided)`);
    }

    if (priceForCalc === 0) {
      throw new HttpException('Unable to determine price for order', HttpStatus.BAD_REQUEST);
    }

    // Calculate quantity based on sizeUsd or sizePct
    if (sizeUsd && sizeUsd > 0) {
      quantity = (sizeUsd / priceForCalc).toString();
      estimatedValue = sizeUsd;
      this.logger.log(`${userLabel} Using fixed USD amount: $${sizeUsd} at $${priceForCalc} = ${quantity} ${symbol.replace('USDT', '')}`);
    } else {
      // Calculate order quantity based on portfolio percentage using graph price if available
      const calcResult = await this.calculateOrderQuantity(
        userId || 'env-user',
        ExchangeEnum.BINANCE,
        symbol,
        sizePct,
        side,
        apiKey,
        secretKey,
        undefined, // passphrase (not needed for Binance)
        priceForCalc, // Use graph price for quantity calculation
      );
      quantity = calcResult.quantity;
      estimatedValue = calcResult.estimatedValue;
    }

    this.logger.log(`${userLabel} Calculated quantity: ${quantity} ${symbol.replace('USDT', '')} (≈ $${estimatedValue.toFixed(6)})`);

    // Fetch exchange info for precision
    const exchangeInfo = await this.binanceSignedService.getExchangeInfo(symbol);
    const lotSizeFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const priceFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    const notionalFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'NOTIONAL');

    const stepSize = parseFloat(lotSizeFilter.stepSize);
    const tickSize = parseFloat(priceFilter.tickSize);
    const minNotional = parseFloat(notionalFilter.minNotional);

    const quantityPrecision = this.binanceSignedService.getPrecision(stepSize);
    const pricePrecision = this.binanceSignedService.getPrecision(tickSize);

    // Round quantity and price to proper precision
    const roundedQuantity = parseFloat(quantity).toFixed(quantityPrecision);
    const roundedPrice = priceForCalc.toFixed(pricePrecision);

    // Validate minimum requirements
    const quantityNum = parseFloat(roundedQuantity);
    const priceNum = roundedPrice ? parseFloat(roundedPrice) : 0;
    const minQty = parseFloat(lotSizeFilter.minQty);
    const maxQty = parseFloat(lotSizeFilter.maxQty);

    if (quantityNum < minQty || quantityNum > maxQty) {
      throw new HttpException(
        `Quantity must be between ${minQty} and ${maxQty}, got ${quantityNum}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate notional for LIMIT orders
    if (type === 'LIMIT' && priceNum * quantityNum < minNotional) {
      throw new HttpException(
        `Order value must be at least ${minNotional} USDT, got ${(priceNum * quantityNum).toFixed(8)} USDT`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Build order object
    const order: any = {
      symbol,
      side,
      type,
    };

    // Check if quoteOrderQtyMarketAllowed is true for this symbol
    const quoteOrderQtyAllowed = exchangeInfo.quoteOrderQtyMarketAllowed || false;

    if (type === 'MARKET' && side === 'BUY' && quoteOrderQtyAllowed) {
      // Use quoteOrderQty for market BUY orders if supported (amount in USDT)
      const quotePrecision = exchangeInfo.quotePrecision || 8;
      const roundedQuoteOrderQty = estimatedValue.toFixed(quotePrecision);
      order.quoteOrderQty = roundedQuoteOrderQty;
      this.logger.log(`${userLabel} Using quoteOrderQty=${roundedQuoteOrderQty} USDT for market BUY order`);
    } else {
      // Use quantity for SELL market orders, LIMIT orders, or when quoteOrderQty not supported
      order.quantity = roundedQuantity;
      this.logger.log(`${userLabel} Using quantity=${roundedQuantity} ${symbol.replace('USDT', '')} for order`);

      if (type === 'LIMIT' && roundedPrice) {
        order.price = roundedPrice;
        order.timeInForce = 'GTC';
      }
    }

    this.logger.log(`${userLabel} Submitting order: ${JSON.stringify(order)}`);

    const result = await this.binanceSignedService.placeOrder(order, apiKey, secretKey);
    this.logger.log(`${userLabel} ✅ Binance order placed successfully: orderId=${result.orderId} and order ${result}`);

    // Calculate actual fill price if order is filled immediately
    let actualPrice = result.price;
    if (result.status === 'FILLED' && parseFloat(result.executedQty) > 0 && parseFloat(result.cummulativeQuoteQty) > 0) {
      actualPrice = (parseFloat(result.cummulativeQuoteQty) / parseFloat(result.executedQty)).toString();
      this.logger.log(`${userLabel} 📊 Order filled immediately. Actual price: ${actualPrice} (Requested: ${result.price})`);
    }

    // Save order to database with userId
    // =========================================================================
    // CRITICAL FIX (Jan 10, 2026 - Issue #14): tpLevels undefined bug
    // =========================================================================
    // tpLevels and sl are typically undefined because:
    // - SLTP is handled DYNAMICALLY by SF app's SLTP Manager (not stored with order)
    // - SF app sends SLTP triggers when price conditions are met
    // 
    // Previous code: tpLevels.length crashed when undefined, causing DB save to fail.
    // Without DB records, hasOpenPosition() returns false → DUPLICATE orders!
    // 
    // Fix: Safely handle undefined tpLevels/sl (they're expected to be undefined)
    // =========================================================================
    const safeTpLevels = Array.isArray(tpLevels) && tpLevels.length > 0 ? tpLevels : undefined;
    const hasTpOrSl = safeTpLevels || (sl && sl > 0);

    try {
      await this.saveEntryOrder({
        orderId: result.orderId,
        clientOrderId: result.clientOrderId,
        exchange: 'BINANCE',
        symbol: result.symbol,
        side: result.side,
        type: result.type,
        quantity: result.origQty,
        price: actualPrice,
        status: result.status,
        executedQty: result.executedQty || '0',
        orderTimestamp: result.transactTime,
        tpLevels: safeTpLevels,
        slPrice: sl && sl > 0 ? sl : undefined,
        note: hasTpOrSl ? 'Static TP/SL (SF SLTP Manager handles dynamic execution)' : undefined,
        userId: userId || undefined, // Associate order with user
      });

      // Note: SLTP is handled by SF app's SLTP Manager which monitors positions
      // and sends webhooks to /sltp-webhook when TP/SL conditions are triggered.

      this.logger.log(`${userLabel} 💾 Order saved to database with userId`);
    } catch (dbError) {
      this.logger.error(`${userLabel} ⚠️ Failed to save order to database: ${dbError.message}`);
      // Don't fail the entire order placement if DB save fails
    }

    return {
      success: true,
      userId,
      exchange: 'BINANCE',
      orderId: result.orderId,
      clientOrderId: result.clientOrderId,
      symbol: result.symbol,
      side: result.side,
      type: result.type,
      quantity: result.origQty,
      price: result.price,
      status: result.status,
      executedQty: result.executedQty,
      timestamp: result.transactTime,
      tpLevels: safeTpLevels,
      sl: sl && sl > 0 ? sl : undefined,
    };
  }

  /**
   * Place order on Bitget with specific user credentials
   * Splits each order into 2 parts with different TP levels (4% and 8%)
   * Uses Bitget's native TP/SL parameters for atomic execution
   */
  private async placeBitgetOrderWithCredentials(
    userId: string | null,
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    sizePct: number,
    price: number | undefined,
    tpLevels: number[] | undefined,  // Can be undefined when Graph doesn't send TP levels  
    sl: number | undefined,           // Can be undefined when Graph doesn't send SL
    sizeUsd: number | undefined,
    apiKey: string,
    secretKey: string,
    passphrase: string | undefined,
  ): Promise<any> {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '[ENV]';

    if (!apiKey || !secretKey) {
      throw new HttpException(
        `${userLabel} Bitget credentials not found`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // =========================================================================
    // CRITICAL FIX (Jan 2026): DISABLE PREDEFINED TP/SL ORDERS
    // =========================================================================
    // SLTP is now handled DYNAMICALLY by the embedded dynamic_sltp module.
    // The module monitors positions and sends webhooks when TP/SL conditions
    // are met. We should NOT place predefined TP/SL orders here.
    //
    // PREVIOUS BEHAVIOR (REMOVED):
    // - Split BUY into 2 orders with presetTakeProfitPrice/presetStopLossPrice
    // - This created 4 sell orders (2 TP + 2 SL) automatically
    //
    // NEW BEHAVIOR:
    // - Place single BUY order without TP/SL
    // - dynamic_sltp module handles exits based on real-time analysis
    // =========================================================================

    // Always place single order - no splitting, no predefined TP/SL
    return this.placeSingleBitgetOrder(
      userId, symbol, side, type, sizePct, price,
      [],  // Empty tpLevels - SLTP handled dynamically
      0,   // No sl - SLTP handled dynamically
      sizeUsd,
      apiKey, secretKey, passphrase
    );
  }

  // =========================================================================
  // DISABLED: Old split order logic with predefined TP/SL
  // =========================================================================
  // This code has been disabled because SLTP is now handled dynamically by the
  // embedded dynamic_sltp module. The old logic is preserved in comments for
  // reference but should be removed in a future cleanup.
  // =========================================================================

  /*
  private async placeBitgetOrderWithCredentials_OLD_DISABLED(
    userId: string | null,
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    sizePct: number,
    price: number | undefined,
    tpLevels: number[] | undefined,
    sl: number | undefined,
    sizeUsd: number | undefined,
    apiKey: string,
    secretKey: string,
    passphrase: string | undefined,
  ): Promise<any> {
    // Old split order logic removed - SLTP now handled dynamically
  }
  */

  /**
   * Place a single Bitget order with TP/SL parameters
   * @deprecated This function uses predefined TP/SL which is now handled dynamically
   */
  private async placeBitgetOrderWithTPSL(
    symbol: string,
    side: string,
    quantity: string,
    price: string,
    tpPrice: string,
    slPrice: string,
    apiKey: string,
    secretKey: string,
    passphrase: string | undefined,
    userLabel: string,
    tpGroup: string,
  ): Promise<any> {
    const bitgetOrder: any = {
      symbol,
      side: side.toLowerCase() as 'buy' | 'sell',
      orderType: 'limit',
      force: 'gtc',
      price,
      size: quantity,
      presetTakeProfitPrice: tpPrice,
      presetStopLossPrice: slPrice,
    };

    this.logger.log(`${userLabel} Placing ${tpGroup} order: ${JSON.stringify(bitgetOrder)}`);

    const result = await this.bitgetOrderService.placeSpotOrder(bitgetOrder, apiKey, secretKey, passphrase);
    this.logger.log(`${userLabel} ✅ ${tpGroup} order placed: orderId=${result.orderId}`);

    return result;
  }

  /**
   * Save Bitget order to database
   */
  private async saveBitgetOrderToDb(orderData: {
    orderId: number;
    clientOrderId: string;
    exchange: string;
    symbol: string;
    side: string;
    type: string;
    quantity: string;
    price: string;
    status: string;
    executedQty: string;
    orderTimestamp: number;
    orderGroupId: string;
    orderRole: string;
    userId?: string;
    metadata?: any;
  }): Promise<Order> {
    try {
      const order = this.orderRepository.create({
        orderId: orderData.orderId,
        clientOrderId: orderData.clientOrderId,
        exchange: orderData.exchange,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        quantity: orderData.quantity,
        price: orderData.price,
        executedQty: orderData.executedQty,
        status: orderData.status,
        orderTimestamp: new Date(orderData.orderTimestamp),
        orderGroupId: orderData.orderGroupId,
        orderRole: orderData.orderRole,
        userId: orderData.userId || null,
        metadata: orderData.metadata || null,
      });

      const savedOrder = await this.orderRepository.save(order);
      const userLabel = orderData.userId ? `[User ${orderData.userId.substring(0, 8)}...]` : '[ENV]';
      this.logger.log(`${userLabel} 💾 Saved ${orderData.metadata?.tpGroup || 'order'} to DB: orderId=${savedOrder.orderId}`);

      return savedOrder;
    } catch (error) {
      this.logger.error(`❌ Failed to save order to DB: ${error.message}`);
      throw error;
    }
  }

  /**
   * Place a single Bitget order without splitting (for SELL or non-TP/SL orders)
   */
  private async placeSingleBitgetOrder(
    userId: string | null,
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    sizePct: number,
    price: number | undefined,
    tpLevels: number[],
    sl: number,
    sizeUsd: number | undefined,
    apiKey: string,
    secretKey: string,
    passphrase: string | undefined,
  ): Promise<any> {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '[ENV]';

    let quantity: string;
    let estimatedValue: number;

    // =========================================================================
    // PRICE DETERMINATION (Jan 2026 - Graph Price Priority)
    // =========================================================================
    // If price is provided from graph signal, USE THAT PRICE for the LIMIT order.
    // This ensures we buy at the exact price the graph analysis determined.
    // Only fetch exchange price if no price is provided (fallback).
    // =========================================================================
    let priceForCalc: number;

    if (price && price > 0) {
      // Use graph price - this is the price the graph analysis determined is optimal
      priceForCalc = price;
      this.logger.log(`${userLabel} 📊 Using GRAPH PRICE for ${symbol}: $${priceForCalc} (from signal)`);
    } else {
      // Fallback: Fetch current price from Bitget
      const coinInfo = await this.bitgetService.getCoinInfo(symbol);
      priceForCalc = parseFloat(coinInfo.lastPrice);
      this.logger.log(`${userLabel} Using EXCHANGE PRICE for ${symbol}: $${priceForCalc} (no graph price provided)`);
    }

    if (priceForCalc === 0) {
      throw new HttpException('Unable to determine price for Bitget order', HttpStatus.BAD_REQUEST);
    }

    // Calculate quantity based on sizeUsd or sizePct
    if (sizeUsd && sizeUsd > 0) {
      quantity = (sizeUsd / priceForCalc).toString();
      estimatedValue = sizeUsd;
      this.logger.log(`${userLabel} Using fixed USD amount: $${sizeUsd} at $${priceForCalc} = ${quantity} ${symbol.replace('USDT', '')}`);
    } else {
      // Calculate order quantity based on portfolio percentage using graph price if available
      const result = await this.calculateOrderQuantity(
        userId || 'env-user',
        ExchangeEnum.BITGET,
        symbol,
        sizePct,
        side,
        apiKey,
        secretKey,
        passphrase,
        priceForCalc, // Use graph price for quantity calculation
      );
      quantity = result.quantity;
      estimatedValue = result.estimatedValue;
    }

    // Build order object - type is always LIMIT, use fetched current price
    const bitgetOrder: any = {
      symbol,
      side: side.toLowerCase() as 'buy' | 'sell',
      orderType: type.toLowerCase() as 'market' | 'limit',
      force: 'gtc',
    };

    if (type === 'MARKET' && side === 'BUY') {
      bitgetOrder.size = estimatedValue.toString();
    } else {
      bitgetOrder.size = quantity;
    }

    // For LIMIT orders, use the fetched current price
    if (type === 'LIMIT') {
      bitgetOrder.price = priceForCalc.toString();
    }

    this.logger.log(`${userLabel} Placing order: ${JSON.stringify(bitgetOrder)}`);

    const result = await this.bitgetOrderService.placeSpotOrder(bitgetOrder, apiKey, secretKey, passphrase);
    this.logger.log(`${userLabel} ✅ Order placed: orderId=${result.orderId}`);

    // Save to database
    await this.saveEntryOrder({
      orderId: BigInt(result.orderId),
      clientOrderId: result.clientOid,
      exchange: 'BITGET',
      symbol,
      side,
      type,
      quantity: result.size || quantity,
      price: result.price || (price ? price.toString() : undefined),
      status: result.status || 'NEW',
      executedQty: result.fillQty || '0',
      orderTimestamp: Date.now(),
      userId: userId || undefined,
    });

    return {
      success: true,
      userId,
      exchange: 'BITGET',
      orderId: result.orderId,
      clientOrderId: result.clientOid,
      symbol,
      side,
      type,
      quantity: result.size || quantity,
      price: result.price || (price ? price.toString() : undefined),
      status: result.status || 'NEW',
      timestamp: Date.now(),
    };
  }

  /**
   * Place order on Binance (complete flow with TP/SL support)
   */
  // private async placeBinanceOrder(
  //   symbol: string,
  //   side: 'BUY' | 'SELL',
  //   type: 'MARKET' | 'LIMIT',
  //   sizePct: number,
  //   price: number | undefined,
  //   tpLevels: number[],
  //   sl: number,
  //   sizeUsd?: number,
  // ): Promise<any> {
  //   try {
  //     // Get Binance credentials from environment
  //     const apiKey = process.env.BINANCE_API_KEY || '';
  //     const secretKey = process.env.BINANCE_SECRET_KEY || '';

  //     if (!apiKey || !secretKey) {
  //       throw new HttpException(
  //         'Binance credentials not found in environment variables',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     this.logger.log('Using Binance credentials from environment');

  //     let quantity: string;
  //     let estimatedValue: number;

  //     // If sizeUsd is provided, use it directly; otherwise calculate from sizePct
  //     if (sizeUsd && sizeUsd > 0) {
  //       // Get current price to calculate quantity from fixed USD amount
  //       const priceData = await this.binanceService.getSymbolPrice(symbol);
  //       const currentPrice = parseFloat(priceData[0]?.price || '0');

  //       if (currentPrice === 0) {
  //         throw new HttpException('Unable to fetch current price for sizeUsd calculation', HttpStatus.BAD_REQUEST);
  //       }

  //       quantity = (sizeUsd / currentPrice).toString();
  //       estimatedValue = sizeUsd;
  //       this.logger.log(`Using fixed USD amount: $${sizeUsd} at price $${currentPrice} = ${quantity} ${symbol.replace('USDT', '')}`);
  //     } else {
  //       // Calculate order quantity based on portfolio percentage
  //       const calcResult = await this.calculateOrderQuantity(
  //         'env-user',
  //         ExchangeEnum.BINANCE,
  //         symbol,
  //         sizePct,
  //         side,
  //         apiKey,
  //         secretKey,
  //       );
  //       quantity = calcResult.quantity;
  //       estimatedValue = calcResult.estimatedValue;
  //     }

  //     this.logger.log(`Calculated quantity: ${quantity} ${symbol.replace('USDT', '')} (≈ $${estimatedValue.toFixed(6)})`);

  //     // Cancel all open orders before placing MARKET SELL order
  //     if (type === 'MARKET' && side === 'SELL') {
  //       this.logger.log(`🗑️ Canceling all open orders for ${symbol} before MARKET SELL...`);
  //       try {
  //         const canceledOrders = await this.binanceSignedService.cancelAllOrders(symbol, apiKey, secretKey);
  //         this.logger.log(`✅ Canceled ${canceledOrders.length} open orders for ${symbol}`);
  //       } catch (cancelError) {
  //         this.logger.warn(`⚠️ Failed to cancel orders: ${cancelError.message}. Proceeding with order placement...`);
  //       }
  //     }

  //     this.logger.log(`Placing Binance ${type} ${side} order for ${symbol}`);

  //     // Fetch exchange info for precision
  //     const exchangeInfo = await this.binanceSignedService.getExchangeInfo(symbol);
  //     const lotSizeFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
  //     const priceFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
  //     const notionalFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'NOTIONAL');

  //     const stepSize = parseFloat(lotSizeFilter.stepSize);
  //     const tickSize = parseFloat(priceFilter.tickSize);
  //     const minNotional = parseFloat(notionalFilter.minNotional);

  //     const quantityPrecision = this.binanceSignedService.getPrecision(stepSize);
  //     const pricePrecision = this.binanceSignedService.getPrecision(tickSize);

  //     // Round quantity and price to proper precision
  //     const roundedQuantity = parseFloat(quantity).toFixed(quantityPrecision);
  //     const roundedPrice = price ? parseFloat(price.toString()).toFixed(pricePrecision) : undefined;

  //     // Validate minimum requirements
  //     const quantityNum = parseFloat(roundedQuantity);
  //     const priceNum = roundedPrice ? parseFloat(roundedPrice) : 0;
  //     const minQty = parseFloat(lotSizeFilter.minQty);
  //     const maxQty = parseFloat(lotSizeFilter.maxQty);

  //     if (quantityNum < minQty || quantityNum > maxQty) {
  //       throw new HttpException(
  //         `Quantity must be between ${minQty} and ${maxQty}, got ${quantityNum}`,
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }

  //     // Validate notional for LIMIT orders
  //     if (type === 'LIMIT' && priceNum * quantityNum < minNotional) {
  //       throw new HttpException(
  //         `Order value must be at least ${minNotional} USDT, got ${(priceNum * quantityNum).toFixed(8)} USDT`,
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }
  //     console.log("roundedQuantity, roundedPrice inside placeBinaceOrder function inexchagescontrolle.Service", roundedQuantity, roundedPrice);

  //     // For MARKET orders, prefer quoteOrderQty (USDT amount) over quantity
  //     // - BUY market orders: can use quantity OR quoteOrderQty (prefer quoteOrderQty if exchange supports it)
  //     // - SELL market orders: can only use quantity
  //     // For LIMIT orders: only quantity is allowed
  //     const order: any = {
  //       symbol,
  //       side,
  //       type,
  //     };

  //     // Check if quoteOrderQtyMarketAllowed is true for this symbol
  //     const quoteOrderQtyAllowed = exchangeInfo.quoteOrderQtyMarketAllowed || false;

  //     if (type === 'MARKET' && side === 'BUY' && quoteOrderQtyAllowed) {
  //       // Use quoteOrderQty for market BUY orders if supported (amount in USDT)
  //       const quotePrecision = exchangeInfo.quotePrecision || 8;
  //       const roundedQuoteOrderQty = estimatedValue.toFixed(quotePrecision);
  //       order.quoteOrderQty = roundedQuoteOrderQty;
  //       this.logger.log(`Using quoteOrderQty=${roundedQuoteOrderQty} USDT for market BUY order`);
  //     } else {
  //       // Use quantity for:
  //       // - SELL market orders
  //       // - LIMIT orders
  //       // - BUY market orders when quoteOrderQty not supported
  //       order.quantity = roundedQuantity;
  //       this.logger.log(`Using quantity=${roundedQuantity} ${symbol.replace('USDT', '')} for order`);

  //       if (type === 'LIMIT' && roundedPrice) {
  //         order.price = roundedPrice;
  //         order.timeInForce = 'GTC';
  //       }
  //     }

  //     this.logger.log(`Submitting order: ${JSON.stringify(order)}`);

  //     const result = await this.binanceSignedService.placeOrder(order, apiKey, secretKey);
  //     console.log("result after placing order from binanceservice", result);
  //     this.logger.log(`✅ Binance order placed successfully: orderId=${result.orderId}`);

  //     // Save order to database
  //     try {
  //       await this.saveEntryOrder({
  //         orderId: result.orderId,
  //         clientOrderId: result.clientOrderId,
  //         exchange: 'BINANCE',
  //         symbol: result.symbol,
  //         side: result.side,
  //         type: result.type,
  //         quantity: result.origQty,
  //         price: (result.status === 'FILLED' && parseFloat(result.executedQty) > 0 && parseFloat(result.cummulativeQuoteQty) > 0)
  //           ? (parseFloat(result.cummulativeQuoteQty) / parseFloat(result.executedQty)).toString()
  //           : (result.price || '0'),
  //         status: result.status,
  //         executedQty: result.executedQty || '0',
  //         orderTimestamp: result.transactTime,
  //         tpLevels: tpLevels.length > 0 ? tpLevels : undefined,
  //         slPrice: sl || undefined,
  //         note: tpLevels.length > 0 || sl ? 'TP/SL orders will be placed after main order is filled' : undefined,
  //       });
  //     } catch (dbError) {
  //       this.logger.error(`⚠️ Failed to save order to database: ${dbError.message}`);
  //       // Don't fail the entire order placement if DB save fails
  //     }

  //     // =========================================================================
  //     // SLTP MODE CHECK: Skip OCO if SF SLTP manager is active
  //     // Dec 2025: When SLTP_MODE=true or 'stateless', SF app monitors positions
  //     // and sends trigger_type (TP1_HIT, TP2_HIT, SL_HIT) which Graph processes
  //     // via check_sltp_triggers_and_execute() to place SELL orders.
  //     // SLTP_MODE values:
  //     //   - 'stateless': SF SLTP manager controls exits (RECOMMENDED)
  //     //   - 'true': Legacy SF SLTP mode
  //     //   - 'false': Traditional OCO orders on exchange
  //     // CRITICAL FIX: Must check for BOTH 'true' AND 'stateless' modes!
  //     // =========================================================================
  //     const SLTP_MODE_ENABLED = process.env.SLTP_MODE === 'true' || process.env.SLTP_MODE === 'stateless';

  //     // Place OCO orders if order is FILLED and TP/SL are provided AND SLTP_MODE is NOT enabled
  //     if ((tpLevels.length > 0 || sl) && result.status === 'FILLED' && side === 'BUY' && !SLTP_MODE_ENABLED) {
  //       this.logger.log(`🎯 Entry order ${result.orderId} filled immediately at ${result.price}, placing OCO orders...`);
  //       this.logger.log(`   TP levels: [${tpLevels.join(', ')}], SL: ${sl}`);

  //       try {
  //         const filledQty = parseFloat(result.executedQty);
  //         const quoteQty = parseFloat(result.cummulativeQuoteQty);
  //         const avgFillPrice = quoteQty / filledQty;

  //         // Calculate TP and SL prices (with configurable percentages)
  //         const tp1Multiplier = 1 + parseFloat(process.env.TP1_PERCENT || '0.04');
  //         const tp2Multiplier = 1 + parseFloat(process.env.TP2_PERCENT || '0.06');
  //         const slMultiplier = 1 - parseFloat(process.env.SL_PERCENT || '0.05');

  //         const tp1Price = tpLevels[0] || avgFillPrice * tp1Multiplier; // Default +4% if not provided
  //         const tp2Price = tpLevels[1] || avgFillPrice * tp2Multiplier; // Default +6% if not provided
  //         const slPrice = sl || avgFillPrice * slMultiplier; // Default -5% if not provided

  //         // Get exchange info for precision
  //         const exchangeInfo = await this.binanceSignedService.getExchangeInfo(symbol);
  //         const lotSizeFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
  //         const priceFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');

  //         const stepSize = parseFloat(lotSizeFilter.stepSize);
  //         const tickSize = parseFloat(priceFilter.tickSize);

  //         // Align prices to exchange precision
  //         const alignedTp1Price = this.binanceSignedService.alignToTickSize(tp1Price, tickSize);
  //         const alignedTp2Price = this.binanceSignedService.alignToTickSize(tp2Price, tickSize);
  //         const alignedSlPrice = this.binanceSignedService.alignToTickSize(slPrice, tickSize);

  //         // Calculate quantity for first OCO (configurable split of filled quantity, default 50%)
  //         const oco1Split = parseFloat(process.env.OCO1_QUANTITY_PCT || '0.5');
  //         const qty1 = filledQty * oco1Split;
  //         const alignedQty1 = this.binanceSignedService.alignToStepSize(qty1, stepSize);

  //         this.logger.log(`📈 Placing OCO 1: TP=${alignedTp1Price}, SL=${alignedSlPrice}, Qty=${alignedQty1} (${(oco1Split * 100).toFixed(0)}%)`);

  //         // Place first OCO order
  //         const oco1 = await this.binanceSignedService.placeOrderOCO(
  //           {
  //             symbol: symbol,
  //             side: 'SELL',
  //             quantity: alignedQty1.toString(),
  //             aboveType: 'LIMIT_MAKER',
  //             abovePrice: alignedTp1Price.toString(),
  //             belowType: 'STOP_LOSS_LIMIT',
  //             belowPrice: alignedSlPrice.toString(),
  //             belowStopPrice: alignedSlPrice.toString(),
  //             belowTimeInForce: 'GTC',
  //           },
  //           apiKey,
  //           secretKey
  //         );

  //         this.logger.log(`✅ OCO 1 placed successfully! OrderListId: ${oco1.orderListId}`);

  //         // Save OCO 1 orders to database
  //         const order0Price = parseFloat(oco1.orders[0].price || '0');
  //         const order1Price = parseFloat(oco1.orders[1].price || '0');

  //         let tpOrder1, slOrder1;
  //         if (order0Price > order1Price) {
  //           tpOrder1 = oco1.orders[0]; // Higher price = TP
  //           slOrder1 = oco1.orders[1]; // Lower price = SL
  //         } else {
  //           tpOrder1 = oco1.orders[1];
  //           slOrder1 = oco1.orders[0];
  //         }

  //         await this.linkTpSlOrders(result.orderId, 'BINANCE', [
  //           {
  //             orderId: tpOrder1.orderId,
  //             clientOrderId: tpOrder1.clientOrderId,
  //             symbol: symbol,
  //             side: 'SELL',
  //             type: 'LIMIT_MAKER',
  //             price: alignedTp1Price.toString(),
  //             quantity: alignedQty1.toString(),
  //             status: 'NEW',
  //             orderTimestamp: Date.now(),
  //             role: 'TP1' as const,
  //           },
  //           {
  //             orderId: slOrder1.orderId,
  //             clientOrderId: slOrder1.clientOrderId,
  //             symbol: symbol,
  //             side: 'SELL',
  //             type: 'STOP_LOSS_LIMIT',
  //             price: alignedSlPrice.toString(),
  //             quantity: alignedQty1.toString(),
  //             status: 'NEW',
  //             orderTimestamp: Date.now(),
  //             role: 'SL' as const,
  //           },
  //         ]);

  //         this.logger.log(`✅ Saved OCO 1 orders to database`);

  //         // Calculate quantity for second OCO (remaining balance)
  //         const qty2 = filledQty * (1 - oco1Split);
  //         const alignedQty2 = this.binanceSignedService.alignToStepSize(qty2, stepSize);

  //         this.logger.log(`📈 Placing OCO 2: TP=${alignedTp2Price}, SL=${alignedSlPrice}, Qty=${alignedQty2} (remaining balance)`);

  //         // Place second OCO order
  //         const oco2 = await this.binanceSignedService.placeOrderOCO(
  //           {
  //             symbol: symbol,
  //             side: 'SELL',
  //             quantity: alignedQty2.toString(),
  //             aboveType: 'LIMIT_MAKER',
  //             abovePrice: alignedTp2Price.toString(),
  //             belowType: 'STOP_LOSS_LIMIT',
  //             belowPrice: alignedSlPrice.toString(),
  //             belowStopPrice: alignedSlPrice.toString(),
  //             belowTimeInForce: 'GTC',
  //           },
  //           apiKey,
  //           secretKey
  //         );

  //         this.logger.log(`✅ OCO 2 placed successfully! OrderListId: ${oco2.orderListId}`);

  //         // Save OCO 2 orders to database
  //         const order0Price2 = parseFloat(oco2.orders[0].price || '0');
  //         const order1Price2 = parseFloat(oco2.orders[1].price || '0');

  //         let tpOrder2, slOrder2;
  //         if (order0Price2 > order1Price2) {
  //           tpOrder2 = oco2.orders[0];
  //           slOrder2 = oco2.orders[1];
  //         } else {
  //           tpOrder2 = oco2.orders[1];
  //           slOrder2 = oco2.orders[0];
  //         }

  //         await this.linkTpSlOrders(result.orderId, 'BINANCE', [
  //           {
  //             orderId: tpOrder2.orderId,
  //             clientOrderId: tpOrder2.clientOrderId,
  //             symbol: symbol,
  //             side: 'SELL',
  //             type: 'LIMIT_MAKER',
  //             price: alignedTp2Price.toString(),
  //             quantity: alignedQty2.toString(),
  //             status: 'NEW',
  //             orderTimestamp: Date.now(),
  //             role: 'TP2' as const,
  //           },
  //           {
  //             orderId: slOrder2.orderId,
  //             clientOrderId: slOrder2.clientOrderId,
  //             symbol: symbol,
  //             side: 'SELL',
  //             type: 'STOP_LOSS_LIMIT',
  //             price: alignedSlPrice.toString(),
  //             quantity: alignedQty2.toString(),
  //             status: 'NEW',
  //             orderTimestamp: Date.now(),
  //             role: 'SL' as const,
  //           },
  //         ]);

  //         this.logger.log(`✅ Saved OCO 2 orders to database`);
  //         this.logger.log(`🎉 All OCO orders placed successfully for entry order ${result.orderId}`);

  //       } catch (ocoError) {
  //         this.logger.error(`❌ Failed to place OCO orders: ${ocoError.message}`);
  //         // Don't fail the main order if OCO placement fails
  //       }
  //     } else if (SLTP_MODE_ENABLED && (tpLevels.length > 0 || sl) && result.status === 'FILLED' && side === 'BUY') {
  //       // SLTP mode active - SF SLTP manager handles exits
  //       this.logger.log(
  //         `📌 SLTP mode active - Entry ${result.orderId} filled at ${result.price}, ` +
  //         `SF SLTP manager will handle exits (no OCO placed). TP: [${tpLevels.join(', ')}], SL: ${sl}`
  //       );
  //     } else if ((tpLevels.length > 0 || sl) && side === 'BUY') {
  //       this.logger.log(`⚠️ Entry order ${result.orderId} not filled yet (status: ${result.status}). OCO orders will be placed via sync service when filled.`);
  //     }

  //     return {
  //       success: true,
  //       exchange: 'BINANCE',
  //       orderId: result.orderId,
  //       clientOrderId: result.clientOrderId,
  //       symbol: result.symbol,
  //       side: result.side,
  //       type: result.type,
  //       quantity: result.origQty,
  //       price: result.price,
  //       status: result.status,
  //       executedQty: result.executedQty,
  //       timestamp: result.transactTime,
  //       tpLevels: tpLevels.length > 0 ? tpLevels : undefined,
  //       sl: sl || undefined,
  //       note: tpLevels.length > 0 || sl ? 'TP/SL orders will be placed after main order is filled' : undefined,
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error placing Binance order: ${error.message}`);
  //     throw new HttpException(
  //       `Failed to place Binance order: ${error.message}`,
  //       error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  /**
   * Place order on Bitget (complete flow with TP/SL support)
   */
  // private async placeBitgetOrder(
  //   symbol: string,
  //   side: 'BUY' | 'SELL',
  //   type: 'MARKET' | 'LIMIT',
  //   sizePct: number,
  //   price: number | undefined,
  //   tpLevels: number[],
  //   sl: number,
  //   sizeUsd?: number, // Add optional sizeUsd parameter
  // ): Promise<any> {
  //   console.log("inside placeBitgetOrder function of exchangescontroller.service.ts");

  //   try {
  //     // Get Bitget credentials from environment
  //     const apiKey = process.env.BITGET_API_KEY || '';
  //     const secretKey = process.env.BITGET_SECRET_KEY || '';
  //     const passphrase = process.env.BITGET_PASSPHRASE || '';

  //     if (!apiKey || !secretKey || !passphrase) {
  //       throw new HttpException(
  //         'Bitget credentials not found in environment variables',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }

  //     this.logger.log('Using Bitget credentials from environment');

  //     let quantity: string;
  //     let estimatedValue: number;

  //     if (sizeUsd) {
  //       // If sizeUsd is provided, calculate quantity directly from USD amount
  //       if (!price && type === 'LIMIT') {
  //         throw new HttpException('Price is required for limit orders when using sizeUsd', HttpStatus.BAD_REQUEST);
  //       }

  //       const currentPrice = price || parseFloat((await this.bitgetService.getCoinInfo(symbol)).lastPrice);
  //       quantity = (sizeUsd / currentPrice).toString();
  //       estimatedValue = sizeUsd;

  //       this.logger.log(`Using fixed USD amount: $${sizeUsd} at price $${currentPrice} = ${quantity} ${symbol.replace('USDT', '')}`);
  //     } else {
  //       // Calculate order quantity based on portfolio percentage (existing logic)
  //       const result = await this.calculateOrderQuantity(
  //         'env-user',
  //         ExchangeEnum.BITGET,
  //         symbol,
  //         sizePct,
  //         side,
  //         apiKey,
  //         secretKey,
  //         passphrase,
  //       );
  //       quantity = result.quantity;
  //       estimatedValue = result.estimatedValue;

  //       this.logger.log(`Calculated quantity: ${quantity} ${symbol.replace('USDT', '')} (≈ $${estimatedValue.toFixed(2)})`);
  //     }

  //     // Fetch exchange info for validation only (precision handled by order service)
  //     const exchangeInfo = await this.bitgetService.getExchangeInfo(symbol);
  //     const minNotional = parseFloat(exchangeInfo.minTradeUSDT || '1');

  //     // Validate minimum notional for LIMIT orders
  //     if (type === 'LIMIT' && price) {
  //       const notionalValue = parseFloat(price.toString()) * parseFloat(quantity);
  //       this.logger.log(`Order validation: quantity=${quantity}, price=${price}, notional=${notionalValue.toFixed(2)} USDT (min: ${minNotional})`);

  //       if (notionalValue < minNotional) {
  //         throw new HttpException(
  //           `Order value must be at least ${minNotional} USDT, got ${notionalValue.toFixed(2)} USDT`,
  //           HttpStatus.BAD_REQUEST,
  //         );
  //       }
  //     }

  //     // Map parameters to Bitget format (precision applied in order service)
  //     const bitgetOrder: any = {
  //       symbol: symbol,
  //       side: side.toLowerCase() as 'buy' | 'sell', // 'BUY' -> 'buy', 'SELL' -> 'sell'
  //       orderType: type.toLowerCase() as 'market' | 'limit', // 'MARKET' -> 'market', 'LIMIT' -> 'limit'
  //       force: 'gtc' as const, // Good 'til canceled
  //     };

  //     // Cancel all open orders before placing MARKET SELL order
  //     if (type === 'MARKET' && side === 'SELL') {
  //       this.logger.log(`🗑️ Canceling all open orders for ${symbol} before MARKET SELL...`);
  //       try {

  //         await this.bitgetOrderService.cancelAllOrdersBySymbol(symbol);
  //         this.logger.log(`✅ Initiated cancellation of all open orders for ${symbol}`);
  //         // Wait a moment for cancellations to process
  //         await new Promise(resolve => setTimeout(resolve, 500));
  //       } catch (cancelError) {
  //         this.logger.warn(`⚠️ Failed to cancel orders: ${cancelError.message}. Proceeding with order placement...`);
  //       }
  //     }

  //     // For market BUY orders: size is in quote currency (USDT)
  //     // For market SELL and LIMIT orders: size is in base currency (AIA tokens)
  //     if (type === 'MARKET' && side === 'BUY') {
  //       // Market BUY: use estimatedValue (USDT amount)
  //       bitgetOrder.size = estimatedValue.toString();
  //       this.logger.log(`Market BUY: Using quote currency size = $${estimatedValue} USDT`);
  //     } else {
  //       // Market SELL or LIMIT orders: use quantity (base currency)
  //       bitgetOrder.size = quantity;
  //       this.logger.log(`${type} ${side}: Using base currency size = ${quantity} ${symbol.replace('USDT', '')}`);
  //     }

  //     // Add price for limit orders
  //     if (type === 'LIMIT' && price) {
  //       bitgetOrder.price = price.toString();
  //     }

  //     console.log("request to place order to bitget service:", bitgetOrder);
  //     this.logger.log(`Placing Bitget ${type} ${side} order for ${symbol}`);
  //     this.logger.log(`Order details: ${JSON.stringify(bitgetOrder)}`);

  //     // Place the order using Bitget service
  //     const result = await this.bitgetOrderService.placeSpotOrder(bitgetOrder);
  //     this.logger.log(`✅ Bitget order placed successfully: ${JSON.stringify(result)}`);

  //     // TODO: Implement TP/SL orders after main order is filled
  //     if (tpLevels.length > 1 || sl) {
  //       this.logger.log(`⚠️ Multiple TP levels or SL not fully implemented yet. TP levels: [${tpLevels.join(', ')}], SL: ${sl}`);
  //     }

  //     return {
  //       success: true,
  //       exchange: 'BITGET',
  //       orderId: result.orderId,
  //       clientOrderId: result.clientOid,
  //       symbol: symbol,
  //       side: side,
  //       type: type,
  //       quantity: result.size || quantity,
  //       price: result.price || (price ? price.toString() : undefined),
  //       status: result.status || 'NEW',
  //       executedQty: result.fillQty || '0',
  //       timestamp: Date.now(),
  //       tpLevels: tpLevels.length > 0 ? tpLevels : undefined,
  //       sl: sl || undefined,
  //       note: tpLevels.length > 0 || sl ? 'TP/SL orders will be placed after main order is filled' : undefined,
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error placing Bitget order: ${error.message}`);
  //     throw new HttpException(
  //       `Failed to place Bitget order: ${error.message}`,
  //       error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }



  /**
   * Cancel order on specified exchange
   * Routes to appropriate exchange service (Binance, Bitget, etc.)
   */
  async cancelOrder(exchange: string, symbol: string, orderId: string): Promise<any> {
    const exchangeUpper = exchange.toUpperCase();

    this.logger.log(`Canceling order ${orderId} for ${symbol} on ${exchangeUpper}`);

    try {
      // Route to appropriate exchange handler
      switch (exchangeUpper) {
        case ExchangeEnum.BINANCE: {
          const apiKey = process.env.BINANCE_API_KEY || '';
          const secretKey = process.env.BINANCE_SECRET_KEY || '';

          if (!apiKey || !secretKey) {
            throw new HttpException(
              'Binance credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
          this.logger.log('Canceling Binance order using environment credentials');
          const result = await this.binanceSignedService.cancelOrder(symbol, Number(orderId), apiKey, secretKey);
          this.logger.log(`✅ Binance order ${orderId} canceled successfully`);
          return result;
        }

        case ExchangeEnum.BITGET: {
          const apiKey = process.env.BITGET_API_KEY || '';
          const secretKey = process.env.BITGET_SECRET_KEY || '';
          const passphrase = process.env.BITGET_PASSPHRASE || '';

          if (!apiKey || !secretKey || !passphrase) {
            throw new HttpException(
              'Bitget credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          this.logger.log('Canceling Bitget order using environment credentials');
          const result = await this.bitgetOrderService.cancelOrder(symbol, orderId);
          this.logger.log(`✅ Bitget order ${orderId} canceled successfully`);
          return result;
        }

        default:
          throw new HttpException(
            `Exchange ${exchange} not supported yet`,
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.error(`Error canceling order on ${exchangeUpper}: ${error.message}`);
      throw error;
    }
  }



  /**
   * Get open orders for specified exchange
   * Routes to appropriate exchange service (Binance, Bitget, etc.)
   */
  async getOpenOrders(exchange: string, symbol?: string): Promise<any> {
    const exchangeUpper = exchange.toUpperCase();

    this.logger.log(`Fetching open orders from ${exchangeUpper}${symbol ? ` for ${symbol}` : ''}`);

    try {
      // Route to appropriate exchange handler
      switch (exchangeUpper) {
        case ExchangeEnum.BINANCE: {
          const apiKey = process.env.BINANCE_API_KEY || '';
          const secretKey = process.env.BINANCE_SECRET_KEY || '';

          if (!apiKey || !secretKey) {
            throw new HttpException(
              'Binance credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          this.logger.log('Fetching Binance open orders using environment credentials');
          const orders = await this.binanceSignedService.getOpenOrders(symbol, apiKey, secretKey);
          this.logger.log(`✅ Binance open orders fetched successfully: ${orders.length} orders found`);

          // Normalize Binance orders to unified format
          const normalizedOrders = orders.map(order => normalizeBinanceOrder(order));
          return normalizedOrders;
        }

        case ExchangeEnum.BITGET: {
          const apiKey = process.env.BITGET_API_KEY || '';
          const secretKey = process.env.BITGET_SECRET_KEY || '';
          const passphrase = process.env.BITGET_PASSPHRASE || '';

          if (!apiKey || !secretKey || !passphrase) {
            throw new HttpException(
              'Bitget credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          this.logger.log('Fetching Bitget open orders using environment credentials');

          // Fetch both normal orders and TP/SL orders
          const [normalOrders, tpslOrders] = await Promise.all([
            this.bitgetOrderService.getUnfilledOrders(symbol, 'normal'),
            this.bitgetOrderService.getUnfilledOrders(symbol, 'tpsl')
          ]);

          // Combine all orders
          const allOrders = [
            ...(normalOrders || []),
            ...(tpslOrders || [])
          ];

          this.logger.log(`✅ Bitget open orders fetched successfully: ${allOrders.length} orders found (${normalOrders?.length || 0} normal, ${tpslOrders?.length || 0} TP/SL)`);

          // Normalize Bitget orders to unified format
          const normalizedOrders = allOrders.map(order => normalizeBitgetOrder(order));
          return normalizedOrders;
        }

        default:
          throw new HttpException(
            `Exchange ${exchange} not supported yet`,
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.error(`Error fetching open orders from ${exchangeUpper}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel all open orders on a symbol for specified exchange
   * Routes to appropriate exchange service (Binance, Bitget, etc.)
   */
  async cancelAllOrders(exchange: string, symbol: string): Promise<any> {
    const exchangeUpper = exchange.toUpperCase();

    if (!symbol) {
      throw new HttpException('Symbol parameter is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Canceling all open orders for ${symbol} on ${exchangeUpper}`);

    try {
      // Route to appropriate exchange handler
      switch (exchangeUpper) {
        case ExchangeEnum.BINANCE: {
          const apiKey = process.env.BINANCE_API_KEY || '';
          const secretKey = process.env.BINANCE_SECRET_KEY || '';

          if (!apiKey || !secretKey) {
            throw new HttpException(
              'Binance credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          this.logger.log(`Using Binance credentials from environment`);
          const canceledOrders = await this.binanceSignedService.cancelAllOrders(symbol, apiKey, secretKey);

          // Normalize canceled orders
          const normalizedCanceledOrders = canceledOrders.map((order: any) => normalizeBinanceOrder(order));

          this.logger.log(`✅ Canceled ${normalizedCanceledOrders.length} open orders for ${symbol} on Binance`);
          return {
            success: true,
            exchange: 'BINANCE',
            symbol: symbol,
            totalCanceled: normalizedCanceledOrders.length,
            orders: normalizedCanceledOrders,
          };
        }

        case ExchangeEnum.BITGET: {
          const apiKey = process.env.BITGET_API_KEY || '';
          const secretKey = process.env.BITGET_SECRET_KEY || '';
          const passphrase = process.env.BITGET_PASSPHRASE || '';

          if (!apiKey || !secretKey || !passphrase) {
            throw new HttpException(
              'Bitget credentials not found in environment variables',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }

          this.logger.log(`Using Bitget credentials from environment`);
          const result = await this.bitgetOrderService.cancelAllOrdersBySymbol(symbol);

          this.logger.log(`✅ Initiated cancellation of all orders for ${symbol} on Bitget (asynchronous)`);
          return {
            success: true,
            exchange: 'BITGET',
            symbol: symbol,
            note: 'Cancellation executed asynchronously. Use /exchanges/open-orders to verify completion.',
            result: result,
          };
        }

        default:
          throw new HttpException(
            `Exchange ${exchange} not supported yet`,
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      this.logger.error(`Error canceling all orders on ${exchangeUpper}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all trades with PnL calculations for a specific user
   * Groups orders by order_group_id and calculates realized/unrealized PnL
   * OPTIMIZED: Uses single query with joins and batched price fetching
   * @param userId - User ID to filter orders by
   * @param exchange - Optional exchange filter
   * @param symbol - Optional symbol filter
   */
  async getTradesWithPnL(userId: string, exchange?: string, symbol?: string) {
    try {
      const startTime = Date.now();

      // Build query conditions - always filter by userId
      const whereConditions: any = {
        userId: userId, // Filter by user ID
      };
      if (exchange) whereConditions.exchange = exchange;
      if (symbol) whereConditions.symbol = symbol;

      // OPTIMIZATION: Fetch ALL orders in ONE query (both entry and exit orders)
      // This eliminates N+1 query problem
      const allOrders = await this.orderRepository.find({
        where: whereConditions,
        order: { createdAt: 'DESC' }
      });

      // Group orders by orderGroupId
      const orderGroups = new Map<string, any[]>();
      for (const order of allOrders) {
        if (!order.orderGroupId) continue;

        if (!orderGroups.has(order.orderGroupId)) {
          orderGroups.set(order.orderGroupId, []);
        }
        const group = orderGroups.get(order.orderGroupId);
        if (group) {
          group.push(order);
        }
      }

      // OPTIMIZATION: Collect unique symbols for batch price fetching
      const uniqueSymbols = new Map<string, { exchange: string; symbol: string }>();
      for (const [groupId, orders] of orderGroups) {
        const entryOrder = orders.find(o => o.orderRole === 'ENTRY');
        if (entryOrder) {
          const key = `${entryOrder.exchange}:${entryOrder.symbol}`;
          uniqueSymbols.set(key, { exchange: entryOrder.exchange, symbol: entryOrder.symbol });
        }
      }

      // OPTIMIZATION: Batch fetch all market prices at once
      const priceCache = new Map<string, number>();
      const pricePromises = Array.from(uniqueSymbols.values()).map(async ({ exchange, symbol }) => {
        try {
          let price = 0;
          if (exchange === 'BINANCE') {
            const priceData = await this.binanceService.getSymbolPrice(symbol);
            price = parseFloat(priceData[0]?.price || '0');
          } else if (exchange === 'BITGET') {
            const coinInfo = await this.bitgetService.getCoinInfo(symbol);
            price = parseFloat(coinInfo.lastPrice || '0');
          }
          priceCache.set(`${exchange}:${symbol}`, price);
        } catch (error) {
          this.logger.warn(`⚠️ Could not fetch price for ${symbol} on ${exchange}`);
          priceCache.set(`${exchange}:${symbol}`, 0);
        }
      });

      await Promise.all(pricePromises);

      const trades: any[] = [];

      // Process each order group
      for (const [groupId, orders] of orderGroups) {
        const entryOrder = orders.find(o => o.orderRole === 'ENTRY');
        if (!entryOrder) continue;

        const exitOrders = orders.filter(o => o.orderRole !== 'ENTRY');

        // Calculate PnL
        const entryPrice = parseFloat(entryOrder.price || '0');
        const entryQty = parseFloat(entryOrder.executedQty || entryOrder.quantity);
        const entryCost = entryPrice * entryQty;

        let totalSellProceeds = 0;
        let realizedQty = 0;
        let hasDataIntegrityIssue = false; // Flag for impossible trades

        // Check if there's a manual sell order FIRST (before filtering)
        const hasManualSell = exitOrders.some(exit => exit.orderRole === 'MANUAL_SELL' && exit.status === 'FILLED');

        // Filter: Exclude CANCELED orders, but KEEP open (NEW) and filled orders
        const visibleExitOrders = exitOrders.filter(exit =>
          exit.status !== 'CANCELED' && exit.status !== 'EXPIRED'
        );

        const exitOrdersData = visibleExitOrders.map(exit => {
          const exitQty = parseFloat(exit.executedQty || '0');
          const exitPrice = parseFloat(exit.price || '0');

          if (exit.status === 'FILLED' && exitQty > 0) {
            totalSellProceeds += exitPrice * exitQty;
            realizedQty += exitQty;
          }

          return {
            orderId: exit.orderId,
            role: exit.orderRole,
            type: exit.type,
            quantity: parseFloat(exit.quantity),
            executedQty: exitQty,
            price: exitPrice,
            status: exit.status,
            filledAt: exit.filledTimestamp,
            createdAt: exit.createdAt,
            updatedAt: exit.updatedAt
          };
        });

        // =========================================================================
        // DATA INTEGRITY CHECK (Jan 2026 - CRITICAL FIX for ARUSDT bug)
        // =========================================================================
        // Detect impossible scenarios where exit qty > entry qty
        // This can happen due to:
        // 1. Double SL execution (race condition)
        // 2. Exit orders incorrectly linked to wrong entry
        // 3. Database corruption
        // =========================================================================
        if (realizedQty > entryQty * 1.01) { // Allow 1% tolerance for dust/fees
          this.logger.error(
            `🚨 DATA INTEGRITY ERROR: Trade ${groupId} (${entryOrder.symbol}) ` +
            `has EXIT qty (${realizedQty.toFixed(4)}) > ENTRY qty (${entryQty.toFixed(4)})! ` +
            `This is IMPOSSIBLE and indicates double-selling or wrong order linking.`
          );
          hasDataIntegrityIssue = true;

          // Cap realizedQty at entryQty to prevent phantom profits
          // But keep totalSellProceeds as calculated (shows actual revenue)
          // This will result in a PnL that reflects what actually happened
          const excessQty = realizedQty - entryQty;
          this.logger.warn(
            `   Capping realizedQty from ${realizedQty.toFixed(4)} to ${entryQty.toFixed(4)} ` +
            `(excess: ${excessQty.toFixed(4)}). PnL may be incorrect - manual review needed.`
          );
          realizedQty = entryQty;
        }

        // Calculate remaining quantity
        let unrealizedQty = Math.max(0, entryQty - realizedQty);

        // Get current market price from cache
        const priceKey = `${entryOrder.exchange}:${entryOrder.symbol}`;
        const currentMarketPrice = priceCache.get(priceKey) || entryPrice;

        // Calculate dust value in USDT
        const DUST_THRESHOLD_USDT = 1.0;
        const dustValueUsdt = unrealizedQty * currentMarketPrice;
        const isDustOnly = dustValueUsdt < DUST_THRESHOLD_USDT;

        // Determine if trade is complete
        const allOrdersClosed = exitOrders.every(o =>
          o.status === 'FILLED' || o.status === 'EXPIRED' || o.status === 'CANCELED'
        );
        const isComplete = hasManualSell || (allOrdersClosed && isDustOnly);

        // Calculate PnL based on trade completion status
        let realizedPnl = 0;
        let unrealizedPnl = 0;

        if (isComplete) {
          realizedPnl = totalSellProceeds - entryCost;
          unrealizedQty = 0;
          unrealizedPnl = 0;
        } else {
          const proportionalEntryCost = realizedQty * entryPrice;
          realizedPnl = totalSellProceeds - proportionalEntryCost;

          if (unrealizedQty > 0 && currentMarketPrice > 0) {
            unrealizedPnl = (currentMarketPrice - entryPrice) * unrealizedQty;
          }
        }

        const totalPnl = realizedPnl + unrealizedPnl;
        const realizedPercent = entryCost > 0 ? (realizedPnl / entryCost) * 100 : 0;
        const unrealizedPercent = entryCost > 0 ? (unrealizedPnl / entryCost) * 100 : 0;
        const totalPercent = entryCost > 0 ? (totalPnl / entryCost) * 100 : 0;

        trades.push({
          tradeId: entryOrder.orderGroupId,
          entryOrder: {
            orderId: entryOrder.orderId,
            symbol: entryOrder.symbol,
            exchange: entryOrder.exchange,
            side: entryOrder.side,
            type: entryOrder.type,
            quantity: parseFloat(entryOrder.quantity),
            executedQty: entryQty,
            price: entryPrice,
            status: entryOrder.status,
            filledAt: entryOrder.filledTimestamp,
            createdAt: entryOrder.createdAt
          },
          exitOrders: exitOrdersData,
          pnl: {
            realized: parseFloat(realizedPnl.toFixed(8)),
            unrealized: parseFloat(unrealizedPnl.toFixed(8)),
            total: parseFloat(totalPnl.toFixed(8)),
            realizedPercent: parseFloat(realizedPercent.toFixed(4)),
            unrealizedPercent: parseFloat(unrealizedPercent.toFixed(4)),
            totalPercent: parseFloat(totalPercent.toFixed(4)),
            entryCost: parseFloat(entryCost.toFixed(8)),
            realizedQty,
            unrealizedQty: parseFloat(unrealizedQty.toFixed(8)),
            currentMarketPrice: currentMarketPrice > 0 ? parseFloat(currentMarketPrice.toFixed(8)) : null,
            isComplete,
            // DATA INTEGRITY FLAGS (Jan 2026)
            hasDataIntegrityIssue,
            ...(hasDataIntegrityIssue && {
              warning: 'CRITICAL: Exit qty exceeded entry qty. PnL values are capped and may be incorrect.',
              rawExitQty: visibleExitOrders.filter(e => e.status === 'FILLED').reduce(
                (sum, e) => sum + parseFloat(e.executedQty || '0'), 0
              )
            })
          }
        });
      }

      // Calculate summary
      const totalRealizedPnl = trades.reduce((sum, t) => sum + t.pnl.realized, 0);
      const totalUnrealizedPnl = trades.reduce((sum, t) => sum + t.pnl.unrealized, 0);
      const completedTrades = trades.filter(t => t.pnl.isComplete).length;
      const activeTrades = trades.filter(t => !t.pnl.isComplete).length;

      const duration = Date.now() - startTime;
      this.logger.log(`⚡ Trades fetched in ${duration}ms (${trades.length} trades, ${uniqueSymbols.size} symbols)`);

      return {
        trades,
        summary: {
          totalTrades: trades.length,
          completedTrades,
          activeTrades,
          totalRealizedPnl: parseFloat(totalRealizedPnl.toFixed(8)),
          totalUnrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(8)),
          totalPnl: parseFloat((totalRealizedPnl + totalUnrealizedPnl).toFixed(8))
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching trades with PnL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get account balance for specified exchange (Aggregated across all active users)
   * Returns array of assets with detailed balance info
   */
  async getBalance(exchange: string): Promise<any[]> {
    try {
      this.logger.log(`💰 Fetching aggregated balance for ${exchange}...`);

      // 1. Get all active credentials for this exchange
      const dbCredentials = (await this.apiCredentialsService.getActiveTradingCredentials())
        .filter(cred => cred.exchange.toLowerCase() === exchange.toLowerCase());

      const activeCredentials = [...dbCredentials];

      // FIX (Dec 30, 2025): Fallback to ENV details if no DB users found (Single-User Stability)
      if (activeCredentials.length === 0 && exchange.toLowerCase() === 'binance') {
        this.logger.warn(`⚠️ Balance: No DB users found for ${exchange}. Using ENV credentials fallback.`);
        activeCredentials.push({
          userId: 'env-default',
          exchange: 'BINANCE',
          apiKey: undefined,     // getBalances() will use ConfigService
          secretKey: undefined,  // getBalances() will use ConfigService
          passphrase: undefined,
          id: 'env',
          accountName: 'Env Default',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        } as any);
      }

      if (activeCredentials.length === 0) {
        this.logger.warn(`⚠️ No active trading users found for ${exchange}. Returning empty balance.`);
        return [];
      }

      // 2. Fetch balances for each user in parallel
      const balancePromises = activeCredentials.map(async (cred) => {
        try {
          if (exchange.toLowerCase() === 'binance') {
            const userBalances = await this.binanceSignedService.getBalances(cred.apiKey, cred.secretKey);
            return userBalances.map(b => ({
              symbol: b.asset,
              free: parseFloat(b.free),
              locked: parseFloat(b.locked),
              exchange: 'BINANCE'
            }));
          } else if (exchange.toLowerCase() === 'bitget') {
            const userBalances = await this.bitgetAccountService.getSpotAccount(cred.apiKey, cred.secretKey, cred.passphrase);
            return userBalances.map(b => ({
              symbol: b.coin,
              free: parseFloat(b.available),
              locked: parseFloat(b.frozen),
              exchange: 'BITGET'
            }));
          }
          return [];
        } catch (error) {
          this.logger.error(`❌ Failed to fetch balance for user ${cred.userId}: ${error.message}`);
          return [];
        }
      });

      const results = await Promise.all(balancePromises);

      // 3. Aggregate balances by symbol
      const aggregatedBalances: Record<string, { symbol: string, free: number, locked: number, total: number }> = {};

      for (const userResult of results) {
        for (const item of userResult) {
          if (!aggregatedBalances[item.symbol]) {
            aggregatedBalances[item.symbol] = {
              symbol: item.symbol,
              free: 0,
              locked: 0,
              total: 0
            };
          }
          aggregatedBalances[item.symbol].free += item.free;
          aggregatedBalances[item.symbol].locked += item.locked;
          aggregatedBalances[item.symbol].total += (item.free + item.locked);
        }
      }

      // 4. Filter out zero balances and format return
      const finalBalances = Object.values(aggregatedBalances)
        .filter(b => b.total > 0)
        .map(b => ({
          ...b,
          valueUsd: 0,
          total: parseFloat(b.total.toFixed(8))
        }));

      this.logger.log(`✅ Aggregated balance fetched: ${finalBalances.length} assets with non-zero balance.`);
      return finalBalances;

    } catch (error) {
      this.logger.error(`Error in getBalance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get open positions for specified exchange (Aggregated across all active users)
   * 
   * ENHANCED (Jan 2026): Now includes entry_price calculated from trade history!
   * This fixes the root cause of manual buy positions having $0 entry price.
   */
  async getOpenPositions(exchange: string): Promise<any[]> {
    try {
      // Reuse getBalance logic to get raw holdings
      const balances = await this.getBalance(exchange);

      const enrichedPositions: any[] = [];

      for (const balance of balances) {
        // Skip small dust or USDT itself if we want just "positions"
        if (balance.symbol === 'USDT' || balance.symbol === 'USDC' || balance.symbol === 'FDUSD') {
          continue;
        }

        try {
          // Get current price
          let price = 0;
          const pair = `${balance.symbol}USDT`;
          if (exchange.toLowerCase() === 'binance') {
            const priceData = await this.binanceService.getSymbolPrice(pair);
            price = parseFloat(priceData[0]?.price || '0');
          } else if (exchange.toLowerCase() === 'bitget') {
            const coinInfo = await this.bitgetService.getCoinInfo(pair);
            price = parseFloat(coinInfo.lastPrice || '0');
          }

          if (price > 0) {
            const valueUsd = balance.total * price;
            if (valueUsd > 1.0) { // Only show positions worth > $1

              // =============================================================
              // PRINCIPAL-LEVEL FIX (Jan 19, 2026): Trade Boundary Isolation
              // =============================================================
              // Previous bug: VWAP was calculated across ALL historical trades,
              // causing entry_price to be contaminated with old closed positions.
              //
              // FIX: Only calculate VWAP from trades AFTER the last full exit.
              // This isolates the CURRENT trade's entry price.
              // =============================================================
              let entryPrice = 0;
              let entryTimestamp: Date | null = null;

              try {
                if (exchange.toLowerCase() === 'binance') {
                  // STEP 1: Find the last SELL trade (potential position close)
                  const trades = await this.binanceSignedService.getMyTrades(pair, 100);
                  
                  if (trades && trades.length > 0) {
                    // Sort by time descending to find latest first
                    const sortedTrades = [...trades].sort((a, b) => b.time - a.time);
                    
                    // STEP 2: Find trade boundary (last SELL trade)
                    // The current position started AFTER the last sell
                    let tradeBoundary: number | null = null;
                    let lastSellQty = 0;
                    
                    for (const trade of sortedTrades) {
                      if (!trade.isBuyer) {
                        // This is a SELL trade - potential position close
                        tradeBoundary = trade.time;
                        lastSellQty += parseFloat(trade.qty || '0');
                        break; // Only need the most recent sell
                      }
                    }
                    
                    // STEP 3: Calculate VWAP only for BUY trades AFTER the boundary
                    let totalCost = 0;
                    let totalQty = 0;
                    let earliestBuyTime: Date | null = null;

                    for (const trade of sortedTrades) {
                      // Skip trades before the boundary (from previous position)
                      if (tradeBoundary && trade.time <= tradeBoundary) {
                        continue;
                      }
                      
                      if (trade.isBuyer) {
                        const qty = parseFloat(trade.qty || '0');
                        const tradePrice = parseFloat(trade.price || '0');
                        totalCost += qty * tradePrice;
                        totalQty += qty;

                        const tradeTime = new Date(trade.time);
                        if (!earliestBuyTime || tradeTime < earliestBuyTime) {
                          earliestBuyTime = tradeTime;
                        }
                      }
                    }

                    if (totalQty > 0) {
                      entryPrice = totalCost / totalQty;  // VWAP of CURRENT trade only
                      entryTimestamp = earliestBuyTime;
                      this.logger.debug(
                        `📊 ${pair}: Entry VWAP $${entryPrice.toFixed(6)} from ${totalQty.toFixed(6)} qty ` +
                        `(trade-boundary-isolated${tradeBoundary ? `, boundary=${new Date(tradeBoundary).toISOString()}` : ''})`
                      );
                    } else if (tradeBoundary === null) {
                      // No sells found - all trades belong to current position
                      // Fall back to full VWAP
                      for (const trade of sortedTrades) {
                        if (trade.isBuyer) {
                          const qty = parseFloat(trade.qty || '0');
                          const tradePrice = parseFloat(trade.price || '0');
                          totalCost += qty * tradePrice;
                          totalQty += qty;
                          
                          const tradeTime = new Date(trade.time);
                          if (!earliestBuyTime || tradeTime < earliestBuyTime) {
                            earliestBuyTime = tradeTime;
                          }
                        }
                      }
                      if (totalQty > 0) {
                        entryPrice = totalCost / totalQty;
                        entryTimestamp = earliestBuyTime;
                        this.logger.debug(`📊 ${pair}: Entry VWAP $${entryPrice.toFixed(6)} (no prior sells)`);
                      }
                    }
                  }
                }
                // TODO: Add Bitget trade history lookup if needed
              } catch (tradeError) {
                this.logger.warn(`⚠️ Could not fetch trade history for ${pair}: ${tradeError.message}`);
                // Fallback: use current price as entry (better than 0)
                entryPrice = price;
              }

              // If no trades found, use current price as fallback
              if (entryPrice === 0) {
                entryPrice = price;
                this.logger.debug(`📊 ${pair}: No trade history, using current price as entry`);
              }

              enrichedPositions.push({
                symbol: pair,
                baseAsset: balance.symbol,
                quantity: balance.total,
                free: balance.free,
                locked: balance.locked,
                valueUsd: parseFloat(valueUsd.toFixed(2)),
                price: price,
                // NEW FIELDS: Entry price data for SLTP
                current_price: price,
                entry_price: entryPrice,
                entry_timestamp: entryTimestamp?.toISOString() || null,
                pnl_pct: entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0
              });
            }
          }
        } catch (e) {
          // Ignore price fetch errors for obscure coins
        }
      }

      this.logger.log(`✅ Open positions fetched: ${enrichedPositions.length} positions > $1 (with entry prices)`);
      return enrichedPositions;

    } catch (error) {
      this.logger.error(`Error in getOpenPositions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get open entry orders from database for position reconciliation.
   * 
   * =========================================================================
   * PRINCIPAL-LEVEL FIX (Jan 19, 2026): Trade Boundary Isolation
   * =========================================================================
   * Previous bug: Returned ALL historical FILLED BUY orders across ALL time,
   * causing 90 orders to be returned for 3 actual positions. This led to
   * incorrect entry_price calculations using historical data.
   * 
   * FIX: Only return the MOST RECENT entry order per symbol that doesn't have
   * a FULL EXIT (100% quantity sold). This isolates the current trade.
   * =========================================================================
   * 
   * Returns FILLED BUY orders that:
   * 1. Have orderRole = 'ENTRY' and status = 'FILLED'
   * 2. Are the MOST RECENT entry for that symbol
   * 3. Don't have EXIT orders that fully close the position
   * 
   * Used by Graph reconciliation to identify positions WE created vs manual buys.
   */
  async getOpenEntryOrders(exchange: string): Promise<any[]> {
    try {
      this.logger.log(`📊 Fetching open entry orders for reconciliation (${exchange})...`);

      // =====================================================================
      // STEP 1: Get the MOST RECENT filled entry order per symbol
      // =====================================================================
      // This ensures we only look at the CURRENT trade, not historical ones
      const latestEntryQuery = await this.orderRepository
        .createQueryBuilder('entry')
        .select('entry.symbol', 'symbol')
        .addSelect('MAX(entry.filledTimestamp)', 'maxFilledTimestamp')
        .where('entry.exchange = :exchange', { exchange: exchange.toUpperCase() })
        .andWhere('entry.orderRole = :role', { role: 'ENTRY' })
        .andWhere('entry.status = :status', { status: 'FILLED' })
        .andWhere('entry.side = :side', { side: 'BUY' })
        .groupBy('entry.symbol')
        .getRawMany();

      // Build map of symbol -> latest entry timestamp
      const latestEntryBySymbol: Map<string, Date> = new Map();
      for (const row of latestEntryQuery) {
        if (row.symbol && row.maxFilledTimestamp) {
          latestEntryBySymbol.set(row.symbol, new Date(row.maxFilledTimestamp));
        }
      }

      if (latestEntryBySymbol.size === 0) {
        this.logger.log(`📊 No filled entry orders found for ${exchange}`);
        return [];
      }

      // =====================================================================
      // STEP 2: For each symbol, get the CURRENT trade's entry orders
      // =====================================================================
      // Only get entry orders from the CURRENT trade (after the last full exit)
      const openEntries: any[] = [];

      for (const [symbol, latestEntryTime] of latestEntryBySymbol) {
        // Find the last FULL EXIT for this symbol (if any)
        // A full exit is when we sold everything after a buy
        const lastFullExit = await this.orderRepository
          .createQueryBuilder('exit')
          .where('exit.exchange = :exchange', { exchange: exchange.toUpperCase() })
          .andWhere('exit.symbol = :symbol', { symbol })
          .andWhere('exit.orderRole = :role', { role: 'EXIT' })
          .andWhere('exit.status = :status', { status: 'FILLED' })
          .andWhere('exit.side = :side', { side: 'SELL' })
          .orderBy('exit.filledTimestamp', 'DESC')
          .getOne();

        // Determine the trade boundary (start time of current trade)
        // Current trade starts AFTER the last full exit, or from the beginning if no exits
        let tradeBoundary: Date | null = null;
        if (lastFullExit && lastFullExit.filledTimestamp) {
          tradeBoundary = new Date(lastFullExit.filledTimestamp);
        }

        // Get entry orders for this symbol AFTER the trade boundary
        let entryQuery = this.orderRepository
          .createQueryBuilder('entry')
          .where('entry.exchange = :exchange', { exchange: exchange.toUpperCase() })
          .andWhere('entry.symbol = :symbol', { symbol })
          .andWhere('entry.orderRole = :role', { role: 'ENTRY' })
          .andWhere('entry.status = :status', { status: 'FILLED' })
          .andWhere('entry.side = :side', { side: 'BUY' });

        if (tradeBoundary) {
          entryQuery = entryQuery.andWhere('entry.filledTimestamp > :boundary', { boundary: tradeBoundary });
        }

        const currentTradeEntries = await entryQuery
          .orderBy('entry.filledTimestamp', 'DESC')
          .getMany();

        // Get exit orders AFTER the trade boundary too
        let exitQuery = this.orderRepository
          .createQueryBuilder('exit')
          .where('exit.exchange = :exchange', { exchange: exchange.toUpperCase() })
          .andWhere('exit.symbol = :symbol', { symbol })
          .andWhere('exit.orderRole = :role', { role: 'EXIT' })
          .andWhere('exit.status = :status', { status: 'FILLED' })
          .andWhere('exit.side = :side', { side: 'SELL' });

        if (tradeBoundary) {
          exitQuery = exitQuery.andWhere('exit.filledTimestamp > :boundary', { boundary: tradeBoundary });
        }

        const currentTradeExits = await exitQuery.getMany();

        // Calculate net position for CURRENT trade only
        let totalEntryQty = 0;
        let latestEntry: any = null;

        for (const entry of currentTradeEntries) {
          totalEntryQty += parseFloat(entry.quantity || '0');
          if (!latestEntry) {
            latestEntry = entry; // First one is most recent (DESC order)
          }
        }

        let totalExitQty = 0;
        for (const exit of currentTradeExits) {
          totalExitQty += parseFloat(exit.quantity || '0');
        }

        const remainingQty = totalEntryQty - totalExitQty;

        if (remainingQty > 0.000001 && latestEntry) {
          openEntries.push({
            symbol: latestEntry.symbol,
            orderId: latestEntry.orderId,
            // CRITICAL: Use the actual FILL PRICE from the order, not VWAP
            price: latestEntry.price,
            entry_price: parseFloat(latestEntry.price || '0'),
            quantity: remainingQty.toString(),
            originalQuantity: totalEntryQty.toString(),
            filledTimestamp: latestEntry.filledTimestamp,
            filled_timestamp: latestEntry.filledTimestamp,
            userId: latestEntry.userId,
            exchange: latestEntry.exchange,
            // Trade boundary info for debugging
            _trade_boundary: tradeBoundary?.toISOString() || null,
            _current_trade_entries: currentTradeEntries.length,
            _current_trade_exits: currentTradeExits.length
          });
        }
      }

      this.logger.log(`✅ Found ${openEntries.length} open entry orders for reconciliation (trade-boundary-isolated)`);
      return openEntries;

    } catch (error) {
      this.logger.error(`Error in getOpenEntryOrders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Binance trade history for a specific symbol (for entry price recovery)
   * Used by orchestrator to get actual entry prices for orphan positions
   */
  async getBinanceTradesForSymbol(
    symbol: string,
    limit: number = 50,
    apiKey: string,
    secretKey: string
  ): Promise<any[]> {
    try {
      this.logger.log(`📜 Fetching ${limit} trades for ${symbol}...`);

      const trades = await this.binanceSignedService.getMyTrades(
        symbol,
        limit,
        apiKey,
        secretKey
      );

      // Return mapped trades with relevant info
      return trades.map(t => ({
        symbol: t.symbol,
        price: parseFloat(t.price),
        qty: parseFloat(t.qty),
        quoteQty: parseFloat(t.quoteQty),
        time: t.time,
        isBuyer: t.isBuyer,
        orderId: t.orderId
      }));

    } catch (error) {
      this.logger.error(`Error fetching Binance trades for ${symbol}: ${error.message}`);
      return [];
    }
  }

  /**
   * Manual Sell: Cancel all open orders and place market sell order
   * 
   * Flow:
   * 1. Fetch user credentials
   * 2. Get the order group from DB to verify ownership and get entry info
   * 3. Calculate remaining quantity to sell
   * 4. Cancel all open orders on the exchange for this symbol
   * 5. Place market sell order for remaining quantity
   * 6. Update DB: Mark open orders as CANCELED, add new sell order, calculate PnL
   * 
   * @param userId - User ID performing the sell
   * @param orderGroupId - The order group ID to close
   * @param exchange - Exchange (BINANCE, BITGET)
   * @param symbol - Trading pair symbol
   */
  async manualSell(
    userId: string,
    orderGroupId: string,
    exchange: string,
    symbol: string
  ): Promise<any> {
    const userLabel = `[User ${userId.substring(0, 8)}...][${exchange}]`;
    this.logger.log(`${userLabel} 🎯 Starting manual sell for order group ${orderGroupId}`);

    try {
      // 1. Get user credentials
      const credentials = await this.apiCredentialsService.getActiveTradingCredentials();
      const userCreds = credentials.find(
        c => c.userId === userId && c.exchange.toLowerCase() === exchange.toLowerCase()
      );

      if (!userCreds) {
        throw new HttpException(
          `No active trading credentials found for user on ${exchange}`,
          HttpStatus.NOT_FOUND
        );
      }

      // 2. Get order group from database
      const orderGroup = await this.orderRepository.find({
        where: {
          orderGroupId: orderGroupId,
          userId: userId
        },
        order: { createdAt: 'ASC' }
      });

      if (orderGroup.length === 0) {
        throw new HttpException(
          `Order group ${orderGroupId} not found for user`,
          HttpStatus.NOT_FOUND
        );
      }

      // Find entry order
      const entryOrder = orderGroup.find(o => o.orderRole === 'ENTRY');
      if (!entryOrder) {
        throw new HttpException(
          `Entry order not found in order group ${orderGroupId}`,
          HttpStatus.NOT_FOUND
        );
      }

      // 3. Calculate remaining quantity to sell
      const entryQty = parseFloat(entryOrder.executedQty || entryOrder.quantity);
      const entryPrice = parseFloat(entryOrder.price || '0');

      // Sum up already filled exit quantities
      const exitOrders = orderGroup.filter(o => o.orderRole !== 'ENTRY');
      const filledExitQty = exitOrders
        .filter(o => o.status === 'FILLED')
        .reduce((sum, o) => sum + parseFloat(o.executedQty || '0'), 0);

      const remainingQty = Math.max(0, entryQty - filledExitQty);

      if (remainingQty <= 0) {
        throw new HttpException(
          `No remaining quantity to sell. Trade is already fully closed.`,
          HttpStatus.BAD_REQUEST
        );
      }

      this.logger.log(`${userLabel} Remaining quantity to sell: ${remainingQty} (Entry: ${entryQty}, Already sold: ${filledExitQty})`);

      // 4. Cancel all open orders on the exchange for this symbol
      let canceledCount = 0;
      try {
        if (exchange === 'BINANCE') {
          const cancelResult = await this.binanceSignedService.cancelAllOrders(
            symbol,
            userCreds.apiKey,
            userCreds.secretKey
          );
          canceledCount = Array.isArray(cancelResult) ? cancelResult.length : 0;
          this.logger.log(`${userLabel} ✅ Canceled ${canceledCount} open orders on Binance`);
        } else if (exchange === 'BITGET') {
          await this.bitgetOrderService.cancelAllOrdersBySymbol(
            symbol,
            userCreds.apiKey,
            userCreds.secretKey,
            userCreds.passphrase
          );
          this.logger.log(`${userLabel} ✅ Initiated cancellation of all orders on Bitget`);
          // Bitget cancellation is async, we'll update DB based on our records
        }
      } catch (cancelError) {
        // Log but continue - orders might already be canceled or filled
        this.logger.warn(`${userLabel} ⚠️ Error canceling orders (continuing): ${cancelError.message}`);
      }

      // Small delay to allow balance to update after cancellation
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Fetch ACTUAL available balance after cancellation
      // This is critical - don't trust calculated remainingQty, use actual balance
      let actualAvailableBalance = 0;
      const asset = symbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '').replace('ETH', '');

      if (exchange === 'BINANCE') {
        const accountInfo = await this.binanceSignedService.getAccountInfo(
          userCreds.apiKey,
          userCreds.secretKey
        );
        const assetBalance = accountInfo.balances.find((b: any) => b.asset === asset);
        actualAvailableBalance = assetBalance ? parseFloat(assetBalance.free) : 0;
        this.logger.log(`${userLabel} 📊 Actual ${asset} balance after cancel: ${actualAvailableBalance}`);
      } else if (exchange === 'BITGET') {
        // For Bitget, use remaining qty as fallback (can be enhanced later)
        actualAvailableBalance = remainingQty;
      }

      // Use the MINIMUM of (calculated remaining vs actual balance) to avoid insufficient balance errors
      // This handles cases where fees/rounding reduced the actual available amount
      const qtyToSell = Math.min(remainingQty, actualAvailableBalance);

      if (qtyToSell <= 0) {
        throw new HttpException(
          `No balance available to sell. Actual balance: ${actualAvailableBalance}, Expected: ${remainingQty}`,
          HttpStatus.BAD_REQUEST
        );
      }

      if (actualAvailableBalance < remainingQty) {
        this.logger.warn(
          `${userLabel} ⚠️ Actual balance (${actualAvailableBalance}) is less than expected (${remainingQty}). ` +
          `Using actual balance to avoid insufficient balance error.`
        );
      }

      // 6. Place market sell order
      let sellOrderResult: any = null;
      let sellPrice = 0;

      // Get exchange info to format quantity properly
      if (exchange === 'BINANCE') {
        const exchangeInfo = await this.binanceSignedService.getExchangeInfo(symbol);
        const lotSizeFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
        const stepSize = parseFloat(lotSizeFilter?.stepSize || '0.00000001');

        // CRITICAL: Use FLOOR not round to ensure we never exceed available balance
        const qtyPrecision = this.binanceSignedService.getPrecision(stepSize);
        // Floor to step size: Math.floor(qty / stepSize) * stepSize
        const stepsCount = Math.floor(qtyToSell / stepSize);
        const alignedQty = stepsCount * stepSize;
        const formattedQty = alignedQty.toFixed(qtyPrecision);

        // Final safety check
        if (parseFloat(formattedQty) > actualAvailableBalance) {
          this.logger.error(`${userLabel} ❌ Formatted qty ${formattedQty} still exceeds balance ${actualAvailableBalance}`);
          throw new HttpException(
            `Cannot sell: quantity ${formattedQty} exceeds available balance ${actualAvailableBalance}`,
            HttpStatus.BAD_REQUEST
          );
        }

        this.logger.log(`${userLabel} 📤 Placing market SELL order: ${formattedQty} ${symbol} (available: ${actualAvailableBalance})`);

        sellOrderResult = await this.binanceSignedService.placeOrder(
          {
            symbol: symbol,
            side: 'SELL',
            type: 'MARKET',
            quantity: formattedQty
          },
          userCreds.apiKey,
          userCreds.secretKey
        );

        // Get actual fill price from MARKET order
        sellPrice = sellOrderResult.fills && sellOrderResult.fills.length > 0
          ? sellOrderResult.fills.reduce((sum: number, fill: any) =>
            sum + parseFloat(fill.price) * parseFloat(fill.qty), 0) / parseFloat(sellOrderResult.executedQty)
          : parseFloat(sellOrderResult.price || '0');

      } else if (exchange === 'BITGET') {
        // Bitget uses a different order format - use qtyToSell (which considers actual balance)
        const formattedQty = qtyToSell.toFixed(8);

        this.logger.log(`${userLabel} 📤 Placing market SELL order on Bitget: ${formattedQty} ${symbol}`);

        sellOrderResult = await this.bitgetOrderService.placeSpotOrder({
          symbol: symbol,
          side: 'sell',
          orderType: 'market',
          size: formattedQty,
          force: 'gtc'
        }, userCreds.apiKey, userCreds.secretKey, userCreds.passphrase);

        // Get current price as estimate (Bitget market orders may not return fill price immediately)
        try {
          const coinInfo = await this.bitgetService.getCoinInfo(symbol);
          sellPrice = parseFloat(coinInfo.lastPrice || '0');
        } catch {
          sellPrice = 0;
        }
      }

      if (!sellOrderResult) {
        throw new HttpException(
          `Failed to place market sell order on ${exchange}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(`${userLabel} ✅ Market sell order placed: OrderId=${sellOrderResult.orderId}, Status=${sellOrderResult.status}`);

      // 6. Update database
      // 6a. Mark all open exit orders as CANCELED
      const openExitOrders = exitOrders.filter(o => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED');
      for (const order of openExitOrders) {
        await this.orderRepository.update(
          { id: order.id },
          {
            status: 'CANCELED',
            note: `Canceled by manual sell at ${new Date().toISOString()}`
          }
        );
        this.logger.log(`${userLabel} Updated order ${order.orderId} to CANCELED`);
      }

      // 6b. Save the new manual sell order to database
      const executedQty = parseFloat(sellOrderResult.executedQty || sellOrderResult.size || qtyToSell.toString());
      const finalSellPrice = sellPrice > 0 ? sellPrice : (parseFloat(sellOrderResult.price) || 0);
      const newOrderId = parseInt(sellOrderResult.orderId) || Date.now();
      const newOrderStatus = sellOrderResult.status || 'FILLED';

      await this.orderRepository.save({
        orderId: newOrderId,
        clientOrderId: sellOrderResult.clientOrderId || `manual-sell-${Date.now()}`,
        exchange: exchange,
        symbol: symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: executedQty.toString(),
        price: finalSellPrice.toString(),
        executedQty: executedQty.toString(),
        status: newOrderStatus,
        parentOrderId: entryOrder.orderId,
        orderGroupId: orderGroupId,
        orderRole: 'MANUAL_SELL',
        orderTimestamp: new Date(),
        filledTimestamp: new Date(),
        userId: userId,
        note: `Manual sell order - user initiated exit | actualBalance: ${actualAvailableBalance.toFixed(8)} | qtyToSell: ${qtyToSell.toFixed(8)} | canceledOrders: ${canceledCount} | entryPrice: ${entryPrice}`,
        metadata: {
          tpGroup: 'MANUAL_SELL',
          actualBalanceAtSell: actualAvailableBalance,
          expectedQty: remainingQty,
          // Store additional manual sell info in note field instead
        } as any
      });

      this.logger.log(`${userLabel} ✅ Manual sell order saved to DB: ${newOrderId}`);

      // 7. Calculate PnL
      const pnlAmount = (finalSellPrice - entryPrice) * executedQty;
      const entryCost = entryPrice * entryQty;
      const totalRealizedPnl = pnlAmount + exitOrders
        .filter(o => o.status === 'FILLED')
        .reduce((sum, o) => {
          const exitPrice = parseFloat(o.price || '0');
          const exitQty = parseFloat(o.executedQty || '0');
          return sum + (exitPrice - entryPrice) * exitQty;
        }, 0);

      const pnlPercent = entryCost > 0 ? (totalRealizedPnl / entryCost) * 100 : 0;

      this.logger.log(`${userLabel} 📊 PnL: ${totalRealizedPnl.toFixed(4)} USDT (${pnlPercent.toFixed(2)}%)`);

      return {
        orderGroupId,
        symbol,
        exchange,
        canceledOrders: openExitOrders.length,
        sellOrder: {
          orderId: newOrderId,
          status: newOrderStatus,
          executedQty: executedQty.toFixed(8),
          price: finalSellPrice.toFixed(8)
        },
        pnl: {
          thisExit: parseFloat(pnlAmount.toFixed(8)),
          totalRealized: parseFloat(totalRealizedPnl.toFixed(8)),
          realizedPercent: parseFloat(pnlPercent.toFixed(4))
        },
        isComplete: true
      };

    } catch (error) {
      this.logger.error(`${userLabel} ❌ Manual sell failed: ${error.message}`);
      throw error;
    }
  }

  // =========================================================================
  // ADMIN: Clear stale position by creating synthetic SELL order
  // =========================================================================
  async clearStalePosition(userId: string, symbol: string, exchange: string): Promise<{
    ordersFound: number;
    syntheticSellCreated: boolean;
    orderGroupId: string | null;
    message: string;
  }> {
    // Find user by partial ID match if provided
    let matchingUserId = userId;
    if (userId.length < 36) {
      // Search for users that start with this prefix
      const allOrders = await this.orderRepository.find({
        where: { symbol, exchange: exchange.toUpperCase() },
      });
      const matchingOrder = allOrders.find(o => o.userId?.startsWith(userId));
      if (matchingOrder?.userId) {
        matchingUserId = matchingOrder.userId;
        this.logger.log(`🔍 Found full userId: ${matchingUserId} from prefix ${userId}`);
      }
    }

    // Find the latest BUY order without a matching SELL
    const latestBuyOrder = await this.orderRepository.findOne({
      where: {
        userId: matchingUserId,
        symbol,
        exchange: exchange.toUpperCase(),
        orderRole: 'ENTRY',
        side: 'BUY',
        status: 'FILLED',
      },
      order: { filledTimestamp: 'DESC' },
    });

    if (!latestBuyOrder) {
      return {
        ordersFound: 0,
        syntheticSellCreated: false,
        orderGroupId: null,
        message: `No open BUY order found for ${matchingUserId.substring(0, 8)}.../${symbol}`,
      };
    }

    // Check if there's already a SELL order for this group
    if (!latestBuyOrder.orderGroupId) {
      return {
        ordersFound: 1,
        syntheticSellCreated: false,
        orderGroupId: null,
        message: `BUY order ${latestBuyOrder.orderId} has no orderGroupId - cannot create matching SELL`,
      };
    }

    const existingSell = await this.orderRepository.findOne({
      where: {
        userId: matchingUserId,
        symbol,
        exchange: exchange.toUpperCase(),
        orderGroupId: latestBuyOrder.orderGroupId,
        side: 'SELL',
        status: 'FILLED',
      },
    });

    if (existingSell) {
      return {
        ordersFound: 1,
        syntheticSellCreated: false,
        orderGroupId: latestBuyOrder.orderGroupId,
        message: `Position already closed - SELL order ${existingSell.orderId} exists`,
      };
    }

    // Create a synthetic SELL order to close the position
    const syntheticSellOrder = this.orderRepository.create({
      orderId: Date.now(), // Synthetic order ID
      clientOrderId: `ADMIN_CLEANUP_${Date.now()}`,
      exchange: exchange.toUpperCase(),
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: latestBuyOrder.quantity,
      price: latestBuyOrder.price, // Use same price for simplicity
      executedQty: latestBuyOrder.executedQty,
      status: 'FILLED',
      parentOrderId: latestBuyOrder.orderId,
      orderGroupId: latestBuyOrder.orderGroupId,
      orderRole: 'ADMIN_CLEANUP',
      orderTimestamp: new Date(),
      filledTimestamp: new Date(),
      userId: matchingUserId,
      note: `Admin cleanup: Synthetic SELL to close stale position. Original BUY: ${latestBuyOrder.orderId}`,
    });

    await this.orderRepository.save(syntheticSellOrder);

    this.logger.log(
      `✅ Created synthetic SELL order ${syntheticSellOrder.orderId} ` +
      `to close stale position for ${matchingUserId.substring(0, 8)}.../${symbol}`
    );

    return {
      ordersFound: 1,
      syntheticSellCreated: true,
      orderGroupId: latestBuyOrder.orderGroupId,
      message: `Created synthetic SELL to close position (BUY order: ${latestBuyOrder.orderId})`,
    };
  }

  // =========================================================================
  // ADMIN: List all open positions in the database
  // =========================================================================
  async listOpenPositionsInDb(exchange?: string, userId?: string): Promise<Array<{
    userId: string;
    symbol: string;
    exchange: string;
    orderId: number | bigint;
    orderGroupId: string | null;
    quantity: string;
    price: string;
    filledTimestamp: Date | null;
  }>> {
    // Get all FILLED BUY orders
    const whereClause: any = {
      orderRole: 'ENTRY',
      side: 'BUY',
      status: 'FILLED',
    };

    if (exchange) {
      whereClause.exchange = exchange.toUpperCase();
    }

    if (userId) {
      // Support partial userId match
      const allOrders = await this.orderRepository.find({ where: whereClause });
      const filteredOrders = allOrders.filter(o => o.userId?.startsWith(userId));

      // Now check which ones don't have matching SELL
      const openPositions: Array<{
        userId: string;
        symbol: string;
        exchange: string;
        orderId: number | bigint;
        orderGroupId: string | null;
        quantity: string;
        price: string;
        filledTimestamp: Date | null;
      }> = [];

      for (const buyOrder of filteredOrders) {
        if (!buyOrder.orderGroupId || !buyOrder.userId) continue;

        const sellOrder = await this.orderRepository.findOne({
          where: {
            userId: buyOrder.userId,
            symbol: buyOrder.symbol,
            orderGroupId: buyOrder.orderGroupId,
            side: 'SELL',
            status: 'FILLED',
          },
        });

        if (!sellOrder) {
          openPositions.push({
            userId: buyOrder.userId || 'unknown',
            symbol: buyOrder.symbol,
            exchange: buyOrder.exchange,
            orderId: buyOrder.orderId,
            orderGroupId: buyOrder.orderGroupId,
            quantity: buyOrder.quantity,
            price: buyOrder.price,
            filledTimestamp: buyOrder.filledTimestamp,
          });
        }
      }

      return openPositions;
    }

    // No userId filter - get all
    const buyOrders = await this.orderRepository.find({
      where: whereClause,
      order: { filledTimestamp: 'DESC' },
    });

    const openPositions: Array<{
      userId: string;
      symbol: string;
      exchange: string;
      orderId: number | bigint;
      orderGroupId: string | null;
      quantity: string;
      price: string;
      filledTimestamp: Date | null;
    }> = [];

    for (const buyOrder of buyOrders) {
      if (!buyOrder.orderGroupId) {
        // No orderGroupId = treat as open
        openPositions.push({
          userId: buyOrder.userId || 'unknown',
          symbol: buyOrder.symbol,
          exchange: buyOrder.exchange,
          orderId: buyOrder.orderId,
          orderGroupId: buyOrder.orderGroupId,
          quantity: buyOrder.quantity,
          price: buyOrder.price,
          filledTimestamp: buyOrder.filledTimestamp,
        });
        continue;
      }

      // Skip if no userId
      if (!buyOrder.userId) continue;

      const sellOrder = await this.orderRepository.findOne({
        where: {
          userId: buyOrder.userId,
          symbol: buyOrder.symbol,
          orderGroupId: buyOrder.orderGroupId,
          side: 'SELL',
          status: 'FILLED',
        },
      });

      if (!sellOrder) {
        openPositions.push({
          userId: buyOrder.userId || 'unknown',
          symbol: buyOrder.symbol,
          exchange: buyOrder.exchange,
          orderId: buyOrder.orderId,
          orderGroupId: buyOrder.orderGroupId,
          quantity: buyOrder.quantity,
          price: buyOrder.price,
          filledTimestamp: buyOrder.filledTimestamp,
        });
      }
    }

    return openPositions;
  }
}
