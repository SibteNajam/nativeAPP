import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BinanceService } from './binance.service';
import { BinanceController } from './binance.controller';
import { BinanceGateway } from './binance.gateway';
import { IndicatorsService } from './indicators.service';
import { CacheService } from './cache.service';
import { ObiService } from './obi.service';
import { BinanceSignedService } from './binance.signed.service';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';
import { ExchangesControllerModule } from '../exchanges-controller/exchanges-controller.module';
import { UserModule } from '../user/user.module';
import { GraphWebhookModule } from '../graph-webhook/graph-webhook.module';
// import { BinanceStreamService } from './binancedb.gateway';
// import { DatabaseService } from './database.service';

@Module({
  imports: [
    HttpModule, 
    ApicredentialsModule,
    forwardRef(() => ExchangesControllerModule),
    UserModule,
    GraphWebhookModule,
  ],
  providers: [BinanceService, IndicatorsService, CacheService, ObiService, BinanceSignedService, BinanceGateway], // , BinanceStreamService
  controllers: [BinanceController],
  exports: [BinanceService, IndicatorsService, CacheService, ObiService, BinanceSignedService, BinanceGateway], // so they can inject each other
})
export class BinanceModule {}
