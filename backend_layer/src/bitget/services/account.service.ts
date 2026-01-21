import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly baseUrl = 'https://api.bitget.com';
  // private readonly baseUrl = 'https://api-testnet.bitget.com';
  private axiosInstance: AxiosInstance;

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;

  constructor() {
    this.apiKey = process.env.BITGET_API_KEY || '';
    this.apiSecret = process.env.BITGET_SECRET_KEY || '';
    this.passphrase = process.env.BITGET_PASSPHRASE || '';

    this.axiosInstance = axios.create({
      timeout: 30000, // Increased from 10000 to 30000ms for better network resilience
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Generate signature for authenticated requests
  private generateSignature(
    apiSecret: string,
    timestamp: string,
    method: string,
    endpoint: string,
    queryString: string = '',
    body: string = '',
  ): string {
    // Must include '?' if query string exists
    const fullQuery = queryString ? `?${queryString}` : '';
    const message = timestamp + method.toUpperCase() + endpoint + fullQuery + body;

    return crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('base64');
  }


  // Make authenticated request with retry logic
  private async makeAuthRequest(method: string, endpoint: string, params: any = {}, body: any = null, retryCount: number = 0, apiKey?: string, apiSecret?: string, passphrase?: string) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    const apiKeyToUse = apiKey || this.apiKey;
    const apiSecretToUse = apiSecret || this.apiSecret;
    const passphraseToUse = passphrase || this.passphrase;

    try {
      const timestamp = Date.now().toString();
      let queryString = '';
      let bodyString = '';

      if (method === 'GET' && Object.keys(params).length > 0) {
        queryString = new URLSearchParams(params).toString();
      }
      if (method === 'POST' && body) {
        bodyString = JSON.stringify(body);
      }
      const signature = this.generateSignature(apiSecretToUse, timestamp, method, endpoint, queryString, bodyString);

      const headers = {
        'ACCESS-KEY': apiKeyToUse,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphraseToUse, // REQUIRED
        'Content-Type': 'application/json',
        locale: 'en-US',
      };

      let url = `${this.baseUrl}${endpoint}`;
      if (queryString) {
        url += `?${queryString}`;
      }

      const config: any = {
        method,
        url,
        headers,
      };

      if (method === 'POST' && body) {
        config.data = body;
      }

      const response = await this.axiosInstance(config);

      if (response.data.code !== '00000') {
        throw new HttpException(response.data.msg || 'Bitget API Error', HttpStatus.BAD_REQUEST);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(`API Request failed (attempt ${retryCount + 1}/${maxRetries + 1}): ${error.message}`);

      // Check if it's a network error that should be retried
      const isRetryableError = error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.message.includes('timeout') ||
        error.message.includes('Network Error');

      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        this.logger.warn(`Network error for ${endpoint}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeAuthRequest(method, endpoint, params, body, retryCount + 1, apiKey, apiSecret, passphrase);
      }

      // Check if it's a network error and don't throw HttpException for network issues
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message.includes('timeout')) {
        this.logger.warn(`Network error for ${endpoint}, giving up after ${maxRetries} retries`);
        return null; // Return null instead of throwing
      }

      throw new HttpException(
        error.response?.data?.msg || 'Failed to fetch data from Bitget',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //spot

  async getAccountInfo(apiKey?: string, apiSecret?: string, passphrase?: string) {
    if (!apiKey || !apiSecret || !passphrase) {
      apiKey = process.env.BITGET_API_KEY;
      apiSecret = process.env.BITGET_SECRET_KEY;
      passphrase = process.env.BITGET_PASSPHRASE;
    }
    return this.makeAuthRequest('GET', '/api/v2/spot/account/info', {}, null, 0, apiKey, apiSecret, passphrase);
  }

  async getSpotAccount(apiKey?: string, apiSecret?: string, passphrase?: string) {

    if (!apiKey || !apiSecret || !passphrase) {
      apiKey = process.env.BITGET_API_KEY || '';
      apiSecret = process.env.BITGET_SECRET_KEY || '';
      passphrase = process.env.BITGET_PASSPHRASE || '';
    }
    const result = await this.makeAuthRequest('GET', '/api/v2/spot/account/assets', {}, null, 0, apiKey, apiSecret, passphrase);
    if (result === null) {
      throw new HttpException('Network error - unable to fetch account data', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  async getSpotCoinAsset(coin: string, apiKey?: string, apiSecret?: string, passphrase?: string) {
    if (!apiKey || !apiSecret || !passphrase) {
      apiKey = process.env.BITGET_API_KEY;
      apiSecret = process.env.BITGET_SECRET_KEY;
      passphrase = process.env.BITGET_PASSPHRASE;
    }
    const result = await this.makeAuthRequest('GET', '/api/v2/spot/account/assets', { coin }, null, 0, apiKey, apiSecret, passphrase);
    if (result === null) {
      throw new HttpException('Network error - unable to fetch coin asset data', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  async getSpotAccountBills(params: {
    coin?: string;
    groupType?: string;
    businessType?: string;
    after?: string;
    before?: string;
    limit?: number;
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string;
  }) {
    if (!params.apiKey || !params.apiSecret || !params.passphrase) {
      params.apiKey = process.env.BITGET_API_KEY;
      params.apiSecret = process.env.BITGET_SECRET_KEY;
      params.passphrase = process.env.BITGET_PASSPHRASE;
    }
    return this.makeAuthRequest('GET', '/api/v2/spot/account/bills', params);
  }

  async transfer(params: {
    fromType: string; // spot_account, mix_account, etc.
    toType: string;
    amount: string;
    coin: string;
    clientOid?: string;
  }) {
    return this.makeAuthRequest('POST', '/api/v2/spot/wallet/transfer', {}, params);
  }


  async getAccountTransferRecords(params: {
    coin: string;               // required
    fromType?: string;           // optional
    startTime?: string;          // optional, Unix ms timestamp
    endTime?: string;            // optional, Unix ms timestamp
    clientOid?: string;          // optional
    pageNum?: string;            // optional
    limit?: string;              // optional
  }) {
    return this.makeAuthRequest('GET', '/api/v2/spot/account/transferRecords', params);
  }
  async getTransferRecordById(transferId: string) {
    return this.makeAuthRequest('GET', '/api/v2/spot/account/transfer-record', { transferId });
  }

  async getDepositHistory(params: {
    coin?: string;
    orderId?: string;
    startTime?: string;
    endTime?: string;
    limit?: string;
    idLessThan?: string;
  }, apiKey?: string, apiSecret?: string, passphrase?: string) {
    // Set default time range if not provided
    const now = Date.now();
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000); // 60 days in milliseconds

    const finalParams = {
      ...params,
      startTime: params.startTime || sixtyDaysAgo.toString(),
      endTime: params.endTime || now.toString(),
    };

    return this.makeAuthRequest('GET', '/api/v2/spot/wallet/deposit-records', finalParams, null, 0, apiKey, apiSecret, passphrase);
  }

  async getWithdrawalHistory(params: {
    coin?: string;
    orderId?: string;
    startTime?: string;
    endTime?: string;
    limit?: string;
    idLessThan?: string;
  }, apiKey?: string, apiSecret?: string, passphrase?: string) {
    // Set default time range if not provided
    const now = Date.now();
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000); // 60 days in milliseconds

    const finalParams = {
      ...params,
      startTime: params.startTime || sixtyDaysAgo.toString(),
      endTime: params.endTime || now.toString(),
    };

    return this.makeAuthRequest('GET', '/api/v2/spot/wallet/withdrawal-records', finalParams, null, 0, apiKey, apiSecret, passphrase);
  }

  async withdraw(params: {
    coin: string;
    address: string;
    chain: string;
    amount: string;
    remark?: string;
    clientOid?: string;
    tag?: string;
  }) {
    return this.makeAuthRequest('POST', '/api/v2/spot/wallet/withdrawal', {}, params);
  }

  async getDepositAddress(coin: string, chain?: string, size?: string) {
    const params: any = { coin };
    if (chain) params.chain = chain;
    if (size) params.size = size;
    return this.makeAuthRequest('GET', '/api/v2/spot/wallet/deposit-address', params);
  }

  /**
   * Get open positions with USD values (similar to Binance implementation)
   * Fetches spot account balances and calculates USD value for each asset
   */
  async getOpenPositions(apiKey?: string, apiSecret?: string, passphrase?: string) {
    try {
      // Get spot account balances
      const balances = await this.getSpotAccount(apiKey, apiSecret, passphrase);

      if (!balances || balances.length === 0) {
        return [];
      }

      const positions: any[] = [];

      // Filter non-zero balances
      const nonZeroBalances = balances.filter((balance: any) =>
        parseFloat(balance.available) > 0 || parseFloat(balance.frozen) > 0 || parseFloat(balance.locked) > 0
      );

      // For each asset, get current price and calculate USD value
      for (const balance of nonZeroBalances) {
        const coin = balance.coin;
        const available = parseFloat(balance.available);
        const frozen = parseFloat(balance.frozen || '0');
        const locked = parseFloat(balance.locked || '0');
        const totalAmount = available + frozen + locked;

        let valueUsd = 0;
        let pricePerUnit = 0;

        // USDT and stablecoins are 1:1 with USD
        if (coin === 'USDT' || coin === 'USDC' || coin === 'BUSD' || coin === 'DAI') {
          valueUsd = totalAmount;
          pricePerUnit = 1;
        } else {
          // Try to fetch current price from symbol/USDT pair
          try {
            const symbol = `${coin}USDT`;

            // Make a public API request to get ticker price
            const timestamp = Date.now().toString();
            const endpoint = '/api/v2/spot/market/tickers';
            const queryParams: any = { symbol };
            const queryString = Object.keys(queryParams).length > 0
              ? '?' + new URLSearchParams(queryParams).toString()
              : '';

            const headers = {
              'Content-Type': 'application/json',
              locale: 'en-US',
            };

            const { data } = await this.axiosInstance.get(
              `${this.baseUrl}${endpoint}${queryString}`,
              { headers }
            );

            if (data.code === '00000' && data.data && data.data.length > 0) {
              pricePerUnit = parseFloat(data.data[0]?.lastPr || '0');
              valueUsd = totalAmount * pricePerUnit;
            }
          } catch (priceError) {
            // If price fetch fails, log warning and continue
            this.logger.warn(`Unable to fetch price for ${coin}: ${priceError.message}`);
            valueUsd = 0;
            pricePerUnit = 0;
          }
        }

        positions.push({
          symbol: coin,
          quantity: totalAmount,
          valueUsd: valueUsd,
          pricePerUnit: pricePerUnit,
          free: available,
          locked: frozen + locked,
          freeUsd: available * pricePerUnit,
          lockedUsd: (frozen + locked) * pricePerUnit,
        });
      }

      return positions;
    } catch (error) {
      this.logger.error('Error fetching open positions', error.message);
      throw new HttpException(
        'Unable to fetch open positions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== BGB CONVERT ENDPOINTS ====================

  /**
   * Get BGB Convert Coins
   * Get a list of Convert Bgb Currencies
   * Frequency limit: 10 times/1s (User ID)
   */
  async getBgbConvertCoinList(apiKey?: string, apiSecret?: string, passphrase?: string) {
    if (!apiKey || !apiSecret || !passphrase) {
      apiKey = process.env.BITGET_API_KEY;
      apiSecret = process.env.BITGET_SECRET_KEY;
      passphrase = process.env.BITGET_PASSPHRASE;
    }
    return this.makeAuthRequest('GET', '/api/v2/convert/bgb-convert-coin-list', {}, null, 0, apiKey, apiSecret, passphrase);
  }

  /**
   * Convert BGB
   * Convert specified coins to BGB
   * Frequency limit: 10 times/1s (User ID)
   */
  async convertBgb(coinList: string[], apiKey?: string, apiSecret?: string, passphrase?: string) {
    if (!apiKey || !apiSecret || !passphrase) {
      apiKey = process.env.BITGET_API_KEY;
      apiSecret = process.env.BITGET_SECRET_KEY;
      passphrase = process.env.BITGET_PASSPHRASE;
    }
    const body = { coinList };
    return this.makeAuthRequest('POST', '/api/v2/convert/bgb-convert', {}, body, 0, apiKey, apiSecret, passphrase);
  }
}
