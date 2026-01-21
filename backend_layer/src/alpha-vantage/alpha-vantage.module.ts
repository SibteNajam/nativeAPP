import { Module } from '@nestjs/common';
import { AlphaVantageController } from './alpha-vantage.controller';
import { AlphaVantageService } from './alpha-vantage.service';

@Module({
  controllers: [AlphaVantageController],
  providers: [AlphaVantageService]
})
export class AlphaVantageModule {}
