import { Module } from '@nestjs/common';
import { SltpWebhookController } from './sltp-webhook.controller';
import { SltpWebhookService } from './sltp-webhook.service';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';
import { BinanceModule } from '../binance/binance.module';
import { BitgetModule } from '../bitget/bitget.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../exchanges-controller/entities/order.entity';
import { GraphWebhookModule } from '../graph-webhook/graph-webhook.module';

/**
 * SLTP Webhook Module
 * 
 * Provides real-time SLTP trigger execution.
 * 
 * Dependencies:
 * - ApicredentialsModule: Get active trading credentials for all users
 * - BinanceModule: Execute sells on Binance
 * - BitgetModule: Execute sells on Bitget
 * - TypeOrmModule: Access Order repository for position tracking
 * - GraphWebhookModule: Notify Graph about closed positions
 * 
 * Endpoint: POST /sltp-webhook
 * 
 * Usage:
 * SF App sends webhook when TP/SL trigger fires → Backend sells for all users
 */
@Module({
    imports: [
        ApicredentialsModule,
        BinanceModule,
        BitgetModule,
        TypeOrmModule.forFeature([Order]),
        GraphWebhookModule,
    ],
    controllers: [SltpWebhookController],
    providers: [SltpWebhookService],
    exports: [SltpWebhookService],
})
export class SltpWebhookModule { }
