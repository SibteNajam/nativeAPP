import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface OpenOrdersParams {
  symbol?: string;
  recvWindow?: number;
}

export interface OpenOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  stpMode: string;
  cancelReason: string;
  origQuoteOrderQty: string;
}

@Injectable()
export class MexcOrderService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.mexc.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MEXC_API_KEY') || '';
    this.secretKey = this.configService.get<string>('MEXC_SECRET_KEY') || '';

    if (!this.apiKey || !this.secretKey) {
      console.warn('[MEXC Order Service] API credentials not configured - service will not be functional');
    } else {
      // Log credentials (first/last 4 chars only for security)
      console.log('[MEXC Order Service] Initialized with:');
      console.log(`  API Key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
      console.log(`  Secret Key: ${this.secretKey.substring(0, 4)}...${this.secretKey.substring(this.secretKey.length - 4)}`);
    }
  }

  /**
   * Check if credentials are configured
   */
  private checkCredentials(): void {
    if (!this.apiKey || !this.secretKey) {
      throw new HttpException(
        'MEXC API credentials not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate HMAC SHA256 signature for MEXC API
   * @param queryString - The query string to sign
   * @returns Lowercase signature string
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex')
      .toLowerCase(); // Signature must be lowercase only
  }

  /**
   * Build query string from parameters WITHOUT URL encoding
   * This is used for signature generation
   * Per MEXC docs: signature is computed on raw values
   */
  private buildSignatureString(params: Record<string, any>): string {
    return Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .sort() // Sort keys alphabetically for consistency
      .map(key => `${key}=${params[key]}`)
      .join('&');
  }

  /**
   * Build query string from parameters WITH URL encoding
   * This is used for the actual HTTP request URL
   */
  private buildQueryString(params: Record<string, any>): string {
    return Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .sort() // Sort keys alphabetically for consistency
      .map(key => {
        const value = params[key];
        const encodedValue = encodeURIComponent(String(value));
        return `${key}=${encodedValue}`;
      })
      .join('&');
  }

  /**
   * Get all open orders
   * @param symbol - Optional trading pair symbol (e.g., 'BTCUSDT')
   * @param recvWindow - Optional receive window in milliseconds (default: 60000, max: 60000)
   * @returns Array of open orders
   */
  async getOpenOrders(
    symbol?: string,
    recvWindow: number = 60000,
  ): Promise<OpenOrder[]> {
    this.checkCredentials();
    try {
      // Validate recvWindow
      if (recvWindow > 60000) {
        throw new HttpException(
          'recvWindow cannot exceed 60000 milliseconds',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Build parameters object
      const timestamp = Date.now();
      const params: any = {
        recvWindow,
        timestamp,
      };

      // Add symbol if provided
      if (symbol) {
        params.symbol = symbol;
      }

      // Build signature string (WITHOUT URL encoding) for HMAC
      const signatureString = this.buildSignatureString(params);
      const signature = this.generateSignature(signatureString);

      // Build query string (WITH URL encoding) for actual URL
      const queryString = this.buildQueryString(params);

      // Build final URL with signature appended
      const url = `${this.baseUrl}/api/v3/openOrders?${queryString}&signature=${signature}`;

      console.log('Debug Info:');
      console.log('Signature String:', signatureString);
      console.log('Query String:', queryString);
      console.log('Signature:', signature);
      console.log('Full URL:', url);

      // Make API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MEXC-APIKEY': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new HttpException(
          {
            message: 'Rate limit exceeded',
            retryAfter: retryAfter ? parseInt(retryAfter) : null,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Handle WAF violations
      if (response.status === 403) {
        throw new HttpException(
          'WAF limit violated',
          HttpStatus.FORBIDDEN,
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Provide helpful error messages
        let errorMessage = errorData.msg || 'MEXC API request failed';
        if (errorData.code === 700002) {
          errorMessage += ' - Please verify your MEXC API credentials are correct and have SPOT_DEAL_READ permission. Check that the API key is activated in your MEXC account.';
        } else if (errorData.code === 700003) {
          errorMessage += ' - Timestamp outside recvWindow. Try increasing recvWindow or check system clock synchronization.';
        } else if (errorData.code === 700006) {
          errorMessage += ' - IP not whitelisted. Add your server IP to the API key whitelist in MEXC.';
        } else if (errorData.code === 700007) {
          errorMessage += ' - No permission to access this endpoint. Check API key permissions.';
        }

        throw new HttpException(
          {
            code: errorData.code,
            message: errorMessage,
            originalError: errorData,
          },
          response.status,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Re-throw HttpExceptions
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle other errors
      throw new HttpException(
        {
          message: 'Failed to fetch open orders',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Make signed GET request
   */
  private async signedGet(path: string, params: Record<string, any> = {}) {
    const timestamp = Date.now();
    const allParams = {
      ...params,
      recvWindow: params.recvWindow || 60000,
      timestamp,
    };

    const signatureString = this.buildSignatureString(allParams);
    const signature = this.generateSignature(signatureString);
    const queryString = this.buildQueryString(allParams);
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MEXC-APIKEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Make signed POST request
   */
  private async signedPost(path: string, params: Record<string, any> = {}) {
    const timestamp = Date.now();
    const allParams = {
      ...params,
      recvWindow: params.recvWindow || 60000,
      timestamp,
    };

    const signatureString = this.buildSignatureString(allParams);
    const signature = this.generateSignature(signatureString);
    const queryString = this.buildQueryString(allParams);
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MEXC-APIKEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Handle API response
   */
  private async handleResponse(response: Response) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          retryAfter: retryAfter ? parseInt(retryAfter) : null,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (response.status === 403) {
      throw new HttpException('WAF limit violated', HttpStatus.FORBIDDEN);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.msg || 'MEXC API request failed';

      if (errorData.code === 700002) {
        errorMessage += ' - Invalid signature or API credentials';
      } else if (errorData.code === 700003) {
        errorMessage += ' - Timestamp outside recvWindow';
      } else if (errorData.code === 700006) {
        errorMessage += ' - IP not whitelisted';
      } else if (errorData.code === 700007) {
        errorMessage += ' - No permission to access this endpoint';
      }

      throw new HttpException(
        {
          code: errorData.code,
          message: errorMessage,
          originalError: errorData,
        },
        response.status,
      );
    }

    return response.json();
  }


  /**
   * Query UID
   * GET /api/v3/uid
   * Permission: SPOT_ACCOUNT_READ
   * Weight(IP): 1
   */
  async getUid(recvWindow?: number): Promise<{ uid: string }> {
    this.checkCredentials();
    try {
      return await this.signedGet('/api/v3/uid', { recvWindow });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to fetch UID', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user API default symbols
   * GET /api/v3/selfSymbols
   * Permission: SPOT_ACCOUNT_R
   * Weight(IP): 1
   */
  async getSelfSymbols(): Promise<{ code: number; data: string[]; msg: string | null }> {
    this.checkCredentials();
    try {
      return await this.signedGet('/api/v3/selfSymbols', {});
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to fetch self symbols', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * Create new order
   * POST /api/v3/order
   * Permission: SPOT_DEAL_WRITE
   * Weight(IP): 1, Weight(UID): 1
   */
  async createOrder(orderParams: Record<string, any>): Promise<any> {
    this.checkCredentials();
    try {
      return await this.signedPost('/api/v3/order', orderParams);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to create order', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create batch orders
   * POST /api/v3/batchOrders
   * Permission: SPOT_DEAL_WRITE
   * Weight(IP): 1, Weight(UID): 1
   * Rate limit: 2 times/s
   */
  async createBatchOrders(batchOrders: any[]): Promise<any> {
    this.checkCredentials();
    try {
      const params: Record<string, any> = {
        batchOrders: JSON.stringify(batchOrders),
      };

      return await this.signedPost('/api/v3/batchOrders', params);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to create batch orders', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Make signed DELETE request
   */
  private async signedDelete(path: string, params: Record<string, any> = {}) {
    const timestamp = Date.now();
    const allParams = {
      ...params,
      recvWindow: params.recvWindow || 60000,
      timestamp,
    };

    const signatureString = this.buildSignatureString(allParams);
    const signature = this.generateSignature(signatureString);
    const queryString = this.buildQueryString(allParams);
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-MEXC-APIKEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Cancel an active order
   * DELETE /api/v3/order
   * Permission: SPOT_DEAL_WRITE
   * Weight(IP): 1
   */
  async cancelOrder(params: {
    symbol: string;
    orderId?: string;
    origClientOrderId?: string;
    newClientOrderId?: string;
  }): Promise<any> {
    this.checkCredentials();
    try {
      // Validate that either orderId or origClientOrderId is provided
      if (!params.orderId && !params.origClientOrderId) {
        throw new HttpException(
          'Either orderId or origClientOrderId must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const requestParams: Record<string, any> = {
        symbol: params.symbol,
      };

      if (params.orderId) requestParams.orderId = params.orderId;
      if (params.origClientOrderId) requestParams.origClientOrderId = params.origClientOrderId;
      if (params.newClientOrderId) requestParams.newClientOrderId = params.newClientOrderId;

      return await this.signedDelete('/api/v3/order', requestParams);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to cancel order', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel all open orders on a symbol
   * DELETE /api/v3/openOrders
   * Permission: SPOT_DEAL_WRITE
   * Weight(IP): 1
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    this.checkCredentials();
    try {
      return await this.signedDelete('/api/v3/openOrders', { symbol });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to cancel all orders', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Query an order's status
   * GET /api/v3/order
   * Permission: SPOT_DEAL_READ
   * Weight(IP): 2
   */
  async queryOrder(params: {
    symbol: string;
    orderId?: string;
    origClientOrderId?: string;
  }): Promise<any> {
    try {
      // Validate that either orderId or origClientOrderId is provided
      if (!params.orderId && !params.origClientOrderId) {
        throw new HttpException(
          'Either orderId or origClientOrderId must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const requestParams: Record<string, any> = {
        symbol: params.symbol,
      };

      if (params.orderId) requestParams.orderId = params.orderId;
      if (params.origClientOrderId) requestParams.origClientOrderId = params.origClientOrderId;

      return await this.signedGet('/api/v3/order', requestParams);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to query order', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all orders (active, cancelled, or completed)
   * GET /api/v3/allOrders
   * Permission: SPOT_DEAL_READ
   * Weight(IP): 10
   * 
   * Note: Query period is latest 24 hours by default. Can query max 7 days.
   */
  async getAllOrders(params: {
    symbol: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<any> {
    this.checkCredentials();
    try {
      const requestParams: Record<string, any> = {
        symbol: params.symbol,
      };

      // Default time window: if not provided, use last 6 days -> startTime = now - 6 days, endTime = now
      const now = Date.now();
      const sixDaysMs = 6 * 24 * 60 * 60 * 1000;

      if (params.startTime !== undefined && params.startTime !== null) {
        requestParams.startTime = params.startTime;
      } else {
        requestParams.startTime = now - sixDaysMs;
      }

      if (params.endTime !== undefined && params.endTime !== null) {
        requestParams.endTime = params.endTime;
      } else {
        requestParams.endTime = now;
      }

      if (params.limit !== undefined && params.limit !== null) requestParams.limit = params.limit;

      return await this.signedGet('/api/v3/allOrders', requestParams);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { message: 'Failed to fetch all orders', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}