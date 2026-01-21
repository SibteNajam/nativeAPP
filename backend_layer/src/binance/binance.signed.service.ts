import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BinanceService } from './binance.service';
export interface OTOCOOrderRequest {
  symbol: string;
  workingType: 'LIMIT';
  workingSide: 'BUY' | 'SELL';
  workingPrice: string;
  workingQuantity: string;
  workingTimeInForce: 'GTC' | 'IOC' | 'FOK';
  pendingSide: 'BUY' | 'SELL';
  pendingQuantity: string;
  pendingAboveType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
  pendingAbovePrice: string;
  pendingAboveStopPrice: string;
  pendingAboveTimeInForce: 'GTC';
  pendingBelowType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
  pendingBelowPrice: string;
  pendingBelowStopPrice: string;
  pendingBelowTimeInForce: 'GTC';
  timestamp: number;
}

export interface OTOCOOrderResult {
  orderListId: number;
  contingencyType: string;
  listStatusType: string;
  listOrderStatus: string;
  listClientOrderId: string;
  transactionTime: number;
  symbol: string;
  orders: Array<{
    symbol: string;
    orderId: number;
    clientOrderId: string;
  }>;
  orderReports: Array<{
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    transactTime: number;
    price: string;
    origQty: string;
    executedQty: string;
    origQuoteOrderQty: string;
    cummulativeQuoteQty: string;
    status: string;
    timeInForce: string;
    type: string;
    side: string;
    stopPrice?: string;
    workingTime: number;
    selfTradePreventionMode: string;
  }>;
}

@Injectable()
export class BinanceSignedService {
  private readonly logger = new Logger(BinanceSignedService.name);
  private BASE_URL = 'https://api.binance.com';

  private BASE_URL_TEST = 'https://testnet.binance.vision';
  private FUTURES_TESTNET_URL = 'https://testnet.binancefuture.com';
  private binanceApiKey = process.env.BINANCE_API_KEY;
  private binanceSecretKey = process.env.BINANCE_SECRET_KEY;
  private binanceTestnetApiKey = process.env.BINANCE_TESTNET_API_KEY;
  private binanceTestnetSecretKey = process.env.BINANCE_TESTNET_SECRET_KEY;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly binanceService: BinanceService,
  ) { }


  async getAccountInfo(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      this.logger.error('Binance API key or secret missing for getAccountInfo');
      throw new HttpException('Binance API key or secret is missing', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Use server time to avoid timestamp skew
      const serverTime = await this.getServerTime();
      const query = `timestamp=${serverTime}`;
      const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');

      const url = `${this.BASE_URL}/api/v3/account?${query}&signature=${signature}`;
      this.logger.debug(`GET ${url.replace(/signature=[^&]+/, 'signature=***')}`);

      const { data } = await firstValueFrom(
        this.http.get(url, {
          headers: { 'X-MBX-APIKEY': apiKeyToUse },
          timeout: 10000,
        }),
      );

      return data;
    } catch (error: any) {
      this.logger.error('Error in getAccountInfo', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const binanceResp = error.response?.data;
      if (binanceResp) {
        // Prefer returning the Binance-provided status code when available
        const msg = binanceResp.msg || binanceResp.message || JSON.stringify(binanceResp);
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST;
        throw new HttpException({ message: msg, original: binanceResp }, statusCode);
      }

      // Fallback network/unknown error
      throw new HttpException('Failed to fetch account info from Binance', HttpStatus.BAD_GATEWAY);
    }
  }

  async getOpenOrders(symbol?: string, apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');
    if (!apiKeyToUse || !secretKeyToUse) {
      this.logger.error('Binance API key or secret missing for getOpenOrders');
      throw new HttpException('Binance API key or secret is missing in environment variables', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Prefer Binance server time to avoid timestamp skew issues
      const serverTime = await this.getServerTime();
      let query = `timestamp=${serverTime}`;
      if (symbol) query = `symbol=${symbol}&${query}`;

      const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');
      const url = `${this.BASE_URL}/api/v3/openOrders?${query}&signature=${signature}`;

      this.logger.debug(`GET ${url.replace(/signature=[^&]+/, 'signature=***')}`);
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: { 'X-MBX-APIKEY': apiKeyToUse }, timeout: 10000 }),
      );

      return data;
    } catch (error: any) {
      // Log full error for debugging
      this.logger.error('Error in getOpenOrders', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If Binance returned JSON error, forward its message/status
      const binanceResp = error.response?.data;
      if (binanceResp) {
        const msg = binanceResp.msg || binanceResp.message || JSON.stringify(binanceResp);
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST;
        throw new HttpException({ message: msg, original: binanceResp }, statusCode);
      }

      // Fallback
      throw new HttpException('Failed to fetch open orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get trades for a symbol
   */
  async getMyTrades(symbol: string, limit = 10, apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');
    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }
    const timestamp = await this.getServerTime();

    const query = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');

    const url = `${this.BASE_URL_TEST}/api/v3/myTrades?${query}&signature=${signature}`;

    const { data } = await firstValueFrom(
      this.http.get(url, { headers: { 'X-MBX-APIKEY': apiKeyToUse } }),
    );

    return data;
  }

  /**
   * Place a new order
   * For MARKET orders:
   *   - BUY: can use either quantity OR quoteOrderQty (prefer quoteOrderQty for exact USDT amount)
   *   - SELL: can only use quantity
   * For LIMIT orders: only quantity is allowed (quoteOrderQty not supported)
   */
  async placeOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    quantity?: string;
    quoteOrderQty?: string; // Amount in quote asset (USDT) - only for MARKET BUY
    price?: string;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }, apiKey?: string, secretKey?: string) {
    try {
      const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
      const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

      if (!apiKeyToUse || !secretKeyToUse) {
        throw new Error('Binance API key or secret is missing in environment variables');
      }

      // Use Binance server time instead of local time to avoid timestamp skew
      const timestamp = await this.getServerTime();

      // Build query parameters based on order type and side
      const params: any = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        newOrderRespType: 'FULL', // Explicitly request full response to get fills and cumulative stats
        recvWindow: '10000',
        timestamp: timestamp.toString(),
      };

      // For MARKET BUY orders, prefer quoteOrderQty if provided, otherwise use quantity
      // For MARKET SELL and all LIMIT orders, use quantity only
      if (order.type === 'MARKET' && order.side === 'BUY' && order.quoteOrderQty) {
        params.quoteOrderQty = order.quoteOrderQty;
        console.log(`Using quoteOrderQty=${order.quoteOrderQty} USDT for market BUY`);
      } else if (order.quantity) {
        params.quantity = order.quantity;
      } else {
        throw new Error('Either quantity or quoteOrderQty must be provided');
      }

      // Add price and timeInForce for LIMIT orders
      if (order.price) params.price = order.price;
      if (order.timeInForce) params.timeInForce = order.timeInForce;

      const query = new URLSearchParams(params).toString();
      const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');
      const url = `${this.BASE_URL}/api/v3/order?${query}&signature=${signature}`;

      console.log('🚀 Placing order:', { url: this.BASE_URL, order, params });

      const { data } = await firstValueFrom(
        this.http.post(url, null, {
          headers: { 'X-MBX-APIKEY': apiKeyToUse },
          timeout: 10000 // Add timeout
        }),
      );

      console.log('✅ Order placed successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Error placing order:', error);

      // Handle Binance-specific errors
      if (error.response?.data) {
        const binanceError = error.response.data;
        throw new Error(`Binance API Error: ${binanceError.msg || binanceError.message || 'Unknown error'}`);
      }

      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol: string, orderId: number, apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');
    if (!apiKeyToUse || !secretKeyToUse) {
      this.logger.error('Binance API key or secret missing for cancelOrder');
      throw new HttpException('Binance API key or secret is missing in environment variables', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Use Binance server time to avoid timestamp skew issues
      const serverTime = await this.getServerTime();
      const query = `symbol=${symbol}&orderId=${orderId}&timestamp=${serverTime}`;
      const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');

      const url = `${this.BASE_URL}/api/v3/order?${query}&signature=${signature}`;

      this.logger.debug(`DELETE ${url.replace(/signature=[^&]+/, 'signature=***')}`);
      const { data } = await firstValueFrom(
        this.http.delete(url, {
          headers: { 'X-MBX-APIKEY': apiKeyToUse },
          timeout: 10000,
        }),
      );

      return data;
    } catch (error: any) {
      this.logger.error('Error in cancelOrder', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If Binance returned JSON error, forward its message/status
      const binanceResp = error.response?.data;
      if (binanceResp) {
        const msg = binanceResp.msg || binanceResp.message || JSON.stringify(binanceResp);
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST;
        throw new HttpException({ message: msg, original: binanceResp }, statusCode);
      }

      // Fallback
      throw new HttpException('Failed to cancel order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Cancel all open orders on a symbol
   * Cancels all active orders on a symbol, including orders part of OCO/OTOCO lists
   * Weight: 1
   */
  async cancelAllOrders(symbol: string, apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      this.logger.error('Binance API key or secret missing for cancelAllOrders');
      throw new HttpException('Binance API key or secret is missing in environment variables', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Use Binance server time to avoid timestamp skew
      const serverTime = await this.getServerTime();
      const query = `symbol=${symbol}&timestamp=${serverTime}`;
      const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');

      const url = `${this.BASE_URL}/api/v3/openOrders?${query}&signature=${signature}`;

      this.logger.debug(`DELETE ${url.replace(/signature=[^&]+/, 'signature=***')}`);
      const { data } = await firstValueFrom(
        this.http.delete(url, {
          headers: { 'X-MBX-APIKEY': apiKeyToUse },
          timeout: 10000,
        }),
      );

      this.logger.log(`✅ Canceled all open orders for ${symbol}. Total canceled: ${data.length}`);
      return data;
    } catch (error: any) {
      this.logger.error('Error in cancelAllOrders', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If Binance returned JSON error, forward its message/status
      const binanceResp = error.response?.data;
      if (binanceResp) {
        const msg = binanceResp.msg || binanceResp.message || JSON.stringify(binanceResp);
        const statusCode = error.response?.status || HttpStatus.BAD_REQUEST;
        throw new HttpException({ message: msg, original: binanceResp }, statusCode);
      }

      // Fallback
      throw new HttpException('Failed to cancel all orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  /**
 * Get account balances
 */
  async getBalances(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = await this.getServerTime();
      const query = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secretKeyToUse)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL}/api/v3/account?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKeyToUse },
            timeout: 10000,
          },
        ),
      );

      // Return only balances with non-zero amounts
      return data.balances.filter(balance =>
        parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
      );
    } catch (error) {
      this.logger.error('Error fetching balances', error.response?.data || error.message);
      throw new Error('Unable to fetch account balances');
    }
  }

  /**
   * Get open positions with USD values
   * This uses the same balance API but formats it differently and includes current prices
   */
  async getOpenPositions(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      // Get account balances
      const timestamp = await this.getServerTime();
      const query = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secretKeyToUse)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL}/api/v3/account?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKeyToUse },
            timeout: 10000,
          },
        ),
      );

      const positions: any[] = [];

      // Filter non-zero balances
      const nonZeroBalances = data.balances.filter(balance =>
        parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
      );

      // For each asset, get current price and calculate USD value
      for (const balance of nonZeroBalances) {
        const asset = balance.asset;
        const freeAmount = parseFloat(balance.free);
        const lockedAmount = parseFloat(balance.locked);
        const totalAmount = freeAmount + lockedAmount;

        let valueUsd = 0;
        let pricePerUnit = 0;

        // USDT is 1:1 with USD
        if (asset === 'USDT' || asset === 'USDC' || asset === 'BUSD') {
          valueUsd = totalAmount;
          pricePerUnit = 1;
        } else {
          // Try to fetch current price from symbol/USDT pair
          try {
            const symbol = `${asset}USDT`;
            const priceData = await this.binanceService.getSymbolPrice(symbol);

            if (priceData && priceData.length > 0) {
              pricePerUnit = parseFloat(priceData[0]?.price || '0');
              valueUsd = totalAmount * pricePerUnit;
            }
          } catch (priceError) {
            // If price fetch fails, log warning and continue
            this.logger.warn(`Unable to fetch price for ${asset}: ${priceError.message}`);
            valueUsd = 0;
            pricePerUnit = 0;
          }
        }

        positions.push({
          symbol: asset,
          quantity: totalAmount,
          valueUsd: valueUsd,
          pricePerUnit: pricePerUnit,
          free: freeAmount,
          locked: lockedAmount,
          freeUsd: freeAmount * pricePerUnit, // Free amount converted to USD
          lockedUsd: lockedAmount * pricePerUnit, // Locked amount converted to USD
        });
      }

      return positions;
    } catch (error) {
      this.logger.error('Error fetching open positions', error.response?.data || error.message);
      throw new Error('Unable to fetch open positions');
    }
  }

  /**
   * Get trading status
   */
  async getTradingStatus() {
    const apiKey = this.configService.get<string>('BINANCE_TESTNET_API_KEY');
    const secretKey = this.configService.get<string>('BINANCE_TESTNET_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = Date.now();
      const query = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL_TEST}/sapi/v1/account/apiTradingStatus?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKey },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching trading status', error.response?.data || error.message);
      throw new Error('Unable to fetch trading status');
    }
  }

  /**
   * Query a single order's status by orderId
   * GET /api/v3/order (USER_DATA)
   * Weight: 4
   * Used for order sync to check if orders were filled while backend was down
   */
  async queryOrder(
    symbol: string,
    orderId: number,
    apiKey: string,
    secretKey: string
  ): Promise<{
    orderId: number;
    symbol: string;
    status: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    price: string;
    updateTime: number;
    type: string;
    side: string;
  }> {
    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing');
    }

    try {
      const serverTime = await this.getServerTime();
      const query = `symbol=${symbol}&orderId=${orderId}&timestamp=${serverTime}`;
      const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

      const url = `${this.BASE_URL}/api/v3/order?${query}&signature=${signature}`;

      this.logger.debug(`Querying order: ${symbol} orderId=${orderId}`);

      const { data } = await firstValueFrom(
        this.http.get(url, {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 10000,
        }),
      );

      return {
        orderId: data.orderId,
        symbol: data.symbol,
        status: data.status,
        executedQty: data.executedQty,
        cummulativeQuoteQty: data.cummulativeQuoteQty,
        price: data.price,
        updateTime: data.updateTime,
        type: data.type,
        side: data.side,
      };
    } catch (error: any) {
      // Handle order not found
      if (error.response?.data?.code === -2013) {
        this.logger.warn(`Order ${orderId} not found on Binance for ${symbol}`);
        throw new Error(`ORDER_NOT_FOUND: Order ${orderId} does not exist`);
      }

      this.logger.error(`Error querying order ${orderId}:`, {
        message: error.message,
        response: error.response?.data,
      });

      throw new Error(`Failed to query order: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Get all orders (historical)
   */
  async getAllOrders(symbol: string, limit = 100, apiKey?: string, secretKey?: string, orderId?: number, startTime?: number, endTime?: number) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = await this.getServerTime();
      let query = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`;

      if (orderId) {
        query = `symbol=${symbol}&orderId=${orderId}&limit=${limit}&timestamp=${timestamp}`;
      }

      // Add time range if provided
      if (startTime) {
        query += `&startTime=${startTime}`;
      }
      if (endTime) {
        query += `&endTime=${endTime}`;
      }

      const signature = crypto
        .createHmac('sha256', secretKeyToUse)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL}/api/v3/allOrders?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKeyToUse },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching all orders', error.response?.data || error.message);
      throw new Error('Unable to fetch order history');
    }
  }

  /**
   * Get all order lists (OCO orders)
   * Query all Order lists (USER_DATA)
   * GET /api/v3/allOrderList
   */
  async getAllOrderLists(
    apiKey?: string,
    secretKey?: string,
    fromId?: number,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = Date.now();
      let query = `timestamp=${timestamp}`;

      // Validate time range if provided
      if (startTime && endTime) {
        const timeRange = endTime - startTime;
        if (timeRange > 24 * 60 * 60 * 1000) {
          throw new Error('The time between startTime and endTime can\'t be longer than 24 hours');
        }
        query += `&startTime=${startTime}&endTime=${endTime}`;
      }

      // Add other optional parameters
      if (fromId) {
        query += `&fromId=${fromId}`;
      }

      if (limit) {
        if (limit > 1000) {
          limit = 1000; // Maximum limit is 1000
        }
        query += `&limit=${limit}`;
      }

      const signature = crypto
        .createHmac('sha256', secretKeyToUse)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL}/api/v3/allOrderList?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKeyToUse },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching all order lists', error.response?.data || error.message);
      throw new Error('Unable to fetch order lists: ' + (error.response?.data?.msg || error.message));
    }
  }

  /**
   * Get my trades for a specific symbol
   * GET /api/v3/myTrades
   */
  async getTrades(
    symbol: string,
    apiKey?: string,
    secretKey?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<any[]> {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing');
    }

    const timestamp = await this.getServerTime();
    const params: any = {
      symbol,
      timestamp,
      limit,
    };

    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    const queryString = new URLSearchParams(params).toString();
    const signature = crypto.createHmac('sha256', secretKeyToUse).update(queryString).digest('hex');

    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL}/api/v3/myTrades?${queryString}&signature=${signature}`,
          {
            headers: {
              'X-MBX-APIKEY': apiKeyToUse,
            },
          }
        )
      );

      return data;
    } catch (error) {
      this.logger.error(`Error fetching trades for ${symbol}`, error.response?.data || error.message);
      throw new Error(`Unable to fetch trades for ${symbol}: ` + (error.response?.data?.msg || error.message));
    }
  }

  /**
   * Get historical filled orders across all symbols for a specified number of hours
   * Strategy: 
   * 1. Call /api/v3/allOrderList to get all OCO order lists (without symbol parameter)
   * 2. Extract unique symbols from the order lists
   * 3. Call /api/v3/allOrders for each symbol to get detailed orders
   * 4. Filter and return only FILLED orders
   * @param hours - Number of hours to fetch history for (must be <= 24 hours due to API constraint)
   * @param apiKey - Binance API key
   * @param secretKey - Binance secret key
   * @returns Array of filled orders with complete details
   */
  async getHistoricalFilledOrders(
    hours: number,
    apiKey?: string,
    secretKey?: string
  ): Promise<any[]> {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing');
    }

    if (hours > 24 || hours < 1) {
      throw new Error('Hours parameter must be between 1 and 24');
    }

    try {
      const now = Date.now();
      const oneHourMs = 60 * 60 * 1000;
      const startTime = now - (hours * oneHourMs);
      const allOrderLists: any[] = [];
      const symbolsSet = new Set<string>();

      this.logger.log(`Fetching ${hours} hours of historical order lists (from ${new Date(startTime).toISOString()} to ${new Date(now).toISOString()})...`);

      // Step 1: Fetch all order lists (OCO orders) - single call since we're within 24 hours
      try {
        const orderLists = await this.getAllOrderLists(
          apiKeyToUse,
          secretKeyToUse,
          undefined, // fromId
          startTime,
          now,
          1000 // max limit
        );

        if (orderLists && orderLists.length > 0) {
          allOrderLists.push(...orderLists);
          // Collect unique symbols from order lists
          orderLists.forEach((list: any) => {
            if (list.symbol) {
              symbolsSet.add(list.symbol);
            }
          });
          this.logger.log(`Found ${orderLists.length} order lists with ${symbolsSet.size} unique symbols`);
        } else {
          this.logger.log(`No order lists found in the last ${hours} hours`);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch order lists: ${error.message}`);
      }

      this.logger.log(`Total order lists found: ${allOrderLists.length} across ${symbolsSet.size} unique symbols`);

      if (symbolsSet.size === 0) {
        this.logger.warn('No symbols found from order lists. No trading history available.');
        return [];
      }

      // Step 2: Fetch detailed orders for each symbol
      const allFilledOrders: any[] = [];
      const symbols = Array.from(symbolsSet);

      this.logger.log(`Fetching detailed orders for ${symbols.length} symbols...`);

      for (const symbol of symbols) {
        this.logger.log(`Fetching orders for symbol: ${symbol}`);

        try {
          // Fetch orders for the entire time period for this symbol
          const orders = await this.getAllOrders(
            symbol,
            1000, // limit
            apiKeyToUse,
            secretKeyToUse,
            undefined, // orderId - not needed
            startTime,
            now
          );

          if (orders && orders.length > 0) {
            // Filter only FILLED orders
            const filledOrders = orders.filter((order: any) => order.status === 'FILLED');

            if (filledOrders.length > 0) {
              this.logger.log(`Found ${filledOrders.length} filled orders out of ${orders.length} total orders for ${symbol}`);
              allFilledOrders.push(...filledOrders);
            } else {
              this.logger.log(`No filled orders for ${symbol} (${orders.length} total orders)`);
            }
          }

          // Rate limiting: wait 200ms between requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          this.logger.warn(`Failed to fetch orders for ${symbol}: ${error.message}`);
          // Continue to next symbol even if this one fails
        }
      }

      this.logger.log(`Total filled orders found: ${allFilledOrders.length} across all symbols`);

      // Sort by time (most recent first)
      allFilledOrders.sort((a, b) => b.time - a.time);

      return allFilledOrders;
    } catch (error) {
      this.logger.error('Error fetching historical filled orders', error.message);
      throw new Error('Unable to fetch historical filled orders: ' + error.message);
    }
  }

  async getOrderHistory(apiKey?: string, secretKey?: string): Promise<Array<{ symbol: string; orders: any[] }>> {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    const timestamp = Date.now();
    const accountQuery = `timestamp=${timestamp}`;
    const accountSig = crypto.createHmac('sha256', secretKeyToUse).update(accountQuery).digest('hex');

    // 1. Get account balances
    const accountRes = await firstValueFrom(
      this.http.get(`${this.BASE_URL_TEST}/api/v3/account?${accountQuery}&signature=${accountSig}`, {
        headers: { 'X-MBX-APIKEY': apiKey },
      }),
    );
    const accountData = accountRes.data;

    // 2. Get symbols where user has some balance
    const symbols = accountData.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => `${b.asset}USDT`); // assumes USDT pairs

    // 3. Fetch orders for each symbol
    const allOrders: Record<string, any[]> = {};
    for (const symbol of symbols) {
      try {
        const ts = Date.now();
        const params = new URLSearchParams({
          symbol,
          limit: '100',
          timestamp: ts.toString(),
        });
        const sig = crypto.createHmac('sha256', secretKeyToUse).update(params.toString()).digest('hex');

        const { data } = await firstValueFrom(
          this.http.get(`${this.BASE_URL_TEST}/api/v3/allOrders?${params.toString()}&signature=${sig}`, {
            headers: { 'X-MBX-APIKEY': apiKey },
          }),
        );

        if (data.length > 0) {
          allOrders[symbol] = data.sort((a, b) => b.updateTime - a.updateTime); // sort per symbol
        }
      } catch (err) {
        this.logger.warn(`⚠️ Could not fetch orders for ${symbol}: ${err.message}`);
      }
    }

    // 4. Convert to grouped format
    const grouped = Object.entries(allOrders).map(([symbol, orders]) => ({
      symbol,
      orders: orders.slice(0, 100), // top 100 per symbol
    }));

    return grouped;
  }


  /**
   * Get account snapshot
   */
  async getAccountSnapshot(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = Date.now();

      // Hardcoded: Always get 30 days of SPOT data
      const type = 'SPOT';
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const limit = 30;

      const queryParams = new URLSearchParams({
        type,
        startTime: thirtyDaysAgo.toString(),
        endTime: now.toString(),
        limit: limit.toString(),
        timestamp: timestamp.toString(),
      });

      const queryString = queryParams.toString();
      const signature = crypto.createHmac('sha256', secretKeyToUse).update(queryString).digest('hex');

      // Get snapshot data from Binance
      const { data: snapshotData } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/sapi/v1/accountSnapshot?${queryString}&signature=${signature}`, {
          headers: {
            'X-MBX-APIKEY': apiKeyToUse
          },
          timeout: 15000,
        }),
      );

      if (snapshotData.code !== 200) {
        throw new Error(`Binance API error: ${snapshotData.msg || 'Unknown error'}`);
      }

      // If coin-info fails, use fallback prices (this is your current issue)
      let assetPrices: { [key: string]: number } = { USDT: 1 };

      try {
        // Get all unique assets from all snapshots
        const allAssets = new Set<string>();
        snapshotData.snapshotVos.forEach((snapshot: any) => {
          snapshot.data.balances.forEach((balance: any) => {
            if (parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0) {
              allAssets.add(balance.asset);
            }
          });
        });

        const assetsArray = Array.from(allAssets);
        console.log('📊 Processing assets:', assetsArray);

        // Fetch real-time prices - if this fails, use fallback
        const pricesResponse = await firstValueFrom(
          this.http.get(`${this.BASE_URL}/binance/coin-info?symbols=${encodeURIComponent(assetsArray.join(','))}`, {
            timeout: 5000, // Shorter timeout to avoid hanging
          }),
        );

        pricesResponse.data.forEach((coinInfo: any) => {
          const asset = coinInfo.symbol.replace('USDT', '');
          assetPrices[asset] = parseFloat(coinInfo.currentPrice);
        });

        console.log('💰 Asset prices from API:', assetPrices);
      } catch (priceError) {
        console.warn('⚠️ Coin info API failed, using fallback prices:', priceError.message);
        // Fallback prices based on your assets
        assetPrices = {
          USDT: 1,
          BTC: 113200,  // From your example
          RVN: 0.045,   // Ravencoin current price
          SUI: 2.09,    // SUI current price  
          XRP: 0.58,    // XRP current price
        };
      }

      // Transform snapshots with real USD values
      const snapshots = snapshotData.snapshotVos
        .map((snapshot: any) => {
          const balances = snapshot.data.balances
            .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
            .map((balance: any) => {
              const total = parseFloat(balance.free) + parseFloat(balance.locked);
              const assetPrice = assetPrices[balance.asset] || 1;
              const usdValue = total * assetPrice;

              return {
                asset: balance.asset,
                free: parseFloat(balance.free),
                locked: parseFloat(balance.locked),
                total,
                usdValue,
                pricePerUnit: assetPrice,
              };
            });

          const totalValueUSD = balances.reduce((sum: number, b: any) => sum + b.usdValue, 0);
          const totalAssetOfBtc = parseFloat(snapshot.data.totalAssetOfBtc);

          return {
            date: new Date(snapshot.updateTime).toISOString().split('T')[0],
            totalValueUSD,
            totalAssetOfBtc,
            balances,
            updateTime: snapshot.updateTime,
            change24h: 0,
            pricesUsed: { ...assetPrices },
          };
        })
        .sort((a: any, b: any) => b.updateTime - a.updateTime);

      // Calculate 24h changes
      snapshots.forEach((snapshot: any, index: number) => {
        if (index < snapshots.length - 1) {
          const currentValue = snapshot.totalValueUSD;
          const previousValue = snapshots[index + 1].totalValueUSD;
          snapshot.change24h = previousValue > 0
            ? ((currentValue - previousValue) / previousValue) * 100
            : 0;
        }
      });

      // Get top 5 assets from latest snapshot
      const latestSnapshot = snapshots[0];
      const topAssets = latestSnapshot.balances
        .filter((balance: any) => balance.usdValue > 0)
        .map((balance: any) => ({
          asset: balance.asset,
          value: balance.usdValue.toFixed(2),
          percentage: latestSnapshot.totalValueUSD > 0
            ? ((balance.usdValue / latestSnapshot.totalValueUSD) * 100).toFixed(1)
            : '0',
        }))
        .sort((a: any, b: any) => parseFloat(b.value) - parseFloat(a.value))
        .slice(0, 5);

      // Calculate performance metrics
      const currentValue = snapshots[0]?.totalValueUSD || 0;
      const initialValue = snapshots[snapshots.length - 1]?.totalValueUSD || 0;

      // Find first meaningful value (greater than $0.01)
      const firstMeaningfulValue = Math.max(
        ...snapshots.map((s: any) => s.totalValueUSD).filter((v: number) => v > 0.01),
        currentValue // Fallback to current if no meaningful value found
      );

      const meaningfulReturn = firstMeaningfulValue > 0
        ? ((currentValue - firstMeaningfulValue) / firstMeaningfulValue) * 100
        : 0;

      return {
        totalSnapshots: snapshots.length,
        period: type,
        snapshots,
        currentValue,
        initialValue,
        meaningfulInitialValue: firstMeaningfulValue,
        performance: {
          totalReturn: meaningfulReturn.toFixed(2),
          rawTotalReturn: initialValue > 0 ? ((currentValue - initialValue) / initialValue * 100).toFixed(2) : '0',
          days: snapshots.length,
          avgDailyReturn: snapshots.length > 0 ? (meaningfulReturn / snapshots.length).toFixed(2) : '0',
        },
        summary: {
          totalPortfolioValue: currentValue.toFixed(2),
          topAssets,
          assetPricesUsed: assetPrices,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching account snapshot', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      throw new Error('Unable to fetch account snapshot');
    }
  }



  async getUserAssets(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKeyToUse || !secretKeyToUse) {
      throw new Error('Binance API key or secret is missing');
    }

    try {
      const timestamp = await this.getServerTime();
      const query = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secretKeyToUse)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.post(
          `${this.BASE_URL}/sapi/v3/asset/getUserAsset?${query}&signature=${signature}`,
          null,
          {
            headers: { 'X-MBX-APIKEY': apiKeyToUse },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching user assets', error.response?.data || error.message);
      throw new Error('Unable to fetch user assets');
    }
  }


  /**
   * Get asset details
   */
  async getAssetDetail(asset?: string) {
    const apiKey = this.configService.get<string>('BINANCE_TESTNET_API_KEY');
    const secretKey = this.configService.get<string>('BINANCE_TESTNET_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = Date.now();
      let query = `timestamp=${timestamp}`;

      if (asset) query += `&asset=${asset}`;

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL_TEST}/sapi/v1/asset/assetDetail?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKey },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching asset details', error.response?.data || error.message);
      throw new Error('Unable to fetch asset details');
    }
  }

  /**
   * Get trade fee
   */
  async getTradeFee(symbol?: string) {
    const apiKey = this.configService.get<string>('BINANCE_TESTNET_API_KEY');
    const secretKey = this.configService.get<string>('BINANCE_TESTNET_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const timestamp = Date.now();
      let query = `timestamp=${timestamp}`;

      if (symbol) query += `&symbol=${symbol}`;

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(query)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(
          `${this.BASE_URL_TEST}/sapi/v1/asset/tradeFee?${query}&signature=${signature}`,
          {
            headers: { 'X-MBX-APIKEY': apiKey },
            timeout: 10000,
          },
        ),
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching trade fee', error.response?.data || error.message);
      throw new Error('Unable to fetch trade fee');
    }
  }

  /**
   * Get universal transfer history
   */
  async getAllTransferHistory(current = 1, size = 100) {
    const apiKey = this.configService.get<string>('BINANCE_API_KEY');
    const secretKey = this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    const transferTypes = [
      'MAIN_UMFUTURE', 'UMFUTURE_MAIN',
      'MAIN_CMFUTURE', 'CMFUTURE_MAIN',
      'MAIN_MARGIN', 'MARGIN_MAIN',
      'MARGIN_ISOLATEDMARGIN', 'ISOLATEDMARGIN_MARGIN',
    ];

    try {
      const now = Date.now();
      const sixMonthsAgo = now - 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in ms

      const allRows: any[] = [];

      // Helper function to make API call for a specific transfer type
      const fetchTransfersForType = async (type: string): Promise<any[]> => {
        let pageRows: any[] = [];
        let currentPage = current;
        let hasMore = true;

        while (hasMore) {
          const timestamp = Date.now();
          // Build query string properly
          const queryParams = new URLSearchParams({
            type,
            current: currentPage.toString(),
            size: size.toString(),
            startTime: sixMonthsAgo.toString(),
            endTime: now.toString(),
            timestamp: timestamp.toString(),
          });

          const queryString = queryParams.toString();
          const signature = crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');

          const fullUrl = `${this.BASE_URL}/sapi/v1/asset/transfer?${queryString}&signature=${signature}`;

          try {
            const { data } = await firstValueFrom(
              this.http.get(fullUrl, {
                headers: { 'X-MBX-APIKEY': apiKey },
                timeout: 10000,
              }),
            );

            if (data?.rows?.length) {
              pageRows.push(...data.rows);

              // Check if we have more pages
              const total = data.total || 0;
              const expectedTotal = (currentPage - 1) * size + data.rows.length;
              hasMore = data.rows.length === size && expectedTotal < total;

              currentPage++;
            } else {
              hasMore = false;
            }
          } catch (pageError) {
            this.logger.error(`Error fetching transfers for type ${type} on page ${currentPage}:`,
              pageError.response?.data || pageError.message);
            hasMore = false;
          }
        }

        return pageRows;
      };

      // Fetch transfers for all types sequentially
      for (const type of transferTypes) {
        try {
          const typeRows = await fetchTransfersForType(type);
          allRows.push(...typeRows);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (typeError) {
          this.logger.error(`Error processing transfer type ${type}:`, typeError);
          // Continue with other types instead of failing completely
        }
      }

      // Sort by timestamp descending
      allRows.sort((a, b) => b.timestamp - a.timestamp);

      return {
        total: allRows.length,
        rows: allRows,
        current,
        size,
        pages: Math.ceil(allRows.length / size)
      };

    } catch (error) {
      this.logger.error('Error fetching transfer history', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error('Unable to fetch transfer history');
    }
  }
  async getDepositHistory(apiKey?: string, secretKey?: string) {

    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const now = Date.now();
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000; // 90 days as per API docs

      const queryParams = new URLSearchParams({
        startTime: ninetyDaysAgo.toString(),
        endTime: now.toString(),
        limit: '1000', // Max limit
        timestamp: now.toString(),
      });

      const queryString = queryParams.toString();
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/sapi/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`, {
          headers: {
            'X-MBX-APIKEY': apiKey
          },
          timeout: 10000,
        }),
      );

      // Sort by insertTime descending (newest first)
      const sortedDeposits = data.sort((a: any, b: any) => b.insertTime - a.insertTime);

      return {
        total: data.length,
        deposits: sortedDeposits,
        summary: {
          pending: data.filter((d: any) => d.status === 0).length,
          creditedButCannotWithdraw: data.filter((d: any) => d.status === 6).length,
          wrongDeposit: data.filter((d: any) => d.status === 7).length,
          waitingUserConfirm: data.filter((d: any) => d.status === 8).length,
          success: data.filter((d: any) => d.status === 1).length,
          rejected: data.filter((d: any) => d.status === 2).length,
          totalAmount: data.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0).toFixed(8),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching deposit history', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error('Unable to fetch deposit history');
    }
  }

  async getWithdrawHistory(apiKey?: string, secretKey?: string) {
    const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
    const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing in environment variables');
    }

    try {
      const now = Date.now();
      const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000; // 90 days as per API docs

      const queryParams = new URLSearchParams({
        startTime: ninetyDaysAgo.toString(),
        endTime: now.toString(),
        limit: '1000', // Max limit
        timestamp: now.toString(),
      });

      const queryString = queryParams.toString();
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');

      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/sapi/v1/capital/withdraw/history?${queryString}&signature=${signature}`, {
          headers: {
            'X-MBX-APIKEY': apiKey
          },
          timeout: 15000, // Higher timeout for withdrawal API (weight 18000)
        }),
      );

      // Sort by applyTime descending (newest first)
      const sortedWithdrawals = data.sort((a: any, b: any) => {
        // Convert applyTime string to timestamp for proper sorting
        const getTimeStamp = (timeStr: string) => new Date(timeStr).getTime();
        return getTimeStamp(b.applyTime) - getTimeStamp(a.applyTime);
      });

      return {
        total: data.length,
        withdrawals: sortedWithdrawals,
        summary: {
          emailSent: data.filter((d: any) => d.status === 0).length,
          awaitingApproval: data.filter((d: any) => d.status === 2).length,
          rejected: data.filter((d: any) => d.status === 3).length,
          processing: data.filter((d: any) => d.status === 4).length,
          completed: data.filter((d: any) => d.status === 6).length,
          totalAmount: data.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0).toFixed(8),
          totalFees: data.reduce((sum: number, d: any) => sum + parseFloat(d.transactionFee || '0'), 0).toFixed(8),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching withdrawal history', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle specific Binance errors
      if (error.response?.status === 400 && error.response?.data?.code === -2010) {
        throw new Error('Withdrawal API access not enabled. Please enable withdrawal permissions in your Binance API settings.');
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid API key or secret. Please check your Binance API credentials.');
      }

      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later. (Withdrawal API: 10 requests/second)');
      }

      throw new Error('Unable to fetch withdrawal history');
    }
  }

  async getSecurityInfo() {
    const apiKey = this.configService.get<string>('BINANCE_API_KEY');
    const secretKey = this.configService.get<string>('BINANCE_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing');
    }

    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');

      // Get account API restrictions and security info
      const restrictionsResponse = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/sapi/v1/account/apiRestrictions?${queryString}&signature=${signature}`, {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 10000,
        }),
      );

      // Get account info for 2FA and other permissions
      const accountResponse = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/api/v3/account?${queryString}&signature=${signature}`, {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 10000,
        }),
      );

      return {
        apiRestrictions: restrictionsResponse.data,
        accountPermissions: accountResponse.data.permissions,
        twoFactorEnabled: restrictionsResponse.data.enableTwoFactorAuth || false, // Placeholder, as Binance doesn't directly expose 2FA status
        ipRestrict: restrictionsResponse.data.ipRestrict,
        withdrawEnabled: restrictionsResponse.data.enableWithdrawals,
        internalTransferEnabled: restrictionsResponse.data.enableInternalTransfer,
      };
    } catch (error) {
      this.logger.error('Error fetching security info', error.response?.data || error.message);
      throw new Error('Unable to fetch security information');
    }
  }
  async getServerTime(): Promise<number> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/api/v3/time`, { timeout: 3000 }),
      );
      if (!data?.serverTime) {
        throw new Error('No server time in response');
      }
      return data.serverTime;
    } catch (error) {
      this.logger.error(`Error fetching Binance server time: ${error.message}`);
      return Date.now(); // Fallback to local time
    }
  }
  // async placeOrderListOTOCO(order: OTOCOOrderRequest, apiKey?: string, secretKey?: string): Promise<OTOCOOrderResult> {
  //   const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
  //   const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

  //   if (!apiKeyToUse || !secretKeyToUse) {
  //     this.logger.error('Binance API key or secret is missing');
  //     throw new HttpException(
  //       'Binance API key or secret is missing',
  //       HttpStatus.INTERNAL_SERVER_ERROR
  //     );
  //   }

  //   try {
  //     // Fetch exchange info for symbol
  //     const exchangeInfo = await this.getExchangeInfo(order.symbol);
  //     const lotSizeFilter = exchangeInfo.filters.find(f => f.filterType === 'LOT_SIZE');
  //     const priceFilter = exchangeInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
  //     const notionalFilter = exchangeInfo.filters.find(f => f.filterType === 'NOTIONAL');
  //     const stepSize = parseFloat(lotSizeFilter.stepSize); // 0.1 for RVNUSDT
  //     const tickSize = parseFloat(priceFilter.tickSize); // 0.00001 for RVNUSDT
  //     const minNotional = parseFloat(notionalFilter.minNotional); // 5 for RVNUSDT

  //     // Log input values
  //     this.logger.log(`Input order: ${JSON.stringify(order)}`);

  //     // Validate numeric fields
  //     const workingPrice = parseFloat(order.workingPrice);
  //     const workingQuantity = parseFloat(order.workingQuantity);
  //     const pendingQuantity = parseFloat(order.pendingQuantity);
  //     const pendingAbovePrice = parseFloat(order.pendingAbovePrice);
  //     const pendingAboveStopPrice = parseFloat(order.pendingAboveStopPrice);
  //     const pendingBelowPrice = parseFloat(order.pendingBelowPrice);
  //     const pendingBelowStopPrice = parseFloat(order.pendingBelowStopPrice);

  //     if (
  //       isNaN(workingPrice) ||
  //       isNaN(workingQuantity) ||
  //       isNaN(pendingQuantity) ||
  //       isNaN(pendingAbovePrice) ||
  //       isNaN(pendingAboveStopPrice) ||
  //       isNaN(pendingBelowPrice) ||
  //       isNaN(pendingBelowStopPrice)
  //     ) {
  //       throw new HttpException('Invalid numeric values in order parameters', HttpStatus.BAD_REQUEST);
  //     }

  //     // Validate notional requirement
  //     const notionalValue = workingPrice * workingQuantity;
  //     if (notionalValue < minNotional) {
  //       throw new HttpException(
  //         `Order value must be at least ${minNotional} USDT, got ${notionalValue.toFixed(8)} USDT`,
  //         HttpStatus.BAD_REQUEST
  //       );
  //     }

  //     // Align quantities and prices
  //     const alignedWorkingQuantity = this.alignToStepSize(workingQuantity, stepSize);
  //     const alignedPendingQuantity = this.alignToStepSize(pendingQuantity, stepSize);
  //     const alignedWorkingPrice = this.alignToTickSize(workingPrice, tickSize);
  //     const alignedPendingAbovePrice = this.alignToTickSize(pendingAbovePrice, tickSize);
  //     const alignedPendingAboveStopPrice = this.alignToTickSize(pendingAboveStopPrice, tickSize);
  //     const alignedPendingBelowPrice = this.alignToTickSize(pendingBelowPrice, tickSize);
  //     const alignedPendingBelowStopPrice = this.alignToTickSize(pendingBelowStopPrice, tickSize);

  //     // Log aligned values
  //     this.logger.log(`Aligned values: workingPrice=${alignedWorkingPrice}, pendingAbovePrice=${alignedPendingAbovePrice}, pendingAboveStopPrice=${alignedPendingAboveStopPrice}, pendingBelowPrice=${alignedPendingBelowPrice}, pendingBelowStopPrice=${alignedPendingBelowStopPrice}, workingQuantity=${alignedWorkingQuantity}, pendingQuantity=${alignedPendingQuantity}`);

  //     // Sync timestamp with Binance server
  //     const timestamp = await this.getServerTime();
  //     order.timestamp = timestamp;

  //     this.logger.log(`Placing OTOCO order for ${order.symbol}`);

  //     // Construct parameters object with aligned values
  //     const params: any = {
  //       symbol: order.symbol,
  //       listClientOrderId: `otoco_${order.timestamp}`,
  //       workingType: order.workingType,
  //       workingSide: order.workingSide,
  //       workingPrice: alignedWorkingPrice.toFixed(this.getPrecision(tickSize)),
  //       workingQuantity: alignedWorkingQuantity.toFixed(this.getPrecision(stepSize)),
  //       pendingSide: order.pendingSide,
  //       pendingQuantity: alignedPendingQuantity.toFixed(this.getPrecision(stepSize)),
  //       pendingAboveType: order.pendingAboveType,
  //       pendingBelowType: order.pendingBelowType,
  //       timestamp: order.timestamp.toString(),
  //     };

  //     // Add mandatory parameters based on workingType
  //     if (order.workingType === 'LIMIT' || order.workingType === 'LIMIT_MAKER') {
  //       params.workingTimeInForce = order.workingTimeInForce;
  //     }

  //     // Add mandatory parameters for pendingAboveType
  //     if (order.pendingAboveType === 'TAKE_PROFIT_LIMIT' || order.pendingAboveType === 'STOP_LOSS_LIMIT') {
  //       params.pendingAbovePrice = alignedPendingAbovePrice.toFixed(this.getPrecision(tickSize));
  //       params.pendingAboveStopPrice = alignedPendingAboveStopPrice.toFixed(this.getPrecision(tickSize));
  //       params.pendingAboveTimeInForce = order.pendingAboveTimeInForce;
  //     } else if (order.pendingAboveType === 'STOP_LOSS' || order.pendingAboveType === 'TAKE_PROFIT') {
  //       params.pendingAboveStopPrice = alignedPendingAboveStopPrice.toFixed(this.getPrecision(tickSize));
  //     }

  //     // Add mandatory parameters for pendingBelowType
  //     if (order.pendingBelowType === 'TAKE_PROFIT_LIMIT' || order.pendingBelowType === 'STOP_LOSS_LIMIT') {
  //       params.pendingBelowPrice = alignedPendingBelowPrice.toFixed(this.getPrecision(tickSize));
  //       params.pendingBelowStopPrice = alignedPendingBelowStopPrice.toFixed(this.getPrecision(tickSize));
  //       params.pendingBelowTimeInForce = order.pendingBelowTimeInForce;
  //     } else if (order.pendingBelowType === 'STOP_LOSS' || order.pendingBelowType === 'TAKE_PROFIT') {
  //       params.pendingBelowStopPrice = alignedPendingBelowStopPrice.toFixed(this.getPrecision(tickSize));
  //     }

  //     // Log parameters sent to Binance
  //     this.logger.log(`Params sent to Binance: ${JSON.stringify(params)}`);

  //     // Convert to query string for signature
  //     this.logger.log(`Final workingPrice=${workingPrice}, workingQuantity=${workingQuantity}`);

  //     const queryString = new URLSearchParams(params).toString();

  //     // Generate HMAC-SHA256 signature
  //     const signature = crypto
  //       .createHmac('sha256', secretKeyToUse)
  //       .update(queryString)
  //       .digest('hex');

  //     // Add signature to params
  //     const finalParams = { ...params, signature };

  //     // Send POST request as form data
  //     const { data } = await firstValueFrom(
  //       this.http.post(
  //         `${this.BASE_URL}/api/v3/orderList/otoco`,
  //         new URLSearchParams(finalParams).toString(),
  //         {
  //           headers: {
  //             'X-MBX-APIKEY': apiKey,
  //             'Content-Type': 'application/x-www-form-urlencoded',
  //           },
  //         }
  //       )
  //     );

  //     this.logger.log(`OTOCO order placed successfully: orderListId=${data.orderListId}`);
  //     return data as OTOCOOrderResult;
  //   } catch (error) {
  //     const errorMessage = error.response?.data?.msg || error.message;
  //     const errorCode = error.response?.data?.code || -1;
  //     this.logger.error(`Error placing OTOCO order: ${errorMessage} (code: ${errorCode})`);
  //     throw new HttpException(
  //       `${errorMessage} (code: ${errorCode})`,
  //       HttpStatus.BAD_REQUEST
  //     );
  //   }
  // }

  async getExchangeInfo(symbol: string): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/api/v3/exchangeInfo?symbol=${symbol}`)
      );
      return data.symbols[0];
    } catch (error) {
      this.logger.error(`Error fetching exchange info for ${symbol}: ${error.message}`);
      throw new HttpException(
        `Failed to fetch exchange info for ${symbol}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getTickerPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/api/v3/ticker/price?symbol=${symbol}`)
      );
      return data;
    } catch (error) {
      this.logger.error(`Error fetching ticker price for ${symbol}: ${error.message}`);
      throw new HttpException(
        `Failed to fetch ticker price for ${symbol}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMinNotional(symbol: string): Promise<number> {
    const exchangeInfo = await this.getExchangeInfo(symbol);
    const filter = exchangeInfo.filters.find(
      (f: any) => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL'
    );

    if (!filter || !filter.minNotional) {
      throw new HttpException(
        `No NOTIONAL/MIN_NOTIONAL filter found for ${symbol}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return parseFloat(filter.minNotional);
  }

  alignToStepSize(quantity: number, stepSize: number): number {
    const precision = this.getPrecision(stepSize);
    const steps = Math.round(quantity / stepSize);
    return Number((steps * stepSize).toFixed(precision));
  }

  alignToTickSize(price: number, tickSize: number): number {
    const precision = this.getPrecision(tickSize);
    const steps = Math.round(price / tickSize);
    return Number((steps * tickSize).toFixed(precision));
  }

  getPrecision(value: number): number {
    return Math.max(0, -Math.floor(Math.log10(value)));
  }

  /**
   * Place an OCO (One-Cancels-the-Other) order
   * An OCO consists of 2 orders: one LIMIT/TAKE_PROFIT and one STOP_LOSS/STOP_LOSS_LIMIT
   * When one order fills, the other is automatically canceled
   */
  // async placeOrderOCO(order: {
  //   symbol: string;
  //   side: 'BUY' | 'SELL';
  //   quantity: string;
  //   // Above order (TAKE_PROFIT_LIMIT for SELL, or STOP_LOSS for BUY, etc.)
  //   aboveType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'LIMIT_MAKER' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  //   abovePrice?: string; // Required for STOP_LOSS_LIMIT, LIMIT_MAKER, TAKE_PROFIT_LIMIT
  //   aboveStopPrice?: string; // Required for STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT
  //   aboveTimeInForce?: 'GTC' | 'IOC' | 'FOK'; // Required if aboveType is STOP_LOSS_LIMIT or TAKE_PROFIT_LIMIT
  //   // Below order (STOP_LOSS for SELL, or TAKE_PROFIT for BUY, etc.)
  //   belowType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  //   belowPrice?: string; // Required for STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT
  //   belowStopPrice?: string; // Required for STOP_LOSS, STOP_LOSS_LIMIT, TAKE_PROFIT, TAKE_PROFIT_LIMIT
  //   belowTimeInForce?: 'GTC' | 'IOC' | 'FOK'; // Required if belowType is STOP_LOSS_LIMIT or TAKE_PROFIT_LIMIT
  //   listClientOrderId?: string; // Automatically generated if not sent
  //   newOrderRespType?: 'ACK' | 'RESULT' | 'FULL'; // Default: RESULT
  //   recvWindow?: number; // Default: 5000
  // }, apiKey?: string, secretKey?: string) {
  //   try {
  //     const apiKeyToUse = apiKey || this.configService.get<string>('BINANCE_API_KEY');
  //     const secretKeyToUse = secretKey || this.configService.get<string>('BINANCE_SECRET_KEY');

  //     if (!apiKeyToUse || !secretKeyToUse) {
  //       throw new Error('Binance API key or secret is missing in environment variables');
  //     }

  //     // Validate required parameters
  //     if (!order.symbol || !order.side || !order.quantity || !order.aboveType || !order.belowType) {
  //       throw new Error('Missing required parameters: symbol, side, quantity, aboveType, belowType');
  //     }

  //     // Use Binance server time instead of local time to avoid timestamp skew
  //     const timestamp = await this.getServerTime();

  //     // Get exchange info for precision alignment
  //     const exchangeInfo = await this.getExchangeInfo(order.symbol);
  //     const lotSizeFilter = exchangeInfo.filters.find(f => f.filterType === 'LOT_SIZE');
  //     const priceFilter = exchangeInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
  //     const notionalFilter = exchangeInfo.filters.find(f => f.filterType === 'NOTIONAL');

  //     const stepSize = parseFloat(lotSizeFilter?.stepSize || '0.00000001');
  //     const tickSize = parseFloat(priceFilter?.tickSize || '0.00000001');
  //     const minNotional = parseFloat(notionalFilter?.minNotional || '5');

  //     // Align quantity to step size
  //     const alignedQuantity = this.alignToStepSize(parseFloat(order.quantity), stepSize);

  //     // Validate minimum notional (using above price as reference)
  //     if (order.abovePrice) {
  //       const notionalValue = parseFloat(order.abovePrice) * alignedQuantity;
  //       if (notionalValue < minNotional) {
  //         throw new Error(
  //           `Order value must be at least ${minNotional} USDT, got ${notionalValue.toFixed(8)} USDT`
  //         );
  //       }
  //     }

  //     // Build query parameters
  //     const params: any = {
  //       symbol: order.symbol,
  //       side: order.side,
  //       quantity: alignedQuantity.toFixed(this.getPrecision(stepSize)),
  //       aboveType: order.aboveType,
  //       belowType: order.belowType,
  //       recvWindow: order.recvWindow || '5000',
  //       timestamp: timestamp.toString(),
  //     };

  //     // Add above order parameters if provided
  //     if (order.abovePrice) {
  //       params.abovePrice = this.alignToTickSize(parseFloat(order.abovePrice), tickSize)
  //         .toFixed(this.getPrecision(tickSize));
  //     }
  //     if (order.aboveStopPrice) {
  //       params.aboveStopPrice = this.alignToTickSize(parseFloat(order.aboveStopPrice), tickSize)
  //         .toFixed(this.getPrecision(tickSize));
  //     }
  //     if (order.aboveTimeInForce) {
  //       params.aboveTimeInForce = order.aboveTimeInForce;
  //     }
  //     if (order.listClientOrderId) {
  //       params.listClientOrderId = order.listClientOrderId;
  //     }

  //     // Add below order parameters if provided
  //     if (order.belowPrice) {
  //       params.belowPrice = this.alignToTickSize(parseFloat(order.belowPrice), tickSize)
  //         .toFixed(this.getPrecision(tickSize));
  //     }
  //     if (order.belowStopPrice) {
  //       params.belowStopPrice = this.alignToTickSize(parseFloat(order.belowStopPrice), tickSize)
  //         .toFixed(this.getPrecision(tickSize));
  //     }
  //     if (order.belowTimeInForce) {
  //       params.belowTimeInForce = order.belowTimeInForce;
  //     }

  //     // Set response type (default: RESULT)
  //     if (order.newOrderRespType) {
  //       params.newOrderRespType = order.newOrderRespType;
  //     }

  //     const query = new URLSearchParams(params).toString();
  //     const signature = crypto.createHmac('sha256', secretKeyToUse).update(query).digest('hex');

  //     const url = `${this.BASE_URL}/api/v3/orderList/oco?${query}&signature=${signature}`;

  //     this.logger.log(`🚀 Placing OCO order: ${order.symbol} ${order.side} ${order.quantity}`);
  //     this.logger.debug(`OCO Parameters: ${JSON.stringify(params)}`);

  //     const { data } = await firstValueFrom(
  //       this.http.post(url, null, {
  //         headers: { 'X-MBX-APIKEY': apiKeyToUse },
  //         timeout: 10000
  //       }),
  //     );

  //     this.logger.log(`✅ OCO order placed successfully: orderListId=${data.orderListId}`);
  //     return data;

  //   } catch (error: any) {
  //     this.logger.error('❌ Error placing OCO order:', error.message);

  //     // Handle Binance-specific errors
  //     if (error.response?.data) {
  //       const binanceError = error.response.data;
  //       const errorMsg = binanceError.msg || binanceError.message || 'Unknown error';
  //       this.logger.error(`Binance API Error: ${errorMsg}`, binanceError);

  //       // Provide helpful hints for common errors
  //       if (errorMsg.includes('insufficient balance')) {
  //         this.logger.error(`💡 HINT: Your USDT balance is too low for the order prices. Check:
  //           - Above price × quantity ≥ min notional (usually $5)
  //           - Below price × quantity ≥ min notional (usually $5)
  //           - You have enough USDT if prices are high`);
  //       }
  //       if (errorMsg.includes('notional')) {
  //         this.logger.error(`💡 HINT: Order notional value too low. Try:
  //           - Increasing quantity
  //           - Using higher TP/SL prices
  //           - Ensuring: price × quantity ≥ $5 USDT`);
  //       }
  //       if (errorMsg.includes('precision')) {
  //         this.logger.error(`💡 HINT: Precision issue. Check that:
  //           - Quantity matches exchange step size
  //           - Prices match exchange tick size
  //           - Remove extra decimal places`);
  //       }

  //       throw new HttpException(
  //         { message: errorMsg, original: binanceError },
  //         error.response?.status || HttpStatus.BAD_REQUEST
  //       );
  //     }

  //     throw error;
  //   }
  // }
  /**
   * Get current account information (balances)
   * GET /api/v3/account
   */
  async getAccountInformation(apiKey: string, secretKey: string): Promise<any> {
    if (!apiKey || !secretKey) {
      throw new Error('Binance API key or secret is missing');
    }

    try {
      const serverTime = await this.getServerTime();
      const query = `timestamp=${serverTime}`;
      const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

      const url = `${this.BASE_URL}/api/v3/account?${query}&signature=${signature}`;

      this.logger.debug(`Fetching account info for key ending in ...${apiKey.slice(-5)}`);

      const { data } = await firstValueFrom(
        this.http.get(url, {
          headers: { 'X-MBX-APIKEY': apiKey },
          timeout: 10000,
        }),
      );

      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching account info: ${error.message}`);
      throw error;
    }
  }
}
