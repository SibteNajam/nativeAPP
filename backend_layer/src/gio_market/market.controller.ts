import { Controller, Get, Param, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GateioMarketService } from './market.service';
import { SpotCurrencyDto, SpotCurrencyPairDto } from './dto/market.dto';

@ApiTags('GateIO Market')
@Controller('gateio/spot')
export class GateioMarketController {
  private readonly logger = new Logger(GateioMarketController.name);

  constructor(private readonly marketService: GateioMarketService) {}

  @Get('currencies')
  @ApiOperation({ summary: 'Query all currency information' })
  @ApiResponse({ status: 200, description: 'List retrieved successfully' })
  async getAllCurrencies() {
    this.logger.log('GET /gateio/spot/currencies');
    return this.marketService.getAllCurrencies();
  }

  @Get('currencies/:currency')
  @ApiOperation({ summary: 'Query single currency information' })
  @ApiParam({ name: 'currency', description: 'Currency name' })
  @ApiResponse({ status: 200, description: 'Currency retrieved successfully' })
  async getCurrency(@Param('currency') currency: string) {
    this.logger.log(`GET /gateio/spot/currencies/${currency}`);
    return this.marketService.getCurrency(currency);
  }

  @Get('currency_pairs')
  @ApiOperation({ summary: 'Query all supported currency pairs' })
  @ApiResponse({ status: 200, description: 'Currency pairs retrieved successfully' })
  async getCurrencyPairs() {
    this.logger.log('GET /gateio/spot/currency_pairs');
    return this.marketService.getAllCurrencyPairs();
  }

  @Get('currency_pairs/:currency_pair')
  @ApiOperation({ summary: 'Query single currency pair details' })
  @ApiParam({ name: 'currency_pair', description: 'Trading pair id, e.g., ETH_USDT' })
  @ApiResponse({ status: 200, description: 'Currency pair retrieved successfully', type: SpotCurrencyPairDto })
  async getCurrencyPair(@Param('currency_pair') currencyPair: string) {
    this.logger.log(`GET /gateio/spot/currency_pairs/${currencyPair}`);
    return this.marketService.getCurrencyPair(currencyPair);
  }

  @Get('tickers')
  @ApiOperation({ summary: 'Get currency pair ticker information' })
  @ApiQuery({ name: 'currency_pair', required: false, description: 'Specific trading pair to query (optional)' })
  @ApiQuery({ name: 'timezone', required: false, description: 'Timezone (utc0, utc8, all)', enum: ['utc0', 'utc8', 'all'] })
  @ApiResponse({ status: 200, description: 'Tickers retrieved successfully' })
  async getTickers(
    @Query('currency_pair') currencyPair?: string,
    @Query('timezone') timezone?: string,
  ) {
    this.logger.log(`GET /gateio/spot/tickers${currencyPair ? `?currency_pair=${currencyPair}` : ''}${timezone ? `&timezone=${timezone}` : ''}`);
    return this.marketService.getTickers(currencyPair, timezone);
  }

  @Get('order_book')
  @ApiOperation({ summary: 'Get market depth (order book) information' })
  @ApiQuery({ name: 'currency_pair', required: true, description: 'Trading pair, e.g., BTC_USDT' })
  @ApiQuery({ name: 'interval', required: false, description: 'Price precision for depth aggregation, 0 means no aggregation' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of depth levels' })
  @ApiQuery({ name: 'with_id', required: false, description: 'Return order book update ID (boolean)' })
  @ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
  async getOrderBook(
    @Query('currency_pair') currencyPair: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
    @Query('with_id') withId?: string,
  ) {
    // coerce optional query params to proper types
    const intervalNum = typeof interval !== 'undefined' ? Number(interval) : undefined;
    const limitNum = typeof limit !== 'undefined' ? Number(limit) : undefined;
    const withIdBool = typeof withId !== 'undefined' ? (withId === 'true' || withId === '1') : undefined;

    this.logger.log(`GET /gateio/spot/order_book?currency_pair=${currencyPair}${interval ? `&interval=${interval}` : ''}${limit ? `&limit=${limit}` : ''}${withId ? `&with_id=${withId}` : ''}`);
    return this.marketService.getOrderBook(currencyPair, intervalNum, limitNum, withIdBool);
  }

  @Get('trades')
  @ApiOperation({ summary: 'Query market transaction records' })
  @ApiQuery({ name: 'currency_pair', required: true, description: 'Trading pair, e.g., BTC_USDT' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of items (1-1000)', type: Number })
  @ApiQuery({ name: 'last_id', required: false, description: 'Use the ID of the last record in the previous list as the starting point for the next list' })
  @ApiQuery({ name: 'reverse', required: false, description: 'Whether to retrieve data less than last_id (true) or greater than last_id (false)' })
  @ApiQuery({ name: 'from', required: false, description: 'Start timestamp (seconds)' })
  @ApiQuery({ name: 'to', required: false, description: 'End timestamp (seconds)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (when using page-based pagination)' })
  @ApiResponse({ status: 200, description: 'Trades retrieved successfully' })
  async getTrades(
    @Query('currency_pair') currencyPair: string,
    @Query('limit') limit?: string,
    @Query('last_id') lastId?: string,
    @Query('reverse') reverse?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    const opts: any = { currency_pair: currencyPair };
    if (typeof limit !== 'undefined') opts.limit = Number(limit);
    if (typeof lastId !== 'undefined') opts.last_id = lastId;
    if (typeof reverse !== 'undefined') opts.reverse = reverse === 'true' || reverse === '1';
    if (typeof from !== 'undefined') opts.from = Number(from);
    if (typeof to !== 'undefined') opts.to = Number(to);
    if (typeof page !== 'undefined') opts.page = Number(page);

    this.logger.log(`GET /gateio/spot/trades?currency_pair=${currencyPair}${limit ? `&limit=${limit}` : ''}${lastId ? `&last_id=${lastId}` : ''}`);
    return this.marketService.getTrades(opts);
  }

  @Get('candlesticks')
  @ApiOperation({ summary: 'Market K-line chart (candlesticks)' })
  @ApiQuery({ name: 'currency_pair', required: true, description: 'Trading pair, e.g., BTC_USDT' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of recent data points to return (max 1000)' })
  @ApiQuery({ name: 'from', required: false, description: 'Start time (unix seconds). If from/to specified, limit should not be set.' })
  @ApiQuery({ name: 'to', required: false, description: 'End time (unix seconds)' })
  @ApiQuery({ name: 'interval', required: false, description: 'Time interval: 1s,10s,1m,5m,15m,30m,1h,4h,8h,1d,7d,30d' })
  @ApiResponse({ status: 200, description: 'Candlesticks retrieved successfully' })
  async getCandlesticks(
    @Query('currency_pair') currencyPair: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: string,
  ) {
    const opts: any = { currency_pair: currencyPair };
    if (typeof limit !== 'undefined') opts.limit = Number(limit);
    if (typeof from !== 'undefined') opts.from = Number(from);
    if (typeof to !== 'undefined') opts.to = Number(to);
    if (typeof interval !== 'undefined') opts.interval = interval;

    this.logger.log(`GET /gateio/spot/candlesticks?currency_pair=${currencyPair}${limit ? `&limit=${limit}` : ''}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}${interval ? `&interval=${interval}` : ''}`);
    return this.marketService.getCandlesticks(opts);
  }

  @Get('futures/:settle/funding_rate')
  @ApiOperation({ summary: 'Futures market historical funding rate' })
  @ApiParam({ name: 'settle', description: 'Settle currency (btc or usdt)' })
  @ApiQuery({ name: 'contract', required: true, description: 'Futures contract, e.g., BTC_USDT' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records returned in a single list' })
  @ApiQuery({ name: 'from', required: false, description: 'Start timestamp (unix seconds)' })
  @ApiQuery({ name: 'to', required: false, description: 'End timestamp (unix seconds)' })
  @ApiResponse({ status: 200, description: 'Funding rates retrieved successfully' })
  async getFuturesFundingRate(
    @Param('settle') settle: string,
    @Query('contract') contract: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const opts: any = { contract };
    if (typeof limit !== 'undefined') opts.limit = Number(limit);
    if (typeof from !== 'undefined') opts.from = Number(from);
    if (typeof to !== 'undefined') opts.to = Number(to);

    this.logger.log(`GET /gateio/spot/futures/${settle}/funding_rate?contract=${contract}${limit ? `&limit=${limit}` : ''}`);
    return this.marketService.getFundingRates(settle, contract, opts.limit, opts.from, opts.to);
  }
}
