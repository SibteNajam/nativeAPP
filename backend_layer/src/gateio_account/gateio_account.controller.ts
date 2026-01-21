import { Controller, Get, Query, Logger, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { GateioAccountService } from './gateio_account.service';
import { ListDepositsQueryDto } from './dto/list-deposits.dto';
import { WalletTransferDto } from './dto/wallet-transfer.dto';
import { ListWithdrawalsQueryDto } from './dto/list-withdrawals.dto';

@ApiTags('Gate.io Accounts')
@Controller('gateio-account')
export class GateioAccountController {
	private readonly logger = new Logger(GateioAccountController.name);

	constructor(private readonly gateioAccountService: GateioAccountService) {}

	@Get('spot/assets')
	@ApiOperation({ summary: 'List spot trading accounts' })
	@ApiQuery({ name: 'currency', required: false, description: 'Query by specified currency name' })
	@ApiResponse({ status: 200, description: 'List retrieved successfully' })
	async listSpotAccounts(@Query('currency') currency?: string) {
		this.logger.log(`GET /gateio-account/spot/accounts called${currency ? `?currency=${currency}` : ''}`);
		return this.gateioAccountService.getSpotAccounts(currency);
	}

	@Get('account/detail')
	@ApiOperation({ summary: 'Retrieve user account information' })
	@ApiResponse({ status: 200, description: 'Account details retrieved successfully' })
	async getAccountDetail() {
		this.logger.log('GET /gateio-account/account/detail called');
		return this.gateioAccountService.getAccountDetail();
	}

	@Get('wallet/fee')
	@ApiOperation({ summary: 'Query wallet fee settings' })
	@ApiQuery({ name: 'currency_pair', required: false, description: 'Specify currency pair to get more accurate fee settings' })
	@ApiResponse({ status: 200, description: 'Fee settings retrieved successfully' })
	async getWalletFee(@Query('currency_pair') currency_pair?: string) {
		this.logger.log(`GET /gateio-account/wallet/fee called${currency_pair ? `?currency_pair=${currency_pair}` : ''}`);
		return this.gateioAccountService.getWalletFee(currency_pair);
	}

	@Get('spot/batch_fee')
	@ApiOperation({ summary: 'Batch query account fee rates' })
	@ApiQuery({ name: 'currency_pairs', required: true, description: 'Comma separated list of currency pairs (max 50)' })
	@ApiResponse({ status: 200, description: 'Batch fee rates retrieved successfully' })
	async getSpotBatchFee(@Query('currency_pairs') currency_pairs: string) {
		this.logger.log(`GET /gateio-account/spot/batch_fee called?currency_pairs=${currency_pairs}`);
		return this.gateioAccountService.getSpotBatchFee(currency_pairs);
	}

		@Get('spot/account_book')
		@ApiOperation({ summary: 'Query spot account transaction history' })
		@ApiQuery({ name: 'currency', required: false })
		@ApiQuery({ name: 'from', required: false })
		@ApiQuery({ name: 'to', required: false })
		@ApiQuery({ name: 'page', required: false })
		@ApiQuery({ name: 'limit', required: false })
		@ApiQuery({ name: 'type', required: false })
		@ApiQuery({ name: 'code', required: false })
		@ApiResponse({ status: 200, description: 'Account book retrieved successfully' })
		async listSpotAccountBook(
			@Query('currency') currency?: string,
			@Query('from') from?: string,
			@Query('to') to?: string,
			@Query('page') page?: string,
			@Query('limit') limit?: string,
			@Query('type') type?: string,
			@Query('code') code?: string,
		) {
			this.logger.log(`GET /gateio-account/spot/account_book called${currency ? `?currency=${currency}` : ''}`);

			const opts: any = {};
			if (currency) opts.currency = currency;
			if (from) opts.from = parseInt(from, 10);
			if (to) opts.to = parseInt(to, 10);
			if (page) opts.page = parseInt(page, 10);
			if (limit) opts.limit = parseInt(limit, 10);
			if (type) opts.type = type;
			if (code) opts.code = code;

			return this.gateioAccountService.getSpotAccountBook(opts);
		}

		@Get('wallet/deposits')
		@ApiOperation({ summary: 'Get deposit records' })
		@ApiQuery({ name: 'currency', required: false })
		@ApiQuery({ name: 'from', required: false })
		@ApiQuery({ name: 'to', required: false })
		@ApiQuery({ name: 'limit', required: false })
		@ApiQuery({ name: 'offset', required: false })
		@ApiResponse({ status: 200, description: 'List retrieved successfully' })
		async listDeposits(
			@Query('currency') currency?: string,
			@Query('from') from?: string,
			@Query('to') to?: string,
			@Query('limit') limit?: string,
			@Query('offset') offset?: string,
		) {
			this.logger.log(`GET /gateio-account/wallet/deposits called${currency ? `?currency=${currency}` : ''}`);

			const opts: any = {};
			if (currency) opts.currency = currency;
			if (from) opts.from = parseInt(from, 10);
			if (to) opts.to = parseInt(to, 10);
			if (limit) opts.limit = parseInt(limit, 10);
			if (offset) opts.offset = parseInt(offset, 10);

			return this.gateioAccountService.listDeposits(opts);
		}

		@Post('wallet/transfers')
		@ApiOperation({ summary: 'Transfer between trading accounts' })
		@ApiBody({ type: WalletTransferDto })
		@ApiResponse({ status: 200, description: 'Transfer operation successful' })
		async transferBetweenAccounts(@Body() body: WalletTransferDto) {
			this.logger.log(`POST /gateio-account/wallet/transfers called from=${body.from} to=${body.to} currency=${body.currency} amount=${body.amount}`);
			return this.gateioAccountService.transferBetweenAccounts(body);
		}

		@Get('wallet/withdrawals')
		@ApiOperation({ summary: 'Get withdrawal records' })
		@ApiQuery({ name: 'currency', required: false })
		@ApiQuery({ name: 'withdraw_id', required: false })
		@ApiQuery({ name: 'asset_class', required: false })
		@ApiQuery({ name: 'withdraw_order_id', required: false })
		@ApiQuery({ name: 'from', required: false })
		@ApiQuery({ name: 'to', required: false })
		@ApiQuery({ name: 'limit', required: false })
		@ApiQuery({ name: 'offset', required: false })
		@ApiResponse({ status: 200, description: 'List retrieved successfully' })
		async listWithdrawals(
			@Query('currency') currency?: string,
			@Query('withdraw_id') withdraw_id?: string,
			@Query('asset_class') asset_class?: string,
			@Query('withdraw_order_id') withdraw_order_id?: string,
			@Query('from') from?: string,
			@Query('to') to?: string,
			@Query('limit') limit?: string,
			@Query('offset') offset?: string,
		) {
			this.logger.log(`GET /gateio-account/wallet/withdrawals called currency=${currency || '-'} withdraw_id=${withdraw_id || '-'} withdraw_order_id=${withdraw_order_id || '-'} from=${from || '-'} to=${to || '-'} limit=${limit || '-'} offset=${offset || '-'}`);

			const opts: any = {};
			if (currency) opts.currency = currency;
			if (withdraw_id) opts.withdraw_id = withdraw_id;
			if (asset_class) opts.asset_class = asset_class;
			if (withdraw_order_id) opts.withdraw_order_id = withdraw_order_id;
			if (from) opts.from = parseInt(from, 10);
			if (to) opts.to = parseInt(to, 10);
			if (limit) opts.limit = parseInt(limit, 10);
			if (offset) opts.offset = parseInt(offset, 10);

			return this.gateioAccountService.listWithdrawals(opts);
		}
}
