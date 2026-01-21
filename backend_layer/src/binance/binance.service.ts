import { forwardRef, HttpException, HttpStatus, Inject, Injectable,Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IndicatorsService } from './indicators.service';
import { CacheService } from './cache.service';
import { ObiService } from './obi.service';


export interface CandleWithIndicators {
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  indicators: {
    rsi?: number;
    bollingerBands?: {
      upperBand: number;
      lowerBand: number;
      sma: number;
      percentB: number;
    };
    ema?: number;
    cvdSlope?: number;
    inverseATR?: number;
  };
}

@Injectable()
export class BinanceService {
        private readonly logger = new Logger(BinanceService.name);

    private BASE_URL = 'https://api.binance.com';
    private FUTURE_BASE_URL = 'https://fapi.binance.com';
    constructor(
        private readonly http: HttpService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => IndicatorsService))
        private readonly indicatorsService: IndicatorsService,
        private readonly cacheService: CacheService,
        private readonly obiService: ObiService, // Inject OBI service (make sure to import and provide it in the module

    ) { }

 async getCandlesWithIndicators(
        symbol: string, 
        interval: string, 
        limit: number = 100
    ): Promise<CandleWithIndicators[]> {
    const requestKey = `${symbol.toUpperCase()}_${interval}`;
        
        // Check cache first
        const cached = this.cacheService.getCandlesWithIndicators(symbol, interval, limit);
        if (cached && cached.length >= limit) {
            return cached.slice(0, limit);
        }

        // this.logger.log(`Cache miss for ${requestKey}, fetching fresh data`);

        // Fetch fresh data
        const klines = await this.getKlines(symbol, interval,1000); // Extra for indicators

        // Calculate all indicators in parallel
        const candlesWithIndicators = await this.calculateAllIndicators(
            symbol, 
            interval, 
            klines, 
            1000
        );

        // Cache the results
        this.cacheService.setCandlesWithIndicators(symbol, interval, 1000, candlesWithIndicators);

    return candlesWithIndicators.slice(0, limit);
}
private async calculateAllIndicators(
    symbol: string,
    interval: string,
    klines: any[],
    limit: number
): Promise<CandleWithIndicators[]> {
    const start = Date.now();
    // this.logger.log(`Starting indicator calculations for ${symbol} ${interval}`);

    // Convert klines to basic candle format
    const candles: CandleWithIndicators[] = klines.map(k => ({
        openTime: k.openTime,
        closeTime: k.closeTime,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume),
        quoteVolume: parseFloat(k.quoteVolume),
        trades: k.trades || 0,
        indicators: {}
    }));

    const closes = candles.map(c => c.close);
    const closesForRSI = closes.slice(-(limit + 14));
    const klinesForATR = klines.slice(-(limit + 14)); // Extra candles for ATR calculation


    
    try {
        // Calculate all indicators in parallel - INCLUDING enhanced CVD
        const [rsiValues, bollingerBands, emaValues, cvdSlope,inverseATRValues] = await Promise.all([
            this.indicatorsService.calculateRSIValues(closesForRSI, 14),
            this.indicatorsService.calculateBollingerBandsFromPrices(closes, 20, 2),
            this.indicatorsService.calculateEMAFromPrices(closes, 20),
            // ✅ ENHANCED: Use optimized CVD method
            this.indicatorsService.calculateCVDSlopeForCandlesOptimized(symbol, interval, klines, 10),
             this.indicatorsService.calculateInverseATRValues(klinesForATR, 14),
        ]);

        // Merge indicators with candles
        const startIndex = Math.max(0, candles.length - limit);
        for (let i = startIndex; i < candles.length; i++) {
            const candleIndex = i;
            const indicatorIndex = i - startIndex;

            // RSI
            if (rsiValues[indicatorIndex] !== undefined) {
                candles[candleIndex].indicators.rsi = Number(rsiValues[indicatorIndex].toFixed(2));
            }

            // Bollinger Bands
            if (bollingerBands[indicatorIndex]) {
                candles[candleIndex].indicators.bollingerBands = {
                    upperBand: Number(bollingerBands[indicatorIndex].upperBand),
                    lowerBand: Number(bollingerBands[indicatorIndex].lowerBand),
                    sma: Number(bollingerBands[indicatorIndex].sma),
                    percentB: Number(bollingerBands[indicatorIndex].percentB)
                };
            }

            // EMA
            if (emaValues[indicatorIndex] !== undefined) {
                candles[candleIndex].indicators.ema = Number(emaValues[indicatorIndex].toFixed(2));
            }

            // CVD Slope - Apply to ALL candles that have enough history
            if (cvdSlope !== null && i >= 9) { // Need at least 10 candles for CVD slope
                candles[candleIndex].indicators.cvdSlope = Number(cvdSlope.toFixed(6));
            }
            if (inverseATRValues[indicatorIndex] !== undefined) {
                candles[candleIndex].indicators.inverseATR = Number(inverseATRValues[indicatorIndex].toFixed(6));
            }
        }

        // this.logger.log(`All indicators (including CVD) calculated in ${Date.now() - start}ms`);
        return candles;

    } catch (error) {
        // this.logger.error(`Error calculating indicators: ${error.message}`);
        return candles; // Return candles without indicators
    }
}

    // NEW METHOD: Calculate indicators for a single candle (for WebSocket updates)
   async calculateIndicatorsForSingleCandle(
    symbol: string,
    interval: string,
    newKline: any
): Promise<CandleWithIndicators> {
    // Check if this update is for our active cache
    const activeCacheInfo = this.cacheService.getActiveCacheInfo();
    if (!activeCacheInfo || 
        activeCacheInfo.symbol !== symbol.toUpperCase() || 
        activeCacheInfo.interval !== interval) {
        // Return basic candle without indicators
        return {
            openTime: new Date(newKline.t).toISOString(),
            closeTime: new Date(newKline.T).toISOString(),
            open: parseFloat(newKline.o),
            high: parseFloat(newKline.h),
            low: parseFloat(newKline.l),
            close: parseFloat(newKline.c),
            volume: parseFloat(newKline.v),
            quoteVolume: parseFloat(newKline.q),
            trades: newKline.n || 0,
            indicators: {}
        };
    }

    // Get recent cached candles for context
    const recentCandles = this.cacheService.getLatestCandles(symbol, interval, 50);

    //what this rsicandles lines do what it extract from recent candles 
    // Create the new candle
    const newCandle: CandleWithIndicators = {
        openTime: new Date(newKline.t).toISOString(),
        closeTime: new Date(newKline.T).toISOString(),
        open: parseFloat(newKline.o),
        high: parseFloat(newKline.h),
        low: parseFloat(newKline.l),
        close: parseFloat(newKline.c),
        volume: parseFloat(newKline.v),
        quoteVolume: parseFloat(newKline.q),
        trades: newKline.n || 0,
        indicators: {}
    };

    if (recentCandles.length > 20) {
        // Convert cached candles back to kline format for CVD calculation
        const candlesForCalculation = [...recentCandles].reverse();
        const klinesForCVD = candlesForCalculation.map(c => ({
            open: c.open.toString(),
            close: c.close.toString(),
            volume: c.volume.toString(),
        }));
        
        // Add new kline
        klinesForCVD.push({
            open: newKline.o,
            close: newKline.c,
            volume: newKline.v,
        });


         // ✅ Prepare klines for ATR (need OHLC)
        const klinesForATR = candlesForCalculation.map(c => ({
            high: c.high,
            low: c.low,
            close: c.close,
        }));

          klinesForATR.push({
            high: newKline.h,
            low: newKline.l,
            close: newKline.c,
        });

        const allCandles = [...candlesForCalculation, newCandle];
        const closes = allCandles.map(c => c.close);


        //rsi data
        const rsicandles = [...recentCandles.slice(0, 14)];
        const rsiCloses = rsicandles.map(c => c.close);
        const n_rsiCloses = [...rsiCloses, newCandle.close];


        try {
            // Calculate all indicators including CVD in parallel
            const [rsi, bb, ema, cvdSlope,inverseATR] = await Promise.all([
                this.indicatorsService.calculateRSIValues(n_rsiCloses, 14),
                this.indicatorsService.calculateBollingerBandsFromPrices(closes, 20, 2),
                this.indicatorsService.calculateEMAFromPrices(closes, 20),
                // ✅ CVD calculation for real-time updates
                this.indicatorsService.calculateCVDSlopeForCandlesOptimized(symbol, interval, klinesForCVD, 10),
                this.indicatorsService.calculateInverseATRValues(klinesForATR, 14)
            ]);

            // Apply latest indicator values
            const latest = rsi.length - 1;
            
            if (rsi[latest] !== undefined) {
                newCandle.indicators.rsi = Number(rsi[latest].toFixed(2));
            }
            
            if (bb[latest]) {
                newCandle.indicators.bollingerBands = {
                    upperBand: Number(bb[latest].upperBand),
                    lowerBand: Number(bb[latest].lowerBand),
                    sma: Number(bb[latest].sma),
                    percentB: Number(bb[latest].percentB)
                };
            }
            
            if (ema[latest] !== undefined) {
                newCandle.indicators.ema = Number(ema[latest].toFixed(2));
            }

            // ✅ CVD Slope for real-time
            if (cvdSlope !== null) {
                newCandle.indicators.cvdSlope = Number(cvdSlope.toFixed(6));
            }
              if (inverseATR[inverseATR.length - 1] !== undefined) {
                newCandle.indicators.inverseATR = Number(inverseATR[inverseATR.length - 1].toFixed(6));
            }

        } catch (error) {
            // this.logger.error(`Error calculating single candle indicators: ${error.message}`);
        }
    }

    return newCandle;
}
    // Add helper method to get current cache status
getCurrentCacheStatus() {
    const activeCacheInfo = this.cacheService.getActiveCacheInfo();
    
    if (!activeCacheInfo) {
        return {
            hasActiveCache: false,
            message: 'No active cache'
        };
    }

    return {
        hasActiveCache: true,
        symbol: activeCacheInfo.symbol,
        interval: activeCacheInfo.interval,
        cacheKey: activeCacheInfo.cacheKey,
        ageInMs: Date.now() - activeCacheInfo.timestamp,
        expiresInMs: (activeCacheInfo.timestamp + 5 * 60 * 1000) - Date.now()
    };
}

    async getCoinPrices(limit: number = 20): Promise<any[]> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/ticker/24hr`)
        );

        // Filter USDT pairs and sort by volume
        const usdtPairs = data
            .filter((ticker: any) =>
                ticker.symbol.endsWith('USDT') &&
                parseFloat(ticker.volume) > 0
            )
            .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, limit);

        return usdtPairs.map((ticker: any) => ({
            symbol: ticker.symbol,
            price: ticker.lastPrice,
            priceChange: ticker.priceChange,
            priceChangePercent: ticker.priceChangePercent,
            volume: ticker.volume,
            quoteVolume: ticker.quoteVolume,
        }));
    }

    async getCoinInfo(symbol: string): Promise<any> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/ticker/24hr`, {
                params: { symbol }
            })
        );

        return {
            symbol: data.symbol,
            currentPrice: parseFloat(data.lastPrice),
            priceChange24h: parseFloat(data.priceChange),
            priceChangePercent24h: parseFloat(data.priceChangePercent),
            highPrice24h: parseFloat(data.highPrice),
            lowPrice24h: parseFloat(data.lowPrice),
            openPrice24h: parseFloat(data.openPrice),
            volume24h: parseFloat(data.volume),
            volumeUSDT: parseFloat(data.quoteVolume),
            lastUpdateTime: new Date().toISOString(),
            bidPrice: parseFloat(data.bidPrice || '0'),
            askPrice: parseFloat(data.askPrice || '0'),
            trades24h: parseInt(data.count),
        };
    }

    async getCandleData(symbol: string, interval: string, limit: string): Promise<any> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/klines`, {
                params: { symbol, interval, limit: parseInt(limit) },
            })
        );

        const candles = data.map((k: any) => ({
            openTime: new Date(k[0]).toISOString(),
            closeTime: new Date(k[6]).toISOString(),
            openPrice: parseFloat(k[1]),
            highPrice: parseFloat(k[2]),
            lowPrice: parseFloat(k[3]),
            closePrice: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            quoteVolume: parseFloat(k[7]),
            trades: parseInt(k[8]),
        }));

        return {
            symbol,
            interval,
            candles,
            count: candles.length,
        };
    }

    async getAllSymbols(): Promise<string[]> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/exchangeInfo`)
        );

        return data.symbols
            .filter((symbol: any) =>
                symbol.status === 'TRADING' &&
                symbol.symbol.endsWith('USDT')
            )
            .map((symbol: any) => symbol.symbol)
            .sort();
    }
    async getActiveUsdtSymbols(limit?: number): Promise<string[]> {
    const symbols = await this.getAllSymbols();
    return limit && limit > 0 ? symbols.slice(0, limit) : symbols;
  }
    async getSymbolPrice(symbol: string): Promise<{symbol: string, price: string}[]> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/ticker/price`)
        );

        return data
            .filter((t: any) => t.symbol === symbol)
            .map((t: any) => ({
                symbol: t.symbol,
                price: t.price,
            }));
    }

    async getKlines(symbol: string, interval: string, limit: number) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/klines`, {
                params: { symbol, interval, limit },
            })
        );

        return data.map((k: any) => ({
            openTime: new Date(k[0]).toISOString(),
            open: k[1],
            high: k[2],
            low: k[3],
            close: k[4],
            volume: k[5],
            closeTime: new Date(k[6]).toISOString(),
            quoteVolume: k[7],
        }));
    }


    async getRecentTrades(symbol: string, limit: number = 10) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/trades`, {
                params: { symbol, limit },
            })
        );

        return data.map((t: any) => ({
            tradeId: t.id,
            price: t.price,
            qty: t.qty,
            quoteQty: (parseFloat(t.price) * parseFloat(t.qty)).toFixed(8),
            isBuyerMaker: t.isBuyerMaker ? 'Maker' : 'Taker',
            time: new Date(t.time).toISOString(),
        }));
    }


    async getOrderBook(symbol: string, limit: number = 100) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/depth`, {
                params: { symbol, limit },
            })
        );

        return {
            lastUpdateId: data.lastUpdateId,
            bids: data.bids.map(([price, qty]) => ({
                price,
                qty,
            })),
            asks: data.asks.map(([price, qty]) => ({
                price,
                qty,
            })),
        };
    }

    async getTopOfBook(symbol: string) {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/ticker/bookTicker`, {
                params: { symbol },
            })
        );

        const bid = parseFloat(data.bidPrice);
        const ask = parseFloat(data.askPrice);
        const spread = ask - bid;
        const spreadPct = (spread / ask) * 100;

        return {
            symbol: data.symbol,
            bidPrice: data.bidPrice,
            bidQty: data.bidQty,
            askPrice: data.askPrice,
            askQty: data.askQty,
            spread: spread.toFixed(8),
            spreadPct: spreadPct.toFixed(4) + '%',
        };
    }
    // async getExchangeInfo() {
    //     const { data } = await firstValueFrom(
    //         this.http.get(`${this.BASE_URL}/api/v3/exchangeInfo`)
    //     );

    //     return {
    //         timezone: data.timezone,
    //         serverTime: data.serverTime,
    //         rateLimits: data.rateLimits,
    //     };
    // }
    async getExchangeInfo(symbol?: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.BASE_URL}/api/v3/exchangeInfo${symbol ? `?symbol=${symbol}` : ''}`),
      );
      console.log('Exchange Info Data:', data); // Debug log
      const symbolInfo = data.symbols[0];
      if (!symbolInfo) {
        throw new Error(`Symbol ${symbol} not found`);
      }
      return symbolInfo;
    } catch (error) {
    //   this.logger.error(`Error fetching exchange info for ${symbol}: ${error.message}`);
      throw new HttpException(
        `Failed to fetch symbol info: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

    async getSystemStatus(): Promise<any> {
        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/sapi/v1/system/status`)
        );
        return data;
    }

    async getAccountInfo() {
        const apiKey = this.configService.get<string>('BINANCE_API_KEY');
        const secretKey = this.configService.get<string>('BINANCE_SECRET_KEY');

        if (!apiKey || !secretKey) {
            throw new Error('Binance API key or secret is missing in environment variables');
        }
        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(query)
            .digest('hex');

        const { data } = await firstValueFrom(
            this.http.get(`${this.BASE_URL}/api/v3/account?${query}&signature=${signature}`, {
                headers: { 'X-MBX-APIKEY': apiKey },
            })
        );

        return data;
    }

    async getTakerVolume(
        symbol: string,
        period: string,
        limit?: number,
        startTime?: number,
        endTime?: number,
    ) {
        const params: any = { symbol, period, limit };

        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        const { data } = await firstValueFrom(
            this.http.get(`${this.FUTURE_BASE_URL}/futures/data/takerlongshortRatio`, {
                params,
            }),
        );

        // Convert timestamp to ISO string
        return data.map((d: any) => ({
            buySellRatio: d.buySellRatio,
            buyVol: d.buyVol,
            sellVol: d.sellVol,
            timestamp: new Date(Number(d.timestamp)).toISOString(),
        }));
    }
    async getLiquidation(symbol: string, limit: number) {
        if (!symbol) {
            throw new Error('Symbol is required');
        }

        const { data } = await firstValueFrom(
            this.http.get(`${this.FUTURE_BASE_URL}/fapi/v1/allForceOrders`, {
                params: { symbol, limit },
            }),
        );

        return {
            symbol: data.symbol,
            liquidation: data.liquidation,
            timestamp: new Date(data.time).toISOString(),
        };
    }
    async getFundingRates(
        symbol: string,
        limit: number,
        startTime?: number,
        endTime?: number,
    ) {
        const params: any = { symbol, limit };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        const { data } = await firstValueFrom(
            this.http.get(`${this.FUTURE_BASE_URL}/fapi/v1/fundingRate`, { params }),
        );

        return data.map((f: any) => ({
            symbol: f.symbol,
            fundingRate: f.fundingRate,
            fundingTime: new Date(f.fundingTime).toISOString(),
            markPrice: f.markPrice,   // ✅ new field from Nov 2023 update
        }));
    }
    async getOpenInterest(symbol: string) {
        if (!symbol) {
            throw new Error('Symbol is required');
        }

        const { data } = await firstValueFrom(
            this.http.get(`${this.FUTURE_BASE_URL}/fapi/v1/openInterest`, {
                params: { symbol },
            }),
        );

        return {
            symbol: data.symbol,
            openInterest: data.openInterest,
            timestamp: new Date(data.time).toISOString(),
        };
    }



    async calculateOBIZ(symbol: string, limit: number = 100, window: number = 20) {
        return this.indicatorsService.calculateOBIZ(symbol, limit, window);
    }

    // async calculateRSI(symbol: string, interval: string, period: number = 14, limit: number = 100) {
    //     return this.indicatorsService.calculateRSI(symbol, interval, period, limit);
    // }

    async calculateBollingerBands(symbol: string = 'BTCUSDT', interval: string = '15m', period: number = 20, multiplier: number = 2, limit: number = 500): Promise<any[]> {
        return this.indicatorsService.calculateBollingerBands(symbol, interval, period, multiplier, limit);
    }

    async calculateEMA(symbol: string = 'BTCUSDT', interval: string = '15m', period: number = 20, limit: number = 100): Promise<any[]> {
        return this.indicatorsService.calculateEMA(symbol, interval, period, limit);
    }

    async getLatestCVDSlope(symbol: string, interval: string, slopeWindow: number = 10): Promise<any> {
        return this.indicatorsService.getLatestCVDSlope(symbol, interval, slopeWindow);
    }
    async calculateRangeGARCH(symbol: string, interval: string, limit: number = 30) {
        return this.indicatorsService.calculateRangeGARCH(symbol, interval, limit);
    }


  
 
   // Helper function to fetch all aggregated trades in a time period (handles pagination)
     async getAggTradesInPeriod(symbol: string, startTime: number, endTime: number): Promise<any[]> {
        const trades: any[] = [];
        let currentStart = startTime;

        while (currentStart < endTime) {
            const params = {
                symbol,
                startTime: currentStart,
                endTime: endTime - 1,  // Avoid overlap with next period
                limit: 1000,
            };

            const { data } = await firstValueFrom(
                this.http.get(`${this.BASE_URL}/api/v3/aggTrades`, { params })
            );

            if (data.length === 0) break;

            trades.push(...data);
            // Update to the timestamp after the last trade
            currentStart = data[data.length - 1].T + 1;
        }

        return trades;
    }
    async getOBIData(symbol: string): Promise<any> {
        if (!symbol) {
            throw new HttpException('Symbol is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.obiService.getOBIData(symbol);
            return result;
        } catch (error) {
            throw new HttpException(
                `Error getting OBI data: ${error.message}`, 
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}