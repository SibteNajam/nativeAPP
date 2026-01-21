import { Module } from '@nestjs/common';
import { MexcAccountController } from './mexc-account.controller';
import { MexcAccountService } from './mexc-account.service';
import { ApicredentialsModule } from '../apicredentials/apicredentials.module';

@Module({
  imports: [ApicredentialsModule],
  controllers: [MexcAccountController],
  providers: [MexcAccountService]
})
export class MexcAccountModule { }
