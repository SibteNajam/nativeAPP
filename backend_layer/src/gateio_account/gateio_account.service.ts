import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { WalletTransferDto } from './dto/wallet-transfer.dto';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals.dto';

@Injectable()
export class GateioAccountService {
	private readonly logger = new Logger(GateioAccountService.name);
	private readonly baseUrl = 'https://api.gateio.ws';
    // private readonly  baseUrl = 'https://fx-api-testnet.gateio.ws/api/v4/';


	private readonly apiKey = process.env.GATEIO_API_KEY || '';
	private readonly apiSecret = process.env.GATEIO_SECRET_KEY || '';

	private genSign(timestamp: string, method: string, path: string, queryString = '', body = ''): string {
		// Follow Gate.io APIv4 signing spec:
		// Signature string = METHOD + "\n" + REQUEST_URL + "\n" + QUERY_STRING + "\n" + HexEncode(SHA512(payload)) + "\n" + TIMESTAMP
		// QUERY_STRING should NOT contain the leading '?'
		const qs = queryString && queryString.startsWith('?') ? queryString.slice(1) : (queryString || '');
		const payload = body || '';
		const payloadHash = crypto.createHash('sha512').update(payload, 'utf8').digest('hex');
		const signatureString = `${method.toUpperCase()}\n${path}\n${qs}\n${payloadHash}\n${timestamp}`;
		return crypto.createHmac('sha512', this.apiSecret).update(signatureString, 'utf8').digest('hex');
	}

	async getSpotAccounts(currency?: string) {
		try {
			if (!this.apiKey || !this.apiSecret) {
				throw new HttpException(
					{ 
						statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
						message: 'GateIO API credentials are not configured. Please set GATEIO_API_KEY and GATEIO_SECRET_KEY environment variables.',
					},
					HttpStatus.INTERNAL_SERVER_ERROR
				);
			}
			const path = '/api/v4/spot/accounts';
			const queryString = currency ? `?currency=${encodeURIComponent(currency)}` : '';
			const url = `${this.baseUrl}${path}${queryString}`;


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
			this.logger.error(`Error fetching spot accounts${currency ? ' for ' + currency : ''}: ${error.message}`, error.response?.data);
			
			if (error instanceof HttpException) {
				throw error;
			}
			
			throw new HttpException(
				error.response?.data?.message || 'Failed to fetch spot accounts',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async getSpotAccountBook(options: {
		currency?: string;
		from?: number;
		to?: number;
		page?: number;
		limit?: number;
		type?: string;
		code?: string;
	}) {
		try {
			const path = '/api/v4/spot/account_book';
			const params: Record<string, any> = {};
			if (options.currency) params.currency = options.currency;
			if (typeof options.from !== 'undefined') params.from = options.from;
			if (typeof options.to !== 'undefined') params.to = options.to;
			if (typeof options.page !== 'undefined') params.page = options.page;
			if (typeof options.limit !== 'undefined') params.limit = options.limit;
			if (options.type) params.type = options.type;
			if (options.code) params.code = options.code;

			// Validate 30-day max range (milliseconds)
			if (params.from && params.to) {
				const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
				if (params.to - params.from > maxRange) {
					throw new HttpException('Query time range cannot exceed 30 days', HttpStatus.BAD_REQUEST);
				}
			}

			// Validate pagination rule: limit * (page - 1) <= 100000
			if (typeof params.limit !== 'undefined' && typeof params.page !== 'undefined') {
				const allowed = (params.limit as number) * ((params.page as number) - 1);
				if (allowed > 100000) {
					throw new HttpException('Pagination exceeds allowed maximum (limit * (page - 1) <= 100000)', HttpStatus.BAD_REQUEST);
				}
			}

			const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params as any).toString() : '';
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
			this.logger.error(`Error fetching account book${options?.currency ? ' for ' + options.currency : ''}: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to fetch account book',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async listDeposits(options: { currency?: string; from?: number; to?: number; limit?: number; offset?: number }) {
		try {
			const path = '/api/v4/wallet/deposits';
			const params: Record<string, any> = {};
			if (options.currency) params.currency = options.currency;
			if (typeof options.from !== 'undefined') params.from = options.from;
			if (typeof options.to !== 'undefined') params.to = options.to;
			if (typeof options.limit !== 'undefined') params.limit = options.limit;

			// Validate 30-day max range (milliseconds)
			if (params.from && params.to) {
				const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
				if (params.to - params.from > maxRange) {
					throw new HttpException('Query time range cannot exceed 30 days', HttpStatus.BAD_REQUEST);
				}
			}

			// Enforce maximum limit
			if (params.limit && params.limit > 500) params.limit = 500;

			const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params as any).toString() : '';
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
			this.logger.error(`Error listing deposits: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to list deposits',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async listWithdrawals(options: ListWithdrawalsQueryDto) {
		try {
			const path = '/api/v4/wallet/withdrawals';
			const params: Record<string, any> = {};

			if (options.currency) params.currency = options.currency;
			if (options.withdraw_id) params.withdraw_id = options.withdraw_id;
			if (options.asset_class) params.asset_class = options.asset_class;
			if (options.withdraw_order_id) params.withdraw_order_id = options.withdraw_order_id;
			if (typeof options.from !== 'undefined') params.from = options.from;
			if (typeof options.to !== 'undefined') params.to = options.to;
			if (typeof options.limit !== 'undefined') params.limit = options.limit;
			if (typeof options.offset !== 'undefined') params.offset = options.offset;

			// If withdraw_id or withdraw_order_id is provided, ignore time range validation
			if (!params.withdraw_id && !params.withdraw_order_id && params.from && params.to) {
				const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
				if (params.to - params.from > maxRange) {
					throw new HttpException('Query time range cannot exceed 30 days', HttpStatus.BAD_REQUEST);
				}
			}

			const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params as any).toString() : '';
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
			this.logger.error(`Error listing withdrawals: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to list withdrawals',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async transferBetweenAccounts(dto: WalletTransferDto) {
		try {
			// Basic validation
			if (!dto.currency) {
				throw new HttpException('currency is required', HttpStatus.BAD_REQUEST);
			}
			if (!dto.from) {
				throw new HttpException('from is required', HttpStatus.BAD_REQUEST);
			}
			if (!dto.to) {
				throw new HttpException('to is required', HttpStatus.BAD_REQUEST);
			}
			if (!dto.amount) {
				throw new HttpException('amount is required', HttpStatus.BAD_REQUEST);
			}

			const path = '/api/v4/wallet/transfers';
			const body = JSON.stringify(dto);
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
			this.logger.error(`Error transferring between accounts: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to perform transfer',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async getAccountDetail() {
		try {
			const path = '/api/v4/account/detail';
			const queryString = '';
			const url = `${this.baseUrl}${path}`;

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
			this.logger.error(`Error fetching account detail: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to fetch account detail',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async getWalletFee(currency_pair?: string) {
		try {
			const path = '/api/v4/wallet/fee';

			// Expect a full currency pair when provided (e.g. "ETH_USDT").
			// Passing a single currency symbol like "ETH" is ambiguous for this endpoint.
			if (currency_pair && !currency_pair.includes('_')) {
				throw new HttpException(
					'currency_pair must be a full pair like "ETH_USDT" or be omitted to get default fees',
					HttpStatus.BAD_REQUEST,
				);
			}
			const params: Record<string, any> = {};
			if (currency_pair) params.currency_pair = currency_pair;
			const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params as any).toString() : '';
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
			this.logger.error(`Error fetching wallet fee${currency_pair ? ' for ' + currency_pair : ''}: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to fetch wallet fee',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async getSpotBatchFee(currency_pairs: string) {
		try {
			if (!currency_pairs || typeof currency_pairs !== 'string' || currency_pairs.trim().length === 0) {
				throw new HttpException('currency_pairs is required and must be a comma-separated string', HttpStatus.BAD_REQUEST);
			}

			const pairs = currency_pairs.split(',').map((p) => p.trim()).filter(Boolean);
			if (pairs.length === 0) {
				throw new HttpException('currency_pairs must contain at least one pair', HttpStatus.BAD_REQUEST);
			}
			if (pairs.length > 50) {
				throw new HttpException('Maximum 50 currency pairs are allowed per request', HttpStatus.BAD_REQUEST);
			}

			const path = '/api/v4/spot/batch_fee';
			const queryString = '?currency_pairs=' + encodeURIComponent(pairs.join(','));
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
			this.logger.error(`Error fetching spot batch fee for ${currency_pairs}: ${error.message}`);
			throw new HttpException(
				error.response?.data || 'Failed to fetch spot batch fee',
				error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}


}
