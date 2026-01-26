import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Logger, ParseIntPipe, Post, Query, UseGuards, Req } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { BinanceSignedService, OTOCOOrderResult } from './binance.signed.service';
import { Public } from 'src/decorators/isPublic';
import { JWTGuard } from '../guards/jwt.guard';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { get } from 'axios';
import { use } from 'passport';
import { UserService } from 'src/user/user.service';
export interface OTOCOOrderRequest {
    symbol: string;
    workingType: 'LIMIT';
    workingSide: 'BUY' | 'SELL';
    workingPrice: string;
    workingQuantity: string;
    workingTimeInForce: 'GTC' | 'IOC' | 'FOK';
    pendingSide: 'BUY' | 'SELL';
    pendingQuantity: string;
    pendingAboveType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
    pendingAbovePrice: string;
    pendingAboveStopPrice: string;
    pendingAboveTimeInForce: 'GTC';
    pendingBelowType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
    pendingBelowPrice: string;
    pendingBelowStopPrice: string;
    pendingBelowTimeInForce: 'GTC';
    timestamp: number;
}
@Controller('binance')
@UseGuards(JWTGuard)
export class BinanceController {
    constructor(
        private readonly binanceService: BinanceService,
        private readonly binanceSignedService: BinanceSignedService,
        private readonly apiCredentialsService: ApicredentialsService,
        private readonly userService: UserService,
    ) { }
    private readonly logger = new Logger(BinanceSignedService.name);
    @Public()

    @ApiOperation({ summary: 'Get all available trading symbols' })
    @Get('symbols')
    async getAllSymbols() {
        return this.binanceService.getAllSymbols();
    }
    @Public()
    @Get('symbol-price')
    @ApiOperation({ summary: 'Get symbol price' })
    async getSymbolPrice(@Query('symbol') symbol: string) {
        return this.binanceService.getSymbolPrice(symbol);
    }
    @Public()
    @ApiOperation({ summary: 'Get coin prices (top USDT pairs by volume)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of coins to return (default: 20)' })
    @Get('prices')
    async getCoinPrices(@Query('limit') limit?: string) {
        return this.binanceService.getCoinPrices(limit ? Number(limit) : 20);
    }
    @Public()

    @ApiOperation({ summary: 'candle data kline' })
    @Get('klines')
    async fetchKlines(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('limit') limit: string
    ) {
        return this.binanceService.getKlines(symbol, interval, Number(limit));
    }

    @Public()

    @ApiOperation({ summary: 'Get detailed coin information' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @Get('getCoinInfo')
    async getCoinInfo(@Query('symbol') symbol: string) {
        return this.binanceService.getCoinInfo(symbol);
    }
    @Public()

    @ApiOperation({ summary: 'Get candle/kline data with interval and limit' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1m, 5m, 1h, 1d' })
    @ApiQuery({ name: 'limit', required: true, description: 'Number of candles to return' })
    @Get('coinWithIntervalandLimit')
    async getCandleData(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('limit') limit: string
    ) {
        return this.binanceService.getCandleData(symbol, interval, limit);
    }

    @Public()
    @ApiOperation({ summary: 'get recent trades' })
    @Get('trades')
    async fetchTrades(@Query('symbol') symbol: string, @Query('limit') limit: string) {
        return this.binanceService.getRecentTrades(symbol, Number(limit));
    }
    @Public()
    @ApiOperation({ summary: 'Order Book' })
    @Get('orderBook')
    async fetchOrderBook(@Query('symbol') symbol: string, @Query('limit') limit: string) {
        const start = Date.now();
        const result = await this.binanceService.getOrderBook(symbol, Number(limit));
        return result;
    }
    @Public()

    @ApiOperation({ summary: 'Top Order Book' })
    @Get('top-orderBook')
    async topOrderBook(@Query('symbol') symbol: string) {
        return this.binanceService.getTopOfBook(symbol);
    }

    @Public()
    @ApiOperation({ summary: 'Get Exchange Info' })
    @Get('exchangeinfo')
    async exchangeInfo() {
        return this.binanceService.getExchangeInfo();
    }
    @Public()

    @ApiOperation({ summary: 'system status' })
    @Get('system-status')
    async getSystemStatus() {
        return this.binanceService.getSystemStatus();
    }
    @Public()


    @ApiOperation({ summary: 'Taker Buy/Sell Volume (Futures)' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'period',
        required: true,
        description: 'Interval, e.g., 5m, 15m, 1h',
        enum: ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d']
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of data points (default 30, max 500)' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start timestamp in ms (optional)' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End timestamp in ms (optional)' })
    @Get('taker-volume')
    async getTakerVolume(
        @Query('symbol') symbol: string,
        @Query('period') period: string,
        @Query('limit') limit?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
    ) {
        return this.binanceService.getTakerVolume(
            symbol,
            period,
            limit ? Number(limit) : undefined,
            startTime ? Number(startTime) : undefined,
            endTime ? Number(endTime) : undefined,
        );
    }
    @Public()

    @ApiOperation({ summary: "get liquidation" })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair, e.g., BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, description: 'limit for liquidation' })
    @Get('liquidation')
    async getLiquidation(@Query('symbol') symbol: string, @Query('limit') limit: number) {
        return this.binanceService.getLiquidation(symbol, limit);
    }
    @Public()

    @ApiOperation({ summary: 'Open Interest (OI) for a symbol - Binance Futures' })
    @ApiQuery({ name: 'symbol', type: String, required: true, description: 'Trading pair, e.g., BTCUSDT' })
    @Get('open-interest')
    async getOpenInterest(@Query('symbol') symbol: string) {
        return this.binanceService.getOpenInterest(symbol);
    }

    @Public()


    @ApiOperation({ summary: 'Get Funding Rates (Futures)' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair, e.g., BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit for funding rates' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start time in ms (optional)' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End time in ms (optional)' })
    @Get('funding-rates')
    async getFundingRates(
        @Query('symbol') symbol: string,
        @Query('limit') limit: number,
        @Query('startTime') startTime?: number,
        @Query('endTime') endTime?: number,
    ) {
        return this.binanceService.getFundingRates(symbol, limit, startTime, endTime);
    }
    @Public()

    @Get('range-garch')
    @ApiOperation({ summary: 'Calculate Range GARCH' })
    // @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    // @ApiQuery({ name: 'interval', required: false, description: 'Time interval, e.g., 1d', default: '1d' })
    // @ApiQuery({ name: 'limit', required: false, description: 'Number of data points to return', default: 30 })
    async getRangeGARCH(
        @Query('symbol') symbol: string = 'BTCUSDT',
        @Query('interval') interval: string = '1d',
        @Query('limit') limit: number = 30,
    ) {
        if (!symbol) {
            return { error: 'Symbol is required' };
        }

        const data = await this.binanceService.calculateRangeGARCH(symbol, interval, limit);
        return { symbol, interval, data };
    }
    @Public()

    @Get('obiz')
    @ApiOperation({ summary: 'Get OBI & OBI_z score for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'window', required: false, example: 10 })
    async getOBIZ(
        @Query('symbol') symbol: string,
        @Query('limit') limit: number = 10,
        @Query('window') window: number = 10,
    ) {
        return this.binanceService.calculateOBIZ(symbol, limit, window);
    }
    // @Get('rsi')
    // @ApiOperation({ summary: 'Get RSI series for a symbol' })
    // @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    // @ApiQuery({ name: 'interval', required: true, example: '15m' })
    // @ApiQuery({ name: 'timePeriod', required: false, example: 14 })
    // @ApiQuery({ name: 'limit', required: false, example: 400 })
    // async getRSI(
    //     @Query('symbol') symbol: string,
    //     @Query('interval') interval: string,
    //     @Query('timePeriod') timePeriod: number = 14,
    //     @Query('limit') limit: number = 100,
    // ) {
    //     return this.binanceService.calculateRSI(symbol, interval, timePeriod, limit);
    // }
    @Get('bollinger-bands')
    @ApiOperation({ summary: 'Get Bollinger Bands for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, example: '15m' })
    @ApiQuery({ name: 'period', required: false, example: 20 })
    @ApiQuery({ name: 'multiplier', required: false, example: 2 })
    @ApiQuery({ name: 'limit', required: false, example: 100 })
    async getBollingerBands(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('period') period: number = 20,
        @Query('multiplier') multiplier: number = 2,
        @Query('limit') limit: number = 100,
    ) {
        return this.binanceService.calculateBollingerBands(symbol, interval, period, multiplier, limit);
    }
    @Public()

    @Get('EMA')
    @ApiOperation({ summary: 'Get EMA for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, example: '15m' })
    @ApiQuery({ name: 'period', required: false, example: 20 })
    @ApiQuery({ name: 'limit', required: false, example: 100 })
    async getEMA(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('period') period: number = 20,
        @Query('limit') limit: number = 100,
    ) {
        return this.binanceService.calculateEMA(symbol, interval, period, limit);
    }
    @Public()

    @Get('latest-cvd-slope')
    @ApiOperation({ summary: 'Get Latest CVD Slope for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, example: '15m' })
    @ApiQuery({ name: 'slopeWindow', required: false, example: 10 })
    async getLatestCVDSlope(
        @Query('symbol') symbol: string = 'BTCUSDT',
        @Query('interval') interval: string = '15m',
        @Query('slopeWindow') slopeWindow: number = 10,
    ) {
        return await this.binanceService.getLatestCVDSlope(symbol, interval, slopeWindow);
    }

    @Public()

    @ApiOperation({ summary: 'Get candles with indicators' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1m, 5m, 1h' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of candles to return', default: 100 })
    @Get('candles-with-indicators')
    async getCandlesWithIndicators(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('limit') limit: string,
    ) {
        const limitNumber = parseInt(limit) || 100;

        return this.binanceService.getCandlesWithIndicators(
            symbol.toUpperCase(),
            interval,
            limitNumber
        );
    }
    @Public()

    @Get('data')
    async getOBIData(@Query('symbol') symbol: string) {
        return this.binanceService.getOBIData(symbol);
    }




    //-------------------------------------- signed endpoints
    @ApiOperation({ summary: 'Get Account Info (uses env credentials)' })
    @Get('account-info')
    async getAccountInfo(@Req() req) {
        // Bypass authentication - use environment credentials
        const userId = req.user?.id;
        // fetch username from db
        console.log("userID..", userId);
        const user = await this.userService.findById(userId);
        console.log('Authenticated user:', user);

        console.log('[DEBUG] Calling getUserCredential with userId:', userId, 'exchange: binance');
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        console.log('[DEBUG] getUserCredential returned:', !!credentials ? 'CREDENTIALS FOUND' : 'NULL');

        if (!credentials) {
            console.log('No BINANCE credentials found for this user, using env credentials');
        } else {
            console.log('Using database credentials for user:', userId);
        }

        const start = Date.now();
        const result = await this.binanceSignedService.getAccountInfo(credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Fetched account info in ${end - start}ms`);
        return result;
    }
    @Get('user-assets')
    @ApiOperation({ summary: 'Get User Assets (uses env credentials)' })
    async getUserAssets(@Req() req) {
        // Bypass authentication - use environment credentials
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('No BINANCE credentials found for this user using env')
        }
        const start = Date.now();
        const result = await this.binanceSignedService.getUserAssets(credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Fetched user assets in ${end - start}ms`);
        return result;
    }
    @Get('account-balances')
    @ApiOperation({ summary: 'Get Account Balances (uses env credentials)' })
    async getAccountBalances(@Req() req) {
        const userId = req.user?.id;


        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('No database credentials found, falling back to env credentials');
        } else {
            console.log('Using database credentials for getAccountBalances');
        }

        const start = Date.now();
        const result = await this.binanceSignedService.getBalances(credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Fetched account balances in ${end - start}ms`);
        return result;
    }
    @Get('account-snapshot')
    @ApiOperation({
        summary: 'Get 30 days SPOT account snapshots (historical balances)',
        description: 'Returns daily balance snapshots for the last 30 days for SPOT account. No query parameters required.'
    })
    async getAccountSnapshot(@Req() req) {
        const userId = req.user?.id;

        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('using env credentials')
        }
        try {
            return await this.binanceSignedService.getAccountSnapshot(credentials?.apiKey, credentials?.secretKey);
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Get('transfer-history')
    @ApiOperation({ summary: 'Get all internal transfer history (Spot, Futures, Margin)' })
    @ApiQuery({ name: 'current', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'size', required: false, type: Number, description: 'Page size' })
    async getAllTransfers(
        @Query('current', new ParseIntPipe({ optional: true })) current = 1,
        @Query('size', new ParseIntPipe({ optional: true })) size = 100,
    ) {
        try {
            return await this.binanceSignedService.getAllTransferHistory(current, size);
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Get('deposit-history')
    @ApiOperation({ summary: 'Get all deposit history (last 90 days, all statuses)' })
    @ApiResponse({ status: 200, description: 'Deposit history fetched successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    async getDepositHistory(@Req() req) {
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('No BINANCE credentials found for this user using env')
        }
        try {
            return await this.binanceSignedService.getDepositHistory(credentials?.apiKey, credentials?.secretKey);
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Get('withdraw-history')
    @ApiOperation({ summary: 'Get all withdrawal history (last 90 days, all statuses)' })
    @ApiResponse({ status: 200, description: 'Withdrawal history fetched successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    async getWithdrawHistory(@Req() req) {
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('No BINANCE credentials found for this user using env')
        }
        try {
            return await this.binanceSignedService.getWithdrawHistory(credentials?.apiKey, credentials?.secretKey);
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Get('security')
    @ApiOperation({ summary: 'Get account security information (2FA, API restrictions, etc.)' })
    @ApiResponse({ status: 200, description: 'Security information fetched successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    async getSecurityInfo() {
        try {
            return await this.binanceSignedService.getSecurityInfo();
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
        }
    }

    @ApiOperation({ summary: 'Get all open orders (uses environment credentials)' })
    @ApiQuery({ name: 'symbol', required: false, example: 'BTCUSDT' })
    @Get('open-orders')
    async getOpenOrders(@Req() req, @Query('symbol') symbol?: string) {
        // Use environment credentials since auth modules are disabled
        const userId = req.user?.id;
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        console.log('getAccountBalances called with env credentials');
        if (!credentials) {
            console.log('No BINANCE credentials found for this user, using environment variables')
        }
        const apiKey = credentials?.apiKey;
        const secretKey = credentials?.secretKey;

        if (!apiKey || !secretKey) {
            throw new HttpException('Binance API credentials not configured in environment', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const start = Date.now();
        const result = await this.binanceSignedService.getOpenOrders(symbol, apiKey, secretKey);
        const end = Date.now();
        this.logger.log(`Fetched open orders in ${end - start}ms`);
        return result;
    }
    @ApiOperation({ summary: 'Get all open positions (uses stored credentials)' })
    @Get('open-positions')
    async getOpenPositions(@Req() req) {
        const userId = req.user.id;

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

        if (!credentials) {
            console.log('no binace credenital foiund in db using envcrendentials');
        }

        const start = Date.now();
        const result = await this.binanceSignedService.getOpenPositions(credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Fetched open positions in ${end - start}ms`);
        return result;
    }
    @ApiOperation({ summary: 'Get order history for a symbol (uses stored credentials)' })
    @Get('order-history')
    async getOrderHistory(@Req() req) {
        const userId = req.user.id;

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

        if (!credentials) {
            console.log('no binace credenital foiund in db using env crendentials');
        }

        const start = Date.now();
        const result = await this.binanceSignedService.getOrderHistory(credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Fetched order history in ${end - start}ms`);
        return result;
    }

    @ApiOperation({ summary: 'Get trades for a symbol (uses stored credentials)' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @Get('my-trades')
    async getMyTrades(@Req() req, @Query('symbol') symbol: string, @Query('limit') limit = 10) {
        const userId = req.user.id;

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

        if (!credentials) {
            console.log('no binace credenital foiund in db using env crendentials');
        }

        return this.binanceSignedService.getMyTrades(symbol, limit, credentials?.apiKey, credentials?.secretKey);
    }

    @Get('all-orders')
    @ApiOperation({ summary: 'Get all orders for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, example: 1000, description: 'Default 1000' })
    @ApiQuery({ name: 'startTime', required: false, type: Number })
    @ApiQuery({ name: 'endTime', required: false, type: Number })
    @ApiQuery({ name: 'orderId', required: false, type: Number })
    async getAllOrders(
        @Req() req,
        @Query('symbol') symbol: string,
        @Query('limit') limit = 1000,
        @Query('startTime') startTime?: number,
        @Query('endTime') endTime?: number,
        @Query('orderId') orderId?: number
    ) {
        const userId = req.user.id;
        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('no binace credenital foiund in db using env crendentials');
        }
        return this.binanceSignedService.getAllOrders(
            symbol,
            limit,
            credentials?.apiKey,
            credentials?.secretKey,
            orderId,
            startTime,
            endTime
        );
    }
    @Public()
    @Get('all-order-lists')
    @ApiOperation({ summary: 'Get all order lists (OCO orders) - Query all Order lists (USER_DATA)' })
    @ApiQuery({ name: 'fromId', required: false, type: Number, description: 'If supplied, neither startTime or endTime can be provided' })
    @ApiQuery({ name: 'startTime', required: false, type: Number, description: 'Start time in milliseconds' })
    @ApiQuery({ name: 'endTime', required: false, type: Number, description: 'End time in milliseconds (max 24 hours from startTime)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Default: 500; Maximum: 1000' })
    @ApiResponse({
        status: 200,
        description: 'Array of order lists with OCO order details',
        schema: {
            example: [
                {
                    orderListId: 29,
                    contingencyType: 'OCO',
                    listStatusType: 'EXEC_STARTED',
                    listOrderStatus: 'EXECUTING',
                    listClientOrderId: 'amEEAXryFzFwYF1FeRpUoZ',
                    transactionTime: 1565245913483,
                    symbol: 'LTCBTC',
                    orders: [
                        {
                            symbol: 'LTCBTC',
                            orderId: 4,
                            clientOrderId: 'oD7aesZqjEGlZrbtRpy5zB'
                        },
                        {
                            symbol: 'LTCBTC',
                            orderId: 5,
                            clientOrderId: 'Jr1h6xirOxgeJOUuYQS7V3'
                        }
                    ]
                }
            ]
        }
    })
    async getAllOrderLists(
        @Req() req,
        @Query('fromId') fromId?: number,
        @Query('startTime') startTime?: number,
        @Query('endTime') endTime?: number,
        @Query('limit') limit: number = 500
    ) {
        const userId = req.user.id;
        if (!userId) {

            console.log('no user found using env crendeials')
        }

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        if (!credentials) {
            console.log('no binace credenital foiund in db using env crendentials')
        }

        try {
            return await this.binanceSignedService.getAllOrderLists(
                credentials?.apiKey,
                credentials?.secretKey,
                fromId,
                startTime,
                endTime,
                limit
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Public()
    @ApiOperation({
        summary: 'Get historical filled orders across all symbols (last 20 hours)',
        description: 'Fetches historical FILLED orders from the last 20 hours by first calling /api/v3/allOrderList to get symbols, then /api/v3/allOrders for each symbol. ' +
            'This endpoint automatically handles pagination and rate limiting. ' +
            'Timeframe is hardcoded to 20 hours.'
    })
    @ApiResponse({
        status: 200,
        description: 'Returns object with success status and array of filled orders sorted by time (most recent first)',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                days: { type: 'number', example: 7 },
                totalOrders: { type: 'number', example: 42 },
                orders: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', example: 'BTCUSDT' },
                            orderId: { type: 'number', example: 28 },
                            orderListId: { type: 'number', example: 29 },
                            clientOrderId: { type: 'string' },
                            price: { type: 'string', example: '43250.00' },
                            origQty: { type: 'string', example: '0.1' },
                            executedQty: { type: 'string', example: '0.1' },
                            cummulativeQuoteQty: { type: 'string', example: '4325.00' },
                            status: { type: 'string', example: 'FILLED' },
                            timeInForce: { type: 'string', example: 'GTC' },
                            type: { type: 'string', example: 'LIMIT' },
                            side: { type: 'string', example: 'BUY' },
                            time: { type: 'number', example: 1499827319559 },
                            updateTime: { type: 'number', example: 1499827319559 }
                        }
                    }
                }
            }
        }
    })
    @Get('historical-filled-orders')
    async getHistoricalFilledOrders() {
        // Hardcoded to fetch last 20 hours of data
        const hours = 20;

        let apiKey: string | undefined;
        let secretKey: string | undefined;

        // Try to get user credentials from database if user is authenticated
        // const userId = req.user?.id;

        // if (userId) {
        //     this.logger.log(`Authenticated user ${userId} - fetching credentials from database`);
        //     try {
        //         const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        //         if (credentials) {
        //             apiKey = credentials.apiKey;
        //             secretKey = credentials.secretKey;
        //             this.logger.log(`Using database credentials for user ${userId}`);
        //         } else {
        //             this.logger.warn(`No credentials found in database for user ${userId}, falling back to environment variables`);
        //             apiKey = process.env.BINANCE_API_KEY;
        //             secretKey = process.env.BINANCE_SECRET_KEY;
        //         }
        //     } catch (error) {
        //         this.logger.warn(`Error fetching credentials from database: ${error.message}, falling back to environment variables`);
        //         apiKey = process.env.BINANCE_API_KEY;
        //         secretKey = process.env.BINANCE_SECRET_KEY;
        //     }
        // } else {
        // No authenticated user - use environment variables
        // this.logger.log(`No authenticated user - using environment credentials`);
        apiKey = process.env.BINANCE_API_KEY;
        secretKey = process.env.BINANCE_SECRET_KEY;
        // }

        if (!apiKey || !secretKey) {
            throw new HttpException('Binance API credentials not available', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        this.logger.log(`Fetching last ${hours} hours of historical filled orders`);

        try {
            const filledOrders = await this.binanceSignedService.getHistoricalFilledOrders(
                hours,
                apiKey,
                secretKey
            );

            this.logger.log(`Successfully fetched ${filledOrders.length} filled orders`);

            return {
                success: true,
                hours,
                totalOrders: filledOrders.length,
                orders: filledOrders
            };
        } catch (error) {
            this.logger.error(`Error fetching historical filled orders: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    @Public()
    @ApiOperation({ summary: 'Place a new order (uses stored credentials)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                symbol: { type: 'string', example: 'BTCUSDT' },
                side: { type: 'string', enum: ['BUY', 'SELL'] },
                type: { type: 'string', enum: ['LIMIT', 'MARKET'] },
                quantity: { type: 'string', example: '0.001' },
                price: { type: 'string', example: '45000.00' },
                timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'] }
            },
            required: ['symbol', 'side', 'type', 'quantity']
        }
    })
    @Post('place-order')
    async placeOrder(
        @Req() req,
        @Body() orderData: {
            symbol: string;
            side: 'BUY' | 'SELL';
            type: 'LIMIT' | 'MARKET';
            quantity: string;
            price?: string;
            timeInForce?: 'GTC' | 'IOC' | 'FOK';
        }
    ) {
        const userId = req.user.id;

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

        if (!credentials) {
            console.log('no binace credenital foiund in db using env crendentials');
        }
        console.log('Placing order with data:', orderData);
        const start = Date.now();
        // Validate required fields
        if (!orderData.symbol || !orderData.side || !orderData.type || !orderData.quantity) {
            throw new Error('Missing required fields: symbol, side, type, quantity');
        }

        if (orderData.type === 'LIMIT' && !orderData.price) {
            throw new Error('Price is required for LIMIT orders');
        }

        // Fetch exchange info for precision calculation
        const exchangeInfo = await this.binanceSignedService.getExchangeInfo(orderData.symbol);
        const lotSizeFilter = exchangeInfo.filters.find(f => f.filterType === 'LOT_SIZE');
        const priceFilter = exchangeInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
        const notionalFilter = exchangeInfo.filters.find(f => f.filterType === 'NOTIONAL');

        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const tickSize = parseFloat(priceFilter.tickSize);
        const minNotional = parseFloat(notionalFilter.minNotional);

        const quantityPrecision = this.binanceSignedService.getPrecision(stepSize);
        const pricePrecision = this.binanceSignedService.getPrecision(tickSize);

        // Round quantity and price to proper precision
        const roundedQuantity = parseFloat(orderData.quantity).toFixed(quantityPrecision);
        const roundedPrice = orderData.price ? parseFloat(orderData.price).toFixed(pricePrecision) : undefined;

        // Validate minimum requirements
        const quantityNum = parseFloat(roundedQuantity);
        const priceNum = roundedPrice ? parseFloat(roundedPrice) : 0;
        const minQty = parseFloat(lotSizeFilter.minQty);
        const maxQty = parseFloat(lotSizeFilter.maxQty);

        if (quantityNum < minQty || quantityNum > maxQty) {
            throw new HttpException(
                `Quantity must be between ${minQty} and ${maxQty}, got ${quantityNum}`,
                HttpStatus.BAD_REQUEST
            );
        }
        // Validate notional for LIMIT orders
        if (orderData.type === 'LIMIT' && priceNum * quantityNum < minNotional) {
            throw new HttpException(
                `Order value must be at least ${minNotional} USDT, got ${(priceNum * quantityNum).toFixed(8)} USDT`,
                HttpStatus.BAD_REQUEST
            );
        }
        const order = {
            symbol: orderData.symbol,
            side: orderData.side,
            type: orderData.type,
            quantity: roundedQuantity,
            ...(orderData.type === 'LIMIT' && roundedPrice ? { price: roundedPrice } : {}),
            ...(orderData.type === 'LIMIT' && orderData.timeInForce ? { timeInForce: orderData.timeInForce } : {})
        };


        const result = await this.binanceSignedService.placeOrder(order, credentials?.apiKey, credentials?.secretKey);
        const end = Date.now();
        this.logger.log(`Placed order in ${end - start}ms`);
        return result;
    }
    @Public()

    @ApiOperation({ summary: 'Cancel an order (uses stored credentials)' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    @ApiQuery({ name: 'orderId', required: true, example: '123456789' })
    @Delete('cancel-order')
    async cancelOrder(@Req() req, @Query('symbol') symbol: string, @Query('orderId') orderId: string) {
        const userId = req.user.id;

        // Fetch user's BINANCE credentials from database
        const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

        if (!credentials) {
            console.log('No BINANCE credentials found for this user, using environment variables')
        }

        if (!symbol || !orderId) {
            throw new Error('Missing required query parameters: symbol, orderId');
        }
        return this.binanceSignedService.cancelOrder(symbol, Number(orderId), credentials?.apiKey, credentials?.secretKey);
    }

    @Public()
    @Post('cancel-all-orders')
    @ApiOperation({ summary: 'Cancel all open orders for a symbol (uses stored credentials)' })
    @ApiQuery({ name: 'symbol', required: true, example: 'BTCUSDT' })
    async cancelAllOrders(@Query('symbol') symbol: string) {
        // Fetch user's BINANCE credentials from database
        // const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);
        // if (!credentials) {
        //     console.log('No BINANCE credentials found for this user, using environment variables')
        // }
        return this.binanceSignedService.cancelAllOrders(symbol);
    }

    // @Public()
    // @Post('place-oco-order')
    // @ApiOperation({ summary: 'Place a new OCO order - One Cancels Other' })
    // @ApiBody({
    //     schema: {
    //         type: 'object',
    //         properties: {
    //             symbol: { type: 'string', example: 'ZECUSDT', description: 'Trading pair symbol' },
    //             side: { type: 'string', enum: ['BUY', 'SELL'], example: 'SELL', description: 'Order side' },
    //             quantity: { type: 'string', example: '0.028', description: 'Order quantity' },
    //             aboveType: { type: 'string', enum: ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'LIMIT_MAKER', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'TAKE_PROFIT_LIMIT', description: 'Above order type (trigger above current price)' },
    //             abovePrice: { type: 'string', example: '370.21', description: 'Above order limit price (for TAKE_PROFIT_LIMIT)' },
    //             aboveStopPrice: { type: 'string', example: '370.21', description: 'Above order stop price' },
    //             aboveTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Above order time in force' },
    //             belowType: { type: 'string', enum: ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'STOP_LOSS_LIMIT', description: 'Below order type (trigger below current price)' },
    //             belowPrice: { type: 'string', example: '319.90', description: 'Below order limit price (for STOP_LOSS_LIMIT)' },
    //             belowStopPrice: { type: 'string', example: '320.32', description: 'Below order stop price' },
    //             belowTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Below order time in force' },
    //             listClientOrderId: { type: 'string', description: 'Custom order list ID (optional)' },
    //             newOrderRespType: { type: 'string', enum: ['ACK', 'RESULT', 'FULL'], example: 'RESULT', description: 'Response type (default: RESULT)' },
    //         },
    //         required: [
    //             'symbol',
    //             'side',
    //             'quantity',
    //             'aboveType',
    //             'aboveStopPrice',
    //             'belowType',
    //             'belowStopPrice',
    //         ],
    //     },
    // })
    // async placeOrderOCO(@Req() req,
    //     @Body() order: {
    //         symbol: string;
    //         side: 'BUY' | 'SELL';
    //         quantity: string;
    //         aboveType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'LIMIT_MAKER' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
    //         abovePrice?: string;
    //         aboveStopPrice?: string;
    //         aboveTimeInForce?: 'GTC' | 'IOC' | 'FOK';
    //         belowType: 'STOP_LOSS_LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
    //         belowPrice?: string;
    //         belowStopPrice?: string;
    //         belowTimeInForce?: 'GTC' | 'IOC' | 'FOK';
    //         listClientOrderId?: string;
    //         newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
    //     },
    // ) {
    //     const userId = req.user.id;

    //     // Fetch user's BINANCE credentials from database
    //     const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

    //     if (!credentials) {
    //         console.log('No BINANCE credentials found for this user, using environment variables')
    //     }
    //     const apiKey = credentials?.apiKey;
    //     const secretKey = credentials?.secretKey;
    //     try {
    //         const start = Date.now();

    //         this.logger.log(`📥 Received OCO order request: ${order.symbol} ${order.side} ${order.quantity}`);

    //         const result = await this.binanceSignedService.placeOrderOCO(order, apiKey, secretKey);
    //         const end = Date.now();
    //         this.logger.log(`✅ Placed OCO order in ${end - start}ms`);
    //         return result;

    //     } catch (error: any) {
    //         this.logger.error(`❌ Error placing OCO order: ${error.message}`);
    //         throw new HttpException(
    //             { message: error.message },
    //             HttpStatus.BAD_REQUEST
    //         );
    //     }
    // }

    // @Public()
    // @Post('place-otoc-order')
    // @ApiOperation({ summary: 'Place a new OTOCO order (requires API key & secret)' })
    // @ApiBody({
    //     schema: {
    //         type: 'object',
    //         properties: {
    //             symbol: { type: 'string', example: 'RVNUSDT', description: 'Trading pair symbol' },
    //             workingType: { type: 'string', enum: ['LIMIT', 'LIMIT_MAKER'], example: 'LIMIT', description: 'Type of the working order' },
    //             workingSide: { type: 'string', enum: ['BUY', 'SELL'], example: 'BUY', description: 'Side of the working order' },
    //             workingPrice: { type: 'string', example: '0.013600', description: 'Price for the working LIMIT order' },
    //             workingQuantity: { type: 'string', example: '376.2', description: 'Quantity for the working order' },
    //             workingTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Time in force for the working order' },
    //             pendingSide: { type: 'string', enum: ['BUY', 'SELL'], example: 'SELL', description: 'Side for the pending OCO orders' },
    //             pendingQuantity: { type: 'string', example: '376.2', description: 'Quantity for the pending OCO orders' },
    //             pendingAboveType: { type: 'string', enum: ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'TAKE_PROFIT_LIMIT', description: 'Type of the above pending order' },
    //             pendingAbovePrice: { type: 'string', example: '0.014100', description: 'Price for the above pending order' },
    //             pendingAboveStopPrice: { type: 'string', example: '0.014100', description: 'Stop price for the above pending order' },
    //             pendingAboveTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Time in force for the above pending order' },
    //             pendingBelowType: { type: 'string', enum: ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], example: 'STOP_LOSS_LIMIT', description: 'Type of the below pending order' },
    //             pendingBelowPrice: { type: 'string', example: '0.013200', description: 'Price for the below pending order' },
    //             pendingBelowStopPrice: { type: 'string', example: '0.013200', description: 'Stop price for the below pending order' },
    //             pendingBelowTimeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], example: 'GTC', description: 'Time in force for the below pending order' },
    //             timestamp: { type: 'number', example: Date.now(), description: 'Unix timestamp in milliseconds (optional, set by server if not provided)' },
    //         },
    //         required: [
    //             'symbol',
    //             'workingType',
    //             'workingSide',
    //             'workingPrice',
    //             'workingQuantity',
    //             'workingTimeInForce',
    //             'pendingSide',
    //             'pendingQuantity',
    //             'pendingAboveType',
    //             'pendingAbovePrice',
    //             'pendingAboveStopPrice',
    //             'pendingAboveTimeInForce',
    //             'pendingBelowType',
    //             'pendingBelowPrice',
    //             'pendingBelowStopPrice',
    //             'pendingBelowTimeInForce',
    //         ],
    //     },
    // })

    // async placeOrderListOTOCO(
    //     @Body() order: OTOCOOrderRequest,
    //     @Req() req,
    // ): Promise<OTOCOOrderResult> {
    //     try {
    //         const userId = req.user.id;

    //         // Fetch user's BINANCE credentials from database
    //         const credentials = await this.apiCredentialsService.getUserCredential(userId, 'binance' as any);

    //         if (!credentials) {
    //             console.log('No BINANCE credentials found for this user, using environment variables')
    //         }
    //         const apiKey = credentials?.apiKey;
    //         const secretKey = credentials?.secretKey;
    //         const start = Date.now();

    //         // Log incoming request body
    //         this.logger.log(`📥 Received OTOCO order request: ${JSON.stringify(order, null, 2)}`);
    //         this.logger.log(`🔑 Using API credentials: key=${apiKey ? apiKey.substring(0, 8) + '...' : 'from-env'}, secret=${secretKey ? 'provided' : 'from-env'}`);

    //         // Validate required fields
    //         if (
    //             !order.symbol ||
    //             !order.workingType ||
    //             !order.workingSide ||
    //             !order.workingPrice ||
    //             !order.workingQuantity ||
    //             !order.workingTimeInForce ||
    //             !order.pendingSide ||
    //             !order.pendingQuantity ||
    //             !order.pendingAboveType ||
    //             !order.pendingAbovePrice ||
    //             !order.pendingAboveStopPrice ||
    //             !order.pendingAboveTimeInForce ||
    //             !order.pendingBelowType ||
    //             !order.pendingBelowPrice ||
    //             !order.pendingBelowStopPrice ||
    //             !order.pendingBelowTimeInForce
    //         ) {
    //             throw new HttpException('Missing required fields for OTOCO order', HttpStatus.BAD_REQUEST);
    //         }

    //         // Convert USD amounts to token quantities if needed
    //         const currentPrice = await this.binanceService.getSymbolPrice(order.symbol);
    //         const currentPriceValue = parseFloat(currentPrice[0]?.price || '0');

    //         // Fetch exchange info for symbol precision and validation
    //         const exchangeInfo = await this.binanceSignedService.getExchangeInfo(order.symbol);
    //         const lotSizeFilter = exchangeInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    //         const priceFilter = exchangeInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
    //         const notionalFilter = exchangeInfo.filters.find(f => f.filterType === 'NOTIONAL');

    //         const stepSize = parseFloat(lotSizeFilter.stepSize);
    //         const tickSize = parseFloat(priceFilter.tickSize);
    //         const minNotional = parseFloat(notionalFilter.minNotional);

    //         const quantityPrecision = this.binanceSignedService.getPrecision(stepSize);
    //         const pricePrecision = this.binanceSignedService.getPrecision(tickSize);

    //         this.logger.log(`Symbol ${order.symbol} precision: quantity=${quantityPrecision} decimals (stepSize=${stepSize}), price=${pricePrecision} decimals (tickSize=${tickSize}), minNotional=${minNotional}`);

    //         // Helper function to convert USD amount to token quantity
    //         const convertUSDAmountToQuantity = (usdAmount: number, price: number): number => {
    //             return usdAmount / price;
    //         };

    //         // Check if quantities represent USD values (reasonable USD amounts vs token amounts)
    //         const workingQuantityNum = parseFloat(order.workingQuantity);
    //         const pendingQuantityNum = parseFloat(order.pendingQuantity);

    //         // If quantity seems like a USD amount (> 10 and < 10000), convert it
    //         if (workingQuantityNum >= 10 && workingQuantityNum <= 10000) {
    //             const tokenQuantity = convertUSDAmountToQuantity(workingQuantityNum, currentPriceValue);
    //             // Use proper precision for the symbol
    //             order.workingQuantity = tokenQuantity.toFixed(quantityPrecision);
    //             this.logger.log(`Converted working quantity from $${workingQuantityNum} USD to ${order.workingQuantity} ${order.symbol.replace('USDT', '')} (price: ${currentPriceValue})`);
    //         } else {
    //             // Round to proper quantity precision
    //             order.workingQuantity = parseFloat(order.workingQuantity).toFixed(quantityPrecision);
    //         }

    //         if (pendingQuantityNum >= 10 && pendingQuantityNum <= 10000) {
    //             const tokenQuantity = convertUSDAmountToQuantity(pendingQuantityNum, currentPriceValue);
    //             const decimals = order.symbol.endsWith('USDT') ? 4 : 8;
    //             order.pendingQuantity = tokenQuantity.toFixed(quantityPrecision);
    //             this.logger.log(`Converted pending quantity from $${pendingQuantityNum} USD to ${order.pendingQuantity} ${order.symbol.replace('USDT', '')} (price: ${currentPriceValue})`);
    //         } else {
    //             // Round to proper quantity precision and ensure it matches working quantity
    //             order.pendingQuantity = parseFloat(order.workingQuantity).toFixed(quantityPrecision);
    //         }

    //         // Ensure pending quantity exactly matches working quantity (critical for OTOCO orders)
    //         order.pendingQuantity = order.workingQuantity;
    //         this.logger.log(`Ensured pending quantity matches working quantity: ${order.pendingQuantity}`);

    //         // Round all prices to proper precision
    //         order.workingPrice = parseFloat(order.workingPrice).toFixed(pricePrecision);
    //         order.pendingAbovePrice = parseFloat(order.pendingAbovePrice).toFixed(pricePrecision);
    //         order.pendingAboveStopPrice = parseFloat(order.pendingAboveStopPrice).toFixed(pricePrecision);
    //         order.pendingBelowPrice = parseFloat(order.pendingBelowPrice).toFixed(pricePrecision);
    //         order.pendingBelowStopPrice = parseFloat(order.pendingBelowStopPrice).toFixed(pricePrecision);

    //         this.logger.log(`Applied precision - Working: price=${order.workingPrice}, qty=${order.workingQuantity}`);
    //         this.logger.log(`Applied precision - Above: price=${order.pendingAbovePrice}, stop=${order.pendingAboveStopPrice}, qty=${order.pendingQuantity}`);
    //         this.logger.log(`Applied precision - Below: price=${order.pendingBelowPrice}, stop=${order.pendingBelowStopPrice}, qty=${order.pendingQuantity}`);

    //         // Validate numeric fields
    //         const workingPrice = parseFloat(order.workingPrice);
    //         const workingQuantity = parseFloat(order.workingQuantity);
    //         const pendingQuantity = parseFloat(order.pendingQuantity);
    //         const pendingAbovePrice = parseFloat(order.pendingAbovePrice);
    //         const pendingAboveStopPrice = parseFloat(order.pendingAboveStopPrice);
    //         const pendingBelowPrice = parseFloat(order.pendingBelowPrice);
    //         const pendingBelowStopPrice = parseFloat(order.pendingBelowStopPrice);

    //         // Validate quantity against LOT_SIZE filter
    //         const minQty = parseFloat(lotSizeFilter.minQty);
    //         const maxQty = parseFloat(lotSizeFilter.maxQty);

    //         if (workingQuantity < minQty || workingQuantity > maxQty) {
    //             throw new HttpException(
    //                 `Working quantity must be between ${minQty} and ${maxQty}, got ${workingQuantity}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (pendingQuantity < minQty || pendingQuantity > maxQty) {
    //             throw new HttpException(
    //                 `Pending quantity must be between ${minQty} and ${maxQty}, got ${pendingQuantity}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         // Validate prices against PRICE_FILTER
    //         const minPrice = parseFloat(priceFilter.minPrice);
    //         const maxPrice = parseFloat(priceFilter.maxPrice);

    //         if (workingPrice < minPrice || workingPrice > maxPrice) {
    //             throw new HttpException(
    //                 `Working price must be between ${minPrice} and ${maxPrice}, got ${workingPrice}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (pendingAbovePrice < minPrice || pendingAbovePrice > maxPrice) {
    //             throw new HttpException(
    //                 `Pending above price must be between ${minPrice} and ${maxPrice}, got ${pendingAbovePrice}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (pendingAboveStopPrice < minPrice || pendingAboveStopPrice > maxPrice) {
    //             throw new HttpException(
    //                 `Pending above stop price must be between ${minPrice} and ${maxPrice}, got ${pendingAboveStopPrice}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         if (pendingBelowStopPrice < minPrice || pendingBelowStopPrice > maxPrice) {
    //             throw new HttpException(
    //                 `Pending below stop price must be between ${minPrice} and ${maxPrice}, got ${pendingBelowStopPrice}`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         // Fetch exchange info for notional validation
    //         // const exchangeInfo = await this.binanceSignedService.getExchangeInfo(order.symbol);
    //         // const notionalFilter = exchangeInfo.filters.find(f => f.filterType === 'NOTIONAL');
    //         // const minNotional = parseFloat(notionalFilter.minNotional); // 5 for RVNUSDT

    //         // Validate notional requirement for working order
    //         const notionalValue = workingPrice * workingQuantity;
    //         if (notionalValue < minNotional) {
    //             throw new HttpException(
    //                 `Working order value must be at least ${minNotional} USDT, got ${notionalValue.toFixed(8)} USDT`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         // Validate notional requirement for pending orders
    //         const pendingAboveNotional = pendingAbovePrice * pendingQuantity;
    //         const pendingBelowNotional = pendingBelowPrice * pendingQuantity;
    //         if (pendingAboveNotional < minNotional || pendingBelowNotional < minNotional) {
    //             throw new HttpException(
    //                 `Pending order value must be at least ${minNotional} USDT, got above: ${pendingAboveNotional.toFixed(8)} USDT, below: ${pendingBelowNotional.toFixed(8)} USDT`,
    //                 HttpStatus.BAD_REQUEST
    //             );
    //         }

    //         // Set timestamp using server time
    //         order.timestamp = await this.binanceSignedService.getServerTime();

    //         // Log final order body being sent to Binance
    //         this.logger.log(`📤 Sending OTOCO order to Binance: ${JSON.stringify(order, null, 2)}`);

    //         const result = await this.binanceSignedService.placeOrderListOTOCO(order, apiKey, secretKey);
    //         const end = Date.now();
    //         this.logger.log(`Placed OTOCO order in ${end - start}ms`);
    //         return result;

    //     } catch (error) {
    //         this.logger.error(`Error in placeOrderListOTOCO: ${error.message}`);
    //         throw new HttpException(
    //             `${error.message}`,
    //             HttpStatus.BAD_REQUEST
    //         );
    //     }
    // }
}