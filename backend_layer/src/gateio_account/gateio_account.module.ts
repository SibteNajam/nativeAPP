import { Module } from '@nestjs/common';
import { GateioAccountController } from './gateio_account.controller';
import { GateioAccountService } from './gateio_account.service';

@Module({
	controllers: [GateioAccountController],
	providers: [GateioAccountService],
	exports: [GateioAccountService],
})
export class GateioAccountModule {}
