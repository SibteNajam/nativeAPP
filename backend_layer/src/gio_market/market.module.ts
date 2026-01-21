import { Module } from '@nestjs/common';
import { GateioMarketController } from './market.controller';
import { GateioMarketService } from './market.service';

@Module({
  controllers: [GateioMarketController],
  providers: [GateioMarketService],
  exports: [GateioMarketService],
})
export class GateioMarketModule {}
