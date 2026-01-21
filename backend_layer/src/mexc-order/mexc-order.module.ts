import { Module } from '@nestjs/common';
import { MexcOrderService } from './mexc-order.service';
import { MexcOrderController } from './mexc-order.controller';

@Module({
  providers: [MexcOrderService],
  controllers: [MexcOrderController]
})
export class MexcOrderModule {}
