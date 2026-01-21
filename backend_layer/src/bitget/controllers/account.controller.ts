
import { Controller, Get, Post, Query, Body, Logger, Headers, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiBody, ApiTags } from '@nestjs/swagger';
import { AccountService } from '../services/account.service';
import { JWTGuard } from '../../guards/jwt.guard';
import { ApicredentialsService } from '../../apicredentials/apicredentials.service';
import { Public } from 'src/decorators/isPublic';

@ApiTags('Bitget Account')
@Controller('bitget/account')
@UseGuards(JWTGuard)
export class AccountController {
    private readonly logger = new Logger(AccountController.name);

    constructor(
        private readonly accountService: AccountService,
        private readonly apiCredentialsService: ApicredentialsService
    ) { }

    // ==================== SPOT ACCOUNT ENDPOINTS ====================
    @ApiOperation({ summary: 'Get spot account assets' })
    @Get('spot/assets')
    async getSpotAccount(@Req() req) {
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'bitget' as any);
        if (!credentials) {
            console.log('no crndentials of user');
        }
        console.log('getSpotAccount called with environment credentials');
        return this.accountService.getSpotAccount(credentials?.apiKey, credentials?.secretKey, credentials?.passphrase);
    }


    @ApiOperation({ summary: 'Get specific coin asset in spot account' })
    @ApiQuery({ name: 'coin', required: true, description: 'Coin symbol, e.g., BTC' })
    @Get('spot/asset')
    async getSpotCoinAsset(@Query('coin') coin: string, @Req() req) {
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'bitget' as any);
        if (!credentials) {
            console.log('no crndentials of user');
        }
        console.log('getSpotCoinAsset called with environment credentials');
        return this.accountService.getSpotCoinAsset(coin, credentials?.apiKey, credentials?.secretKey, credentials?.passphrase);
    }

    @ApiOperation({ summary: 'Get spot account bills (transaction history)' })
    @ApiQuery({ name: 'coin', required: false, description: 'Coin symbol' })
    @ApiQuery({ name: 'groupType', required: false, description: 'Group type' })
    @ApiQuery({ name: 'businessType', required: false, description: 'Business type' })
    @ApiQuery({ name: 'after', required: false, description: 'Pagination - after ID' })
    @ApiQuery({ name: 'before', required: false, description: 'Pagination - before ID' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 100)' })
    @Get('spot/bills')
    async getSpotAccountBills(
        @Req() req,
        @Query('coin') coin?: string,
        @Query('groupType') groupType?: string,
        @Query('businessType') businessType?: string,
        @Query('after') after?: string,
        @Query('before') before?: string,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'bitget' as any);
        if (!credentials) {
            console.log('no crndentials of user');
        }
        return this.accountService.getSpotAccountBills({
            coin,
            groupType,
            businessType,
            after,
            before,
            limit: limit ? Number(limit) : undefined,
            apiKey: credentials?.apiKey,
            apiSecret: credentials?.secretKey,
            passphrase: credentials?.passphrase,
        });
    }

    @ApiOperation({ summary: 'Transfer between accounts' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fromType: { type: 'string', description: 'Source account type', example: 'spot_account' },
                toType: { type: 'string', description: 'Destination account type', example: 'mix_account' },
                amount: { type: 'string', description: 'Transfer amount', example: '100' },
                coin: { type: 'string', description: 'Coin symbol', example: 'USDT' },
                clientOid: { type: 'string', description: 'Client order ID (optional)' },
            },
            required: ['fromType', 'toType', 'amount', 'coin'],
        },
    })
    @Post('transfer')
    async transfer(@Body() body: any) {
        return this.accountService.transfer(body);
    }


    @ApiOperation({ summary: 'Get transfer record by ID' })
    @ApiQuery({ name: 'transferId', required: true, description: 'Transfer record ID' })
    @Get('transfer-record-By-Id')
    async getTransferRecord(@Query('transferId') transferId: string) {
        return this.accountService.getTransferRecordById(transferId);
    }

    @ApiOperation({ summary: 'Get account-level transfer records' })
    @ApiQuery({ name: 'coin', required: true, description: 'Coin symbol' })
    @ApiQuery({ name: 'fromType', required: false, description: 'Source account type' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start time in ms' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End time in ms' })
    @ApiQuery({ name: 'clientOid', required: false, description: 'Client order ID' })
    @ApiQuery({ name: 'pageNum', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Records per page' })
    @Get('transfer-records')
    getAccountTransferRecords(
        @Query('coin') coin: string,
        @Query('fromType') fromType?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
        @Query('clientOid') clientOid?: string,
        @Query('pageNum') pageNum?: string,
        @Query('limit') limit?: string,
    ) {
        return this.accountService.getAccountTransferRecords({
            coin,
            fromType,
            startTime,
            endTime,
            clientOid,
            pageNum,
            limit,
        });
    }



    @Get('deposit-address')
    @ApiOperation({ summary: 'Get deposit address for a coin' })
    @ApiQuery({ name: 'coin', required: true, description: 'Coin symbol' })
    @ApiQuery({ name: 'chain', required: false, description: 'Chain name' })
    @ApiQuery({ name: 'size', required: false, description: 'Address size' })
    async getDepositAddress(coin: string, chain?: string, size?: string) {
        return this.accountService.getDepositAddress(coin, chain, size);
    }




    @ApiOperation({ summary: 'Get deposit history' })
    @ApiQuery({ name: 'coin', required: false, description: 'Coin symbol' })
    @ApiQuery({ name: 'orderId', required: false, description: 'Order ID' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start timestamp in ms (optional, defaults to 60 days ago)' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End timestamp in ms (optional, defaults to current time)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 100)' })
    @ApiQuery({ name: 'idLessThan', required: false, description: 'Pagination - ID less than' })
    @Get('deposit-history')
    async getDepositHistory(
        @Query('coin') coin?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
        @Query('orderId') orderId?: string,
        @Query('limit') limit?: string,
        @Query('idLessThan') idLessThan?: string,
        @Headers('x-api-key') apiKey?: string,
        @Headers('x-secret-key') apiSecret?: string,
        @Headers('x-passphrase') passphrase?: string,
    ) {
        const params: any = {};

        if (coin !== undefined) params.coin = coin;
        if (orderId !== undefined) params.orderId = orderId;
        if (startTime !== undefined) params.startTime = startTime;
        if (endTime !== undefined) params.endTime = endTime;
        if (limit !== undefined) params.limit = limit;
        if (idLessThan !== undefined) params.idLessThan = idLessThan;

        return this.accountService.getDepositHistory(params, apiKey, apiSecret, passphrase);
    }

    @ApiOperation({ summary: 'Get withdrawal history' })
    @ApiQuery({ name: 'coin', required: false, description: 'Coin symbol' })
    @ApiQuery({ name: 'orderId', required: false, description: 'Order ID' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start timestamp in ms (optional, defaults to 60 days ago)' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End timestamp in ms (optional, defaults to current time)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit (default: 100)' })
    @ApiQuery({ name: 'idLessThan', required: false, description: 'Pagination - ID less than' })
    @Get('withdrawal-history')
    async getWithdrawalHistory(
        @Query('coin') coin?: string,
        @Query('orderId') orderId?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
        @Query('limit') limit?: string,
        @Query('idLessThan') idLessThan?: string,
        @Headers('x-api-key') apiKey?: string,
        @Headers('x-secret-key') apiSecret?: string,
        @Headers('x-passphrase') passphrase?: string,
    ) {
        const params: any = {};

        if (coin !== undefined) params.coin = coin;
        if (orderId !== undefined) params.orderId = orderId;
        if (startTime !== undefined) params.startTime = startTime;
        if (endTime !== undefined) params.endTime = endTime;
        if (limit !== undefined) params.limit = limit;
        if (idLessThan !== undefined) params.idLessThan = idLessThan;

        return this.accountService.getWithdrawalHistory(params, apiKey, apiSecret, passphrase);
    }

    @ApiOperation({ summary: 'Withdraw cryptocurrency' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                coin: { type: 'string', description: 'Coin symbol', example: 'USDT' },
                address: { type: 'string', description: 'Withdrawal address' },
                chain: { type: 'string', description: 'Chain name', example: 'TRC20' },
                amount: { type: 'string', description: 'Withdrawal amount', example: '100' },
                remark: { type: 'string', description: 'Remark (optional)' },
                clientOid: { type: 'string', description: 'Client order ID (optional)' },
                tag: { type: 'string', description: 'Tag/Memo (optional)' },
            },
            required: ['coin', 'address', 'chain', 'amount'],
        },
    })
    @Post('withdraw')
    async withdraw(@Body() body: any) {
        return this.accountService.withdraw(body);
    }

    // ==================== BGB CONVERT ENDPOINTS ====================

    @Public()
    @ApiOperation({ summary: 'Get BGB Convert Coins - Get a list of Convert Bgb Currencies' })
    @Get('bgb-convert-coin-list')
    async getBgbConvertCoinList(@Req() req) {
        // Bypass authentication - use environment credentials
        const userId = req.user?.id;
        if (!userId) {
            console.log('User not authenticated');
        }
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'bitget' as any);
        if (!credentials) {
            console.log('crnedentials not provided by user')
        }

        return this.accountService.getBgbConvertCoinList(credentials?.apiKey, credentials?.secretKey, credentials?.passphrase);
    }

    @Public()
    @ApiOperation({ summary: 'Convert BGB - Convert specified coins to BGB' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                coinList: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of coins to convert to BGB',
                    example: ['EOS', 'GROK']
                },
            },
            required: ['coinList'],
        },
    })
    @Post('bgb-convert')
    async convertBgb(
        @Body() body: { coinList: string[] },
        @Req() req
    ) {
        const userId = req.user?.id;
        if (!userId) {
            throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
        }
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'bitget' as any);
        if (!credentials) {
            console.log("crendentials not found ifor user")
        }
        // Use environment credentials if headers not provided
        if (!body.coinList || !Array.isArray(body.coinList) || body.coinList.length === 0) {
            throw new HttpException('coinList is required and must be a non-empty array', HttpStatus.BAD_REQUEST);
        }

        return this.accountService.convertBgb(body.coinList, credentials?.apiKey, credentials?.secretKey, credentials?.passphrase);
    }
}