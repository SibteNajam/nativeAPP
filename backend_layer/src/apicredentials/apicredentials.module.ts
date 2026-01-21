import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApicredentialsService } from './apicredentials.service';
import { ApicredentialsController } from './apicredentials.controller';
import { ApiCredential } from './entities/api-credential.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  controllers: [ApicredentialsController],
  providers: [ApicredentialsService],
  exports: [ApicredentialsService], // Export so other modules can use it
})
export class ApicredentialsModule {}
