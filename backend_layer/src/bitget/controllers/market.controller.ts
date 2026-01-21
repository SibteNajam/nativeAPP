import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BitgetService } from '../services/market.service';

@ApiTags('Bitget')
@Controller('bitget')
export class BitgetController {
    private readonly logger = new Logger(BitgetController.name);

    constructor(private readonly bitgetService: BitgetService) {}

    // SPOT

    @ApiOperation({ summary: 'Get all available spot trading symbols' })
    @Get('symbols')
    async getAllSymbols() {
        return this.bitgetService.getAllSymbols();
    }

    @ApiOperation({ summary: 'Get limited symbols with their current price' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of symbols to return (default: 20)' })
    @Get('limit-symbols')
    async getLimitedSymbols(@Query('limit') limit?: string) {
        const limitNumber = limit ? parseInt(limit) : 20;
        return this.bitgetService.getLimitedSymbols(limitNumber);
    }

    @ApiOperation({ summary: 'Get all tickers (spot)' })
    @Get('tickers')
    @ApiQuery({ name: 'symbol', required: false, description: 'Specific symbol to filter (optional)' })
    async getTickers( @Query('symbol') symbol?: string) {
        return this.bitgetService.getTickers(symbol);
    }

    @ApiOperation({ summary: 'Get top coin prices by volume (USDT pairs)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of coins to return (default: 20)' })
    @Get('prices')
    async getCoinPrices(@Query('limit') limit?: string) {
        return this.bitgetService.getCoinPrices(limit ? Number(limit) : 20);
    }

    @ApiOperation({ summary: 'Get candlestick/kline data' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval: 1m, 5m, 15m....' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of candles to return (default: 100, max: 1000)' })
    @Get('klines')
    async getKlines(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getKlines(symbol, interval, limit ? Number(limit) : 100);
    }

    @ApiOperation({ summary: 'Get detailed coin/ticker information' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
   
  @Get('coin-info')
  async getCoinInfo(@Query('symbol') symbol: string) {
    return this.bitgetService.getCoinInfo(symbol);
  }


    @ApiOperation({ summary: 'Get recent trades' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of trades (default: 100, max: 500)' })
    @Get('trades')
    async getRecentTrades(
        @Query('symbol') symbol: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getRecentTrades(symbol, limit ? Number(limit) : 100);
    }

    @ApiOperation({ summary: 'Get market trades history' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of trades (default: 500, max: 1000)' })
    @ApiQuery({ name: 'idLessThan', required: false, description: 'Order ID, returns records less than the specified tradeId' })
    @ApiQuery({ name: 'startTime', required: false, description: 'Start time, Unix millisecond timestamp. Time interval with endTime should not exceed 7 days' })
    @ApiQuery({ name: 'endTime', required: false, description: 'End time, Unix millisecond timestamp. Time interval with startTime should not exceed 7 days' })
    @Get('market-trades')
    async getMarketTrades(
        @Query('symbol') symbol: string,
        @Query('limit') limit?: string,
        @Query('idLessThan') idLessThan?: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
    ) {
        return this.bitgetService.getMarketTrades(
            symbol,
            limit ? Number(limit) : 500,
            idLessThan,
            startTime,
            endTime,
        );
    }

    @ApiOperation({ summary: 'Get order book depth' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'limit', required: false, description: 'Depth limit (default: 100, max: 150)' })
    @Get('orderbook')
    async getOrderBook(
        @Query('symbol') symbol: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getOrderBook(symbol, limit ? Number(limit) : 100);
    }

    @ApiOperation({ summary: 'Get top of order book (best bid/ask)' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTCUSDT' })
    @Get('top-orderbook')
    async getTopOfBook(@Query('symbol') symbol: string) {
        return this.bitgetService.getTopOfBook(symbol);
    }

    @ApiOperation({ summary: 'Get exchange information' })
    @ApiQuery({ name: 'symbol', required: false, description: 'Specific symbol (optional)' })
    @Get('exchange-info')
    async getExchangeInfo(@Query('symbol') symbol?: string) {
        return this.bitgetService.getExchangeInfo(symbol);
    }

    @ApiOperation({ summary: 'Get server time' })
    @Get('server-time')
    async getServerTime() {
        return this.bitgetService.getServerTime();
    }

    

    // Future

    @ApiOperation({ summary: 'Get all futures contracts' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/symbols')
    async getFuturesSymbols(@Query('productType') productType?: string) {
        return this.bitgetService.getFuturesSymbols(productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get futures ticker for a symbol' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/ticker')
    async getFuturesTicker(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
    ) {
        return this.bitgetService.getFuturesTicker(symbol, productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get all futures tickers' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/tickers')
    async getFuturesTickers(@Query('productType') productType?: string) {
        return this.bitgetService.getFuturesTickers(productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get futures candlestick/kline data' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval: 1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 1d, 1w' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of candles (default: 100, max: 1000)' })
    @Get('futures/klines')
    async getFuturesKlines(
        @Query('symbol') symbol: string,
        @Query('interval') interval: string,
        @Query('productType') productType?: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getFuturesKlines(
            symbol,
            interval,
            productType || 'USDT-FUTURES',
            limit ? Number(limit) : 100,
        );
    }

    @ApiOperation({ summary: 'Get futures order book depth' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Depth limit (default: 100, max: 100)' })
    @Get('futures/orderbook')
    async getFuturesOrderBook(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getFuturesOrderBook(
            symbol,
            productType || 'USDT-FUTURES',
            limit ? Number(limit) : 100,
        );
    }

    @ApiOperation({ summary: 'Get recent futures trades' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of trades (default: 100, max: 500)' })
    @Get('futures/trades')
    async getFuturesTrades(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
        @Query('limit') limit?: string,
    ) {
        return this.bitgetService.getFuturesTrades(
            symbol,
            productType || 'USDT-FUTURES',
            limit ? Number(limit) : 100,
        );
    }

    @ApiOperation({ summary: 'Get open interest for a futures symbol' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/open-interest')
    async getOpenInterest(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
    ) {
        return this.bitgetService.getOpenInterest(symbol, productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get current funding rate' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/funding-rate')
    async getCurrentFundingRate(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
    ) {
        return this.bitgetService.getCurrentFundingRate(symbol, productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get funding rate history' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @ApiQuery({ name: 'pageSize', required: false, description: 'Number of records (default: 20)' })
    @Get('futures/funding-rate-history')
    async getFundingRateHistory(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.bitgetService.getFundingRateHistory(
            symbol,
            productType || 'USDT-FUTURES',
            pageSize ? Number(pageSize) : 20,
        );
    }

    @ApiOperation({ summary: 'Get mark price for a futures symbol' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/mark-price')
    async getMarkPrice(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
    ) {
        return this.bitgetService.getMarkPrice(symbol, productType || 'USDT-FUTURES');
    }

    @ApiOperation({ summary: 'Get liquidation orders' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Futures symbol, e.g., BTCUSDT' })
    @ApiQuery({
        name: 'productType',
        required: false,
        description: 'Product type (default: USDT-FUTURES)',
        enum: ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'],
    })
    @Get('futures/liquidations')
    async getLiquidationOrders(
        @Query('symbol') symbol: string,
        @Query('productType') productType?: string,
    ) {
        return this.bitgetService.getLiquidationOrders(symbol, productType || 'USDT-FUTURES');
    }
}