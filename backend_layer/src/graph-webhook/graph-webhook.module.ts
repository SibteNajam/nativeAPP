/**
 * Graph Webhook Module
 * 
 * Provides webhook integration between NestJS backend and Python graph orchestrator.
 * 
 * Owner: Salman/Sibt-e-Najam
 * Status: NEW IMPLEMENTATION (10/10 Position Tracking)
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphWebhookService } from './graph-webhook.service';

@Module({
  imports: [ConfigModule],
  providers: [GraphWebhookService],
  exports: [GraphWebhookService],
})
export class GraphWebhookModule {}
