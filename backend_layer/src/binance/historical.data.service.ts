import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { parse } from 'path';
import { BinanceService } from './binance.service';

@Injectable()
export class HistoricalDataService {
  private readonly logger = new Logger(HistoricalDataService.name);
  private readonly BASE_URL = 'https://api.binance.com';
  private readonly TIMEFRAMES = ['1m']; // You can add more
  private readonly SYMBOL_LIMIT = 10;
  private readonly CANDLE_LIMIT = 100;
  private readonly CONCURRENT_FETCH = 2; // Max concurrent API calls

  constructor(
    private readonly httpService: HttpService,
    private readonly binanceService: BinanceService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) { }

  async onModuleInit() {
    // No need to initialize database connection here as it's handled by TypeORM
  }

  /** Main function to initialize historical data */
  async initializeDatabase() {
    this.logger.log('🚀 Starting historical data initialization...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Initialize timeframes
      await this.initializeTimeframes(queryRunner);

      // Fetch and initialize symbols
      const symbols = await this.binanceService.getActiveUsdtSymbols(this.SYMBOL_LIMIT);
      if (symbols.length === 0) {
        this.logger.error('❌ No symbols fetched, aborting initialization');
        return;
      }
      await this.initializeSymbols(queryRunner, symbols);

      // Process each symbol and timeframe with concurrency
      for (const timeframe of this.TIMEFRAMES) {
        for (let i = 0; i < symbols.length; i += this.CONCURRENT_FETCH) {
          const batch = symbols.slice(i, i + this.CONCURRENT_FETCH);
          await Promise.all(batch.map(symbol => this.processSymbol(queryRunner, symbol, timeframe)));
        }
      }

      this.logger.log('🎉 Historical data initialization complete!');
    } catch (err) {
      this.logger.error(`❌ Initialization failed: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /** Process a single symbol + timeframe */
  private async processSymbol(queryRunner: any, symbol: string, timeframe: string) {
    try {
      const exists = await this.checkExistingData(queryRunner, symbol, timeframe);
      if (exists) {
        this.logger.log(`⏭ Skipping ${symbol}_${timeframe} (data exists)`);
        return;
      }

      // Fetch historical candles
      const candles = await this.fetchKlines(symbol, timeframe, this.CANDLE_LIMIT);
      if (!candles.length) {
        this.logger.warn(`⚠ No candles returned for ${symbol}_${timeframe}`);
        return;
      }

      // Insert all candles in one bulk insert
      await this.insertOHLCV(queryRunner, symbol, timeframe, candles);
      this.logger.log(`✅ Inserted from historical-data ${candles.length} candles for ${symbol}_${timeframe}`);

      // Small delay to respect Binance API
      await this.sleep(50);
    } catch (err) {
      this.logger.error(`❌ Error processing ${symbol}_${timeframe}: ${err.message}`);
    }
  }

  /** Initialize timeframes table */
  private async initializeTimeframes(queryRunner: any) {
    for (const timeframe of this.TIMEFRAMES) {
      await queryRunner.query(
        `INSERT INTO timeframes (timeframe) VALUES ($1) ON CONFLICT (timeframe) DO NOTHING`,
        [timeframe]
      );
      this.logger.log(`✅ Initialized timeframe: ${timeframe}`);
    }
  }

  /** Initialize symbols table */
  private async initializeSymbols(queryRunner: any, symbols: string[]) {
    const values = symbols.map((s, i) => `($${i + 1})`).join(', ');
    await queryRunner.query(
      `INSERT INTO symbols (symbol_name) VALUES ${values} ON CONFLICT (symbol_name) DO NOTHING`,
      symbols
    );
    this.logger.log(`✅ Initialized ${symbols.length} symbols`);
  }

  /** Fetch symbols from Binance API */
  private async getLimitedSymbols(): Promise<string[]> {
    const hardcodedSymbols = [
      'BTCUSDT', // Bitcoin
      'ETHUSDT', // Ethereum
      'BNBUSDT', // Binance Coin
      'XRPUSDT', // Ripple
      'ADAUSDT', // Cardano
      'SOLUSDT', // Solana
      'DOTUSDT', // Polkadot
      'DOGEUSDT', // Dogecoin
      'SHIBUSDT', // Shiba Inu
      'LTCUSDT', // Litecoin
      'LINKUSDT', // Chainlink
      'AVAXUSDT', // Avalanche
      'UNIUSDT', // Uniswap
      'XLMUSDT', // Stellar
      'VETUSDT', // VeChain
      'TRXUSDT', // Tron
      'XTZUSDT', // Tezos
      'FILUSDT'  // Filecoin
    ];

    this.logger.log(`Using hardcoded ${hardcodedSymbols.length} symbols`);
    return hardcodedSymbols;
  }

  /** Check if data exists for symbol and timeframe */
  private async checkExistingData(queryRunner: any, symbol: string, timeframe: string): Promise<boolean> {
    const res = await queryRunner.query(
      `SELECT 1 FROM ohlcv 
       WHERE symbol_id = (SELECT id FROM symbols WHERE symbol_name = $1)
       AND timeframe_id = (SELECT id FROM timeframes WHERE timeframe = $2)
       LIMIT 1`,
      [symbol, timeframe]
    );
    return res.length > 0;
  }

  /** Insert OHLCV data in bulk */
  private async insertOHLCV(queryRunner: any, symbol: string, timeframe: string, candles: any[]) {
    const symbolRes = await queryRunner.query(`SELECT id FROM symbols WHERE symbol_name = $1`, [symbol]);
    const timeframeRes = await queryRunner.query(`SELECT id FROM timeframes WHERE timeframe = $1`, [timeframe]);

    if (!symbolRes[0] || !timeframeRes[0]) {
      throw new Error(`Symbol ${symbol} or timeframe ${timeframe} not found`);
    }

    const symbolId = symbolRes[0].id;
    const timeframeId = timeframeRes[0].id;

    const placeholders: string[] = [];
    const values: any[] = [];

    candles.forEach((c, i) => {
      const idx = i * 10; // 10 columns in ohlcv table
      placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10})`);
      values.push(
        symbolId,            // INTEGER
        timeframeId,         // INTEGER
        new Date(c[0]),      // open_time (TIMESTAMP)
        parseFloat(c[1]),    // open (DOUBLE PRECISION)
        parseFloat(c[2]),    // high (DOUBLE PRECISION)
        parseFloat(c[3]),    // low (DOUBLE PRECISION)
        parseFloat(c[4]),    // close (DOUBLE PRECISION)
        parseFloat(c[5]),    // volume (DOUBLE PRECISION)
        new Date(c[6]),      // close_time (TIMESTAMP)
        parseFloat(c[7])     // quote_volume (DOUBLE PRECISION)
      );
    });

    await queryRunner.query(
      `INSERT INTO ohlcv (symbol_id, timeframe_id, open_time, open, high, low, close, volume, close_time, quote_volume)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (symbol_id, timeframe_id, open_time) DO NOTHING`,
      values
    );
  }

  /** Fetch historical klines from Binance */
  private async fetchKlines(symbol: string, interval: string, limit: number) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.BASE_URL}/api/v3/klines`, {
          params: { symbol, interval, limit },
          timeout: 10000,
        })
      );
      return data;
    } catch (err: any) {
      if (err.response?.status === 429) {
        this.logger.warn(`Rate limit hit for ${symbol}_${interval}, retrying...`);
        await this.sleep(1000);
        return this.fetchKlines(symbol, interval, limit);
      }
      this.logger.error(`❌ Error fetching klines for ${symbol}_${interval}: ${err.message}`);
      throw err;
    }
  }

  /** Utility to delay execution */
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
