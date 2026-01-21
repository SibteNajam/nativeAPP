import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FundFlowDto, LongShortRatioDto, OpenInterestDto } from './dto/gateio.dto';
import { Symbol, GioOpenInterest, MarketType, FundFlowHistorical, FundFlowAnalysis } from './entity/gateio.entity';
import { LongShortExchanges, LongShortOverall } from './entity/longshort.entity';
import  { Timeframe } from './entity/gateio.entity';
@Injectable()
export class GIOMacroDataService {
  private readonly logger = new Logger(GIOMacroDataService.name);

  constructor(
     @InjectRepository(LongShortOverall)
    private longShortOverallRepo: Repository<LongShortOverall>,
    @InjectRepository(LongShortExchanges)
    private longShortExchangesRepo: Repository<LongShortExchanges>,
    @InjectRepository(FundFlowAnalysis)
    private fundFlowAnalysisRepo: Repository<FundFlowAnalysis>,
    @InjectRepository(FundFlowHistorical)
    private fundFlowHistoricalRepo: Repository<FundFlowHistorical>,
    @InjectRepository(Timeframe)
    private timeframeRepo: Repository<Timeframe>,
    @InjectRepository(Symbol)
    private symbolRepo: Repository<Symbol>,
      @InjectRepository(MarketType)
    private marketTypeRepo: Repository<MarketType>,
    @InjectRepository(GioOpenInterest)
    private openInterestRepo: Repository<GioOpenInterest>,
  ) {}

  async saveOpenInterest(dto: OpenInterestDto): Promise<{ insertedCount: number }> {
    let insertedCount = 0;
    console.log('data received in service', dto);
    try {
      // Validate input DTO
      if (!dto.symbol|| !dto.data || !dto.last_updated) {
        this.logger.error('Invalid DTO: missing required fields');
        throw new Error('Invalid DTO: symbol, data, and last_updated are required');
      }

      // Find or create symbol
      let symbol = await this.symbolRepo.findOne({ where: { symbol_name: dto.symbol } });
      if (!symbol) {
        symbol = this.symbolRepo.create({ symbol_name: dto.symbol });
        await this.symbolRepo.save(symbol);
        this.logger.log(`Created new symbol: ${dto.symbol}`);
      }
      // Process each data entry
      for (const item of dto.data) {
        try {
          // Clean and validate data
          const openInterestValue = this.parseOpenInterest(item['Open Interest ($)']);
          const change24hValue = this.parseChange24h(item['Change']);

          if (openInterestValue === null || !item.Exchange) {
            this.logger.warn(`Skipping invalid data for ${dto.symbol}/${item.Exchange}: Open Interest = ${item['Open Interest ($)']}`);
            continue;
          }

          // Check if record exists
          const existingRecord = await this.openInterestRepo.findOne({
            where: {
              symbol: { id: symbol.id },
              exchange: item.Exchange,
              last_updated: new Date(dto.last_updated),
            },
          });

          if (!existingRecord) {
            // i change data type of open intereset and 24hr_change in entity and got eroor in create at symbol fix it  

            // Create new record
            const newRecord = this.openInterestRepo.create({
              symbol: symbol,
              exchange: item.Exchange,
              open_interest: openInterestValue,
              change_24h: change24hValue ?? undefined,
              last_updated: new Date(dto.last_updated),
            });

            await this.openInterestRepo.save(newRecord);
            insertedCount++;
            this.logger.log(`Inserted record for ${dto.symbol}/${item.Exchange}`);
          } else {
            this.logger.log(`Record already exists for ${dto.symbol}/${item.Exchange} on ${dto.last_updated}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to process record for ${dto.symbol}/${item.Exchange}: ${error.message}`);
        }
      }

      return { insertedCount };
    } catch (error) {
      this.logger.error(`Error processing open interest data for ${dto.symbol}: ${error.message}`);
      throw error;
    }
  }

  private parseOpenInterest(value: string): number | null {
    if (!value || value === 'N/A') return null;

    // Handle different formats (e.g., "1.23M", "456.78K", "1234")
    const cleanValue = value.replace(/[^0-9.MK-]/g, '').toUpperCase();
    try {
      if (cleanValue.endsWith('M')) {
        return parseFloat(cleanValue.replace('M', '')) * 1000000;
      } else if (cleanValue.endsWith('K')) {
        return parseFloat(cleanValue.replace('K', '')) * 1000;
      } else {
        return parseFloat(cleanValue);
      }
    } catch {
      return null;
    }
  }

  private parseChange24h(value: string): number | null {
    if (!value || value === 'N/A') return null;

    // Handle percentage (e.g., "+5.23%", "-2.45%", "0%")
    const cleanValue = value.replace('%', '');
    try {
      return parseFloat(cleanValue);
    } catch {
      return null;
    }
  }


  async saveFundFlow(dto: FundFlowDto): Promise<{ analysisInserted: number; historicalInserted: number }> {
    let analysisInserted = 0;
    let historicalInserted = 0;
    console.log('data received in service', dto);
    try {
      // Validate input DTO
      if (!dto.symbol || !dto.market_type || !dto.timeframe || !dto.last_updated) {
        this.logger.error('Invalid DTO: missing required fields');
        throw new Error('Invalid DTO: symbol, market_type, timeframe, and last_updated are required');
      }

      // Find or create symbol
      let symbol = await this.symbolRepo.findOne({ where: { symbol_name: dto.symbol } });
      if (!symbol) {
        symbol = this.symbolRepo.create({ symbol_name: dto.symbol });
        await this.symbolRepo.save(symbol);
        this.logger.log(`Created new symbol: ${dto.symbol}`);
      }

      // Find or create market type
      let marketType = await this.marketTypeRepo.findOne({ where: { name: dto.market_type.toLowerCase() } });
      if (!marketType) {
        marketType = this.marketTypeRepo.create({ name: dto.market_type.toLowerCase() });
        await this.marketTypeRepo.save(marketType);
        this.logger.log(`Created new market type: ${dto.market_type}`);
      }

      // Find or create timeframe
    let timeframe = await this.timeframeRepo.findOne({ where: { timeframe: dto.timeframe } });
if (!timeframe) {
  timeframe = this.timeframeRepo.create({ timeframe: dto.timeframe });
  await this.timeframeRepo.save(timeframe);
  this.logger.log(`Created new timeframe: ${dto.timeframe}`);
}
      // Process analysis data
      if (dto.analysis && dto.analysis.length > 0) {
        for (const analysisItem of dto.analysis) {
          try {
            const newAnalysis = this.fundFlowAnalysisRepo.create({
              symbol,
              marketType,
              timeframe,
              order_size: analysisItem['Order Size'],
              net_inflow: analysisItem['Net Inflow ($)'],
              inflow: analysisItem['Inflow ($)'],
              outflow: analysisItem['Outflow ($)'],
            });

            await this.fundFlowAnalysisRepo.save(newAnalysis);
            analysisInserted++;
            this.logger.log(`Inserted analysis record for ${dto.symbol}/${dto.market_type}/${dto.timeframe}/${analysisItem['Order Size']}`);
          } catch (error) {
            this.logger.warn(`Failed to process analysis record for ${dto.symbol}/${analysisItem['Order Size']}: ${error.message}`);
          }
        }
      }

      // Process historical data
      if (dto.historical && dto.historical.length > 0) {
        for (const historicalItem of dto.historical) {
          try {
            // Check if record with same datetime already exists to avoid duplicates
            const existingHistorical = await this.fundFlowHistoricalRepo.findOne({
              where: {
                symbol: { id: symbol.id },
                marketType: { id: marketType.id },
                timeframe: { id: timeframe.id },
                date_time: historicalItem['Date'],
              },
            });

            if (!existingHistorical) {
              const newHistorical = this.fundFlowHistoricalRepo.create({
                symbol,
                marketType,
                timeframe,
                date_time: historicalItem['Date'],
                inflow: historicalItem['Inflow ($)'],
                outflow: historicalItem['Outflow ($)'],
                net_inflow: historicalItem['Net Inflow ($)'],
              });

              await this.fundFlowHistoricalRepo.save(newHistorical);
              historicalInserted++;
              this.logger.log(`Inserted historical record for ${dto.symbol}/${dto.market_type}/${dto.timeframe}/${historicalItem['Date']}`);
            } else {
              this.logger.log(`Historical record already exists for ${dto.symbol}/${dto.market_type}/${dto.timeframe}/${historicalItem['Date']}`);
            }
          } catch (error) {
            this.logger.warn(`Failed to process historical record for ${dto.symbol}/${historicalItem['Date']}: ${error.message}`);
          }
        }
      }

      return { analysisInserted, historicalInserted };
    } catch (error) {
      this.logger.error(`Error processing fund flow data for ${dto.symbol}: ${error.message}`);
      throw error;
    }
  }








  async saveLongShortRatio(dto: LongShortRatioDto) {
    console.log('data received in service', dto);
    const symbol = await this.getOrCreateSymbol(dto.symbol);
    const timeframe = await this.getOrCreateTimeframe(dto.timeframe);

    // Save overall data
    const longPercent = parseFloat(dto.overall.Long.replace('%', ''));
    const shortPercent = parseFloat(dto.overall.Short.replace('%', ''));

    if (isNaN(longPercent) || isNaN(shortPercent)) {
      throw new Error('Invalid percentage values in overall data');
    }

    // Validate sum (optional, as frontend already checks)
    if (Math.abs(longPercent + shortPercent - 100) > 10) {
      throw new Error('Overall long/short percentages sum is invalid');
    }

    const overallRecord = this.longShortOverallRepo.create({
      symbol,
      timeframe,
      long_percent: longPercent,
      short_percent: shortPercent,
      last_updated: new Date(dto.last_updated),
    });

    const savedOverall = await this.longShortOverallRepo.save(overallRecord);

    // Save exchange data
    const exchangeRecords = dto.table.map((item) => {
      const longVal = parseFloat(item['Long %'].replace('%', ''));
      const shortVal = parseFloat(item['Short %'].replace('%', ''));

      if (isNaN(longVal) || isNaN(shortVal)) {
        throw new Error(`Invalid percentage values for exchange: ${item.Exchange}`);
      }

      // Validate sum (optional)
      if (Math.abs(longVal + shortVal - 100) > 10) {
        throw new Error(`Long/short percentages sum is invalid for exchange: ${item.Exchange}`);
      }

      return this.longShortExchangesRepo.create({
        symbol,
        timeframe,
        exchange: item.Exchange,
        bias: item.Bias,
        long_percent: longVal,
        short_percent: shortVal,
        last_updated: new Date(dto.last_updated),
      });
    });

    const savedExchanges = await this.longShortExchangesRepo.save(exchangeRecords);

    return {
      overallInserted: savedOverall ? 1 : 0,
      exchangesInserted: savedExchanges.length,
    };
  }

  private async getOrCreateSymbol(symbolName: string) {
    let symbol = await this.symbolRepo.findOne({ where: { symbol_name: symbolName.toUpperCase() } });
    if (!symbol) {
      symbol = this.symbolRepo.create({ symbol_name: symbolName.toUpperCase() });
      symbol = await this.symbolRepo.save(symbol);
    }
    return symbol;
  }

  private async getOrCreateTimeframe(timeframeName: string) {
    let timeframe = await this.timeframeRepo.findOne({ where: { timeframe: timeframeName } });
    if (!timeframe) {
      timeframe = this.timeframeRepo.create({ timeframe: timeframeName });
      timeframe = await this.timeframeRepo.save(timeframe);
    }
    return timeframe;
  }
}