import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AlphaVantageService } from './alpha-vantage.service';

@Controller('alpha-vantage')
export class AlphaVantageController {
    constructor(private readonly alphaVantageService: AlphaVantageService) {}


    @Get('RSI-14')
    @ApiOperation({ summary: 'Get RSI-14 data' })
    async fetchRSI14() {
        return this.alphaVantageService.getRSI14();
    }
    @Get('MACD')
    @ApiOperation({ summary: 'Get MACD data' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTC' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1min, 5min ,15min, 30min, 1h, 1d, 7d, 1M' })
    async fetchMACD(@Query('symbol') symbol: string, @Query('interval') interval: string) {
        return this.alphaVantageService.getMACD(symbol, interval);
    }
    @Get('EMA')
      @ApiQuery({ name: 'symbol', required: true, description: 'Trading pair symbol, e.g., BTC' })
        @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1m, 5m ,15m, 30m, 1h, 1d, 7d, 1M' })
        @ApiQuery({ name: 'time_period', required: true, description: 'Time Period' })
    @ApiOperation({ summary: 'Get EMA data---Premium API' })
    async fetchEMA(@Query('symbol') symbol: string, @Query('interval') interval: string, @Query('time_period') timePeriod: number) {
        return  this.alphaVantageService.getEMA(symbol, interval, timePeriod);
    }

    @Get('BBands')
    @ApiOperation({ summary: 'Get Bollinger Bands data---Premium Api' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading  symbol, e.g., BTC' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1min, 5min ,15min, 30min, 1h, 1d, 7d, 1M' })
    @ApiQuery({ name: 'time_period', required: true, description: 'Time Period' })
    async fetchBBands(@Query('symbol') symbol: string, @Query('interval') interval: string, @Query('time_period') timePeriod: number) {
        return this.alphaVantageService.getBBands(symbol, interval, timePeriod);
    }

    @Get('ADX')
    @ApiOperation({ summary: 'Get ADX data---Trending' })
    @ApiQuery({ name: 'symbol', required: true, description: 'Trading  symbol, e.g., BTC' })
    @ApiQuery({ name: 'interval', required: true, description: 'Time interval, e.g., 1min, 5min ,15min, 30min, 1h, 1d, 7d, 1M' })
    @ApiQuery({ name: 'time_period', required: true, description: 'Time Period' })
    async fetchADX(@Query('symbol') symbol: string, @Query('interval') interval: string, @Query('time_period') timePeriod: number) {
        return this.alphaVantageService.getADX(symbol, interval, timePeriod);
    }

    @Get('CPI')
    @ApiOperation({ summary: 'Get CPI data---Economic Indicator' })
    async fetchCPI() {
        return this.alphaVantageService.getCPI();
    }
}
