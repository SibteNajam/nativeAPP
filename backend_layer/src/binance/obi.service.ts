import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws'; // ✅ Change this line - remove the * as

interface OBIRecord {
  symbol: string;
  timestamp: string;
  obi: number;
  obiZ: number;
}

interface OBIStats {
  symbol: string;
  totalSnapshots: number;
  currentCacheSize: number;
  lastRecord: OBIRecord | null;
  collectionStarted: string;
  isCollecting: boolean;
}

interface OBICacheData {
  symbol: string;
  records: OBIRecord[];
  stats: OBIStats;
  lastUpdated: number;
}

@Injectable()
export class ObiService {
  private readonly logger = new Logger(ObiService.name);
  private ws: WebSocket | null = null; // This should work now
  private obiCache: OBIRecord[] = [];
  private currentSymbol: string | null = null;
  private isCollecting = false;
  private stats: OBIStats = {
    symbol: '',
    totalSnapshots: 0,
    currentCacheSize: 0,
    lastRecord: null,
    collectionStarted: '',
    isCollecting: false
  };
  private readonly MAX_CACHE_SIZE = 100;
  private obiCacheStorage: Map<string, OBICacheData> = new Map();

  // ✅ MAIN METHOD: Get OBI data with auto-start collection
  async getOBIData(symbol: string): Promise<{
    success: boolean;
    message?: string;
    symbol: string;
    data?: OBIRecord[];
    recordCount?: number;
    isCollecting: boolean;
    timestamp: string;
  }> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check if we have recent data
    const cached = this.obiCacheStorage.get(upperSymbol);
    if (cached && cached.records.length > 0) {
      return {
        success: true,
        symbol: upperSymbol,
        data: cached.records,
        recordCount: cached.records.length,
        isCollecting: this.isCollecting && this.currentSymbol === upperSymbol,
        timestamp: new Date().toISOString()
      };
    }

    // Auto-start collection if not collecting for this symbol
    if (!this.isCollecting || this.currentSymbol !== upperSymbol) {
      this.logger.log(`🚀 Auto-starting OBI collection for ${upperSymbol}`);
      this.startOBICollection(upperSymbol);
      
      // Wait a moment for initial data
      await this.waitForInitialData(3000);
      
      // Check again after waiting
      const newCached = this.obiCacheStorage.get(upperSymbol);
      if (newCached && newCached.records.length > 0) {
        return {
          success: true,
          symbol: upperSymbol,
          data: newCached.records,
          recordCount: newCached.records.length,
          isCollecting: true,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Return "please wait" response
    return {
      success: false,
      message: `OBI data is being collected for ${upperSymbol}. Please try again in a few seconds.`,
      symbol: upperSymbol,
      isCollecting: true,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ Helper method to wait for initial data
  private async waitForInitialData(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.obiCache.length > 0) {
        this.logger.log(`✅ Initial OBI data received after ${Date.now() - startTime}ms`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.log(`⏰ Timeout waiting for initial OBI data`);
  }

  // Start collecting and calculating OBI/OBI-Z
  private startOBICollection(symbol: string): void {
    if (this.isCollecting && this.currentSymbol === symbol.toUpperCase()) {
      this.logger.log(`Already collecting OBI data for ${symbol}`);
      return;
    }

    this.stopCollection();
    this.resetCache(symbol.toUpperCase());
    
    const stream = `${symbol.toLowerCase()}@depth20@1000ms`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;

    this.logger.log(` Starting OBI collection for ${symbol} (1-second intervals)`);

    try {
      this.ws = new WebSocket(wsUrl); 

      this.ws.on('open', () => {
        this.isCollecting = true;
        this.stats.isCollecting = true;
        this.logger.log(` Connected to order book stream: ${symbol}`);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const orderBookData = JSON.parse(data.toString());
          this.processSnapshotAndCalculateOBI(orderBookData);
        } catch (error) {
          this.logger.error(`Error processing snapshot: ${error.message}`);
        }
      });

      this.ws.on('close', () => {
        this.isCollecting = false;
        this.stats.isCollecting = false;
        this.logger.warn(`❌ Order book stream disconnected`);
      });

      this.ws.on('error', (error) => {
        this.logger.error(`WebSocket error: ${error.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to create WebSocket: ${error.message}`);
      throw error;
    }
  }

  private processSnapshotAndCalculateOBI(data: any): void {
    const timestamp = new Date().toISOString();
    
    // Calculate OBI from current snapshot
    const bidVolume = data.bids.reduce((sum: number, bid: [string, string]) => 
      sum + parseFloat(bid[1]), 0
    );
    
    const askVolume = data.asks.reduce((sum: number, ask: [string, string]) => 
      sum + parseFloat(ask[1]), 0
    );

    const totalVolume = bidVolume + askVolume;
    const currentOBI = totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;

    // Calculate OBI-Z using previous OBI values from cache
    let obiZ = 0;

    if (this.obiCache.length >= 1) {
      const previousOBIValues = this.obiCache.map(record => record.obi);
      const mean = previousOBIValues.reduce((sum, obi) => sum + obi, 0) / previousOBIValues.length;
      
      if (previousOBIValues.length > 1) {
        const variance = previousOBIValues.reduce((sum, obi) => sum + Math.pow(obi - mean, 2), 0) / previousOBIValues.length;
        const standardDeviation = Math.sqrt(variance);
        obiZ = standardDeviation !== 0 ? (currentOBI - mean) / standardDeviation : 0;
      }
    }

    // Create OBI record with all 4 properties
    const obiRecord: OBIRecord = {
      symbol: this.currentSymbol!,
      timestamp,
      obi: Number(currentOBI.toFixed(6)),
      obiZ: Number(obiZ.toFixed(4))
    };

    // Add to cache (latest first)
    this.obiCache.unshift(obiRecord);

    // Maintain cache size (keep only last 100)
    if (this.obiCache.length > this.MAX_CACHE_SIZE) {
      this.obiCache = this.obiCache.slice(0, this.MAX_CACHE_SIZE);
    }

    // Update stats
    this.stats.totalSnapshots++;
    this.stats.currentCacheSize = this.obiCache.length;
    this.stats.lastRecord = obiRecord;

    // Update cache storage
    this.updateCacheStorage();

    this.logger.log(`📊 ${this.currentSymbol} - OBI: ${currentOBI.toFixed(6)}, OBI-Z: ${obiZ.toFixed(4)} (Cache: ${this.obiCache.length})`);
  }

  private updateCacheStorage(): void {
    if (!this.currentSymbol) return;

    const cacheData: OBICacheData = {
      symbol: this.currentSymbol,
      records: [...this.obiCache],
      stats: { ...this.stats },
      lastUpdated: Date.now()
    };

    this.obiCacheStorage.set(this.currentSymbol, cacheData);
  }

  private resetCache(symbol: string): void {
    this.currentSymbol = symbol;
    this.obiCache = [];
    this.stats = {
      symbol,
      totalSnapshots: 0,
      currentCacheSize: 0,
      lastRecord: null,
      collectionStarted: new Date().toISOString(),
      isCollecting: false
    };
  }

  private stopCollection(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isCollecting = false;
    this.stats.isCollecting = false;
  }

  // ✅ Helper methods for external use
  isCollectingData(): boolean {
    return this.isCollecting;
  }

  getCurrentSymbol(): string | null {
    return this.currentSymbol;
  }

  getCachedSymbols(): string[] {
    return Array.from(this.obiCacheStorage.keys());
  }
}