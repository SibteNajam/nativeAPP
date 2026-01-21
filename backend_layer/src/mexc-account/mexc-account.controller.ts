import { Controller, Get, Query, Param, HttpException, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { MexcAccountService } from './mexc-account.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WithdrawHistoryDto, MyTradesDto, TradeFeeDto } from './dto';
import { Public } from 'src/decorators/isPublic';
import { JWTGuard } from '../guards/jwt.guard';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';

@ApiTags('Mexc Account')
@Controller('mexc-account')
@UseGuards(JWTGuard)
export class MexcAccountController {
  constructor(
    private readonly mexcAccountService: MexcAccountService,
    private readonly apiCredentialsService: ApicredentialsService
  ) { }

  /**
   * GET /mexc-account/withdraw/history
   * Query withdraw history (supporting network)
   */
  @Get('withdraw/history')
  @ApiOperation({
    summary: 'Query withdraw history',
    description: `Retrieve withdrawal history with optional filters.
    
    **Important Notes:**
    - Default returns records of the last 7 days
    - Can query up to 90 days of data at most
    - Ensure that the time range between startTime and endTime does not exceed 7 days by default
    - Supported multiple network coins's withdraw history may not return the 'network' field
    
    **Withdraw Status Values:**
    - 1: APPLY
    - 2: AUDITING
    - 3: WAIT
    - 4: PROCESSING
    - 5: WAIT_PACKAGING
    - 6: WAIT_CONFIRM
    - 7: SUCCESS
    - 8: FAILED
    - 9: CANCEL
    - 10: MANUAL`
  })
  @ApiQuery({ name: 'coin', required: false, description: 'Coin name (e.g., USDT, BTC)', example: 'USDT' })
  @ApiQuery({ name: 'status', required: false, description: 'Withdraw status (1-10)', example: '7' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 1000, max: 1000)', example: 1000 })
  @ApiQuery({ name: 'startTime', required: false, description: 'Start time in milliseconds (default: 7 days ago)', example: 1665300874000 })
  @ApiQuery({ name: 'endTime', required: false, description: 'End time in milliseconds (default: current time)', example: 1712134082000 })
  @ApiQuery({ name: 'recvWindow', required: false, description: 'Receive window in milliseconds (default: 5000, max: 60000)', example: 5000 })
  @ApiResponse({
    status: 200,
    description: 'Withdraw history records',
    schema: {
      example: [
        {
          id: 'bb17a2d452684f00a523c015d512a341',
          txId: null,
          coin: 'EOS',
          network: 'EOS',
          address: 'zzqqqqqqqqqq',
          amount: '10',
          transferType: 0,
          status: 3,
          transactionFee: '0',
          confirmNo: null,
          applyTime: 1665300874000,
          remark: '',
          memo: 'MX10086',
          transHash: '0x0ced593b8b5adc9f600334d0d7335456a7ed772ea5547beda7ffc4f33a065c',
          updateTime: 1712134082000,
          coinId: '128f589271cb495b03e71e6323eb7be',
          vcoinId: 'af42c6414b9a46c8869ce30fd51660f'
        }
      ]
    }
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async getWithdrawHistory(
    @Req() req,
    @Query('coin') coin?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('recvWindow') recvWindow?: number,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for  this user, using environment variables');
    }

    const dto: WithdrawHistoryDto = {
      coin,
      status,
      limit,
      startTime,
      endTime,
      recvWindow,
    };

    return this.mexcAccountService.getWithdrawHistory(dto, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * GET /mexc-account/my-trades
   * Get user trade records for a specific symbol
   */
  @Get('my-trades')
  @ApiOperation({
    summary: 'Get user trade records',
    description: `Retrieve account trade history for a specific symbol.
    
    **Important Notes:**
    - startTime and endTime cannot be sent together with fromId
    - Default limit is 100; maximum is 1000
    - If fromId is sent, the return is in ascending order, otherwise descending order
    
    **Permission:** SPOT_ACCOUNT_READ  
    **Weight(IP):** 10`
  })
  @ApiQuery({ name: 'symbol', required: true, description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)', example: 'BTCUSDT' })
  @ApiQuery({ name: 'orderId', required: false, description: 'Order ID to filter trades', example: '123456789' })
  @ApiQuery({ name: 'startTime', required: false, description: 'Start time in milliseconds', example: 1499865549590 })
  @ApiQuery({ name: 'endTime', required: false, description: 'End time in milliseconds', example: 1499865549590 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records (default: 100, max: 1000)', example: 100 })
  @ApiResponse({
    status: 200,
    description: 'User trade records',
    schema: {
      example: [
        {
          symbol: 'BTCUSDT',
          id: '28457',
          orderId: '100234',
          price: '4.00000100',
          qty: '12.00000000',
          quoteQty: '48.000012',
          commission: '10.10000000',
          commissionAsset: 'BNB',
          time: 1499865549590,
          isBuyer: true,
          isMaker: false,
          isBestMatch: true
        }
      ]
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Symbol is required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async getMyTrades(
    @Req() req,
    @Query('symbol') symbol: string,
    @Query('orderId') orderId?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }

    const dto: MyTradesDto = {
      symbol,
      orderId,
      startTime,
      endTime,
      limit,
    };

    return this.mexcAccountService.getMyTrades(dto, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * GET /mexc-account/trade-fee
   * Query user's current trading fees for a symbol
   */
  @Get('trade-fee')
  @ApiOperation({
    summary: 'Query trading fees',
    description: `Get current trading fee rates for a specific symbol.
    
    **Permission:** SPOT_ACCOUNT_READ  
    **Weight(IP):** 20`
  })
  @ApiQuery({ name: 'symbol', required: true, description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)', example: 'BTCUSDT' })
  @ApiResponse({
    status: 200,
    description: 'Trade fee information',
    schema: {
      example: {
        symbol: 'BTCUSDT',
        makerCommission: '0.002',
        takerCommission: '0.002'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Symbol is required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid API credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async getTradeFee(
    @Req() req,
    @Query('symbol') symbol: string,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }

    const dto: TradeFeeDto = {
      symbol,
    };

    return this.mexcAccountService.getTradeFee(dto, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * GET /mexc-account/capital/config/getall
   * Query currency information (networks, fees, limits)
   */
  @Get('capital/config/getall')
  @ApiOperation({ summary: 'Query currency configuration', description: 'Query currency information, networks, fees, withdraw/deposit limits.' })
  @ApiResponse({ status: 200, description: 'Currency configuration array' })
  async getCapitalConfig(@Req() req) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }
    return this.mexcAccountService.getCapitalConfig(credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * GET /mexc-account/capital/deposit/hisrec
   * Query deposit history
   */
  @Get('capital/deposit/hisrec')
  @ApiOperation({ summary: 'Query deposit history', description: 'Query deposit history with optional filters. Defaults to last 7 days.' })
  @ApiQuery({ name: 'coin', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getDepositHistory(
    @Req() req,
    @Query('coin') coin?: string,
    @Query('status') status?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
    @Query('recvWindow') recvWindow?: number,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }
    const params: Record<string, any> = { coin, status, startTime, endTime, limit, recvWindow };
    return this.mexcAccountService.getDepositHistory(params, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * POST /mexc-account/capital/transfer
   * Perform a universal transfer between accounts
   */
  @Get('capital/transfer')
  @ApiOperation({ summary: 'Query transfer history', description: 'Query user universal transfer history.' })
  @ApiQuery({ name: 'fromAccountType', required: true })
  @ApiQuery({ name: 'toAccountType', required: true })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  async getTransferHistory(
    @Req() req,
    @Query('fromAccountType') fromAccountType: string,
    @Query('toAccountType') toAccountType: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }
    const params: Record<string, any> = { fromAccountType, toAccountType, startTime, endTime, page, size };
    return this.mexcAccountService.getTransferHistory(params, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * POST /mexc-account/capital/transfer
   * Perform a universal transfer (execute)
   */
  @Get('capital/transfer/execute')
  @ApiOperation({ summary: 'Execute transfer', description: 'Execute a universal transfer between accounts.' })
  @ApiQuery({ name: 'fromAccountType', required: true })
  @ApiQuery({ name: 'toAccountType', required: true })
  @ApiQuery({ name: 'asset', required: true })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'clientTranId', required: false })
  async postTransfer(
    @Req() req,
    @Query('fromAccountType') fromAccountType: string,
    @Query('toAccountType') toAccountType: string,
    @Query('asset') asset: string,
    @Query('amount') amount: string,
    @Query('clientTranId') clientTranId?: string,
  ) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }
    const params: any = { fromAccountType, toAccountType, asset, amount, clientTranId };
    return this.mexcAccountService.postTransfer(params, credentials?.apiKey, credentials?.secretKey);
  }

  /**
   * GET /mexc-account/account
   * Return full spot account info (balances, permissions)
   */
  @Get('account')
  @ApiOperation({ summary: 'Get spot account info', description: 'Returns spot account information including balances.' })
  @ApiResponse({ status: 200, description: 'Account info with balances' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid API credentials' })
  async getAccountInfo(@Req() req) {
    const userId = req.user?.id;
    const credentials = await this.apiCredentialsService.getUserCredential(userId, 'mexc' as any);
    if (!credentials) {
      console.log('No MEXC credentials found for this user, using environment variables');
    }
    return this.mexcAccountService.getAccountInfo(credentials?.apiKey, credentials?.secretKey);
  }

}
