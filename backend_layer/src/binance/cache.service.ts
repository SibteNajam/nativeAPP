import { Injectable, Logger } from '@nestjs/common';

interface CandleWithIndicators {
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

interface ActiveCacheInfo {
  symbol: string;
  interval: string;
  cacheKey: string;
  timestamp: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  
  // Single cache storage - only one active cache at a time
  private activeCandles: CandleWithIndicators[] = [];
  private activeCacheInfo: ActiveCacheInfo | null = null;
  
  //Always store 100 candles regardless of request limit
  private readonly FIXED_CACHE_SIZE = 1000;

  // Generate cache key without limit (only symbol + interval)
  private generateCacheKey(symbol: string, interval: string): string {
    return `${symbol.toUpperCase()}_${interval}`;
  }

  setCandlesWithIndicators(
    symbol: string, 
    interval: string, 
    limit: number, // ✅ Still accept limit but don't use in key
    candles: CandleWithIndicators[]
  ): void {
    const newCacheKey = this.generateCacheKey(symbol, interval); // ✅ No limit
    
    // Clear previous cache if it exists
    if (this.activeCacheInfo) {
      this.logger.log(`🗑️ Clearing previous cache: ${this.activeCacheInfo.cacheKey}`);
      this.clearActiveCache();
    }

    // Always store exactly 100 candles (trim if more, pad if less)
    const limitedCandles = candles.slice(0, this.FIXED_CACHE_SIZE);
    this.activeCandles = [...limitedCandles].reverse(); // Latest first

    this.activeCacheInfo = {
      symbol: symbol.toUpperCase(),
      interval,
      cacheKey: newCacheKey,
      timestamp: Date.now()
    };

    this.logger.log(
      `✅ Set new active cache: ${newCacheKey} with ${this.activeCandles.length} candles (latest first)`
    );
  }

  // ✅ Always return from same cache regardless of requested limit
  getCandlesWithIndicators(symbol: string, interval: string, limit: number): CandleWithIndicators[] | null {
    const requestedCacheKey = this.generateCacheKey(symbol, interval); // ✅ No limit
    
    // Check if we have active cache
    if (!this.activeCacheInfo) {
      this.logger.log(`❌ No active cache for: ${requestedCacheKey}`);
      return null;
    }

    // Check if requested cache matches active cache
    if (this.activeCacheInfo.cacheKey !== requestedCacheKey) {
      // this.logger.log(`❌ Cache key mismatch. Active: ${this.activeCacheInfo.cacheKey}, Requested: ${requestedCacheKey}`);
      return null;
    }

    // ✅ Return requested number of candles (up to what we have cached)
    const availableCandles = Math.min(limit, this.activeCandles.length);
    const result = this.activeCandles.slice(0, availableCandles);
    
    // this.logger.log(
    //   `✅ Cache hit for: ${requestedCacheKey}, returning ${result.length}/${limit} requested candles`
    // );
    
    return result;
  }

  updateLatestCandle(symbol: string, interval: string, candle: CandleWithIndicators): void {
    // Only update if the candle matches our active cache symbol/interval
    if (!this.activeCacheInfo || 
        this.activeCacheInfo.symbol !== symbol.toUpperCase() || 
        this.activeCacheInfo.interval !== interval) {
      // this.logger.log(` Ignoring candle update for ${symbol}_${interval} - not active cache`);
      return;
    }

    if (this.activeCandles.length > 0) {
      const latestCandle = this.activeCandles[0]; // First candle is latest
      
      if (latestCandle.openTime === candle.openTime) {
        // Update existing latest candle
        this.activeCandles[0] = candle;
        // this.logger.log(`🔄 Updated latest candle for active cache: ${this.activeCacheInfo.cacheKey}`);
      } else {
        // Add new candle at beginning (latest position)
        this.activeCandles.unshift(candle);
        
        // ✅ Always maintain exactly FIXED_CACHE_SIZE candles
        if (this.activeCandles.length > this.FIXED_CACHE_SIZE) {
          this.activeCandles = this.activeCandles.slice(0, this.FIXED_CACHE_SIZE);
          // this.logger.log(`✂️ Trimmed to maintain ${this.FIXED_CACHE_SIZE} candles`);
        }
        
        // this.logger.log(`➕ Added new candle to active cache: ${this.activeCacheInfo.cacheKey}`);
      }
      
      // Update timestamp
      this.activeCacheInfo.timestamp = Date.now();
    }
  }

  getLatestCandles(symbol: string, interval: string, limit: number): CandleWithIndicators[] {
    const cached = this.getCandlesWithIndicators(symbol, interval, limit);
    if (!cached) return [];
    
    return cached; // Already limited in getCandlesWithIndicators
  }

  clearActiveCache(): void {
    if (this.activeCacheInfo) {
      // this.logger.log(`🗑️ Clearing active cache: ${this.activeCacheInfo.cacheKey}`);
    }
    
    this.activeCandles = [];
    this.activeCacheInfo = null;
  }

  getActiveCacheInfo(): ActiveCacheInfo | null {
    return this.activeCacheInfo;
  }

  // ✅ Updated helper method without limit
  isActiveCache(symbol: string, interval: string): boolean {
    if (!this.activeCacheInfo) return false;
    
    const requestedKey = this.generateCacheKey(symbol, interval);
    return this.activeCacheInfo.cacheKey === requestedKey;
  }

  // ✅ New helper method to check cache status
  getCacheStatus(): {
    hasActiveCache: boolean;
    cacheKey?: string;
    symbol?: string;
    interval?: string;
    candleCount: number;
    maxCandles: number;
    ageInSeconds: number;
  } {
    if (!this.activeCacheInfo) {
      return {
        hasActiveCache: false,
        candleCount: 0,
        maxCandles: this.FIXED_CACHE_SIZE,
        ageInSeconds: 0
      };
    }

    return {
      hasActiveCache: true,
      cacheKey: this.activeCacheInfo.cacheKey,
      symbol: this.activeCacheInfo.symbol,
      interval: this.activeCacheInfo.interval,
      candleCount: this.activeCandles.length,
      maxCandles: this.FIXED_CACHE_SIZE,
      ageInSeconds: Math.round((Date.now() - this.activeCacheInfo.timestamp) / 1000)
    };
  }
}