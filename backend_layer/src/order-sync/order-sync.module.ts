import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { BinanceSyncService } from './binance-sync.service';
import { Order } from '../exchanges-controller/entities/order.entity';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';
import { BinanceModule } from '../binance/binance.module';
import { ExchangesControllerModule } from '../exchanges-controller/exchanges-controller.module';
import { GraphWebhookModule } from '../graph-webhook/graph-webhook.module';

/**
 * Order Sync Module
 * 
 * Handles synchronization of order statuses between our database and exchanges.
 * Currently supports Binance, with structure ready for future exchange additions.
 * 
 * Features:
 * - Startup sync: Checks all unfilled orders on backend startup
 * - Periodic sync: Runs every 5 minutes as safety net
 * - Multi-user support: Fetches credentials per user from api_credentials table
 * - Handles filled orders: Updates DB and cancels sibling TP/SL orders
 * - Real-time position tracking: Sends webhooks to Python graph orchestrator
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Order]),
        ApicredentialsModule,
        forwardRef(() => BinanceModule),
        forwardRef(() => ExchangesControllerModule),
        GraphWebhookModule,
    ],
    // providers: [BinanceSyncService],
    // exports: [BinanceSyncService],
})
export class OrderSyncModule { }
