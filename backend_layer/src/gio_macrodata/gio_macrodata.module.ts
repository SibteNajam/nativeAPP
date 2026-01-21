import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GateIoMacroDataController } from './gio_macrodata.controller';
import { GIOMacroDataService } from './gio_macrodata.service';
import { FundFlowAnalysis, FundFlowHistorical, GioOpenInterest, MarketType, Symbol, Timeframe } from './entity/gateio.entity';
import { LongShortExchanges, LongShortOverall } from './entity/longshort.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Symbol,
      GioOpenInterest,
      FundFlowHistorical,
      FundFlowAnalysis,
      Timeframe,
      MarketType,
      LongShortOverall,
      LongShortExchanges,
    ]),
  ],
  controllers: [GateIoMacroDataController],
  providers: [GIOMacroDataService],
  exports: [GIOMacroDataService],
})
export class GIOMacroDataModule {}
