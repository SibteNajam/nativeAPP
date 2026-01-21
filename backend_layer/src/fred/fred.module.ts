import { Module } from '@nestjs/common';
import { FredController } from './fred.controller';
import { FredService } from './fred.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FredIndicatorData } from './entities/fredIndicator.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([FredIndicatorData]) // 👈 add this
  ],
  controllers: [FredController],
  providers: [FredService]
})
export class FredModule {}
