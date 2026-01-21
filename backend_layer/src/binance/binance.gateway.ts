import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import { Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceSignedService } from './binance.signed.service';
import { ConfigService } from '@nestjs/config';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { ExchangesControllerService } from '../exchanges-controller/exchanges-controller.service';
import { GraphWebhookService } from '../graph-webhook/graph-webhook.service';
import * as crypto from 'crypto';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://146.59.93.94:3002',
      'http://146.59.93.94:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BinanceGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(BinanceGateway.name);

  // ========================================
  // PUBLIC MARKET DATA STREAM (Multi-User)
  // Single shared WebSocket connection for all users
  // Each user can subscribe to exactly one symbol at a time
  // ========================================

  /** Shared WebSocket connection to Binance combined stream */
  private binanceWs: WebSocket;

  /** Currently active streams on the shared WebSocket (e.g., 'btcusdt@ticker', 'btcusdt@kline_1m') */
  private currentSubscriptions: Set<string> = new Set();

  /** Reconnection tracking for the shared WebSocket */
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  /** 
   * Per-client symbol subscription tracking
   * Maps client.id → symbol (uppercase, e.g., 'BTCUSDT')
   * Each client can have exactly ONE active symbol subscription at a time
   * When client subscribes to a new symbol, it replaces their previous subscription
   */
  private clientSymbolSubscriptions: Map<string, string> = new Map();

  /** 
   * Default kline interval for all public stream subscriptions
   * All users share the same interval for simplicity
   */
  private readonly DEFAULT_KLINE_INTERVAL = '1m';

  // Track active subscribers (legacy - kept for backward compatibility)
  private subscribers: Set<string> = new Set(); // client IDs subscribed to data

  // Multi-user WebSocket connection manager
  // Each user with activeTrading = true gets their own WebSocket connection
  private readonly BASE_URL = 'https://api.binance.com';

  // Structure to hold each user's WebSocket connection data
  private userConnections: Map<string, {
    userId: string;
    apiKey: string;
    secretKey: string;
    listenKey: string | null;
    websocket: WebSocket | null;
    listenKeyRefreshInterval: NodeJS.Timeout | null;
    reconnectAttempts: number;
  }> = new Map();

  private readonly maxReconnectAttemptsPerUser = 5;

  constructor(
    private readonly binanceService: BinanceService,
    private readonly binanceSignedService: BinanceSignedService,
    private readonly configService: ConfigService,
    private readonly apicredentialsService: ApicredentialsService,
    @Inject(forwardRef(() => ExchangesControllerService))
    private readonly exchangesService: ExchangesControllerService,
    private readonly graphWebhookService: GraphWebhookService,

  ) { }

  async onModuleInit() {
    this.logger.log('🚀 Binance Gateway Module Initializing...');
    // Auto-connect User Data Streams for all active trading users
    await this.initializeMultiUserConnections();
  }

  afterInit(server: Server) {
    this.logger.log('🚀 Binance WebSocket Gateway initialized (ready for subscriptions)');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection_status', {
      status: 'connected',
      message: 'Welcome! Binance WebSocket is ready.',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from active subscriptions
    if (this.clientSymbolSubscriptions.has(client.id)) {
      const symbol = this.clientSymbolSubscriptions.get(client.id);
      this.clientSymbolSubscriptions.delete(client.id);
      this.logger.log(`Removed subscription for client ${client.id} (Symbol: ${symbol})`);

      // Recalculate and update streams
      this.recalculateAndRefreshSubscriptions();
    }

    // Legacy cleanup (if needed)
    this.subscribers.delete(client.id);

    // If no clients left, we might strictly want to disconnect, 
    // but with the new logic, updateSubscription([]) will handle clearing streams.
    // If you want to close the connection completely when empty:
    if (this.clientSymbolSubscriptions.size === 0) {
      this.disconnectBinance();
    }
  }

  @SubscribeMessage('subscribe_symbol_with_indicators')
  async handleSubscribeSymbolWithIndicators(
    @MessageBody() data: { symbol: string; interval: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { symbol, interval, limit = 100 } = data;
    // We force the default interval for the public stream sharing (as per requirements)
    // But we use the requested interval for the initial historical fetch.
    const streamInterval = this.DEFAULT_KLINE_INTERVAL;

    // const klineStream = `${symbol.toLowerCase()}@kline_${streamInterval}`;
    // const tickerStream = `${symbol.toLowerCase()}@ticker`;

    try {
      // 1. Update client subscription tracking
      // If client was subscribed to something else, this overwrites it (perfect).
      this.clientSymbolSubscriptions.set(client.id, symbol.toUpperCase());
      this.logger.log(`Client ${client.id} subscribed to ${symbol.toUpperCase()}`);

      // 2. Fetch fresh historical data (only for this user)
      const historicalData = await this.binanceService.getCandlesWithIndicators(
        symbol.toUpperCase(),
        interval, // Use requested interval for history
        limit
      );

      client.emit('historical_candles_with_indicators', {
        symbol: symbol.toUpperCase(),
        interval,
        data: historicalData,
        count: historicalData.length,
        timestamp: new Date().toISOString()
      });

      // 3. Get fresh ticker data (only for this user)
      const tickerData = await this.binanceService.getCoinInfo(symbol);

      client.emit('ticker_data', {
        symbol: symbol.toUpperCase(),
        ticker: {
          symbol: tickerData.symbol,
          priceChange: tickerData.priceChange24h.toString(),
          priceChangePercent: tickerData.priceChangePercent24h.toString(),
          lastPrice: tickerData.currentPrice.toString(),
          highPrice: tickerData.highPrice24h.toString(),
          lowPrice: tickerData.lowPrice24h.toString(),
          openPrice: tickerData.openPrice24h.toString(),
          volume: tickerData.volume24h.toString(),
          quoteVolume: tickerData.volumeUSDT.toString(),
          bidPrice: tickerData.bidPrice.toString(),
          askPrice: tickerData.askPrice.toString(),
          count: tickerData.trades24h
        },
        timestamp: new Date().toISOString()
      });

      // 4. Update Global Streams
      // Recalculate what we need from Binance based on ALL connected clients
      this.recalculateAndRefreshSubscriptions();

      client.emit('subscription_status', {
        symbol,
        interval,
        status: 'subscribed',
        withIndicators: true,
        // streams: [klineStream, tickerStream], // Internal detail, maybe not needed by client
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Error handling subscription with indicators for ${client.id}: ${error.message}`);
      client.emit('subscription_error', {
        symbol,
        interval,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private connectBinance() {
    // Only connect if we have streams to subscribe to
    if (this.currentSubscriptions.size === 0) {
      return;
    }

    const streams = Array.from(this.currentSubscriptions);
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;

    this.logger.log(`Connecting to Binance Public Stream with ${streams.length} streams...`);

    this.binanceWs = new WebSocket(wsUrl);

    this.binanceWs.on('open', () => {
      this.logger.log(`链 Connected to Binance Combined Stream (${streams.length} active streams)`);
      this.reconnectAttempts = 0;
      this.server.emit('binance_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    this.binanceWs.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const eventSymbol = data.s; // Symbol from message inside (e.g., 'BTCUSDT')

        // Filter: Route message ONLY to interested clients
        if (!eventSymbol) return;

        // Find all clientIds that are subscribed to this symbol
        const interestedClientIds: string[] = [];
        for (const [clientId, subscribedSymbol] of this.clientSymbolSubscriptions.entries()) {
          if (subscribedSymbol === eventSymbol) {
            interestedClientIds.push(clientId);
          }
        }

        if (interestedClientIds.length === 0) return; // No one cares about this update

        if (data.e === 'kline') {
          const klineData = data.k;
          const interval = klineData.i;

          // Payload
          const payloadRaw = {
            symbol: eventSymbol,
            kline: klineData,
            timestamp: new Date().toISOString()
          };

          // Emit raw kline data to interested clients
          interestedClientIds.forEach(id => this.server.to(id).emit('kline_data', payloadRaw));

          // Calculate indicators for everyone? 
          // Note: Indicator calculation is expensive. 
          // If 100 users are on BTC, we calculate ONCE, then emit to 100 users.
          try {
            const candleWithIndicators = await this.binanceService.calculateIndicatorsForSingleCandle(
              eventSymbol,
              interval,
              klineData
            );

            const payloadIndicators = {
              symbol: eventSymbol,
              interval: interval,
              candle: candleWithIndicators,
              isClosed: klineData.x,
              timestamp: new Date().toISOString()
            };

            // Emit to interested clients
            interestedClientIds.forEach(id => this.server.to(id).emit('kline_with_indicators', payloadIndicators));

          } catch (indicatorError) {
            this.logger.error(`Error calculating indicators for ${eventSymbol}: ${indicatorError.message}`);
          }

        } else if (data.e === '24hrTicker') {
          const payloadTicker = {
            symbol: data.s,
            ticker: {
              symbol: data.s,
              priceChange: data.p,
              priceChangePercent: data.P,
              lastPrice: data.c,
              highPrice: data.h,
              lowPrice: data.l,
              openPrice: data.o,
              volume: data.v,
              quoteVolume: data.q,
              bidPrice: data.b || '0',
              askPrice: data.a || '0',
              count: data.n
            },
            timestamp: new Date().toISOString()
          };

          // Emit to interested clients
          interestedClientIds.forEach(id => this.server.to(id).emit('ticker_data', payloadTicker));
        }
      } catch (err) {
        this.logger.error('Error parsing Binance message', err);
      }
    });

    this.binanceWs.on('close', (code, reason) => {
      this.logger.warn(`Binance WS closed. Code: ${code}`);
      this.server.emit('binance_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
      // Don't auto reconnect recursively if we are just closing to update streams.
      // Reconnection logic is handled in handleReconnect or manual re-connect.
      if (this.currentSubscriptions.size > 0) {
        this.handleReconnect();
      }
    });

    this.binanceWs.on('error', (err) => {
      this.logger.error('Binance WS error', err);
      this.server.emit('binance_connection_status', {
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private disconnectBinance() {
    if (this.binanceWs) {
      this.binanceWs.close();
      this.binanceWs = null;
      this.currentSubscriptions.clear();
      this.logger.log('Disconnected from Binance WebSocket');

      this.server.emit('binance_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Helper to recalculate all needed streams based on active client subscriptions
   * and update the Binance WebSocket efficiently.
   */
  private recalculateAndRefreshSubscriptions() {
    const neededStreams = new Set<string>();

    for (const symbol of this.clientSymbolSubscriptions.values()) {
      const lowerSymbol = symbol.toLowerCase();
      // Add both ticker and kline for this symbol
      neededStreams.add(`${lowerSymbol}@ticker`);
      neededStreams.add(`${lowerSymbol}@kline_${this.DEFAULT_KLINE_INTERVAL}`);
    }

    // Convert to array
    const newStreamList = Array.from(neededStreams);
    this.updateSubscription(newStreamList);
  }

  /**
   * Efficiently update Binance subscriptions (SUBSCRIBE new, UNSUBSCRIBE old)
   * Avoids full reconnection if possible.
   */
  private updateSubscription(desiredStreams: string[]) {
    const desiredSet = new Set(desiredStreams);
    const splitNeeded = desiredStreams.length > 0;

    // If no streams needed, just close
    if (desiredStreams.length === 0) {
      if (this.binanceWs) {
        this.logger.log('No active streams needed. Closing Binance connection.');
        this.disconnectBinance();
      }
      return;
    }

    // If not connected, connect with new list
    if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
      this.currentSubscriptions.clear();
      desiredStreams.forEach(s => this.currentSubscriptions.add(s));
      this.connectBinance();
      return;
    }

    // If connected, calculate diff
    const toSubscribe: string[] = [];
    const toUnsubscribe: string[] = [];

    // Check what needs to be added
    for (const stream of desiredStreams) {
      if (!this.currentSubscriptions.has(stream)) {
        toSubscribe.push(stream);
      }
    }

    // Check what needs to be removed
    for (const stream of this.currentSubscriptions) {
      if (!desiredSet.has(stream)) {
        toUnsubscribe.push(stream);
      }
    }

    if (toSubscribe.length === 0 && toUnsubscribe.length === 0) {
      // Nothing to do
      return;
    }

    this.logger.log(`Updating streams: +${toSubscribe.length} adding, -${toUnsubscribe.length} removing`);

    // Send UNSUBSCRIBE for removed streams
    if (toUnsubscribe.length > 0) {
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: toUnsubscribe,
        id: Date.now()
      };
      this.binanceWs.send(JSON.stringify(unsubscribeMessage));
      toUnsubscribe.forEach(s => this.currentSubscriptions.delete(s));
    }

    // Send SUBSCRIBE for new streams
    if (toSubscribe.length > 0) {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: toSubscribe,
        id: Date.now() + 1
      };
      this.binanceWs.send(JSON.stringify(subscribeMessage));
      toSubscribe.forEach(s => this.currentSubscriptions.add(s));
    }
  }

  private reconnectWithNewStream() {
    if (this.binanceWs) {
      this.binanceWs.close();
    }

    this.connectBinance();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      this.logger.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        this.reconnectWithNewStream();
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.server.emit('binance_connection_status', {
        status: 'max_reconnect_attempts_reached',
        timestamp: new Date().toISOString()
      });
    }
  }



  /**
   * ========================================
   * MULTI-USER DATA STREAM (Order Updates)
   * Each user with activeTrading=true gets their own WebSocket connection
   * ========================================
   */

  /**
   * Initialize WebSocket connections for all active trading users
   * Called on module init to connect all users with activeTrading=true
   */
  private async initializeMultiUserConnections(): Promise<void> {
    try {
      this.logger.log('🔍 Fetching all active trading credentials from database...');

      // Get all users with activeTrading = true (Binance only for now)
      const activeTradingCredentials = await this.apicredentialsService.getActiveTradingCredentials();

      // Filter only Binance credentials
      const binanceCredentials = activeTradingCredentials.filter(
        cred => cred.exchange === 'binance'
      );

      if (binanceCredentials.length === 0) {
        this.logger.warn('⚠️ No active trading credentials found for Binance. No WebSocket connections will be opened.');
        this.logger.log('💡 To enable: Set activeTrading=true for users in api_credentials table');
        return;
      }

      this.logger.log(`📊 Found ${binanceCredentials.length} active trading user(s) for Binance`);

      // Connect each user
      for (const credential of binanceCredentials) {
        await this.connectUserDataStreamForUser(
          credential.userId,
          credential.apiKey,
          credential.secretKey
        );
      }

      this.logger.log(`✅ Initialized ${this.userConnections.size} WebSocket connection(s) for active trading users`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize multi-user connections: ${error.message}`);
    }
  }

  /**
   * Create a new listenKey for a specific user
   */
  private async createListenKeyForUser(userId: string, apiKey: string): Promise<string | null> {
    try {
      if (!apiKey) {
        this.logger.error(`❌ [User ${userId.substring(0, 8)}...] API key missing. Cannot create listenKey.`);
        return null;
      }

      const axios = require('axios');
      const response = await axios.post(
        `${this.BASE_URL}/api/v3/userDataStream`,
        null,
        {
          headers: {
            'X-MBX-APIKEY': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000,
        }
      );

      const listenKey = response.data.listenKey;
      this.logger.log(`✅ [User ${userId.substring(0, 8)}...] Created listenKey: ${listenKey.substring(0, 10)}...`);
      return listenKey;
    } catch (error) {
      this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Failed to create listenKey: ${error.response?.data?.msg || error.message}`);
      if (error.response?.data) {
        this.logger.error(`   Binance Error Details:`, error.response.data);
      }
      return null;
    }
  }

  /**
   * Keep-alive listenKey for a specific user (must be called every 30-60 minutes)
   */
  private async keepAliveListenKeyForUser(userId: string): Promise<void> {
    const connection = this.userConnections.get(userId);

    if (!connection || !connection.apiKey || !connection.listenKey) {
      return;
    }

    try {
      const axios = require('axios');
      await axios.put(
        `${this.BASE_URL}/api/v3/userDataStream?listenKey=${connection.listenKey}`,
        null,
        {
          headers: {
            'X-MBX-APIKEY': connection.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000,
        }
      );

      this.logger.log(`🔄 [User ${userId.substring(0, 8)}...] listenKey refreshed`);
    } catch (error) {
      this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Failed to refresh listenKey: ${error.message}`);
      // Try to reconnect if refresh fails
      await this.reconnectUserDataStreamForUser(userId);
    }
  }

  /**
   * Close/delete listenKey for a specific user
   */
  private async closeListenKeyForUser(userId: string): Promise<void> {
    const connection = this.userConnections.get(userId);

    if (!connection || !connection.apiKey || !connection.listenKey) {
      return;
    }

    try {
      const axios = require('axios');
      await axios.delete(
        `${this.BASE_URL}/api/v3/userDataStream?listenKey=${connection.listenKey}`,
        {
          headers: {
            'X-MBX-APIKEY': connection.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000,
        }
      );

      this.logger.log(`✅ [User ${userId.substring(0, 8)}...] listenKey closed`);
    } catch (error) {
      this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Failed to close listenKey: ${error.message}`);
    }
  }

  /**
   * Connect to Binance User Data Stream WebSocket for a specific user
   */
  private async connectUserDataStreamForUser(userId: string, apiKey: string, secretKey: string): Promise<void> {
    try {
      this.logger.log(`🔌 [User ${userId.substring(0, 8)}...] Connecting to Binance User Data Stream...`);

      // Create listenKey
      const listenKey = await this.createListenKeyForUser(userId, apiKey);

      if (!listenKey) {
        this.logger.warn(`⚠️ [User ${userId.substring(0, 8)}...] Cannot connect without listenKey`);
        return;
      }

      // Connect WebSocket
      const wsUrl = `wss://stream.binance.com:9443/ws/${listenKey}`;
      const userWs = new WebSocket(wsUrl);

      // Store connection info in the map
      const connectionInfo = {
        userId,
        apiKey,
        secretKey,
        listenKey,
        websocket: userWs,
        listenKeyRefreshInterval: null as NodeJS.Timeout | null,
        reconnectAttempts: 0,
      };

      this.userConnections.set(userId, connectionInfo);

      userWs.on('open', () => {
        this.logger.log(`🔗 [User ${userId.substring(0, 8)}...] WebSocket connected`);

        const conn = this.userConnections.get(userId);
        if (conn) {
          conn.reconnectAttempts = 0;
        }

        // Emit connection status to clients
        if (this.server) {
          this.server.emit('user_data_stream_status', {
            userId,
            status: 'connected',
            timestamp: new Date().toISOString()
          });
        }
      });

      userWs.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          // Add userId to the data for tracking which user this update belongs to
          this.handleUserDataMessage(data, userId);
        } catch (err) {
          this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Error parsing message`, err);
        }
      });

      userWs.on('close', (code, reason) => {
        this.logger.warn(`⚠️ [User ${userId.substring(0, 8)}...] WebSocket closed. Code: ${code}, Reason: ${reason}`);

        if (this.server) {
          this.server.emit('user_data_stream_status', {
            userId,
            status: 'disconnected',
            timestamp: new Date().toISOString()
          });
        }

        // Auto-reconnect
        this.reconnectUserDataStreamForUser(userId);
      });

      userWs.on('error', (err) => {
        this.logger.error(`❌ [User ${userId.substring(0, 8)}...] WebSocket error`, err);

        if (this.server) {
          this.server.emit('user_data_stream_status', {
            userId,
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Start listenKey refresh interval (every 30 minutes)
      const refreshInterval = setInterval(() => {
        this.keepAliveListenKeyForUser(userId);
      }, 30 * 60 * 1000); // 30 minutes

      const conn = this.userConnections.get(userId);
      if (conn) {
        conn.listenKeyRefreshInterval = refreshInterval;
      }

    } catch (error) {
      this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Failed to connect: ${error.message}`);
    }
  }

  /**
   * Reconnect User Data Stream for a specific user
   */
  private async reconnectUserDataStreamForUser(userId: string): Promise<void> {
    const connection = this.userConnections.get(userId);

    if (!connection) {
      this.logger.warn(`⚠️ [User ${userId.substring(0, 8)}...] No connection info found for reconnect`);
      return;
    }

    if (connection.reconnectAttempts >= this.maxReconnectAttemptsPerUser) {
      this.logger.error(`❌ [User ${userId.substring(0, 8)}...] Max reconnection attempts reached`);
      return;
    }

    connection.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts), 30000);

    this.logger.log(
      `🔄 [User ${userId.substring(0, 8)}...] Reconnecting (${connection.reconnectAttempts}/${this.maxReconnectAttemptsPerUser}) in ${delay}ms`
    );

    setTimeout(async () => {
      // Close old connection
      if (connection.websocket) {
        connection.websocket.close();
      }

      // Clear old refresh interval
      if (connection.listenKeyRefreshInterval) {
        clearInterval(connection.listenKeyRefreshInterval);
      }

      // Close old listenKey
      await this.closeListenKeyForUser(userId);

      // Reconnect with stored credentials
      await this.connectUserDataStreamForUser(
        userId,
        connection.apiKey,
        connection.secretKey
      );
    }, delay);
  }

  /**
   * Disconnect a specific user's WebSocket connection
   */
  private async disconnectUserDataStreamForUser(userId: string): Promise<void> {
    const connection = this.userConnections.get(userId);

    if (!connection) {
      return;
    }

    this.logger.log(`🔌 [User ${userId.substring(0, 8)}...] Disconnecting WebSocket...`);

    // Clear refresh interval
    if (connection.listenKeyRefreshInterval) {
      clearInterval(connection.listenKeyRefreshInterval);
    }

    // Close WebSocket
    if (connection.websocket) {
      connection.websocket.close();
    }

    // Close listenKey
    await this.closeListenKeyForUser(userId);

    // Remove from map
    this.userConnections.delete(userId);

    this.logger.log(`✅ [User ${userId.substring(0, 8)}...] Disconnected`);
  }

  /**
   * Disconnect all user WebSocket connections
   */
  private async disconnectAllUserDataStreams(): Promise<void> {
    this.logger.log(`🔌 Disconnecting all ${this.userConnections.size} user WebSocket connections...`);

    const userIds = Array.from(this.userConnections.keys());

    for (const userId of userIds) {
      await this.disconnectUserDataStreamForUser(userId);
    }

    this.logger.log('✅ All user WebSocket connections closed');
  }

  /**
   * Handle User Data Stream messages (order updates, balance updates, etc.)
   * Now includes userId to track which user the update belongs to
   */
  private handleUserDataMessage(data: any, userId?: string): void {
    const eventType = data.e;
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '';

    switch (eventType) {
      case 'executionReport':
        this.handleOrderUpdate(data, userId);
        break;

      case 'outboundAccountPosition':
        this.handleBalanceUpdate(data, userId);
        break;

      case 'balanceUpdate':
        this.handleBalanceUpdate(data, userId);
        break;

      case 'listStatus':
        this.handleListStatusUpdate(data, userId);
        break;

      default:
        this.logger.debug(`📩 ${userLabel} User Data Event: ${eventType}`);
        break;
    }
  }

  /**
   * Handle order execution reports (NEW, FILLED, CANCELED, etc.)
   * @param userId - Optional user ID for multi-user tracking
   */
  /**
   * Handle order execution reports (NEW, FILLED, CANCELED, etc.)
   * @param userId - Optional user ID for multi-user tracking
   */
  private async handleOrderUpdate(data: any, userId?: string): Promise<void> {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '';
    const orderStatus = data.X; // Order status: NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED, EXPIRED
    const symbol = data.s;
    const side = data.S;
    const orderType = data.o;
    const orderId = data.i;
    const clientOrderId = data.c;
    const price = data.p;
    const quantity = data.q;
    const executedQty = data.z;
    const cumulativeQuoteQty = data.Z;
    const orderTime = new Date(data.O).toISOString();
    const transactionTime = data.T; // Keep as number (timestamp)

    // ========================================
    // SKIP OCO ORDERS - DO NOT SAVE TO DATABASE
    // ========================================
    // OCO orders have orderListId (data.g) or listClientOrderId (data.C)
    // These are automatically placed by Binance or external systems
    // We don't want to track them in our database
    const isOcoOrder = data.g !== undefined && data.g !== -1; // orderListId exists and is not -1

    if (isOcoOrder) {
      this.logger.log(
        `🚫 ${userLabel} SKIPPING OCO ORDER (not saving to DB): ${symbol} ${side} ${orderType} | ` +
        `OrderID: ${orderId} | ListID: ${data.g} | Status: ${orderStatus}`
      );
      // Still emit to connected clients for monitoring
      if (this.server) {
        this.server.emit('order_update', {
          status: orderStatus,
          symbol,
          side,
          orderType,
          orderId,
          clientOrderId,
          price,
          quantity,
          executedQty,
          cumulativeQuoteQty,
          orderTime,
          transactionTime: new Date(transactionTime).toISOString(),
          timestamp: new Date().toISOString(),
          isOcoOrder: true,
          orderListId: data.g,
          rawData: data
        });
      }
      return; // Exit early, don't save to database
    }

    // Log order status changes
    const statusEmoji = {
      'NEW': '🆕',
      'PARTIALLY_FILLED': '⏳',
      'FILLED': '✅',
      'CANCELED': '❌',
      'REJECTED': '🚫',
      'EXPIRED': '⏰'
    };

    const emoji = statusEmoji[orderStatus] || '📦';

    this.logger.log(
      `${emoji} ${userLabel} ORDER ${orderStatus}: ${symbol} ${side} ${orderType} | ` +
      `OrderID: ${orderId} | Price: ${price} | Qty: ${executedQty}/${quantity} | ` +
      `Total: ${cumulativeQuoteQty} USDT`
    );

    // Emit to connected clients
    if (this.server) {
      this.server.emit('order_update', {
        status: orderStatus,
        symbol,
        side,
        orderType,
        orderId,
        clientOrderId,
        price,
        quantity,
        executedQty,
        cumulativeQuoteQty,
        orderTime,
        transactionTime: new Date(transactionTime).toISOString(),
        timestamp: new Date().toISOString(),
        rawData: data
      });
    }

    if (orderStatus === 'FILLED') {
      let fillPrice = parseFloat(data.L); // Last executed price from event
      if (isNaN(fillPrice) || fillPrice === 0) {
        // Fallback: Calculate from executed quantity and quote quantity
        const quoteQty = parseFloat(cumulativeQuoteQty);
        const baseQty = parseFloat(executedQty);
        if (baseQty > 0) {
          fillPrice = quoteQty / baseQty;
          this.logger.log(`📊 Calculated average fill price: ${fillPrice} (${quoteQty} USDT / ${baseQty})`);
        }
      }

      // Update order status in database with fill price for PnL
      try {
        const updatedOrder = await this.exchangesService.updateOrderStatus(
          parseInt(orderId),
          'BINANCE',
          'FILLED',
          executedQty,
          transactionTime,
          userId,
          fillPrice > 0 ? fillPrice : undefined
        );
        this.logger.log(`✅ ${userLabel} Updated order ${orderId} status to FILLED in database`);

        // Send real-time webhook to Python orchestrator for position tracking
        // CRITICAL: This enables duplicate trade prevention in Neo4j graph
        if (updatedOrder && updatedOrder.orderRole === 'ENTRY') {
          try {
            await this.graphWebhookService.notifyPositionOpened({
              orderId: String(orderId),
              symbol: symbol,
              side: side as 'BUY' | 'SELL',
              avgPrice: fillPrice,
              filledQty: parseFloat(executedQty),
              timestamp: new Date(transactionTime),
              exchange: 'BINANCE',
              finalSignalId: (updatedOrder as any).metadata?.finalSignalId,
              portfolioId: userId ? `Portfolio:${userId}` : undefined,
            });
            this.logger.log(`📡 ${userLabel} Real-time webhook sent: Position opened for ${symbol} @ ${fillPrice}`);
          } catch (webhookError) {
            // Don't fail order processing if webhook fails
            this.logger.error(`❌ ${userLabel} Webhook failed (non-blocking): ${webhookError.message}`);
          }
        }
      } catch (dbError) {
        this.logger.error(`❌ Failed to update order status in DB: ${dbError.message}`);
      }

    } else if (orderStatus === 'CANCELED' || orderStatus === 'EXPIRED' || orderStatus === 'REJECTED') {
      // Update order status in database
      try {
        await this.exchangesService.updateOrderStatus(
          parseInt(orderId),
          'BINANCE',
          orderStatus,
          executedQty,
          transactionTime,
          userId,
        );
        this.logger.log(`✅ ${userLabel} Updated order ${orderId} status to ${orderStatus} in database`);
      } catch (dbError) {
        this.logger.error(`❌ Failed to update order status in DB: ${dbError.message}`);
      }
    } else if (orderStatus === 'NEW') {
      // Just log, effectively done above
    }
  }

  /**
   * Handle balance updates
   * @param userId - Optional user ID for multi-user tracking
   */
  private handleBalanceUpdate(data: any, userId?: string): void {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '';
    this.logger.log(`💵 Balance Update: ${JSON.stringify(data)}`);

    if (this.server) {
      this.server.emit('balance_update', {
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle OCO/OTOCO list status updates
   * @param userId - Optional user ID for multi-user tracking
   */
  private handleListStatusUpdate(data: any, userId?: string): void {
    const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '';
    const listOrderStatus = data.L;
    const symbol = data.s;
    const orderListId = data.g;
    const contingencyType = data.c;

    this.logger.log(
      `📋 LIST STATUS: ${contingencyType} | ListID: ${orderListId} | Status: ${listOrderStatus} | Symbol: ${symbol}`
    );

    if (this.server) {
      this.server.emit('list_status_update', {
        listOrderStatus,
        symbol,
        orderListId,
        contingencyType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }


  /**
   * Cleanup on gateway destruction
   */
  async onModuleDestroy() {
    this.logger.log('🛑 Binance Gateway shutting down...');

    // Disconnect all user WebSocket connections
    await this.disconnectAllUserDataStreams();

    // Close market data stream
    if (this.binanceWs) {
      this.binanceWs.close();
    }

    this.logger.log('✅ Binance Gateway shutdown complete');
  }
}