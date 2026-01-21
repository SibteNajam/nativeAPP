import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface BitgetTicker {
    symbol: string;
    lastPr: string;
    change24h: string;
    changeUtc24h: string;
    baseVolume: string;
    quoteVolume: string;
    high24h: string;
    low24h: string;
    bidPr: string;
    askPr: string;
    openUtc: string;
}

@Injectable()
export class BitgetService {
    private readonly logger = new Logger(BitgetService.name);
    private readonly spotBaseUrl = 'https://api.bitget.com';
    private readonly futuresBaseUrl = 'https://api-testnet.bitget.com';
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    private async makeRequest(url: string, params: any = {}) {
        try {
            const response = await this.axiosInstance.get(url, { params });
            if (response.data.code !== '00000') {
                throw new HttpException(
                    response.data.msg || 'Bitget API Error',
                    HttpStatus.BAD_REQUEST,
                );
            }
            return response.data.data;
        } catch (error) {
            this.logger.error(`API Request failed: ${error.message}`);
            throw new HttpException(
                error.response?.data?.msg || 'Failed to fetch data from Bitget',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

  async getCoinInfo(symbol: string) {
    this.logger.log(`Fetching coin info for symbol: ${symbol}`);
    const url = `${this.spotBaseUrl}/api/v2/spot/market/tickers`;
    const data = await this.makeRequest(url, { symbol: symbol.toUpperCase() });

    // For single symbol query, data is an array with one item
    const ticker = data[0];
    return {
        symbol: ticker.symbol,
        lastPrice: ticker.lastPr,
        bidPrice: ticker.bidPr,
        askPrice: ticker.askPr,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        baseVolume: ticker.baseVolume,
        quoteVolume: ticker.quoteVolume,
        openPrice: ticker.openUtc,
    };
}

    // Get all trading symbols (Spot)
    async getAllSymbols() {
        const url = `${this.spotBaseUrl}/api/v2/spot/public/symbols`;
        return this.makeRequest(url);
    }

    // Get limited symbols with their current price
    async getLimitedSymbols(limit: number = 20) {
        const symbols = await this.getAllSymbols();
        const usdtPairs = symbols.filter((s: any) => s.quoteCoin === 'USDT');
        const limitedSymbols = usdtPairs.slice(0, limit);

        const tickers = await this.getTickers();
        const tickerMap = new Map(tickers.map((t: any) => [t.symbol, t]));

        return limitedSymbols.map((symbol: any) => {
            const ticker = tickerMap.get(symbol.symbol) as BitgetTicker | undefined;
            return {
                symbol: symbol.symbol,
                baseCoin: symbol.baseCoin,
                quoteCoin: symbol.quoteCoin,
                price: ticker?.lastPr || '0',
                priceChange: ticker?.change24h || '0',
                volume: ticker?.baseVolume || '0',
            };
        });
    }

    // Get ticker information for all symbols
    async getTickers( symbol?: string) {
        const url = `${this.spotBaseUrl}/api/v2/spot/market/tickers?symbol=${symbol || ''}`;
        return this.makeRequest(url);
    }

    // Get top coin prices by volume (USDT pairs)
    async getCoinPrices(limit: number = 20) {
        const tickers = await this.getTickers();
        const usdtPairs = tickers.filter((t: any) => t.symbol.endsWith('USDT'));

        const sorted = usdtPairs
            .map((ticker: any) => ({
                symbol: ticker.symbol,
                price: ticker.lastPr,
                priceChange: ticker.change24h,
                priceChangePercent: ticker.changeUtc24h,
                volume: ticker.baseVolume,
                quoteVolume: ticker.quoteVolume,
                high: ticker.high24h,
                low: ticker.low24h,
            }))
            .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, limit);

        return sorted;
    }

    // Get candlestick/kline data
    async getKlines(symbol: string, interval: string, limit: number = 100) {
        const url = `${this.spotBaseUrl}/api/v2/spot/market/candles`;
        const granularity = this.convertInterval(interval);
        
        const params = {
            symbol,
            granularity,
            limit: Math.min(limit, 1000),
        };

        const data = await this.makeRequest(url, params);
        
        return data.map((k: any) => ({
            openTime: k[0],
            open: k[1],
            high: k[2],
            low: k[3],
            close: k[4],
            volume: k[5],
            closeTime: k[0],
            quoteVolume: k[6],
        }));
    }

    // Convert interval format (1m, 5m, 1h, etc.) to Bitget granularity
    private convertInterval(interval: string): string {
        const map: { [key: string]: string } = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '4h': '4h',
            '6h': '6h',
            '12h': '12h',
            '1d': '1day',
            '1w': '1week',
        };
        return map[interval] || '1h';
    }

    // Get recent trades
    async getRecentTrades(symbol: string, limit: number = 100) {
        const url = `${this.spotBaseUrl}/api/v2/spot/market/fills`;
        const params = {
            symbol,
            limit: Math.min(limit, 500),
        };
        
        const data = await this.makeRequest(url, params);
        
        return data.map((trade: any) => ({
            id: String(trade.tradeId),
            price: String(trade.price),
            quantity: String(trade.size), // Frontend expects "quantity"
            time: String(trade.ts), // Frontend expects "time" as string
            isBuyerMaker: trade.side === 'sell',
            side: trade.side,
        }));
    }

    // Get market trades history
    async getMarketTrades(
        symbol: string,
        limit: number = 500,
        idLessThan?: string,
        startTime?: string,
        endTime?: string,
    ) {
        const url = `${this.spotBaseUrl}/api/v2/spot/market/fills-history`;
        const params: any = {
            symbol,
            limit: Math.min(limit, 1000),
        };

        if (idLessThan) params.idLessThan = idLessThan;
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        
        const data = await this.makeRequest(url, params);
        
        return data.map((trade: any) => ({
            symbol: trade.symbol,
            tradeId: trade.tradeId,
            side: trade.side,
            price: trade.price,
            size: trade.size,
            ts: trade.ts,
        }));
    }

    // Get order book
    async getOrderBook(symbol: string, limit: number = 100) {
        const url = `${this.spotBaseUrl}/api/v2/spot/market/orderbook`;
        const params = {
            symbol,
            type: 'step0',
            limit: Math.min(limit, 150).toString(),
        };
        
        const data = await this.makeRequest(url, params);
        
        return {
            timestamp: data.ts,
            bids: data.bids.map((b: any) => ({ price: b[0], quantity: b[1] })),
            asks: data.asks.map((a: any) => ({ price: a[0], quantity: a[1] })),
        };
    }

    // Get top of order book (best bid/ask)
    async getTopOfBook(symbol: string) {
        const orderBook = await this.getOrderBook(symbol, 5);
        
        return {
            symbol,
            timestamp: orderBook.timestamp,
            bestBid: orderBook.bids[0],
            bestAsk: orderBook.asks[0],
            spread: (parseFloat(orderBook.asks[0].price) - parseFloat(orderBook.bids[0].price)).toFixed(8),
        };
    }

    // Get server time
    async getServerTime() {
        const url = `${this.spotBaseUrl}/api/v2/public/time`;
        return this.makeRequest(url);
    }

    // Get exchange info for a symbol
    async getExchangeInfo(symbol?: string) {
        const symbols = await this.getAllSymbols();
        
        if (symbol) {
            return symbols.find((s: any) => s.symbol === symbol);
        }
        
        return symbols;
    }

    // FUTURES ENDPOINTS

    // Get all futures symbols
    async getFuturesSymbols(productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/contracts`;
        return this.makeRequest(url, { productType });
    }

    // Get futures ticker
    async getFuturesTicker(symbol: string, productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/ticker`;
        return this.makeRequest(url, { symbol, productType });
    }

    // Get futures tickers (all)
    async getFuturesTickers(productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/tickers`;
        return this.makeRequest(url, { productType });
    }

    // Get futures candlestick data
    async getFuturesKlines(
        symbol: string,
        interval: string,
        productType: string = 'USDT-FUTURES',
        limit: number = 100,
    ) {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/candles`;
        const granularity = this.convertInterval(interval);
        
        const params = {
            symbol,
            productType,
            granularity,
            limit: Math.min(limit, 1000),
        };

        const data = await this.makeRequest(url, params);
        
        return data.map((k: any) => ({
            openTime: k[0],
            open: k[1],
            high: k[2],
            low: k[3],
            close: k[4],
            volume: k[5],
            quoteVolume: k[6],
        }));
    }

    // Get futures order book
    async getFuturesOrderBook(
        symbol: string,
        productType: string = 'USDT-FUTURES',
        limit: number = 100,
    ) {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/merge-depth`;
        const params = {
            symbol,
            productType,
            precision: 'scale0',
            limit: Math.min(limit, 100).toString(),
        };
        
        const data = await this.makeRequest(url, params);
        
        return {
            timestamp: data.ts,
            bids: data.bids.map((b: any) => ({ price: b[0], quantity: b[1] })),
            asks: data.asks.map((a: any) => ({ price: a[0], quantity: a[1] })),
        };
    }

    // Get recent futures trades
    async getFuturesTrades(
        symbol: string,
        productType: string = 'USDT-FUTURES',
        limit: number = 100,
    ) {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/fills`;
        const params = {
            symbol,
            productType,
            limit: Math.min(limit, 500),
        };
        
        const data = await this.makeRequest(url, params);
        
        return data.map((trade: any) => ({
            id: trade.tradeId,
            price: trade.price,
            quantity: trade.size,
            time: trade.ts,
            side: trade.side,
        }));
    }

    // Get open interest
    async getOpenInterest(symbol: string, productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/open-interest`;
        return this.makeRequest(url, { symbol, productType });
    }

    // Get funding rate
    async getCurrentFundingRate(symbol: string, productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/current-fund-rate`;
        return this.makeRequest(url, { symbol, productType });
    }

    // Get funding rate history
    async getFundingRateHistory(
        symbol: string,
        productType: string = 'USDT-FUTURES',
        pageSize: number = 20,
    ) {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/history-fund-rate`;
        return this.makeRequest(url, { symbol, productType, pageSize });
    }

    // Get mark price
    async getMarkPrice(symbol: string, productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/symbol-price`;
        return this.makeRequest(url, { symbol, productType });
    }

    // Get liquidation orders
    async getLiquidationOrders(symbol: string, productType: string = 'USDT-FUTURES') {
        const url = `${this.futuresBaseUrl}/api/v2/mix/market/query-position-lever`;
        return this.makeRequest(url, { symbol, productType });
    }
}