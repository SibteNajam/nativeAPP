import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MexcMarketService } from './mexc-market.service';

@ApiTags('MEXC Market')
@Controller('mexc/market')
export class MexcMarketController {
  private readonly logger = new Logger(MexcMarketController.name);

  constructor(private readonly marketService: MexcMarketService) {}

  @Get('defaultSymbols')
  @ApiOperation({ summary: 'Get default symbols' })
  @ApiResponse({ status: 200, description: 'Default symbols retrieved successfully' })
  async getDefaultSymbols() {
    this.logger.log('GET /mexc/market/defaultSymbols');
    return this.marketService.getDefaultSymbols();
  }

  @Get('exchangeInfo')
  @ApiOperation({ summary: 'Get exchange information' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false, description: 'Comma separated list of symbols' })
  @ApiResponse({ status: 200, description: 'Exchange info retrieved successfully' })
  async getExchangeInfo(@Query('symbol') symbol?: string, @Query('symbols') symbols?: string) {
    this.logger.log(`GET /mexc/market/exchangeInfo${symbol ? `?symbol=${symbol}` : ''}${symbols ? `&symbols=${symbols}` : ''}`);
    const symbolsArr = symbols ? symbols.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.marketService.getExchangeInfo(symbol, symbolsArr);
  }

  @Get('depth')
  @ApiOperation({ summary: 'Get order book (depth)' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
  async getDepth(@Query('symbol') symbol: string, @Query('limit') limit?: string) {
    const limitNum = typeof limit !== 'undefined' ? Number(limit) : undefined;
    this.logger.log(`GET /mexc/market/depth?symbol=${symbol}${limit ? `&limit=${limit}` : ''}`);
    return this.marketService.getDepth(symbol, limitNum);
  }

  @Get('trades')
  @ApiOperation({ summary: 'Get recent trades' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Trades retrieved successfully' })
  async getTrades(@Query('symbol') symbol: string, @Query('limit') limit?: string) {
    const limitNum = typeof limit !== 'undefined' ? Number(limit) : undefined;
    this.logger.log(`GET /mexc/market/trades?symbol=${symbol}${limit ? `&limit=${limit}` : ''}`);
    return this.marketService.getTrades(symbol, limitNum);
  }

  @Get('aggTrades')
  @ApiOperation({ summary: 'Get aggregate trades' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Agg trades retrieved successfully' })
  async getAggTrades(@Query('symbol') symbol: string, @Query('startTime') startTime?: string, @Query('endTime') endTime?: string, @Query('limit') limit?: string) {
    const s = typeof startTime !== 'undefined' ? Number(startTime) : undefined;
    const e = typeof endTime !== 'undefined' ? Number(endTime) : undefined;
    const l = typeof limit !== 'undefined' ? Number(limit) : undefined;
    this.logger.log(`GET /mexc/market/aggTrades?symbol=${symbol}${startTime ? `&startTime=${startTime}` : ''}${endTime ? `&endTime=${endTime}` : ''}${limit ? `&limit=${limit}` : ''}`);
    return this.marketService.getAggTrades(symbol, s, e, l);
  }

  @Get('klines')
  @ApiOperation({ summary: 'Get Kline/candlestick data' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'interval', required: true })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Klines retrieved successfully' })
  async getKlines(@Query('symbol') symbol: string, @Query('interval') interval: string, @Query('startTime') startTime?: string, @Query('endTime') endTime?: string, @Query('limit') limit?: string) {
    const s = typeof startTime !== 'undefined' ? Number(startTime) : undefined;
    const e = typeof endTime !== 'undefined' ? Number(endTime) : undefined;
    const l = typeof limit !== 'undefined' ? Number(limit) : undefined;
    this.logger.log(`GET /mexc/market/klines?symbol=${symbol}&interval=${interval}${startTime ? `&startTime=${startTime}` : ''}${endTime ? `&endTime=${endTime}` : ''}${limit ? `&limit=${limit}` : ''}`);
    return this.marketService.getKlines(symbol, interval, s, e, l);
  }

  @Get('avgPrice')
  @ApiOperation({ summary: 'Get current average price' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiResponse({ status: 200, description: 'Average price retrieved successfully' })
  async getAvgPrice(@Query('symbol') symbol: string) {
    this.logger.log(`GET /mexc/market/avgPrice?symbol=${symbol}`);
    return this.marketService.getAvgPrice(symbol);
  }

  @Get('ticker/24hr')
  @ApiOperation({ summary: '24hr ticker price change statistics' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false, description: 'Comma separated list of symbols' })
  @ApiResponse({ status: 200, description: '24hr ticker retrieved successfully' })
  async getTicker24hr(@Query('symbol') symbol?: string, @Query('symbols') symbols?: string) {
    const symbolsArr = symbols ? symbols.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    this.logger.log(`GET /mexc/market/ticker/24hr${symbol ? `?symbol=${symbol}` : ''}${symbols ? `&symbols=${symbols}` : ''}`);
    return this.marketService.getTicker24hr(symbol, symbolsArr);
  }

  @Get('ticker/price')
  @ApiOperation({ summary: 'Symbol price ticker' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiResponse({ status: 200, description: 'Ticker price retrieved successfully' })
  async getTickerPrice(@Query('symbol') symbol?: string) {
    this.logger.log(`GET /mexc/market/ticker/price${symbol ? `?symbol=${symbol}` : ''}`);
    return this.marketService.getTickerPrice(symbol);
  }

  @Get('ticker/bookTicker')
  @ApiOperation({ summary: 'Best order book ticker' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiResponse({ status: 200, description: 'Book ticker retrieved successfully' })
  async getBookTicker(@Query('symbol') symbol?: string) {
    this.logger.log(`GET /mexc/market/ticker/bookTicker${symbol ? `?symbol=${symbol}` : ''}`);
    return this.marketService.getBookTicker(symbol);
  }
}
 
