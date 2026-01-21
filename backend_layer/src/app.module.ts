import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceModule } from './binance/binance.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AlphaVantageModule } from './alpha-vantage/alpha-vantage.module';
import { FredModule } from './fred/fred.module';
import { CryptoPanicService } from './cryptopanic/cryptopanic.service';
import { CryptoPanicController } from './cryptopanic/cryptopanic.controller';
import { CryptopanicModule } from './cryptopanic/cryptopanic.module';
import { HistoricalDataService } from './binance/historical.data.service';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FredIndicatorData } from './fred/entities/fredIndicator.entity';
import { FundFlowAnalysis, FundFlowHistorical, GioOpenInterest, MarketType, Symbol, Timeframe } from './gio_macrodata/entity/gateio.entity';
import { BitgetModule } from './bitget/bitget.module';
import { LongShortExchanges, LongShortOverall } from './gio_macrodata/entity/longshort.entity';
import { BitgetService } from './bitget/services/market.service';
import { ProcessedOrder } from './bitget/entities/processed-order.entity';
import { OpenOrder } from './bitget/entities/open-order.entity';
import { DataSource } from 'typeorm';
import { GIOMacroDataModule } from './gio_macrodata/gio_macrodata.module';
import { GateioMarketModule } from './gio_market/market.module';
import { GateioAccountController } from './gateio_account/gateio_account.controller';
import { GateioAccountService } from './gateio_account/gateio_account.service';
import { GateioAccountModule } from './gateio_account/gateio_account.module';
import { GateioOrderModule } from './gateio_order/gateio_order.module';
import { MexcMarketModule } from './mexc-market/mexc-market.module';
import { MexcAccountModule } from './mexc-account/mexc-account.module';
import { MexcOrderModule } from './mexc-order/mexc-order.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { RefreshToken } from './auth/entities/refreshToken.entity';
import { ApiCredential } from './apicredentials/entities/api-credential.entity';
import { APP_GUARD } from '@nestjs/core';
import { JWTGuard } from './guards/jwt.guard';
import { ApicredentialsModule } from './apicredentials/apicredentials.module';
import { ExchangesControllerModule } from './exchanges-controller/exchanges-controller.module';
import { Order } from './exchanges-controller/entities/order.entity';
import { OrderSyncModule } from './order-sync/order-sync.module';
import { MigrationService } from './migration.service';
import { SltpWebhookModule } from './sltp-webhook/sltp-webhook.module';

const shouldSkipDb = process.env.SKIP_DB === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    // Conditionally include TypeOrmModule and GIOMacroDataModule when DB is enabled
    ...(shouldSkipDb ? [] : [
      GIOMacroDataModule,
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const databaseUrl = configService.get<string>('DATABASE_PUBLIC_URL');

          if (!databaseUrl) {
            throw new Error('DATABASE_PUBLIC_URL is not defined in environment variables');
          }

          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [
              FredIndicatorData,
              Symbol,
              GioOpenInterest,
              Timeframe,
              FundFlowHistorical,
              FundFlowAnalysis,
              MarketType,
              LongShortOverall,
              LongShortExchanges,
              ProcessedOrder,
              OpenOrder,
              User,
              RefreshToken,
              ApiCredential,
              Order
            ],
            synchronize: false,
            ssl: false, // Railway database doesn't require SSL
            logging: ['error'],
            connectTimeoutMS: 10000,
            maxQueryExecutionTime: 5000,
          };
        },
      }),
    ]),
    ScheduleModule.forRoot(),
    BinanceModule,
    AlphaVantageModule,
    FredModule,
    CryptopanicModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    GateioMarketModule,
    BitgetModule,
    GateioAccountModule,
    GateioOrderModule,
    MexcMarketModule,
    MexcAccountModule,
    MexcOrderModule,
    AuthModule,
    UserModule,
    ApicredentialsModule,
    ExchangesControllerModule,
    OrderSyncModule,
    SltpWebhookModule,
  ],
  controllers: [AppController, CryptoPanicController],
  providers: [
    AppService,
    CryptoPanicService,
    HistoricalDataService,
    BitgetService,
    MigrationService,
    // Uncomment to enable JWT authentication globally
    {
      provide: APP_GUARD,
      useClass: JWTGuard,
    },
  ],
})
export class AppModule { }