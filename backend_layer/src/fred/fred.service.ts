import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FredIndicatorData } from './entities/fredIndicator.entity';

@Injectable()
export class FredService implements OnModuleInit {
  private readonly logger = new Logger(FredService.name);
  private readonly baseURL = 'https://api.stlouisfed.org/fred/series/observations';
  private readonly apiKey = process.env.FRED_API_KEY;
  private readonly indicatorMap = {
    'CPIAUCSL': 'CPI',
    'UNRATE': 'Unemployment Rate',
    'PAYEMS': 'Nonfarm Payrolls',
    'FEDFUNDS': 'Fed Funds Rate',
    'TWEXBGSMTH': 'U.S. Dollar Index',
    'GDP': 'GDP',
    'SP500': 'S&P 500',
  };
  private readonly maxLimit = 100000; // FRED API maximum limit per request

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(FredIndicatorData)
    private dataRepo: Repository<FredIndicatorData>,
  ) {
    // Configure HttpService with timeout
    this.httpService.axiosRef.defaults.timeout = 30000; // 30 second timeout
  }

  /**
   * Helper method to make HTTP requests with retry logic
   */
  private async makeHttpRequest(url: string, retryCount: number = 0): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response;
    } catch (error) {
      this.logger.error(`HTTP Request failed (attempt ${retryCount + 1}/${maxRetries + 1}): ${error.message}`);
      
      // Check if it's a network error that should be retried
      const isRetryableError = error.code === 'ENOTFOUND' || 
                              error.code === 'ECONNREFUSED' || 
                              error.code === 'ETIMEDOUT' ||
                              error.code === 'ECONNRESET' ||
                              error.message.includes('timeout') ||
                              error.message.includes('Network Error');

      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        this.logger.warn(`Network error for FRED API, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeHttpRequest(url, retryCount + 1);
      }
      
      throw error;
    }
  }

  async onModuleInit() {
    this.logger.log('FredService initialized, starting initial data load...');
    await this.initialLoadAllData(); // Initial full historical load
  }

  /**
   * Public method to manually trigger full historical data load for all indicators.
   * Call this from a controller, CLI, or anywhere to load/reload all historical data.
   */
  async loadAllHistoricalData() {
    this.logger.log('Manually triggered full historical data load...');
    await this.initialLoadAllData();
  }

  /**
   * Public method to load historical data for a specific series ID.
   * @param seriesId The FRED series ID (e.g., 'CPIAUCSL')
   */
  async loadHistoricalDataForSeries(seriesId: string) {
    const name = this.indicatorMap[seriesId];
    if (!name) {
      throw new Error(`Indicator ${seriesId} not mapped`);
    }

    const existingCount = await this.dataRepo.count({ where: { name } });
    if (existingCount > 0) {
      this.logger.log(`Data already exists for ${name}, skipping load`);
      return;
    }

    this.logger.log(`Starting load for ${name} (${seriesId})`);
    await this.fetchAndStoreAllHistoricalData(seriesId);
    this.logger.log(`Completed load for ${name}`);
  }

  private async initialLoadAllData() {
    const seriesIds = Object.keys(this.indicatorMap);
    
    for (const seriesId of seriesIds) {
      try {
        const name = this.indicatorMap[seriesId];
        const existingCount = await this.dataRepo.count({ where: { name } });
        
        if (existingCount > 0) {
          this.logger.log(`Data already exists for ${name}, skipping initial load`);
          continue;
        }

        this.logger.log(`Starting initial load for ${name} (${seriesId})`);
        await this.fetchAndStoreAllHistoricalData(seriesId);
        this.logger.log(`Successfully completed initial load for ${name}`);
        
        // Add delay between series to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed to initial load ${seriesId}: ${error.message}`);
      }
    }
    this.logger.log('Initial data load completed at ' + new Date().toISOString());
  }

  private async fetchAndStoreAllHistoricalData(series_id: string) {
    try {
      const name = this.indicatorMap[series_id];
      if (!name) throw new Error(`Indicator ${series_id} not mapped`);

      let offset = 0;
      let totalInserted = 0;
      let allEntities: FredIndicatorData[] = [];

      do {
        // Fetch batch of historical data with pagination
        const url = `${this.baseURL}?series_id=${series_id}&api_key=${this.apiKey}&file_type=json&limit=${this.maxLimit}&offset=${offset}&sort_order=asc`;
        const response = await this.makeHttpRequest(url);
        const observations = response.data.observations;

        if (observations.length === 0) {
          break;
        }

        // Process observations in this batch
        for (const obs of observations) {
          if (obs.value === '.' || isNaN(parseFloat(obs.value))) {
            this.logger.warn(`Invalid value for ${series_id} on ${obs.date}, skipping`);
            continue;
          }

          const observationDate = new Date(obs.date);
          const value = parseFloat(obs.value);

          // For initial load, assume no duplicates, but check to be safe
          const existingRecord = await this.dataRepo.findOne({
            where: { name, observation_date: observationDate },
          });

          if (!existingRecord) {
            const entity = this.dataRepo.create({
              name,
              value,
              observation_date: observationDate,
            });
            allEntities.push(entity);
          }
        }

        totalInserted += observations.length - (observations.length - allEntities.length); // Approximate
        offset += this.maxLimit;

        // Add small delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

        this.logger.log(`Processed batch for ${name}: offset ${offset - this.maxLimit}, inserted ${allEntities.length - totalInserted} new records so far`);
      } while (true); // Continue until no more observations

      if (allEntities.length > 0) {
        // Bulk save all new entities
        await this.dataRepo.save(allEntities);
        this.logger.log(`Inserted ${allEntities.length} historical records for ${name}`);
      } else {
        this.logger.log(`No new historical records to insert for ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error in fetchAndStoreAllHistoricalData for ${series_id}: ${error.message}`);
      throw error;
    }
  }

  // Changed to run every hour instead of every minute to avoid rate limiting
  // @Cron('*/5 * * * *') // Runs every 5 minutes
  async fetchAllIndicators() {
    this.logger.log('Starting FRED data fetch...');
    const seriesIds = Object.keys(this.indicatorMap);
    
    for (const seriesId of seriesIds) {
      try {
        await this.storeIndicatorData(seriesId);
        this.logger.log(`Successfully processed ${seriesId}`);
        // Add small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to process ${seriesId}: ${error.message}`);
        // Continue with next series instead of crashing
      }
    }
    this.logger.log('FRED data fetch completed at ' + new Date().toISOString());
  }

  async getIndicatorData(series_id: string = 'CPIAUCSL'): Promise<any> {
    try {
      const url = `${this.baseURL}?series_id=${series_id}&api_key=${this.apiKey}&file_type=json&limit=100&sort_order=desc`;
      const response = await this.makeHttpRequest(url);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching ${series_id} data: ${error.message}`);
      throw new Error(`Failed to fetch ${series_id} data from FRED API`);
    }
  }

  private async storeIndicatorData(series_id: string) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const url = `${this.baseURL}?series_id=${series_id}&api_key=${this.apiKey}&file_type=json&limit=1&sort_order=desc`;
        const response = await this.makeHttpRequest(url);
        const data = response.data.observations;

        const name = this.indicatorMap[series_id];
        if (!name) throw new Error(`Indicator ${series_id} not mapped`);

        if (data.length === 0) {
          this.logger.warn(`No data returned for ${series_id}`);
          return;
        }

        const latestObs = data[0];
        if (latestObs.value === '.' || isNaN(parseFloat(latestObs.value))) {
          this.logger.warn(`Invalid value for ${series_id} on ${latestObs.date}`);
          return;
        }

        const observationDate = new Date(latestObs.date);
        const value = parseFloat(latestObs.value);

        // Check if a record for this date already exists
        const existingRecord = await this.dataRepo.findOne({
          where: { name, observation_date: observationDate },
        });

        if (existingRecord) {
          // Optionally, update the value if it changed
          if (existingRecord.value !== value) {
            existingRecord.value = value;
            await this.dataRepo.save(existingRecord);
            this.logger.log(`Updated record for ${name} on ${latestObs.date}`);
          } else {
            this.logger.log(`No change for ${name} on ${latestObs.date}`);
          }
        } else {
          // Insert new latest record
          await this.dataRepo.save({ name, value, observation_date: observationDate });
          this.logger.log(`Inserted latest record for ${name} on ${latestObs.date}`);
        }
        return; // Success, exit the retry loop
      } catch (error) {
        attempt++;
        this.logger.error(`Error storing ${series_id} data (attempt ${attempt}/${maxRetries}): ${error.message}`);
        
        if (attempt >= maxRetries) {
          this.logger.error(`Failed to store ${series_id} data after ${maxRetries} attempts`);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
}