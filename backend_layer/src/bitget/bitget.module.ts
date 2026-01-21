import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitgetController } from './controllers/market.controller';
import { BitgetService } from './services/market.service';
import { AccountController } from './controllers/account.controller';
import { AccountService } from './services/account.service';
import { OrderController } from './controllers/orders.controller';
import { OrderService } from './services/orders.service';
import { BitgetGateway } from './websocket/bitget.gateway';
import { OpenOrder } from './entities/open-order.entity';
import { ProcessedOrder } from './entities/processed-order.entity';
import { Order } from '../exchanges-controller/entities/order.entity';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';

@Module({
    imports: [TypeOrmModule.forFeature([OpenOrder, ProcessedOrder, Order]), ApicredentialsModule],
    controllers: [BitgetController, AccountController, OrderController],
    providers: [BitgetService, AccountService, OrderService, BitgetGateway],
    exports: [BitgetService, AccountService, OrderService, BitgetGateway],
})
export class BitgetModule { }