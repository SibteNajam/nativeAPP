import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { OrderInfo } from '../dto/order-info.dto';
import { PlaceSpotOrderDto } from '../dto/spotorder.dto';
import { PlacedOrderDto } from '../dto/placed-order.dto';
import { ProcessedOrderDto } from '../dto/processed-order.dto';
import { OpenOrder } from '../entities/open-order.entity';
import { ProcessedOrder } from '../entities/processed-order.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly baseUrl = 'https://api.bitget.com';
  //   private readonly baseUrl = 'https://testnet.bitget.com';

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;

  constructor(
    @InjectRepository(OpenOrder)
    private readonly openOrderRepository: Repository<OpenOrder>,
    @InjectRepository(ProcessedOrder)
    private readonly processedOrderRepository: Repository<ProcessedOrder>,
  ) {
    this.apiKey = process.env.BITGET_API_KEY || '';
    this.apiSecret = process.env.BITGET_SECRET_KEY || '';
    this.passphrase = process.env.BITGET_PASSPHRASE || '';
  }
  private generateSignature(
    timestamp: string,
    method: string,
    endpoint: string,
    queryParams: Record<string, any> = {},
    body: any = '',
    apiSecret?: string
  ): string {
    const secretToUse = apiSecret || this.apiSecret;

    let queryString = '';
    if (queryParams && Object.keys(queryParams).length > 0) {
      queryString =
        '?' +
        Object.entries(queryParams)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
    }

    const bodyString =
      body && typeof body === 'object' ? JSON.stringify(body) : (body || '');

    const message =
      timestamp + method.toUpperCase() + endpoint + queryString + bodyString;

    return crypto
      .createHmac('sha256', secretToUse)
      .update(message)
      .digest('base64');
  }

  async getSymbolPrecision(symbol: string) {
    try {
      const endpoint = '/api/v2/spot/public/symbols';
      const timestamp = Date.now().toString();

      const queryParams: Record<string, any> = {};
      if (symbol) queryParams.symbol = symbol;

      const queryString =
        Object.keys(queryParams).length > 0
          ? '?' + new URLSearchParams(queryParams).toString()
          : '';

      // Public endpoint - no authentication required
      const headers = {
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${endpoint}${queryString}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      // If specific symbol requested, return that symbol's info
      if (symbol) {
        const symbolInfo = data.data.find((s: any) => s.symbol === symbol);
        if (!symbolInfo) {
          throw new HttpException(`Symbol ${symbol} not found`, HttpStatus.NOT_FOUND);
        }
        return symbolInfo;
      }

      // Return all symbols if no specific symbol requested
      return data.data;
    } catch (error: any) {
      this.logger.error(`Error fetching symbol precision: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch symbol precision',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  async getPlanOrders(symbol?: string, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/current-plan-order';
      const timestamp = Date.now().toString();

      // Build query params
      const queryParams: Record<string, any> = {};
      if (symbol) queryParams.symbol = symbol;

      const queryString =
        Object.keys(queryParams).length > 0
          ? '?' + new URLSearchParams(queryParams).toString()
          : '';

      const signature = this.generateSignature(timestamp, 'GET', endpoint, queryParams, '', secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${endpoint}${queryString}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      // According to docs, data.data contains an object with orderList, etc.
      return data.data.orderList ?? [];
    } catch (error: any) {
      this.logger.error(`Error fetching plan (TP/SL) orders: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch plan orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async placeSpotOrder(order: PlaceSpotOrderDto, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      // Get symbol precision information
      const symbolInfo = await this.getSymbolPrecision(order.symbol);
      const pricePrecision = parseInt(symbolInfo.pricePrecision);
      const quantityPrecision = parseInt(symbolInfo.quantityPrecision);

      // Apply precision to size based on order type:
      // - Market BUY: size is in quote currency (USDT) -> use pricePrecision (2 decimals)
      // - Market SELL: size is in base currency -> use quantityPrecision
      // - LIMIT orders: size is in base currency -> use quantityPrecision
      const sizeValue = parseFloat(order.size);
      if (order.orderType === 'market' && order.side === 'buy') {
        // Market BUY: size is USDT amount, use price precision (typically 2 decimals)
        order.size = sizeValue.toFixed(pricePrecision); // Returns string
        this.logger.log(`Market BUY: Applying price precision (${pricePrecision}) to size: ${order.size}`);
      } else {
        // Market SELL or LIMIT: size is base currency quantity, use quantity precision
        order.size = sizeValue.toFixed(quantityPrecision); // Returns string
        this.logger.log(`${order.orderType.toUpperCase()} ${order.side.toUpperCase()}: Applying quantity precision (${quantityPrecision}) to size: ${order.size}`);
      }

      // Apply price precision for limit orders
      if (order.orderType === 'limit' && order.price) {
        const price = parseFloat(order.price);
        order.price = price.toFixed(pricePrecision); // Returns string
      }

      // Apply price precision to preset take profit and stop loss prices
      if (order.presetTakeProfitPrice) {
        const tpPrice = parseFloat(order.presetTakeProfitPrice);
        order.presetTakeProfitPrice = tpPrice.toFixed(pricePrecision); // Returns string
      }

      if (order.presetStopLossPrice) {
        const slPrice = parseFloat(order.presetStopLossPrice);
        order.presetStopLossPrice = slPrice.toFixed(pricePrecision); // Returns string
      }

      // Ensure force parameter is set (required for all orders)
      if (!order.force) {
        order.force = 'gtc'; // Default to good-til-cancelled
      }

      this.logger.log(`Final order payload to Bitget: ${JSON.stringify(order)}`);

      const timestamp = Date.now().toString(); // Unix ms timestamp as string
      const body = JSON.stringify(order);

      const signature = this.generateSignature(timestamp, 'POST', '/api/v2/spot/trade/place-order', {}, body, secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.post(`${this.baseUrl}/api/v2/spot/trade/place-order`, body, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error placing order: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to place order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  // Add this to your OrderService class

  async getSpotOrderInfo(params: OrderInfo, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const timestamp = Date.now().toString();

      // Build query string (only orderId or clientOid; ignore extras like symbol)
      const queryParams: Record<string, string> = {};
      if (params.orderId) queryParams.orderId = params.orderId;
      if (params.clientOid) queryParams.clientOid = params.clientOid;

      // Validate: At least one required param
      if (!params.orderId && !params.clientOid) {
        throw new HttpException('orderId or clientOid is required', HttpStatus.BAD_REQUEST);
      }

      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

      const endpoint = '/api/v2/spot/trade/orderInfo';
      const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

      const signature = this.generateSignature(timestamp, 'GET', endpoint, queryParams, '', secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${fullEndpoint}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error fetching order info: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch order info',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async cancelOrder(symbol: string, orderId: string, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/cancel-order';
      const timestamp = Date.now().toString();
      const body = JSON.stringify({ symbol, orderId });

      const signature = this.generateSignature(timestamp, 'POST', endpoint, {}, body, secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data; // Usually contains canceled order info
    } catch (error: any) {
      this.logger.error(`Error cancelling order: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to cancel order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Cancel all open orders by symbol
   * Cancels all active orders on a symbol asynchronously
   * Frequency limit: 5 times/1s (UID)
   */
  async cancelAllOrdersBySymbol(symbol: string, apiKey?: string, secretKey?: string, passphrase?: string): Promise<any> {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/cancel-symbol-order';
      const timestamp = Date.now().toString();
      const body = JSON.stringify({ symbol });

      const signature = this.generateSignature(timestamp, 'POST', endpoint, {}, body, secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`✅ Initiated cancellation of all orders for ${symbol}. Request processed asynchronously.`);
      return data.data; // Returns { symbol: "BTCUSDT" }
    } catch (error: any) {
      this.logger.error(`Error cancelling all orders by symbol: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to cancel all orders by symbol',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  async getUnfilledOrders(symbol?: string, tpslType: 'normal' | 'tpsl' = 'normal', apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/unfilled-orders';
      const timestamp = Date.now().toString();

      const queryParams: Record<string, any> = {};
      if (symbol) queryParams.symbol = symbol;
      queryParams.tpslType = tpslType; // <--- important!

      const queryString =
        Object.keys(queryParams).length > 0
          ? '?' + new URLSearchParams(queryParams).toString()
          : '';

      const signature = this.generateSignature(timestamp, 'GET', endpoint, queryParams, '', secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${endpoint}${queryString}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error fetching unfilled orders: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch unfilled orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllOpenOrders(symbol?: string, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Get unfilled orders for both normal and tpsl types
      const [normalOrders, tpslOrders, planOrders] = await Promise.all([
        this.getUnfilledOrders(symbol, 'normal', apiKey, secretKey, passphrase),
        this.getUnfilledOrders(symbol, 'tpsl', apiKey, secretKey, passphrase),
        this.getPlanOrders(symbol, apiKey, secretKey, passphrase),
      ]);

      // Combine all orders into one array
      const allOrders = [
        ...(normalOrders || []),
        ...(tpslOrders || []),
        ...(planOrders || []),
      ];

      return {
        totalOrders: allOrders.length,
        orders: allOrders,
        breakdown: {
          normalOrders: normalOrders?.length || 0,
          tpslOrders: tpslOrders?.length || 0,
          planOrders: planOrders?.length || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error fetching all open orders: ${error.message}`);
      throw new HttpException(
        'Failed to fetch all open orders',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getTradeFills(params?: {
    symbol?: string;
    orderId?: string;
    startTime?: string;
    endTime?: string;
    limit?: string;
    idLessThan?: string;
  }, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/fills';
      const timestamp = Date.now().toString();

      const queryParams: Record<string, any> = {};
      if (params?.symbol) queryParams.symbol = params.symbol;
      if (params?.orderId) queryParams.orderId = params.orderId;
      if (params?.startTime) queryParams.startTime = params.startTime;
      if (params?.endTime) queryParams.endTime = params.endTime;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.idLessThan) queryParams.idLessThan = params.idLessThan;

      const queryString =
        Object.keys(queryParams).length > 0
          ? '?' + new URLSearchParams(queryParams).toString()
          : '';

      const signature = this.generateSignature(timestamp, 'GET', endpoint, queryParams, '', secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${endpoint}${queryString}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error fetching trade fills: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch trade fills',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async getPlanSubOrder(planOrderId: string, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const endpoint = '/api/v2/spot/trade/plan-sub-order';
      const timestamp = Date.now().toString();

      const queryParams: Record<string, any> = { planOrderId };

      const queryString = '?' + new URLSearchParams(queryParams).toString();

      const signature = this.generateSignature(timestamp, 'GET', endpoint, queryParams, '', secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.get(`${this.baseUrl}${endpoint}${queryString}`, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error fetching plan sub orders: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch plan sub orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async savePlacedOrders(orders: PlacedOrderDto[]) {
    try {
      const openOrders = orders.map(order => ({
        symbol: order.symbol,
        entry_price: order.entry_price,
        order_type: order.order_type,
        size: order.size,
        quantity: order.quantity,
        stop_loss: order.stop_loss,
        take_profit: order.take_profit,
        side: order.side,
        force: order.force,
        order_id: order.order_id,
        client_oid: order.client_oid,
        trade_placement_time: new Date(order.trade_placement_time),
        tp_level: order.tp_level,
      }));
      console.log("just before saving to db orders", openOrders);
      await this.openOrderRepository.save(openOrders);
      this.logger.log(`Saved ${orders.length} placed orders to database`);
      return { message: 'Placed orders saved successfully' };
    } catch (error: any) {
      this.logger.error(`Error saving placed orders: ${error.message}`);
      throw new HttpException(
        'Failed to save placed orders',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  async saveProcessedOrders(processedOrders: ProcessedOrderDto[]) {
    try {
      const entities = processedOrders.map(p => ({
        symbol: p.symbol,
        side: p.side,
        entry_price: Number(p.entry_price.toFixed(4)), // Round to 4 decimal places
        stop_loss: p.stop_loss !== undefined && p.stop_loss !== null ? Number(p.stop_loss.toFixed(4)) : undefined,
        take_profit_levels: p.take_profit_levels.map(tpl => ({
          level: tpl.level,
          price: Number(tpl.price.toFixed(4)), // Round to 4 decimal places
          percentage: Number(tpl.percentage.toFixed(2)), // Round to 2 decimal places
        })),
        quantity: Number(p.quantity.toFixed(6)), // Round to 6 decimal places
        notional: Number(p.notional.toFixed(6)), // Round to 6 decimal places
        leverage: p.leverage,
        confidence: p.confidence,
        timeframe: p.timeframe,
        analysis_type: p.analysis_type,
        market_condition: p.market_condition,
        risk_level: p.risk_level,
        order_type: p.order_type,
        force: p.force,
        margin_mode: p.margin_mode,
        timestamp: p.timestamp ? new Date(p.timestamp) : undefined,
        amount_percentage: Number(p.amount_percentage.toFixed(2)), // Round to 2 decimal places
      }));
      console.log("just before saving to db processed orders", entities);

      await this.processedOrderRepository.save(entities);
      this.logger.log(`Saved ${processedOrders.length} processed orders to database`);
      return { message: 'Processed orders saved successfully' };
    } catch (error: any) {
      this.logger.error(`Error saving processed orders: ${error.message}`);
      throw new HttpException(`Failed to save processed orders: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async placeBatchOrders(batchOrders: any, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const { symbol, batchMode = 'single', orderList } = batchOrders;

      // Validate orderList length (max 50)
      if (!orderList || orderList.length === 0 || orderList.length > 50) {
        throw new HttpException('orderList must contain 1-50 orders', HttpStatus.BAD_REQUEST);
      }

      // Process each order in the batch
      const processedOrderList = await Promise.all(
        orderList.map(async (order: any) => {
          // For single mode, use the symbol from the main request
          const orderSymbol = batchMode === 'single' ? symbol : order.symbol;
          if (!orderSymbol) {
            throw new HttpException('Symbol is required for each order in multiple mode', HttpStatus.BAD_REQUEST);
          }

          // Get symbol precision information
          const symbolInfo = await this.getSymbolPrecision(orderSymbol);
          const pricePrecision = parseInt(symbolInfo.pricePrecision);
          const quantityPrecision = parseInt(symbolInfo.quantityPrecision);

          // Apply precision adjustments
          if (order.orderType === 'limit') {
            if (!order.price) {
              throw new HttpException('Price is required for limit orders', HttpStatus.BAD_REQUEST);
            }
            const price = parseFloat(order.price);
            order.price = price.toFixed(pricePrecision);
          }

          // Apply quantity precision
          const quantity = parseFloat(order.size);
          order.size = quantity.toFixed(quantityPrecision);

          // Apply price precision to TP/SL prices
          if (order.presetTakeProfitPrice) {
            const tpPrice = parseFloat(order.presetTakeProfitPrice);
            order.presetTakeProfitPrice = tpPrice.toFixed(pricePrecision);
          }

          if (order.presetStopLossPrice) {
            const slPrice = parseFloat(order.presetStopLossPrice);
            order.presetStopLossPrice = slPrice.toFixed(pricePrecision);
          }

          if (order.executeTakeProfitPrice) {
            const etpPrice = parseFloat(order.executeTakeProfitPrice);
            order.executeTakeProfitPrice = etpPrice.toFixed(pricePrecision);
          }

          if (order.executeStopLossPrice) {
            const eslPrice = parseFloat(order.executeStopLossPrice);
            order.executeStopLossPrice = eslPrice.toFixed(pricePrecision);
          }

          // Add symbol to order for multiple mode
          return { ...order, symbol: orderSymbol };
        })
      );

      const timestamp = Date.now().toString();
      const body = JSON.stringify({
        symbol: batchMode === 'single' ? symbol : undefined,
        batchMode,
        orderList: processedOrderList
      });

      const signature = this.generateSignature(timestamp, 'POST', '/api/v2/spot/trade/batch-orders', {}, body, secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.post(`${this.baseUrl}/api/v2/spot/trade/batch-orders`, body, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error placing batch orders: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to place batch orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async cancelBatchOrders(batchCancelOrders: any, apiKey?: string, secretKey?: string, passphrase?: string) {
    try {
      // Use passed credentials or fall back to environment credentials
      const apiKeyToUse = apiKey || this.apiKey;
      const secretKeyToUse = secretKey || this.apiSecret;
      const passphraseToUse = passphrase || this.passphrase;

      const { symbol, batchMode = 'single', orderList } = batchCancelOrders;

      // Validate orderList length (max 50)
      if (!orderList || orderList.length === 0 || orderList.length > 50) {
        throw new HttpException('orderList must contain 1-50 orders', HttpStatus.BAD_REQUEST);
      }

      // Validate that each order has either orderId or clientOid
      for (const order of orderList) {
        if (!order.orderId && !order.clientOid) {
          throw new HttpException('Each order must have either orderId or clientOid', HttpStatus.BAD_REQUEST);
        }
      }

      // Process each order in the batch for multiple mode
      const processedOrderList = orderList.map((order: any) => {
        // For single mode, use the symbol from the main request
        const orderSymbol = batchMode === 'single' ? symbol : order.symbol;
        if (batchMode === 'multiple' && !orderSymbol) {
          throw new HttpException('Symbol is required for each order in multiple mode', HttpStatus.BAD_REQUEST);
        }

        return {
          ...order,
          symbol: orderSymbol
        };
      });

      const timestamp = Date.now().toString();
      const body = JSON.stringify({
        symbol: batchMode === 'single' ? symbol : undefined,
        batchMode,
        orderList: processedOrderList
      });

      const signature = this.generateSignature(timestamp, 'POST', '/api/v2/spot/trade/batch-cancel-order', {}, body, secretKeyToUse);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse,
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      const { data } = await axios.post(`${this.baseUrl}/api/v2/spot/trade/batch-cancel-order`, body, { headers });

      if (data.code !== '00000') {
        throw new HttpException(data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Error canceling batch orders: ${error.message}`);
      throw new HttpException(
        error.response?.data?.msg || 'Failed to cancel batch orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
