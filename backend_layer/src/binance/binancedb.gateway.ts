// import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
// import { Client } from 'pg';
// import WebSocket from 'ws';
// import { BinanceService } from './binance.service';

// @Injectable()
// export class BinanceStreamService implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(BinanceStreamService.name);
//   private client: Client;
//   private sockets: WebSocket[] = [];
//   private readonly timeframe = '1m'; // Single timeframe for now
//   // private readonly symbolLimit = 20;
//   private readonly maxCandles = 100;
//   private readonly symbols_limit = 10; // Limit to first 10 symbols for testing
//   private reconnectAttempts = new Map<number, number>();
//   private readonly maxReconnectAttempts = 5;
//   private readonly connectionsCount = 5; // For 50 symbols, split into 5 connections
//   private readonly symbolsPerConnection = 10; // 10 symbols per connection

//   constructor(private readonly binanceService: BinanceService) {
//     this.logger.log('BinanceStreamService constructor called');
//     console.log('BinanceStreamService constructor called');
//     this.client = new Client({
//       host: 'localhost',
//       port: 5432,
//       user: 'postgres',
//       password: 'BYTEBOOM',
//       database: 'ByteBoom',
//     });
//   }

//   async onModuleInit() {
//     this.logger.log('Starting BinanceStreamService initialization');
//     console.log('Starting BinanceStreamService initialization');
//     try {
//       await this.client.connect();
//       this.logger.log('📊 Connected to PostgreSQL database');
//       console.log('📊 Connected to PostgreSQL database');

//       await this.initializeTimeframe();

//       const symbols = await this.initializeSymbols();
//       if (!symbols || symbols.length === 0) {
//         this.logger.error('❌ No symbols available, aborting stream initialization');
//         console.error('❌ No symbols available, aborting stream initialization');
//         return;
//       }

//       await this.createWebSocketConnections(symbols);
//       const status = await this.getConnectionStatus();
//       this.logger.log(`Initial connection status: ${JSON.stringify(status, null, 2)}`);
//       this.logger.log('🚀 BinanceStreamService initialized successfully');
//     } catch (error) {
//       this.logger.error(`❌ Failed to initialize BinanceStreamService: ${error.message}`);
//       throw error; // Rethrow to ensure NestJS handles module initialization failure
//     }
//   }

//   private async initializeTimeframe() {
//     try {
//       await this.client.query(
//         `INSERT INTO timeframes (timeframe) VALUES ($1) ON CONFLICT (timeframe) DO NOTHING`,
//         [this.timeframe]
//       );
//       this.logger.log(`✅ Initialized timeframe: ${this.timeframe}`);
//     } catch (error) {
//       this.logger.error(`❌ Failed to initialize timeframe: ${error.message}`);
//       throw error;
//     }
//   }

//   private async initializeSymbols(): Promise<string[]> {
//     try {
//       const symbols = await this.binanceService.getActiveUsdtSymbols(this.symbols_limit);
//       const values = symbols.map((s, i) => `($${i + 1})`).join(', ');
//       await this.client.query(
//         `INSERT INTO symbols (symbol_name) VALUES ${values} ON CONFLICT (symbol_name) DO NOTHING`,
//         symbols
//       );
//     this.logger.log(`✅ Initialized ${symbols.length} symbols`);

//       return symbols;
//     } catch (error) {
//       this.logger.error(`❌ Error initializing symbols: ${error.message}`);
//       return ['BTCUSDT']; // Fallback to a known symbol
//     }
//   }

//   private async getLimitedSymbols(): Promise<string[]> {
// const hardcodedSymbols = [
//   'BTCUSDT', // Bitcoin
//   'ETHUSDT', // Ethereum
//   'BNBUSDT', // Binance Coin
//   'XRPUSDT', // Ripple
//   'ADAUSDT', // Cardano
//   'SOLUSDT', // Solana
//   'DOTUSDT', // Polkadot
//   'DOGEUSDT', // Dogecoin
//   'SHIBUSDT', // Shiba Inu
//   'LTCUSDT', // Litecoin
//   'LINKUSDT', // Chainlink
//   'AVAXUSDT', // Avalanche
//   'UNIUSDT', // Uniswap
//   'XLMUSDT', // Stellar
//   'VETUSDT', // VeChain
//   'TRXUSDT', // Tron
//   'XTZUSDT', // Tezos
//   'FILUSDT'  // Filecoin
// ];
//     this.logger.log(`Using hardcoded ${hardcodedSymbols.length} symbols`);
//   return hardcodedSymbols;
//   }

//   private async createWebSocketConnections(symbols: string[]) {
//     if (symbols.length === 0) {
//       this.logger.error('❌ No symbols to stream');
//       return;
//     }
//     // Split symbols into chunks for multiple connections
//     for (let i = 0; i < this.connectionsCount; i++) {
//       const startIdx = i * this.symbolsPerConnection;
//       const endIdx = Math.min(startIdx + this.symbolsPerConnection, symbols.length);
//       const symbolChunk = symbols.slice(startIdx, endIdx);

//       if (symbolChunk.length === 0) break;

//       await this.createSingleConnection(symbolChunk, i);

//       // Small delay between connections to avoid overwhelming
//       await this.sleep(1000);
//     }
//   }

//   private async createSingleConnection(symbols: string[], connectionId: number) {
//     const streamNames = symbols.map(symbol => `${symbol.toLowerCase()}@kline_${this.timeframe}`);
//     const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames.join('/')}`;
//     this.logger.log(`🔌 WebSocket URL for connection ${connectionId + 1}: ${wsUrl}`);

//     const ws = new WebSocket(wsUrl);

//     ws.on('open', () => {
//       this.logger.log(`✅ Connection ${connectionId + 1} established (${symbols.length} streams)`);
//       this.reconnectAttempts.set(connectionId, 0);
//     });

//     ws.on('message', async (data) => {
//       // this.logger.debug(`Raw message for connection ${connectionId + 1}: ${data.toString()}`);
//       await this.handleMessage(data, connectionId);
//     });

//     ws.on('close', (code, reason) => {
//       this.logger.warn(`⚠️ Connection ${connectionId + 1} closed (${code}): ${reason}`);
//       this.handleReconnection(symbols, connectionId, wsUrl);
//     });

//     ws.on('error', (error) => {
//       this.logger.error(`❌ Connection ${connectionId + 1} error: ${error.message}`);
//     });

//     this.sockets[connectionId] = ws; // Store at specific index for easier management
//   }
  
//   private async maintainCandleLimit(symbol: string) {
//     try {
//       // Get symbol_id
//       const symbolRes = await this.client.query(
//         `SELECT id FROM symbols WHERE symbol_name = $1`,
//         [symbol]
//       );
//       if (symbolRes.rowCount === 0) {
//         this.logger.error(`Symbol ${symbol} not found`);
//         console.error(`Symbol ${symbol} not found`);
//         return;
//       }
//       const symbolId = symbolRes.rows[0].id;

//       // Get timeframe_id
//       const timeframeRes = await this.client.query(
//         `SELECT id FROM timeframes WHERE timeframe = $1`,
//         [this.timeframe]
//       );
//       if (timeframeRes.rowCount === 0) {
//         this.logger.error(`Timeframe ${this.timeframe} not found`);
//         console.error(`Timeframe ${this.timeframe} not found`);
//         return;
//       }
//       const timeframeId = timeframeRes.rows[0].id;

//       // Count current candles
//       const countResult = await this.client.query(
//         `SELECT COUNT(*) as count FROM ohlcv WHERE symbol_id = $1 AND timeframe_id = $2`,
//         [symbolId, timeframeId]
//       );
//       const currentCount = parseInt(countResult.rows[0].count);

//       // If we exceed the limit, remove oldest candles
//       if (currentCount > this.maxCandles) {
//         const excessCount = currentCount - this.maxCandles;
//        const query = `
//   DELETE FROM ohlcv
//   WHERE symbol_id = $1 AND timeframe_id = $2
//   AND open_time < (
//     SELECT open_time FROM ohlcv
//     WHERE symbol_id = $1 AND timeframe_id = $2
//     ORDER BY open_time DESC
//     OFFSET $3 LIMIT 1
//   )
// `;
//         const result = await this.client.query(query, [symbolId, timeframeId, this.maxCandles]);
//         this.logger.log(`🧹 Removed ${result.rowCount} old candles for ${symbol}_${this.timeframe}`);
//         console.log(`🧹 Removed ${result.rowCount} old candles for ${symbol}_${this.timeframe}`);
//       } else {
//         this.logger.debug(`No candles to remove for ${symbol}_${this.timeframe} (current count: ${currentCount})`);
//       }
//     } catch (error) {
//       this.logger.error(`❌ Failed to maintain candle limit for ${symbol}: ${error.message}`);
//       throw error;
//     }
//   }
//   private async handleMessage(data: Buffer, connectionId: number) {
//     try {
//       const message = JSON.parse(data.toString());
//       const klineData = message?.data?.k;

//       if (!klineData) {
//         this.logger.debug(`Non-kline message received: ${JSON.stringify(message)}`);
//         return;
//       }

//       // this.logger.debug(`Kline data: ${JSON.stringify(klineData)}`);
//       if (!klineData.x) {
//         // this.logger.debug(`Incomplete candle for ${klineData.s}: ${JSON.stringify(klineData)}`);
//         return;
//       }

//       const symbol = klineData.s;
//      const openTime = new Date(klineData.t);
// const closeTime = new Date(klineData.T);
// const open = parseFloat(klineData.o);
// const high = parseFloat(klineData.h);
// const low = parseFloat(klineData.l);
// const close = parseFloat(klineData.c);
// const volume = parseFloat(klineData.v);
// const quoteVolume = parseFloat(klineData.q);

//       await this.insertCandle(symbol, openTime, open, high, low, close, volume, closeTime, quoteVolume);
//       // await this.maintainCandleLimit(symbol);

//       this.logger.debug(`📊 Updated ${symbol} at ${openTime.toISOString()}`);
//       console.log(`📊 Updated ${symbol} at ${openTime.toISOString()}`);
//     } catch (error) {
//       this.logger.error(`❌ Error handling message on connection ${connectionId + 1}: ${error.message}`);
//     }
//   }

//  private async insertCandle(
//   symbol: string,
//   openTime: Date,
//   open: number,
//   high: number,
//   low: number,
//   close: number,
//   volume: number,
//   closeTime: Date,
//   quoteVolume: number
// ) {
//     // Check if symbol exists
//     let symbolRes = await this.client.query(
//       `SELECT id FROM symbols WHERE symbol_name = $1`,
//       [symbol]
//     );
//     if (symbolRes.rowCount === 0) {
//       this.logger.log(`Symbol ${symbol} not found, inserting...`);
//       await this.client.query(
//         `INSERT INTO symbols (symbol_name) VALUES ($1) ON CONFLICT (symbol_name) DO NOTHING`,
//         [symbol]
//       );
//       symbolRes = await this.client.query(
//         `SELECT id FROM symbols WHERE symbol_name = $1`,
//         [symbol]
//       );
//       if (symbolRes.rowCount === 0) {
//         this.logger.error(`❌ Failed to insert symbol ${symbol}`);

//         return;
//       }
//     }
//     const symbolId = symbolRes.rows[0].id;

//     // Check if timeframe exists
//     const timeframeRes = await this.client.query(
//       `SELECT id FROM timeframes WHERE timeframe = $1`,
//       [this.timeframe]
//     );
//     if (timeframeRes.rowCount === 0) {
//       this.logger.error(`❌ Timeframe ${this.timeframe} not found`);
//       return;
//     }
//     const timeframeId = timeframeRes.rows[0].id;

//    const query = `
//   INSERT INTO ohlcv (symbol_id, timeframe_id, open_time, open, high, low, close, volume, close_time, quote_volume)
//   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//   ON CONFLICT (symbol_id, timeframe_id, open_time)
//   DO UPDATE SET
//     open = EXCLUDED.open,
//     high = EXCLUDED.high,
//     low = EXCLUDED.low,
//     close = EXCLUDED.close,
//     volume = EXCLUDED.volume,
//     close_time = EXCLUDED.close_time,
//     quote_volume = EXCLUDED.quote_volume
// `;
// const values = [symbolId, timeframeId, openTime, open, high, low, close, volume, closeTime, quoteVolume];

//     try {
//       const result = await this.client.query(query, values);
//       this.logger.log(`✅ Inserted/Updated candle for ${symbol}_${this.timeframe} at ${openTime.toISOString()} (rows affected: ${result.rowCount})`);
//     } catch (error) {
//       this.logger.error(`❌ Failed to insert candle for ${symbol}: ${error.message}`);
//       throw error;
//     }
//   }

//   private handleReconnection(symbols: string[], connectionId: number, wsUrl: string) {
//     const attempts = this.reconnectAttempts.get(connectionId) || 0;

//     if (attempts >= this.maxReconnectAttempts) {
//       this.logger.error(`❌ Max reconnection attempts reached for connection ${connectionId + 1}`);
//       return;
//     }

//     const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Exponential backoff, max 30s
//     this.reconnectAttempts.set(connectionId, attempts + 1);

//     this.logger.log(`🔄 Reconnecting connection ${connectionId + 1} in ${delay}ms (attempt ${attempts + 1})`);

//     setTimeout(() => {
//       this.createSingleConnection(symbols, connectionId);
//     }, delay);
//   }

//   async getConnectionStatus(): Promise<{
//     totalConnections: number;
//     activeConnections: number;
//     status: string[];
//   }> {
//     const status = this.sockets.map((ws, index) => {
//       const state = ws.readyState === WebSocket.OPEN ? 'OPEN' :
//                    ws.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
//                    ws.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED';
//       return `Connection ${index + 1}: ${state}`;
//     });

//     const activeCount = this.sockets.filter(ws => ws.readyState === WebSocket.OPEN).length;

//     return {
//       totalConnections: this.sockets.length,
//       activeConnections: activeCount,
//       status
//     };
//   }

//   private sleep(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   async onModuleDestroy() {
//     this.logger.log('🔌 Closing all WebSocket connections...');
//     console.log('🔌 Closing all WebSocket connections...');

//     for (const ws of this.sockets) {
//       if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
//         ws.close();
//       }
//     }

//     try {
//       await this.client.end();
//       this.logger.log('✅ PostgreSQL connection closed');
//     } catch (error) {
//       this.logger.error(`❌ Error closing PostgreSQL connection: ${error.message}`);
//     }

//     this.logger.log('🛑 BinanceStreamService destroyed');
//   }
// }


