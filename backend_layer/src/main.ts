// Load .env FIRST before any imports that depend on env vars
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // -----------------------------
  // 1️⃣ TRUST PROXY (Critical)
  // -----------------------------
  // Lets NestJS know it's behind a reverse proxy (Coolify)
  // Must access underlying Express instance via getHttpAdapter()
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // -----------------------------
  // 2️⃣ ENABLE CORS
  // -----------------------------
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['*'], // Include your Coolify domain
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

  // -----------------------------
  // 3️⃣ DNS OVERRIDE (Optional)
  // -----------------------------
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']); // Only affects outgoing requests

  // -----------------------------
  // 4️⃣ GLOBAL ERROR HANDLERS
  // -----------------------------
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  // -----------------------------
  // 5️⃣ SWAGGER CONFIGURATION
  // -----------------------------
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Apis for indicators')
    .setDescription('All endpoints for Binance and Bitget indicators')
    .setVersion('1.0')
    .addTag('binance', 'Binance related endpoints')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Force Swagger to use HTTPS for production domain
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  swaggerDocument.servers = [
    { url: backendUrl },
  ];

  SwaggerModule.setup('api', app, swaggerDocument);

  // -----------------------------
  // 6️⃣ SERVER PORT & TIMEOUT
  // -----------------------------
  const port = process.env.PORT ?? 3000;
  const server = await app.listen(port, '0.0.0.0');

  // Increase HTTP server timeout (important for long-running requests)
  server.setTimeout(5 * 60 * 1000); // 5 minutes

  // -----------------------------
  // 7️⃣ LOGS
  // -----------------------------
  console.log(`🚀 NestJS is running on http://localhost:${port}`);
  console.log(`📚 Swagger available at ${backendUrl}/api`);
}

bootstrap();