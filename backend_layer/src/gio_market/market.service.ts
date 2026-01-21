import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GateioMarketService {
  private readonly logger = new Logger(GateioMarketService.name);
  private readonly baseUrl = 'https://api.gateio.ws/api/v4/spot';

  async getAllCurrencies() {
    try {
      const url = `${this.baseUrl}/currencies`;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching currencies: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch currencies',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCurrency(currency: string) {
    try {
      const url = `${this.baseUrl}/currencies/${encodeURIComponent(currency)}`;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching currency ${currency}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch currency',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllCurrencyPairs() {
    try {
      const url = `${this.baseUrl}/currency_pairs`;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching currency pairs: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch currency pairs',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCurrencyPair(currencyPair: string) {
    try {
      const url = `${this.baseUrl}/currency_pairs/${encodeURIComponent(currencyPair)}`;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching currency pair ${currencyPair}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch currency pair',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTickers(currencyPair?: string, timezone?: string) {
    try {
      const url = `${this.baseUrl}/tickers`;
      const params: any = {};
      if (currencyPair) params.currency_pair = currencyPair;
      if (timezone) params.timezone = timezone;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, params });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching tickers: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch tickers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOrderBook(currencyPair: string, interval?: number, limit?: number, with_id?: boolean) {
    try {
      const url = `${this.baseUrl}/order_book`;
      const params: any = { currency_pair: currencyPair };
      if (typeof interval !== 'undefined') params.interval = interval;
      if (typeof limit !== 'undefined') params.limit = limit;
      if (typeof with_id !== 'undefined') params.with_id = with_id;

      const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, params });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching order book for ${currencyPair}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch order book',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTrades(options: {
    currency_pair: string;
    limit?: number;
    last_id?: string;
    reverse?: boolean;
    from?: number;
    to?: number;
    page?: number;
  }) {
    try {
      const url = `${this.baseUrl}/trades`;
      const params: any = {};
      params.currency_pair = options.currency_pair;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.last_id !== undefined) params.last_id = options.last_id;
      if (options.reverse !== undefined) params.reverse = options.reverse;
      if (options.from !== undefined) params.from = options.from;
      if (options.to !== undefined) params.to = options.to;
      if (options.page !== undefined) params.page = options.page;
      const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, params });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching trades for ${options.currency_pair}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch trades',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFundingRates(settle: string, contract: string, limit?: number, from?: number, to?: number) {
    try {
      // futures endpoint
      const futuresBase = this.baseUrl.replace('/spot', '/futures');
      const url = `${futuresBase}/${encodeURIComponent(settle)}/funding_rate`;
      const params: any = { contract };
      if (typeof limit !== 'undefined') params.limit = limit;
      if (typeof from !== 'undefined') params.from = from;
      if (typeof to !== 'undefined') params.to = to;

      const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, params });
      return data;
    } catch (error: any) {
      this.logger.error(`Error fetching funding rates for ${settle}/${contract}: ${error.message}`);
      throw new HttpException(
        error.response?.data || 'Failed to fetch funding rates',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

    async getCandlesticks(options: {
      currency_pair: string;
      limit?: number;
      from?: number;
      to?: number;
      interval?: string;
    }) {
      try {
        const url = `${this.baseUrl}/candlesticks`;
        const params: any = { currency_pair: options.currency_pair };
        if (options.limit !== undefined) params.limit = options.limit;
        if (options.from !== undefined) params.from = options.from;
        if (options.to !== undefined) params.to = options.to;
        if (options.interval !== undefined) params.interval = options.interval;

        const { data } = await axios.get(url, { headers: { Accept: 'application/json' }, params });
        return data;
      } catch (error: any) {
        this.logger.error(`Error fetching candlesticks for ${options.currency_pair}: ${error.message}`);
        throw new HttpException(
          error.response?.data || 'Failed to fetch candlesticks',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
}
