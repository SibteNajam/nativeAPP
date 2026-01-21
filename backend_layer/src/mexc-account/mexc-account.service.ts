import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WithdrawHistoryDto } from './dto/withdraw-history.dto';

@Injectable()
export class MexcAccountService {
  private readonly logger = new Logger(MexcAccountService.name);
  private readonly baseUrl = 'https://api.mexc.com';
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MEXC_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('MEXC_SECRET_KEY') || '';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('[MEXC Account Service] API credentials not configured - service will not be functional');
    } else {
      // Log credentials (first/last 4 chars only for security)
      this.logger.log('[MEXC Account Service] Initialized with:');
      this.logger.log(`  API Key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
      this.logger.log(`  Secret Key: ${this.apiSecret.substring(0, 4)}...${this.apiSecret.substring(this.apiSecret.length - 4)}`);
    }
  }

  /**
   * Check if credentials are configured
   */
  private checkCredentials(apiKey?: string, secretKey?: string): void {
    const key = apiKey || this.apiKey;
    const secret = secretKey || this.apiSecret;
    if (!key || !secret) {
      throw new HttpException(
        'MEXC API credentials not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate HMAC SHA256 signature for MEXC API
   * @param queryString - The query string to sign
   * @param secretKey - Optional secret key (defaults to instance secret)
   * @returns Lowercase signature string
   */
  private generateSignature(queryString: string, secretKey?: string): string {
    const secret = secretKey || this.apiSecret;
    return crypto
      .createHmac('sha256', secret)
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
   * Makes a signed GET request
   * Per MEXC documentation:
   * - timestamp is required (milliseconds)
   * - recvWindow defaults to 60000ms, max 60000ms
   * - signature is computed on raw parameter string (NOT URL encoded)
   * - signature is appended to query string
   */
  private async signedGet(path: string, params: Record<string, any> = {}, apiKey?: string, secretKey?: string) {
    const key = apiKey || this.apiKey;
    const timestamp = Date.now();
    const allParams: Record<string, any> = {
      ...params,
      timestamp: params.timestamp || timestamp,
      recvWindow: params.recvWindow || 60000
    };

    // Build signature string (WITHOUT URL encoding) for HMAC
    const signatureString = this.buildSignatureString(allParams);
    const signature = this.generateSignature(signatureString, secretKey);

    // Build query string (WITH URL encoding) for actual URL
    const queryString = this.buildQueryString(allParams);

    // Build final URL with signature appended
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;
    this.logger.debug(`Signature String: ${signatureString}`);
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MEXC-APIKEY': key,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Make signed POST request
   */
  private async signedPost(path: string, params: Record<string, any> = {}, apiKey?: string, secretKey?: string) {
    const key = apiKey || this.apiKey;
    const timestamp = Date.now();
    const allParams: Record<string, any> = {
      ...params,
      timestamp: params.timestamp || timestamp,
      recvWindow: params.recvWindow || 60000,
    };

    const signatureString = this.buildSignatureString(allParams);
    const signature = this.generateSignature(signatureString, secretKey);
    const queryString = this.buildQueryString(allParams);
    const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;

    this.logger.debug(`POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MEXC-APIKEY': key,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * GET /api/v3/capital/config/getall
   * Query the currency information (networks, fees, limits)
   * Permission: SPOT_WITHDRAW_READ
   * Weight(IP): 10
   */
  async getCapitalConfig(apiKey?: string, secretKey?: string): Promise<any> {
    this.checkCredentials(apiKey, secretKey);
    try {
      const data = await this.signedGet('/api/v3/capital/config/getall', {}, apiKey, secretKey);

      // Summarize and log a compact preview so Swagger / terminal don't get overwhelmed
      try {
        const total = Array.isArray(data) ? data.length : 0;
        const previewCount = 3;
        const preview = Array.isArray(data)
          ? data.slice(0, previewCount).map((item: any) => ({
            coin: item.coin,
            name: item.Name ?? item.name ?? null,
            networkCount: Array.isArray(item.networkList) ? item.networkList.length : 0,
            networks: Array.isArray(item.networkList)
              ? item.networkList.slice(0, 3).map((n: any) => ({
                network: n.network ?? n.netWork ?? null,
                withdrawEnable: n.withdrawEnable,
                withdrawFee: n.withdrawFee,
              }))
              : [],
          }))
          : data;

        this.logger.log(`[MEXC Capital Config] received ${total} items. Preview (first ${previewCount}):`);
        // Use debug log for pretty-printed JSON preview so it appears in terminal
        this.logger.debug(JSON.stringify(preview, null, 2));
      } catch (logErr) {
        // Ensure any logging error doesn't break the API flow
        this.logger.warn('Failed to build preview for capital config', logErr?.stack || logErr);
      }

      return data;
    } catch (error: any) {
      this.logger.error('Error fetching capital config', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch capital config',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/v3/capital/deposit/hisrec
   * Query deposit history (supporting network)
   * Permission: SPOT_WITHDRAW_READ
   * Weight(IP): 1
   */
  async getDepositHistory(params: Record<string, any> = {}, apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    try {
      const queryParams: Record<string, any> = {};
      if (params.coin) queryParams.coin = params.coin;
      if (params.status) queryParams.status = params.status;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;
      // Treat recvWindow as optional; default to 6000ms if not provided
      queryParams.recvWindow = params.recvWindow !== undefined && params.recvWindow !== null ? params.recvWindow : 6000;

      return await this.signedGet('/api/v3/capital/deposit/hisrec', queryParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error fetching deposit history', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch deposit history',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/v3/capital/transfer
   * Universal transfer between accounts
   * Permission: SPOT_TRANSFER_WRITE
   * Weight(IP): 1
   * Note: MEXC expects params in query string for signing; we'll accept them as params
   */
  async postTransfer(params: { fromAccountType: string; toAccountType: string; asset: string; amount: string; clientTranId?: string; recvWindow?: number; }, apiKey?: string, secretKey?: string) {
    try {
      const requestParams: Record<string, any> = {
        fromAccountType: params.fromAccountType,
        toAccountType: params.toAccountType,
        asset: params.asset,
        amount: params.amount,
      };
      if (params.clientTranId) requestParams.clientTranId = params.clientTranId;
      if (params.recvWindow !== undefined) requestParams.recvWindow = params.recvWindow;

      return await this.signedPost('/api/v3/capital/transfer', requestParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error performing transfer', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to perform transfer',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/v3/capital/transfer
   * Query user universal transfer history
   * Permission: SPOT_TRANSFER_READ
   * Weight(IP): 1
   */
  async getTransferHistory(params: Record<string, any> = {}, apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    try {
      const queryParams: Record<string, any> = {};
      if (params.fromAccountType) queryParams.fromAccountType = params.fromAccountType;
      if (params.toAccountType) queryParams.toAccountType = params.toAccountType;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.size !== undefined) queryParams.size = params.size;
      if (params.recvWindow !== undefined) queryParams.recvWindow = params.recvWindow;

      return await this.signedGet('/api/v3/capital/transfer', queryParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error fetching transfer history', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch transfer history',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * GET /api/v3/capital/withdraw/history
   * Query withdraw history (supporting network)
   * Permission: SPOT_WITHDRAW_READ
   * Weight(IP): 1
   * 
   * Notes:
   * - Default returns records of last 7 days
   * - Ensure default timestamp of startTime and endTime does not exceed 7 days
   * - Can query 90 days data at most
   * - Supported multiple network coins's withdraw history may not return the 'network' field
   * 
   * @param params - Query parameters
   * @returns Array of withdraw history records
   */
  async getWithdrawHistory(params: WithdrawHistoryDto = {}, apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    try {
      // Filter out undefined values and prepare params
      const queryParams: Record<string, any> = {};

      if (params.coin) queryParams.coin = params.coin;
      if (params.status) queryParams.status = params.status;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;
      if (params.recvWindow !== undefined) queryParams.recvWindow = params.recvWindow;

      return await this.signedGet('/api/v3/capital/withdraw/history', queryParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error fetching withdraw history', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch withdraw history',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v3/myTrades
   * Get user trade records for a specific symbol
   * Permission: SPOT_ACCOUNT_READ
   * Weight(IP): 10
   * 
   * Notes:
   * - startTime and endTime cannot be sent together with fromId
   * - Default limit 100; max 1000
   * - If fromId is sent, the return is positive sequence, otherwise it is in reverse
   * 
   * @param params - Query parameters including symbol (required)
   * @returns Array of trade records
   */
  async getMyTrades(params: any, apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    if (!params.symbol) {
      throw new HttpException('Symbol is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const queryParams: Record<string, any> = {
        symbol: params.symbol,
      };

      if (params.orderId) queryParams.orderId = params.orderId;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.recvWindow !== undefined) queryParams.recvWindow = params.recvWindow;

      return await this.signedGet('/api/v3/myTrades', queryParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error fetching my trades', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch my trades',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v3/tradeFee
   * Query user's current trading fees for a symbol
   * Permission: SPOT_ACCOUNT_READ
   * Weight(IP): 20
   * 
   * @param params - Query parameters including symbol (required)
   * @returns Trade fee information
   */
  async getTradeFee(params: any, apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    if (!params.symbol) {
      throw new HttpException('Symbol is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const queryParams: Record<string, any> = {
        symbol: params.symbol,
      };

      if (params.recvWindow !== undefined) queryParams.recvWindow = params.recvWindow;

      return await this.signedGet('/api/v3/tradeFee', queryParams, apiKey, secretKey);
    } catch (error: any) {
      this.logger.error('Error fetching trade fee', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch trade fee',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v3/account
   * Query spot account information (balances)
   * Permission: SPOT_ACCOUNT_READ
   */
  async getAccountInfo(apiKey?: string, secretKey?: string) {
    this.checkCredentials(apiKey, secretKey);
    try {
      const data = await this.signedGet('/api/v3/account', {}, apiKey, secretKey);

      // data typically includes a 'balances' array: [{ asset, free, locked }, ...]
      try {
        const balances = Array.isArray(data?.balances) ? data.balances : [];
        const nonZero = balances.filter((b: any) => {
          const free = Number(b.free ?? 0);
          const locked = Number(b.locked ?? 0);
          return free + locked > 0;
        });

        this.logger.log(`[MEXC Account] total balances: ${balances.length}, non-zero: ${nonZero.length}`);
        this.logger.debug(JSON.stringify(nonZero.slice(0, 10), null, 2));
      } catch (logErr) {
        this.logger.warn('Failed to build preview for account balances', logErr?.stack || logErr);
      }

      return data;
    } catch (error: any) {
      this.logger.error('Error fetching account info', error?.response?.data || error?.stack);
      throw new HttpException(
        error?.response?.data || 'Failed to fetch account info',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
