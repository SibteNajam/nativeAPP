import { Module } from '@nestjs/common';
import { GateioOrderController } from './gateio_order.controller';
import { GateioOrderService } from './gateio_order.service';

@Module({
  controllers: [GateioOrderController],
  providers: [GateioOrderService],
  exports: [GateioOrderService],
})
export class GateioOrderModule {}
