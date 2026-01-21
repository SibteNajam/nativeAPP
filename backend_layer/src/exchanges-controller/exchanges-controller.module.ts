import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangesControllerService } from './exchanges-controller.service';
import { ExchangesControllerController } from './exchanges-controller.controller';
import { BinanceModule } from '../binance/binance.module';
import { BitgetModule } from '../bitget/bitget.module';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';
import { GraphWebhookModule } from '../graph-webhook/graph-webhook.module';
import { Order } from './entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => BinanceModule),
    BitgetModule,
    ApicredentialsModule,
    GraphWebhookModule,  // SLTP trigger graph updates
  ],
  providers: [ExchangesControllerService],
  controllers: [ExchangesControllerController],
  exports: [ExchangesControllerService],
})
export class ExchangesControllerModule { }
