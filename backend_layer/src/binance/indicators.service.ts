import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { BinanceService } from './binance.service';

@Injectable()
export class IndicatorsService {
    private readonly logger = new Logger(IndicatorsService.name);

    constructor(@Inject(forwardRef(() => BinanceService))
    private readonly binanceService: BinanceService,) { }

    // NEW METHOD: Calculate Bollinger Bands from price array
    calculateBollingerBandsFromPrices(
        closes: number[],
        period: number = 20,
        multiplier: number = 2
    ): any[] {
        const bollingerBands: any[] = [];

        for (let i = period - 1; i < closes.length; i++) {
            const window = closes.slice(i - period + 1, i + 1);
            const sma = window.reduce((sum, price) => sum + price, 0) / period;
            const variance = window.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
            const std = Math.sqrt(variance);
            const upperBand = sma + (multiplier * std);
            const lowerBand = sma - (multiplier * std);
            const currentClose = closes[i];
            const bandWidth = upperBand - lowerBand;
            const percentB = bandWidth !== 0 ? (currentClose - lowerBand) / bandWidth : 0;

            bollingerBands.push({
                sma: parseFloat(sma.toFixed(8)),
                upperBand: parseFloat(upperBand.toFixed(8)),
                lowerBand: parseFloat(lowerBand.toFixed(8)),
                percentB: parseFloat(percentB.toFixed(4)),
            });
        }

        return bollingerBands;
    }

    // NEW METHOD: Calculate EMA from price array
    calculateEMAFromPrices(closes: number[], period: number = 20): number[] {
        const emaValues: number[] = [];

        if (closes.length < period) {
            return emaValues;
        }

        const alpha = 2 / (period + 1);
        let sma = closes.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
        let prevEMA = sma;
        emaValues.push(prevEMA);

        for (let i = period; i < closes.length; i++) {
            const ema = (closes[i] * alpha) + (prevEMA * (1 - alpha));
            emaValues.push(ema);
            prevEMA = ema;
        }

        return emaValues;
    }

    // NEW METHOD: Calculate CVD slope for specific candles
    async calculateCVDSlopeForCandles(symbol: string, interval: string, klines: any[]): Promise<number> {
        if (klines.length < 2) return 0;

        try {
            const startTimeMs = new Date(klines[0].openTime).getTime();
            const endTimeMs = new Date(klines[klines.length - 1].closeTime).getTime();

            const aggTrades = await this.binanceService.getAggTradesInPeriod(symbol, startTimeMs, endTimeMs);

            const deltas: number[] = [];
            let cumulativeDelta = 0;

            for (const kline of klines) {
                const openMs = new Date(kline.openTime).getTime();
                const closeMs = new Date(kline.closeTime).getTime();

                const barTrades = aggTrades.filter(t => t.T >= openMs && t.T < closeMs);

                let buyVol = 0;
                let sellVol = 0;

                for (const trade of barTrades) {
                    const qty = parseFloat(trade.q);
                    if (!trade.m) {
                        buyVol += qty;
                    } else {
                        sellVol += qty;
                    }
                }

                const delta = buyVol - sellVol;
                deltas.push(delta);
                cumulativeDelta += delta;
            }

            const cvdForSlope: number[] = [];
            let tempCum = 0;
            for (const d of deltas) {
                tempCum += d;
                cvdForSlope.push(tempCum);
            }

            return this.linearRegressionSlope(cvdForSlope);
        } catch (error) {
            this.logger.error(`Error calculating CVD slope: ${error.message}`);
            return 0;
        }
    }
    // Add this enhanced CVD method that works with your workflow
    async calculateCVDSlopeForCandlesOptimized(
        symbol: string,
        interval: string,
        klines: any[],
        slopeWindow: number = 10
    ): Promise<number | null> {
        try {
            // Use the last 'slopeWindow' candles for CVD calculation
            const recentKlines = klines.slice(-slopeWindow);

            if (recentKlines.length < slopeWindow) {
                this.logger.warn(`Not enough candles for CVD slope. Need ${slopeWindow}, got ${recentKlines.length}`);
                return null;
            }

            // Calculate CVD values for each candle
            const cvdValues: number[] = [];
            let cumulativeCVD = 0;

            for (const kline of recentKlines) {
                const volume = parseFloat(kline.volume || kline[5]); // Handle both formats
                const close = parseFloat(kline.close || kline[4]);
                const open = parseFloat(kline.open || kline[1]);

                // CVD calculation: if close > open (bullish), add volume; else subtract
                const volumeDelta = close >= open ? volume : -volume;
                cumulativeCVD += volumeDelta;
                cvdValues.push(cumulativeCVD);
            }

            // Calculate slope using linear regression
            return this.calculateSlope(cvdValues);

        } catch (error) {
            this.logger.error(`Error calculating CVD slope: ${error.message}`);
            return null;
        }
    }

    // Helper method for slope calculation
    private calculateSlope(values: number[]): number {
        const n = values.length;
        const xValues = Array.from({ length: n }, (_, i) => i); // [0, 1, 2, ..., n-1]

        const sumX = xValues.reduce((sum, x) => sum + x, 0);
        const sumY = values.reduce((sum, y) => sum + y, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        // Linear regression slope formula: (n*ΣXY - ΣX*ΣY) / (n*ΣX² - (ΣX)²)
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        return slope;
    }
    async calculateOBIZ(symbol: string, limit: number = 100, window: number = 20) {
        const orderBook = await this.binanceService.getOrderBook(symbol, limit);

        const bidVol = orderBook.bids.reduce((acc, b) => acc + parseFloat(b.qty), 0);
        const askVol = orderBook.asks.reduce((acc, a) => acc + parseFloat(a.qty), 0);

        const OBI = (bidVol - askVol) / (bidVol + askVol);

        const samples: number[] = [];
        for (let i = 0; i < window; i++) {
            const snap = await this.binanceService.getOrderBook(symbol, limit);
            const b = snap.bids.reduce((acc, x) => acc + parseFloat(x.qty), 0);
            const a = snap.asks.reduce((acc, x) => acc + parseFloat(x.qty), 0);
            const val = (b - a) / (b + a);
            samples.push(val);
        }

        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
        const std = Math.sqrt(variance);

        const OBI_z = std !== 0 ? (OBI - mean) / std : 0;

        return {
            symbol,
            limit,
            window,
            bidVol,
            askVol,
            OBI,
            OBI_z,
            timestamp: new Date().toISOString(),
        };
    }

    async calculateRSIValues(closes: number[], period: number = 14): Promise<number[]> {
        const rsiValues: number[] = [];
        if (closes.length < period + 1) {
            return rsiValues;
        }
        for (let i = period; i < closes.length; i++) {
            let gains = 0;
            let losses = 0;
            for (let j = i - period; j < i; j++) {
                const change = closes[j + 1] - closes[j];
                if (change > 0) {
                    gains += change;
                } else {
                    losses += Math.abs(change);
                }
            }
            const avgGain = gains / period;
            const avgLoss = losses / period;

            let rsi = 0;
            if (avgLoss === 0) {
                rsi = 100;
            } else {
                const rs = avgGain / avgLoss;
                rsi = 100 - (100 / (1 + rs));
            }
            rsiValues.push(rsi);
        }
        return rsiValues;
    }
    async calculateInverseATRValues(
        klines: { high: number; low: number; close: number }[],
        period: number = 14
    ): Promise<number[]> {
        const atrValues: number[] = [];

        if (klines.length < period + 1) {
            return atrValues; // Not enough data
        }

        // Step 1: Calculate True Range (TR) for each candle
        const trueRanges: number[] = [];
        for (let i = 1; i < klines.length; i++) {
            const high = klines[i].high;
            const low = klines[i].low;
            const prevClose = klines[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        // Step 2: Calculate ATR using simple moving average
        for (let i = period - 1; i < trueRanges.length; i++) {
            const slice = trueRanges.slice(i - period + 1, i + 1);
            const sum = slice.reduce((a, b) => a + b, 0);
            const atr = sum / period;

            // Step 3: Inverse ATR
            atrValues.push(1 / atr);
        }

        return atrValues;
    }


    async calculateBollingerBands(symbol: string = 'BTCUSDT', interval: string = '15m', period: number = 20, multiplier: number = 2, limit: number = 500): Promise<any[]> {
        const klines = await this.binanceService.getKlines(symbol, interval, period + limit);
        const closes = klines.map(k => parseFloat(k.close));

        const bollingerBands: any[] = [];
        for (let i = period - 1; i < closes.length; i++) {
            const window = closes.slice(i - period + 1, i + 1);
            const sma = window.reduce((sum, price) => sum + price, 0) / period;
            const variance = window.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
            const std = Math.sqrt(variance);
            const upperBand = sma + (multiplier * std);
            const lowerBand = sma - (multiplier * std);
            const currentClose = closes[i];
            const bandWidth = upperBand - lowerBand;
            const percentB = bandWidth !== 0 ? ((currentClose - lowerBand) / bandWidth).toFixed(4) : '0.0000';

            bollingerBands.push({
                timestamp: klines[i].closeTime,
                sma: sma.toFixed(8),
                upperBand: upperBand.toFixed(8),
                lowerBand: lowerBand.toFixed(8),
                percentB: percentB,
            });
        }

        return bollingerBands.slice(-limit);
    }

    async calculateEMA(symbol: string = 'BTCUSDT', interval: string = '15m', period: number = 20, limit: number = 100): Promise<any[]> {
        const klines = await this.binanceService.getKlines(symbol, interval, period + limit);
        const closes = klines.map(k => parseFloat(k.close));

        if (closes.length < period) {
            throw new Error(`Not enough data. Requires at least ${period} periods.`);
        }

        const emaValues: any[] = [];
        const alpha = 2 / (period + 1);

        let sma = closes.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
        let prevEMA = sma;
        emaValues.push({
            timestamp: klines[period - 1].closeTime,
            ema: prevEMA.toFixed(8),
        });

        for (let i = period; i < closes.length; i++) {
            const ema = (closes[i] * alpha) + (prevEMA * (1 - alpha));
            emaValues.push({
                timestamp: klines[i].closeTime,
                ema: ema.toFixed(8),
            });
            prevEMA = ema;
        }

        return emaValues.slice(-limit);
    }

    private linearRegressionSlope(y: number[]): number {
        const n = y.length;
        if (n < 2) return 0;

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            const x = i + 1;
            sumX += x;
            sumY += y[i];
            sumXY += x * y[i];
            sumX2 += x * x;
        }

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return 0;

        return (n * sumXY - sumX * sumY) / denominator;
    }

    async getLatestCVDSlope(
        symbol: string,
        interval: string,
        slopeWindow: number = 10
    ): Promise<any> {
        const start = Date.now();
        this.logger.debug('Starting getLatestCVDSlope...');

        const klines = await this.binanceService.getKlines(symbol, interval, slopeWindow);
        this.logger.debug(`Fetched ${klines.length} klines in ${Date.now() - start}ms`);

        if (klines.length === 0) {
            throw new Error('No klines data available');
        }

        const startTimeMs = new Date(klines[0].openTime).getTime();
        const endTimeMs = new Date(klines[klines.length - 1].closeTime).getTime();

        const aggTradesStart = Date.now();
        const aggTrades = await this.binanceService.getAggTradesInPeriod(symbol, startTimeMs, endTimeMs);
        this.logger.debug(`Fetched ${aggTrades.length} trades in ${Date.now() - aggTradesStart}ms`);

        const deltas: number[] = [];
        let cumulativeDelta = 0;

        for (let i = 0; i < klines.length; i++) {
            const openMs = new Date(klines[i].openTime).getTime();
            const closeMs = new Date(klines[i].closeTime).getTime();

            const barTrades = aggTrades.filter(t => t.T >= openMs && t.T < closeMs);

            let buyVol = 0;
            let sellVol = 0;

            for (const trade of barTrades) {
                const qty = parseFloat(trade.q);
                if (!trade.m) {
                    buyVol += qty;
                } else {
                    sellVol += qty;
                }
            }

            const delta = buyVol - sellVol;
            deltas.push(delta);
            cumulativeDelta += delta;
        }

        let cvdForSlope: number[] = [];
        let tempCum = 0;
        for (const d of deltas) {
            tempCum += d;
            cvdForSlope.push(tempCum);
        }
        const slope = this.linearRegressionSlope(cvdForSlope);

        this.logger.debug(`Total time: ${Date.now() - start}ms`);

        return {
            closeTime: klines[klines.length - 1].closeTime,
            delta: deltas[deltas.length - 1].toFixed(4),
            cvd: cumulativeDelta.toFixed(4),
            slope: slope.toFixed(4)
        };
    }
    async calculateRangeGARCH(symbol: string, interval: string, limit: number = 30) {
        const klines = await this.binanceService.getKlines(symbol, interval, limit);

        const ranges = klines.map(k => Math.log(parseFloat(k.high)) - Math.log(parseFloat(k.low)));

        const omega = 0.000001;
        const alpha = 0.1;
        const beta = 0.85;
        let h_prev = ranges[0] ** 2;

        const garchVolatility = ranges.map(r => {
            const h_t = omega + alpha * (r ** 2) + beta * h_prev;
            h_prev = h_t;
            return Math.sqrt(h_t);
        });

        return klines.map((k, i) => ({
            range: ranges[i],
            rangeGarchVolatility: garchVolatility[i],
        }));
    }

}