import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { ListOrdersQueryDto } from './dto/list-orders.dto';
import { BatchOrderItemDto } from './dto/batch-orders.dto';
import { CancelOrdersQueryDto } from './dto/cancel-orders.dto';
import { CancelBatchOrderItemDto } from './dto/cancel-batch-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelPriceOrdersQueryDto } from './dto/cancel-price-orders.dto';
import { PriceOrderDto } from './dto/price-order.dto';

@Injectable()
export class GateioOrderService {
  private readonly logger = new Logger(GateioOrderService.name);
  private readonly baseUrl = 'https://api.gateio.ws';

  private readonly apiKey = process.env.GATEIO_API_KEY || '';
  private readonly apiSecret = process.env.GATEIO_SECRET_KEY || '';

  private genSign(timestamp: string, method: string, path: string, queryString = '', body = ''): string {
    // Gate.io APIv4 signature format (per docs):
    // Signature string = METHOD + "\n" + REQUEST_URL + "\n" + QUERY_STRING + "\n" + HexEncode(SHA512(payload)) + "\n" + TIMESTAMP
    // Notes:
    // - QUERY_STRING should NOT contain the leading '?' (use empty string if none)
    // - payload should be the JSON string (or empty string), we hash it with SHA512 and hex-encode
    // - TIMESTAMP is Unix time in seconds (string)
    const qs = queryString && queryString.startsWith('?') ? queryString.slice(1) : (queryString || '');
    const payload = body || '';
    const payloadHash = crypto.createHash('sha512').update(payload, 'utf8').digest('hex');
    const signatureString = `${method.toUpperCase()}\n${path}\n${qs}\n${payloadHash}\n${timestamp}`;
    return crypto.createHmac('sha512', this.apiSecret).update(signatureString, 'utf8').digest('hex');
  }

  async cancelPriceOrders(query?: CancelPriceOrdersQueryDto, xGateExptime?: string) {
    try {
      const path = '/api/v4/spot/price_orders';
      const params: Record<string, any> = {};
      if (query?.market) params.market = query.market;
      if (query?.account) params.account = query.account;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'DELETE', path, queryString, '');

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.delete(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error cancelling price orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to cancel price orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPriceOrderByID(orderId: string) {
    try {
      const path = `/api/v4/spot/price_orders/${encodeURIComponent(orderId)}`;
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'GET', path, '', '');

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.get(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching price order ${orderId}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch price order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelPriceOrderByID(orderId: string) {
    try {
      const path = `/api/v4/spot/price_orders/${encodeURIComponent(orderId)}`;
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'DELETE', path, '', '');

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      const { data } = await axios.delete(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error cancelling price order ${orderId}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to cancel price order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelOrders(query: CancelOrdersQueryDto, xGateExptime?: string) {
    try {
      const path = '/api/v4/spot/orders';
      const params: Record<string, any> = {};

      if (query.currency_pair) params.currency_pair = query.currency_pair;
      if (query.side) params.side = query.side;
      if (query.account) params.account = query.account;
      if (query.action_mode) params.action_mode = query.action_mode;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'DELETE', path, queryString, '');

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.delete(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error cancelling orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to cancel orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllOpenOrders(options?: { page?: number; limit?: number; account?: string }) {
    try {
      const path = '/api/v4/spot/open_orders';
      const params: Record<string, any> = {};
      if (options?.page !== undefined) params.page = options.page;
      if (options?.limit !== undefined) params.limit = options.limit;
      if (options?.account) params.account = options.account;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'GET', path, queryString, '');

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.get(url, { headers });
      return data;
    } catch (error: any) {
      // Log full response body when available to aid debugging
      this.logger.error(`Error fetching open orders: ${error.message}`, error.response?.data || error.stack);

      // If axios provided a response, include its status and body. Otherwise return a descriptive message.
      if (error.response) {
        const respBody = error.response.data;
        const respStatus = error.response.status || HttpStatus.INTERNAL_SERVER_ERROR;
        // Return the remote response body directly when it's an object/string so callers see the real error
        throw new HttpException(respBody || 'Failed to fetch open orders (remote error)', respStatus);
      }

      throw new HttpException('Failed to fetch open orders: ' + (error.message || ''), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listOrders(query: ListOrdersQueryDto) {
    try {
      const path = '/api/v4/spot/orders';
      const params: Record<string, any> = {};

      if (query.currency_pair) params.currency_pair = query.currency_pair;
      if (query.status) params.status = query.status;
      if (query.page !== undefined) params.page = query.page;
      if (query.limit !== undefined) params.limit = query.limit;
      if (query.account) params.account = query.account;
      if (query.from !== undefined) params.from = query.from;
      if (query.to !== undefined) params.to = query.to;
      if (query.side) params.side = query.side;

      // Enforce limit maximum for open status
      if (params.status === 'open' && params.limit && params.limit > 100) {
        params.limit = 100;
      }

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'GET', path, queryString, '');

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.get(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error listing orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to list orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async batchCreateOrders(items: BatchOrderItemDto[]) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpException('Request body must be a non-empty array of orders', HttpStatus.BAD_REQUEST);
      }

      // Enforce max unique currency pairs (<=4) and max orders per pair (<=10)
      const pairCounts: Record<string, number> = {};
      const accounts = new Set<string>();

      for (const it of items) {
        if (!it.text) throw new HttpException('text is required for batch orders and must start with t-', HttpStatus.BAD_REQUEST);
        if (!it.text.startsWith('t-')) throw new HttpException('text must be prefixed with "t-"', HttpStatus.BAD_REQUEST);
        const textWithoutPrefix = it.text.substring(2);
        if (textWithoutPrefix.length > 28) throw new HttpException('text without "t-" prefix must not exceed 28 bytes', HttpStatus.BAD_REQUEST);
        if (!/^[0-9A-Za-z._-]+$/.test(textWithoutPrefix)) throw new HttpException('text can only contain 0-9, A-Z, a-z, underscore(_), hyphen(-), or dot(.)', HttpStatus.BAD_REQUEST);

        if (!it.currency_pair) throw new HttpException('currency_pair is required for each order', HttpStatus.BAD_REQUEST);
        if (!it.side || !['buy', 'sell'].includes(it.side)) throw new HttpException('side must be either "buy" or "sell"', HttpStatus.BAD_REQUEST);
        if (!it.amount) throw new HttpException('amount is required for each order', HttpStatus.BAD_REQUEST);
        if (it.type === 'limit' && !it.price) throw new HttpException('price is required when type is "limit"', HttpStatus.BAD_REQUEST);

        pairCounts[it.currency_pair] = (pairCounts[it.currency_pair] || 0) + 1;
        accounts.add(it.account ?? 'spot');
      }

      const uniquePairs = Object.keys(pairCounts).length;
      if (uniquePairs > 4) throw new HttpException('At most 4 trading pairs are allowed in one batch request', HttpStatus.BAD_REQUEST);
      for (const p of Object.keys(pairCounts)) {
        if (pairCounts[p] > 10) throw new HttpException(`At most 10 orders are allowed per trading pair. Pair ${p} has ${pairCounts[p]}`, HttpStatus.BAD_REQUEST);
      }

      if (accounts.size > 1) throw new HttpException('All orders in a batch must use the same account type', HttpStatus.BAD_REQUEST);

      const path = '/api/v4/spot/batch_orders';
      const body = JSON.stringify(items);
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'POST', path, '', body);

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.post(url, body, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error batch placing orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to batch place orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOrder(order: CreateOrderDto) {
    try {
      // Validate required fields
      if (!order.currency_pair) {
        throw new HttpException('currency_pair is required', HttpStatus.BAD_REQUEST);
      }
      if (!order.side || !['buy', 'sell'].includes(order.side)) {
        throw new HttpException('side must be either "buy" or "sell"', HttpStatus.BAD_REQUEST);
      }
      if (!order.amount) {
        throw new HttpException('amount is required', HttpStatus.BAD_REQUEST);
      }

      // Validate price is required for limit orders
      if (order.type === 'limit' && !order.price) {
        throw new HttpException('price is required when type is "limit"', HttpStatus.BAD_REQUEST);
      }

      // Validate time_in_force for market orders
      if (order.type === 'market' && order.time_in_force && !['ioc', 'fok'].includes(order.time_in_force)) {
        throw new HttpException('time_in_force for market orders must be either "ioc" or "fok"', HttpStatus.BAD_REQUEST);
      }

      // Validate text field format if provided
      if (order.text) {
        if (!order.text.startsWith('t-')) {
          throw new HttpException('text must be prefixed with "t-"', HttpStatus.BAD_REQUEST);
        }
        const textWithoutPrefix = order.text.substring(2);
        if (textWithoutPrefix.length > 28) {
          throw new HttpException('text without "t-" prefix must not exceed 28 bytes', HttpStatus.BAD_REQUEST);
        }
        if (!/^[0-9A-Za-z._-]+$/.test(textWithoutPrefix)) {
          throw new HttpException('text can only contain 0-9, A-Z, a-z, underscore(_), hyphen(-), or dot(.)', HttpStatus.BAD_REQUEST);
        }
      }

      const path = '/api/v4/spot/orders';
      const body = JSON.stringify(order);
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'POST', path, '', body);

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      // if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.post(url, body, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error creating order: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to create order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelBatchOrders(items: CancelBatchOrderItemDto[], xGateExptime?: string) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpException('Request body must be a non-empty array of cancel items', HttpStatus.BAD_REQUEST);
      }
      if (items.length > 20) {
        throw new HttpException('At most 20 orders can be cancelled in one request', HttpStatus.BAD_REQUEST);
      }

      for (const it of items) {
        if (!it.currency_pair) throw new HttpException('currency_pair is required for each cancel item', HttpStatus.BAD_REQUEST);
        if (!it.id) throw new HttpException('id is required for each cancel item', HttpStatus.BAD_REQUEST);
      }

      const path = '/api/v4/spot/cancel_batch_orders';
      const body = JSON.stringify(items);
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'POST', path, '', body);

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.post(url, body, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error cancelling batch orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to cancel batch orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // compatibility wrapper for controller (some code expects getOrder)
  async getOrder(orderId: string, options?: { currency_pair?: string; account?: string }) {
    return this.getOrderByID(orderId, options);
  }

  async createTriggerPriceOrder(payload: PriceOrderDto, xGateExptime?: string) {
    try {
      if (!payload || !payload.trigger || !payload.put || !payload.market) {
        throw new HttpException('Invalid request body: trigger, put and market are required', HttpStatus.BAD_REQUEST);
      }
      const { trigger, put } = payload;
      if (!trigger.price) throw new HttpException('trigger.price is required', HttpStatus.BAD_REQUEST);
      if (!['>=', '<='].includes(trigger.rule)) throw new HttpException('trigger.rule must be ">=" or "<="', HttpStatus.BAD_REQUEST);
      if (!Number.isFinite(Number(trigger.expiration))) throw new HttpException('trigger.expiration must be an integer (seconds)', HttpStatus.BAD_REQUEST);

      if (!put.side || !['buy', 'sell'].includes(put.side)) throw new HttpException('put.side must be buy or sell', HttpStatus.BAD_REQUEST);
      if (!put.amount) throw new HttpException('put.amount is required', HttpStatus.BAD_REQUEST);
      if (!put.account) throw new HttpException('put.account is required', HttpStatus.BAD_REQUEST);
      if ((put.type === undefined || put.type === 'limit') && !put.price) throw new HttpException('put.price is required for limit orders', HttpStatus.BAD_REQUEST);

      const path = '/api/v4/spot/price_orders';
      const body = JSON.stringify(payload);
      const url = `${this.baseUrl}${path}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'POST', path, '', body);

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.post(url, body, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error creating price order: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to create price order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listPriceOrders(options: { status: string; market?: string; account?: string; limit?: number; offset?: number }) {
    try {
      const allowedStatus = ['open', 'finished'];
      if (!options || !options.status) {
        throw new HttpException('status is required', HttpStatus.BAD_REQUEST);
      }
      if (!allowedStatus.includes(options.status)) {
        throw new HttpException(`status must be one of: ${allowedStatus.join(', ')}`, HttpStatus.BAD_REQUEST);
      }

      const path = '/api/v4/spot/price_orders';
      const params: Record<string, any> = {};
      params.status = options.status;
      if (options.market) params.market = options.market;
      if (options.account) params.account = options.account;
      if (typeof options.limit !== 'undefined') params.limit = options.limit;
      if (typeof options.offset !== 'undefined') params.offset = options.offset;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'GET', path, queryString, '');

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.get(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error listing price orders: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to list price orders',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOrderByID(orderId: string, options?: { currency_pair?: string; account?: string }) {
    try {
      const path = `/api/v4/spot/orders/${encodeURIComponent(orderId)}`;
      const params: Record<string, any> = {};
      if (options?.currency_pair) params.currency_pair = options.currency_pair;
      if (options?.account) params.account = options.account;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'GET', path, queryString, '');

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      } as any;

      const { data } = await axios.get(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching order ${orderId}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelOrderByID(orderId: string, currency_pair: string, options?: { account?: string; action_mode?: string }, xGateExptime?: string) {
    try {
      if (!currency_pair) {
        throw new HttpException('currency_pair is required', HttpStatus.BAD_REQUEST);
      }

      const path = `/api/v4/spot/orders/${encodeURIComponent(orderId)}`;
      const params: Record<string, any> = { currency_pair };
      if (options?.account) params.account = options.account;
      if (options?.action_mode) params.action_mode = options.action_mode;

      const queryString = Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
      const url = `${this.baseUrl}${path}${queryString}`;

      if (!this.apiKey || !this.apiSecret) {
        throw new HttpException('GateIO API credentials are not configured (GATEIO_API_KEY / GATEIO_SECRET_KEY)', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = this.genSign(timestamp, 'DELETE', path, queryString, '');

      const headers: any = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        KEY: this.apiKey,
        Timestamp: timestamp,
        SIGN: sign,
      };

      if (xGateExptime) headers['x-gate-exptime'] = xGateExptime;

      const { data } = await axios.delete(url, { headers });
      return data;
    } catch (error: any) {
      this.logger.error(`Error cancelling order ${orderId}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to cancel order',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
