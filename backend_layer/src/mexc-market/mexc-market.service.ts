import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MexcMarketService {
	private readonly logger = new Logger(MexcMarketService.name);
	private readonly baseUrl = 'https://api.mexc.com';

	private buildUrl(path: string, params?: Record<string, any>) {
		const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
		return `${this.baseUrl}${path}${qs}`;
	}

	async getDefaultSymbols() {
		try {
			const url = this.buildUrl('/api/v3/defaultSymbols');
			const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching default symbols', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch default symbols', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getExchangeInfo(symbol?: string, symbols?: string[]) {
		try {
			const params: Record<string, any> = {};
			if (symbol) params.symbol = symbol;
			if (symbols && symbols.length) params.symbols = symbols.join(',');
			const url = this.buildUrl('/api/v3/exchangeInfo', params);
			const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching exchange info', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch exchange info', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getDepth(symbol: string, limit?: number) {
		try {
			if (!symbol) throw new HttpException('symbol is required', HttpStatus.BAD_REQUEST);
			const params: any = { symbol };
			if (typeof limit !== 'undefined') params.limit = limit;
			const url = this.buildUrl('/api/v3/depth', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching depth', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch depth', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getTrades(symbol: string, limit?: number) {
		try {
			if (!symbol) throw new HttpException('symbol is required', HttpStatus.BAD_REQUEST);
			const params: any = { symbol };
			if (typeof limit !== 'undefined') params.limit = limit;
			const url = this.buildUrl('/api/v3/trades', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching trades', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch trades', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getAggTrades(symbol: string, startTime?: number, endTime?: number, limit?: number) {
		try {
			if (!symbol) throw new HttpException('symbol is required', HttpStatus.BAD_REQUEST);
			const params: any = { symbol };
			if (typeof startTime !== 'undefined') params.startTime = startTime;
			if (typeof endTime !== 'undefined') params.endTime = endTime;
			if (typeof limit !== 'undefined') params.limit = limit;
			const url = this.buildUrl('/api/v3/aggTrades', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching aggTrades', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch aggTrades', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getKlines(symbol: string, interval: string, startTime?: number, endTime?: number, limit?: number) {
		try {
			if (!symbol) throw new HttpException('symbol is required', HttpStatus.BAD_REQUEST);
			if (!interval) throw new HttpException('interval is required', HttpStatus.BAD_REQUEST);
			const params: any = { symbol, interval };
			if (typeof startTime !== 'undefined') params.startTime = startTime;
			if (typeof endTime !== 'undefined') params.endTime = endTime;
			if (typeof limit !== 'undefined') params.limit = limit;
			const url = this.buildUrl('/api/v3/klines', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching klines', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch klines', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getAvgPrice(symbol: string) {
		try {
			if (!symbol) throw new HttpException('symbol is required', HttpStatus.BAD_REQUEST);
			const url = this.buildUrl('/api/v3/avgPrice', { symbol });
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching avg price', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch avg price', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getTicker24hr(symbol?: string, symbols?: string[]) {
		try {
			const params: Record<string, any> = {};
			if (symbol) params.symbol = symbol;
			if (symbols && symbols.length) params.symbols = symbols.join(',');
			const url = this.buildUrl('/api/v3/ticker/24hr', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching 24hr ticker', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch 24hr ticker', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getTickerPrice(symbol?: string) {
		try {
			const params: Record<string, any> = {};
			if (symbol) params.symbol = symbol;
			const url = this.buildUrl('/api/v3/ticker/price', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching ticker price', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch ticker price', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async getBookTicker(symbol?: string) {
		try {
			const params: Record<string, any> = {};
			if (symbol) params.symbol = symbol;
			const url = this.buildUrl('/api/v3/ticker/bookTicker', params);
			const { data } = await axios.get(url);
			return data;
		} catch (error: any) {
			this.logger.error('Error fetching book ticker', error?.response?.data || error?.stack);
			throw new HttpException(error?.response?.data || 'Failed to fetch book ticker', error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
