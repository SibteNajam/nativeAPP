import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApicredentialsService } from './apicredentials.service';
import { ApicredentialsController } from './apicredentials.controller';
import { ApiCredential } from './entities/api-credential.entity';
import { CredentialHealthService } from './credential-health.service';

/**
 * API Credentials Module
 * 
 * @Global decorator makes CredentialHealthService available throughout the app
 * without explicit imports - critical for the health tracking singleton pattern.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  controllers: [ApicredentialsController],
  providers: [ApicredentialsService, CredentialHealthService],
  exports: [ApicredentialsService, CredentialHealthService],
})
export class ApicredentialsModule {}
