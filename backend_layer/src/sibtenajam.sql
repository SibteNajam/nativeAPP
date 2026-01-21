-- Pipeline runs (master record for each run)
CREATE TABLE pipeline_runs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Node 1: Symbols & confidence
CREATE TABLE symbols_confidence (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
);
-- Node 2 (VLM): Predictions
CREATE TABLE predictions (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  prediction_text TEXT,
  rejected BOOLEAN DEFAULT false -- NEW: true if not in top 3
);
-- Node 2 (VLM): Screenshots linked to predictions
CREATE TABLE vlm_screenshot (
    id BIGSERIAL PRIMARY KEY,               
    vlm_pred_id BIGINT REFERENCES vlm_predictions(id) ON DELETE CASCADE,  -- link to prediction
    screenshot_url TEXT NOT NULL,           -- only one screenshot (highest timeframe)
    timeframes TEXT[] NOT NULL,             -- all captured timeframes as array
    captured_at TIMESTAMPTZ NOT NULL        -- when the screenshot was captured
);


-- Node 3: Trade extraction
CREATE TABLE trades (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  entry_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  trade_start_time TIMESTAMPTZ,
  trade_end_time TIMESTAMPTZ,
  execution_time INTERVAL
);

CREATE TABLE executions (
  id BIGSERIAL PRIMARY KEY,
  trade_id BIGINT REFERENCES trades(id) ON DELETE CASCADE, -- links to specific trade
  run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,              -- e.g. "pending", "executed", "failed"
  order_id TEXT,                     -- exchange order id
  executed_entry_price NUMERIC,      -- actual entry price (may differ from planned)
  trade_start_time TIMESTAMPTZ,
  trade_end_time TIMESTAMPTZ,         -- actual time trade executed
  execution_duration INTERVAL        -- actual duration until filled
);


-- Node 5: Validations
CREATE TABLE validations (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  validation_status TEXT NOT NULL,
  details JSONB
);

































X-MBX-APIKEY: YOUR_API_KEY_HERE


X-MBX-APIKEY = your public API key (identifies your account)

signature = HMAC SHA256 hash of your query string, generated using your secret key

timestamp = current Unix time in milliseconds (Binance checks it to prevent replay attacks)



import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import { Logger } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { CacheService } from './cache.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BinanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(BinanceGateway.name);
  private binanceWs: WebSocket;
  private currentSubscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(
    private readonly binanceService: BinanceService,
    private readonly cacheService: CacheService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized');
  }

  onModuleInit() {
    this.connectBinance();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection_status', { 
      status: 'connected', 
      message: 'Welcome! Binance WebSocket is ready.',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_symbol_with_indicators')
  async handleSubscribeSymbolWithIndicators(
    @MessageBody() data: { symbol: string; interval: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { symbol, interval, limit = 100 } = data;
    const klineStream = `${symbol.toLowerCase()}@kline_${interval}`;
    const tickerStream = `${symbol.toLowerCase()}@ticker`;
    
    this.logger.log(`Client ${client.id} requesting subscription with indicators to ${symbol} ${interval}`);
    
    try {
        // Get current cache status
    const currentCache = this.binanceService.getCurrentCacheStatus();
    let cacheCleared = false;
    
    if (currentCache.hasActiveCache) {
      const newCacheKey = `${symbol.toUpperCase()}_${interval}_${limit}`;
      if (currentCache.cacheKey !== newCacheKey) {
        cacheCleared = true;
        this.logger.log(`🗑️ Cache will be cleared. Old: ${currentCache.cacheKey}, New: ${newCacheKey}`);
      }
    }

      // Send historical data with indicators
      this.logger.log(`Loading historical data with indicators for ${symbol} ${interval}`);
      
      const historicalData = await this.binanceService.getCandlesWithIndicators(
        symbol.toUpperCase(), 
        interval, 
        limit
      );
      
      client.emit('historical_candles_with_indicators', {
        symbol: symbol.toUpperCase(),
        interval,
        data: historicalData,
        count: historicalData.length,
        timestamp: new Date().toISOString()
      });

      // Get initial ticker data
      const tickerData = await this.binanceService.getCoinInfo(symbol);
      client.emit('ticker_data', {
        symbol: symbol.toUpperCase(),
        ticker: {
          symbol: tickerData.symbol,
          priceChange: tickerData.priceChange24h.toString(),
          priceChangePercent: tickerData.priceChangePercent24h.toString(),
          lastPrice: tickerData.currentPrice.toString(),
          highPrice: tickerData.highPrice24h.toString(),
          lowPrice: tickerData.lowPrice24h.toString(),
          openPrice: tickerData.openPrice24h.toString(),
          volume: tickerData.volume24h.toString(),
          quoteVolume: tickerData.volumeUSDT.toString(),
          bidPrice: tickerData.bidPrice.toString(),
          askPrice: tickerData.askPrice.toString(),
          count: tickerData.trades24h
        },
        timestamp: new Date().toISOString()
      });

      // Subscribe to live streams
      this.updateSubscription([klineStream, tickerStream]);
      
      client.emit('subscription_status', {
        symbol,
        interval,
        status: 'subscribed',
        withIndicators: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error(`Error handling subscription with indicators: ${error.message}`);
      client.emit('subscription_error', {
        symbol,
        interval,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private connectBinance() {
    const defaultStreams = ['btcusdt@kline_1m', 'btcusdt@ticker'];
    const wsUrl = `wss://stream.binance.com:9443/ws/${defaultStreams.join('/')}`;
    
    this.binanceWs = new WebSocket(wsUrl);
    defaultStreams.forEach(stream => this.currentSubscriptions.add(stream));

    this.binanceWs.on('open', () => {
      this.logger.log('Connected to Binance WebSocket');
      this.reconnectAttempts = 0;
      
      this.server.emit('binance_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    this.binanceWs.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        
        if (data.e === 'kline') {
          const klineData = data.k;
          const symbol = data.s;
          const interval = klineData.i;

          // Emit raw kline data
          this.server.emit('kline_data', {
            symbol: symbol,
            kline: klineData,
            timestamp: new Date().toISOString()
          });

          // Calculate indicators for the new candle
          try {
            const candleWithIndicators = await this.binanceService.calculateIndicatorsForSingleCandle(
              symbol,
              interval,
              klineData
            );

            // Update cache
            this.cacheService.updateLatestCandle(symbol, interval, candleWithIndicators);

            // Emit candle with indicators
            this.server.emit('kline_with_indicators', {
              symbol: symbol,
              interval: interval,
              candle: candleWithIndicators,
              isClosed: klineData.x, // true when candle is closed
              timestamp: new Date().toISOString()
            });

          } catch (indicatorError) {
            this.logger.error(`Error calculating indicators for live candle: ${indicatorError.message}`);
          }

        } else if (data.e === '24hrTicker') {
          this.server.emit('ticker_data', {
            symbol: data.s,
            ticker: {
              symbol: data.s,
              priceChange: data.P,
              priceChangePercent: data.P,
              lastPrice: data.c,
              highPrice: data.h,
              lowPrice: data.l,
              openPrice: data.o,
              volume: data.v,
              quoteVolume: data.q,
              bidPrice: data.b || '0',
              askPrice: data.a || '0',
              count: data.n
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        this.logger.error('Error parsing Binance message', err);
      }
    });

    this.binanceWs.on('close', (code, reason) => {
      this.logger.warn(`Binance WS closed. Code: ${code}, Reason: ${reason}`);
      this.server.emit('binance_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
      this.handleReconnect();
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error('Binance WS error', err);
      this.server.emit('binance_connection_status', {
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private updateSubscription(newStreams: string[]) {
    if (this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: Array.from(this.currentSubscriptions),
        id: Date.now()
      };
      
      this.binanceWs.send(JSON.stringify(unsubscribeMessage));
      
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: newStreams,
        id: Date.now() + 1
      };
      
      this.binanceWs.send(JSON.stringify(subscribeMessage));
      
      this.currentSubscriptions.clear();
      newStreams.forEach(stream => this.currentSubscriptions.add(stream));
      
      this.logger.log(`Updated subscription to: ${newStreams.join(', ')}`);
    } else {
      this.currentSubscriptions.clear();
      newStreams.forEach(stream => this.currentSubscriptions.add(stream));
      this.reconnectWithNewStream();
    }
  }

  private reconnectWithNewStream() {
    if (this.binanceWs) {
      this.binanceWs.close();
    }
    
    const streams = Array.from(this.currentSubscriptions).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
    
    this.binanceWs = new WebSocket(wsUrl);
    this.setupWebSocketHandlers();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.logger.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.reconnectWithNewStream();
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.server.emit('binance_connection_status', {
        status: 'max_reconnect_attempts_reached',
        timestamp: new Date().toISOString()
      });
    }
  }

  private setupWebSocketHandlers() {
    // Similar to the main connectBinance method but for reconnections
    this.binanceWs.on('open', () => {
      this.logger.log('Reconnected to Binance WebSocket');
      this.reconnectAttempts = 0;
      
      this.server.emit('binance_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    // Add the same message, close, and error handlers as in connectBinance
    this.binanceWs.on('message', async (msg) => {
      // Same logic as in connectBinance
    });

    this.binanceWs.on('close', (code, reason) => {
      this.logger.warn(`Binance WS closed. Code: ${code}, Reason: ${reason}`);
      this.handleReconnect();
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error('Binance WS error', err);
    });
  }
}



















































































import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import { Logger } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { CacheService } from './cache.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BinanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(BinanceGateway.name);
  private binanceWs: WebSocket;
  private currentSubscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(
    private readonly binanceService: BinanceService,
    private readonly cacheService: CacheService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized');
  }

  onModuleInit() {
    this.connectBinance();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection_status', { 
      status: 'connected', 
      message: 'Welcome! Binance WebSocket is ready.',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_symbol_with_indicators')
  async handleSubscribeSymbolWithIndicators(
    @MessageBody() data: { symbol: string; interval: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { symbol, interval, limit = 100 } = data;
    const klineStream = `${symbol.toLowerCase()}@kline_${interval}`;
    const tickerStream = `${symbol.toLowerCase()}@ticker`;
    
    this.logger.log(`Client ${client.id} requesting subscription with indicators to ${symbol} ${interval}`);
    
    try {
        // Get current cache status
    const currentCache = this.binanceService.getCurrentCacheStatus();
    let cacheCleared = false;
    
    if (currentCache.hasActiveCache) {
      const newCacheKey = `${symbol.toUpperCase()}_${interval}_${limit}`;
      if (currentCache.cacheKey !== newCacheKey) {
        cacheCleared = true;
        this.logger.log(`🗑️ Cache will be cleared. Old: ${currentCache.cacheKey}, New: ${newCacheKey}`);
      }
    }

      // Send historical data with indicators
      this.logger.log(`Loading historical data with indicators for ${symbol} ${interval}`);
      
      const historicalData = await this.binanceService.getCandlesWithIndicators(
        symbol.toUpperCase(), 
        interval, 
        limit
      );
      
      client.emit('historical_candles_with_indicators', {
        symbol: symbol.toUpperCase(),
        interval,
        data: historicalData,
        count: historicalData.length,
        timestamp: new Date().toISOString()
      });

      // Get initial ticker data
      const tickerData = await this.binanceService.getCoinInfo(symbol);
      client.emit('ticker_data', {
        symbol: symbol.toUpperCase(),
        ticker: {
          symbol: tickerData.symbol,
          priceChange: tickerData.priceChange24h.toString(),
          priceChangePercent: tickerData.priceChangePercent24h.toString(),
          lastPrice: tickerData.currentPrice.toString(),
          highPrice: tickerData.highPrice24h.toString(),
          lowPrice: tickerData.lowPrice24h.toString(),
          openPrice: tickerData.openPrice24h.toString(),
          volume: tickerData.volume24h.toString(),
          quoteVolume: tickerData.volumeUSDT.toString(),
          bidPrice: tickerData.bidPrice.toString(),
          askPrice: tickerData.askPrice.toString(),
          count: tickerData.trades24h
        },
        timestamp: new Date().toISOString()
      });

      // Subscribe to live streams
      this.updateSubscription([klineStream, tickerStream]);
      
      client.emit('subscription_status', {
        symbol,
        interval,
        status: 'subscribed',
        withIndicators: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error(`Error handling subscription with indicators: ${error.message}`);
      client.emit('subscription_error', {
        symbol,
        interval,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private connectBinance() {
    const defaultStreams = ['btcusdt@kline_1m', 'btcusdt@ticker'];
    const wsUrl = `wss://stream.binance.com:9443/ws/${defaultStreams.join('/')}`;
    
    this.binanceWs = new WebSocket(wsUrl);
    defaultStreams.forEach(stream => this.currentSubscriptions.add(stream));

    this.binanceWs.on('open', () => {
      this.logger.log('Connected to Binance WebSocket');
      this.reconnectAttempts = 0;
      
      this.server.emit('binance_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    this.binanceWs.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        
        if (data.e === 'kline') {
          const klineData = data.k;
          const symbol = data.s;
          const interval = klineData.i;

          // Emit raw kline data
          this.server.emit('kline_data', {
            symbol: symbol,
            kline: klineData,
            timestamp: new Date().toISOString()
          });

          // Calculate indicators for the new candle
          try {
            const candleWithIndicators = await this.binanceService.calculateIndicatorsForSingleCandle(
              symbol,
              interval,
              klineData
            );

            // Update cache
            this.cacheService.updateLatestCandle(symbol, interval, candleWithIndicators);

            // Emit candle with indicators
            this.server.emit('kline_with_indicators', {
              symbol: symbol,
              interval: interval,
              candle: candleWithIndicators,
              isClosed: klineData.x, // true when candle is closed
              timestamp: new Date().toISOString()
            });

          } catch (indicatorError) {
            this.logger.error(`Error calculating indicators for live candle: ${indicatorError.message}`);
          }

        } else if (data.e === '24hrTicker') {
          this.server.emit('ticker_data', {
            symbol: data.s,
            ticker: {
              symbol: data.s,
              priceChange: data.P,
              priceChangePercent: data.P,
              lastPrice: data.c,
              highPrice: data.h,
              lowPrice: data.l,
              openPrice: data.o,
              volume: data.v,
              quoteVolume: data.q,
              bidPrice: data.b || '0',
              askPrice: data.a || '0',
              count: data.n
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        this.logger.error('Error parsing Binance message', err);
      }
    });

    this.binanceWs.on('close', (code, reason) => {
      this.logger.warn(`Binance WS closed. Code: ${code}, Reason: ${reason}`);
      this.server.emit('binance_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
      this.handleReconnect();
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error('Binance WS error', err);
      this.server.emit('binance_connection_status', {
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private updateSubscription(newStreams: string[]) {
    if (this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: Array.from(this.currentSubscriptions),
        id: Date.now()
      };
      
      this.binanceWs.send(JSON.stringify(unsubscribeMessage));
      
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: newStreams,
        id: Date.now() + 1
      };
      
      this.binanceWs.send(JSON.stringify(subscribeMessage));
      
      this.currentSubscriptions.clear();
      newStreams.forEach(stream => this.currentSubscriptions.add(stream));
      
      this.logger.log(`Updated subscription to: ${newStreams.join(', ')}`);
    } else {
      this.currentSubscriptions.clear();
      newStreams.forEach(stream => this.currentSubscriptions.add(stream));
      this.reconnectWithNewStream();
    }
  }

  private reconnectWithNewStream() {
    if (this.binanceWs) {
      this.binanceWs.close();
    }
    
    const streams = Array.from(this.currentSubscriptions).join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
    
    this.binanceWs = new WebSocket(wsUrl);
    this.setupWebSocketHandlers();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.logger.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.reconnectWithNewStream();
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.server.emit('binance_connection_status', {
        status: 'max_reconnect_attempts_reached',
        timestamp: new Date().toISOString()
      });
    }
  }

  private setupWebSocketHandlers() {
    // Similar to the main connectBinance method but for reconnections
    this.binanceWs.on('open', () => {
      this.logger.log('Reconnected to Binance WebSocket');
      this.reconnectAttempts = 0;
      
      this.server.emit('binance_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    // Add the same message, close, and error handlers as in connectBinance
    this.binanceWs.on('message', async (msg) => {
      // Same logic as in connectBinance
    });

    this.binanceWs.on('close', (code, reason) => {
      this.logger.warn(`Binance WS closed. Code: ${code}, Reason: ${reason}`);
      this.handleReconnect();
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error('Binance WS error', err);
    });
  }
}
before doing first clear my confusions i mean let suppose our fucntions that create a stream is depend on symbols array iterated over symbol array and if there are 100 symbols it create 200 stremas for ticker and trade
if 200 symbols then 400 streams
so now in one connections we have 400 streams
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@trade/ethusdt@ticker/ethusdt@trade..... 
