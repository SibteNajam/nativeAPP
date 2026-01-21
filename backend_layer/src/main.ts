// Load .env FIRST before any imports that depend on env vars
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);

  // Global error handlers to prevent crashes
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Apis for indicators')
    .setDescription('all endpoints for binance and bitget indicatores')
    .setVersion('1.0')
    .addTag('binance', 'Binance related endpoints')
    .addBearerAuth() // If you plan to use JWT authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable CORS for frontend - simple array approach
  app.enableCors({
    origin: true, // Allow all origins temporarily to test
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ACCESS-KEY',
      'ACCESS-SIGN',
      'ACCESS-TIMESTAMP',
      'ACCESS-PASSPHRASE',
      'locale',
      'x-api-key',
      'x-secret-key',
      'x-passphrase',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 NestJS is running on http://localhost:${port}`);
  console.log(`📚 Swagger available at http://localhost:${port}/api`);
}
bootstrap();
