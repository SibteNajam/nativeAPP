import { Module } from '@nestjs/common';
import { MexcMarketController } from './mexc-market.controller';
import { MexcMarketService } from './mexc-market.service';

@Module({
  controllers: [MexcMarketController],
  providers: [MexcMarketService]
})
export class MexcMarketModule {}
