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
import { Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Order } from '../../exchanges-controller/entities/order.entity';
import { ApicredentialsService } from '../../apicredentials/apicredentials.service';

interface BitgetTickerData {
  instId: string;
  lastPr: string;
  open24h: string;
  high24h: string;
  low24h: string;
  change24h: string;
  bidPr: string;
  askPr: string;
  bidSz: string;
  askSz: string;
  baseVolume: string;
  quoteVolume: string;
  ts: string;
  openUtc: string;
  changeUtc24h: string;
}

interface BitgetOrderData {
  instId: string;
  orderId: string;
  clientOid: string;
  price?: string;
  size: string;
  newSize: string;
  notional: string;
  orderType: string;
  force: string;
  side: string;
  fillPrice: string;
  tradeId: string;
  baseVolume: string;
  fillTime: string;
  fillFee: string;
  fillFeeCoin: string;
  tradeScope: string;
  accBaseVolume: string;
  priceAvg: string;
  status: string;
  cTime: string;
  uTime: string;
  stpMode: string;
  feeDetail: Array<{
    feeCoin: string;
    fee: string;
  }>;
  enterPointSource: string;
}

// Multi-user WebSocket connection tracking
interface UserConnection {
  userId: string;
  websocket: WebSocket;
  apiKey: string;
  secretKey: string;
  passphrase: string;
  isConnecting: boolean;
  isConnected: boolean;
  reconnectAttempts: number;
  pingInterval: NodeJS.Timeout | null;
}

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
  namespace: '/bitget'
})
export class BitgetGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(BitgetGateway.name);
  private bitgetWs: WebSocket;
  private currentSymbol: string = 'BTCUSDT';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private pingInterval: NodeJS.Timeout | null;
  private readonly wsUrl = 'wss://ws.bitget.com/v2/ws/public';
  private readonly privateWsUrl = 'wss://ws.bitget.com/v2/ws/private';

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;

  // Track active subscribers
  private tickerSubscribers: Set<string> = new Set(); // client IDs subscribed to ticker

  // Track per-client symbol subscriptions
  private clientSymbolSubscriptions: Map<string, string> = new Map(); // clientId -> symbol

  // Track which symbols have active subscriptions
  private activeSymbolSubscriptions: Map<string, number> = new Map(); // symbol -> subscriber count

  // Multi-user WebSocket connections
  private userConnections: Map<string, UserConnection> = new Map(); // userId -> UserConnection

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly apiCredentialsService: ApicredentialsService,
  ) {
    this.apiKey = process.env.BITGET_API_KEY || '';
    this.apiSecret = process.env.BITGET_SECRET_KEY || '';
    this.passphrase = process.env.BITGET_PASSPHRASE || '';

    console.log('🔑 API Key loaded:', this.apiKey ? 'YES' : 'NO');
    console.log('🔑 Secret Key loaded:', this.apiSecret ? 'YES' : 'NO');
    console.log('🔑 Passphrase loaded:', this.passphrase ? 'YES' : 'NO');
  }

  async onModuleInit() {
    this.logger.log('🚀 Bitget Gateway Module Initializing...');

    // Fetch all active trading Bitget users from database (like Binance does)
    this.logger.log('🔍 Fetching all active trading credentials from database...');

    try {
      const allCredentials = await this.apiCredentialsService.getActiveTradingCredentials();
      const activeBitgetCredentials = allCredentials.filter(c => c.exchange === 'bitget');
      this.logger.log(`📊 Found ${activeBitgetCredentials.length} active trading user(s) for Bitget`);

      if (activeBitgetCredentials.length > 0) {
        let connectedCount = 0;

        for (const credential of activeBitgetCredentials) {
          try {
            await this.connectUserPrivateWebSocket(
              credential.userId,
              credential.apiKey,
              credential.secretKey,
              credential.passphrase || '',
            );
            connectedCount++;
          } catch (error) {
            this.logger.error(`❌ Failed to connect WebSocket for user ${credential.userId.substring(0, 8)}...: ${error.message}`);
          }
        }

        this.logger.log(`✅ Initialized ${connectedCount} WebSocket connection(s) for active trading users`);
      } else {
        this.logger.warn('⚠️ No active trading Bitget users found in database');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to fetch Bitget credentials: ${error.message}`);
    }
  }

  afterInit(server: Server) {
    this.logger.log('Bitget Socket.IO Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection_status', {
      status: 'connected',
      message: 'Welcome! Bitget WebSocket is ready.',
      currentSymbol: this.currentSymbol,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Get the symbol this client was subscribed to
    const subscribedSymbol = this.clientSymbolSubscriptions.get(client.id);

    // Remove client from subscribers
    this.tickerSubscribers.delete(client.id);

    // Remove client's symbol subscription
    if (subscribedSymbol) {
      this.clientSymbolSubscriptions.delete(client.id);
      this.decrementSymbolSubscription(subscribedSymbol);
    }

    // Disconnect websockets if no subscribers remain
    if (this.tickerSubscribers.size === 0) {
      this.logger.log('No ticker subscribers remaining - disconnecting public websocket');
      this.disconnectBitget();
    }
  }

  @SubscribeMessage('subscribe_symbol')
  handleSubscribeSymbol(client: Socket, data: { symbol: string }) {
    const { symbol } = data;
    const clientId = client.id;

    this.logger.log(`Client ${clientId} subscribing to symbol: ${symbol}`);

    // Get the previously subscribed symbol for this client
    const previousSymbol = this.clientSymbolSubscriptions.get(clientId);

    // If client was already subscribed to a different symbol, decrement that symbol's count
    if (previousSymbol && previousSymbol !== symbol) {
      this.decrementSymbolSubscription(previousSymbol);
    }

    // Add client to ticker subscribers if not already added
    const wasAlreadySubscribed = this.tickerSubscribers.has(clientId);
    this.tickerSubscribers.add(clientId);

    // Set the new symbol subscription for this client
    this.clientSymbolSubscriptions.set(clientId, symbol);

    // Increment the subscription count for the new symbol
    this.incrementSymbolSubscription(symbol);

    // Connect to public WebSocket if this is the first ticker subscriber
    if (this.tickerSubscribers.size === 1 && !wasAlreadySubscribed && !this.bitgetWs) {
      this.logger.log('First ticker subscriber - connecting to Bitget public websocket');
      this.connectBitget();
    }

    // Send confirmation to client
    client.emit('symbol_subscribed', { symbol, success: true });

    this.logger.log(`Client ${clientId} successfully subscribed to ${symbol}`);
  }

  private incrementSymbolSubscription(symbol: string) {
    const currentCount = this.activeSymbolSubscriptions.get(symbol) || 0;
    const newCount = currentCount + 1;
    this.activeSymbolSubscriptions.set(symbol, newCount);

    // If this is the first subscriber for this symbol, connect public WebSocket if needed
    if (currentCount === 0) {
      // Connect to public WebSocket if not already connected
      if (!this.bitgetWs || this.bitgetWs.readyState !== WebSocket.OPEN) {
        this.logger.log(`📡 Connecting to public WebSocket for ticker data...`);
        this.connectBitget();
        // Wait for connection before subscribing
        setTimeout(() => {
          this.subscribeToTicker(symbol);
          this.logger.log(`📡 Subscribed to ticker for ${symbol} (first subscriber)`);
        }, 2000);
      } else {
        // Already connected, just subscribe
        this.subscribeToTicker(symbol);
        this.logger.log(`📡 Subscribed to ticker for ${symbol} (first subscriber)`);
      }
    }

    this.logger.log(`Symbol ${symbol} now has ${newCount} subscribers`);
  }

  private decrementSymbolSubscription(symbol: string) {
    const currentCount = this.activeSymbolSubscriptions.get(symbol) || 0;
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      this.activeSymbolSubscriptions.set(symbol, newCount);

      // If no more subscribers for this symbol, unsubscribe from its ticker
      if (newCount === 0) {
        this.unsubscribeFromTicker(symbol);
        this.activeSymbolSubscriptions.delete(symbol);
        this.logger.log(`📡 Unsubscribed from ticker for ${symbol} (no more subscribers)`);
      } else {
        this.logger.log(`Symbol ${symbol} now has ${newCount} subscribers`);
      }
    }
  }

  private generateAuthSignature(timestamp: string, secretKey: string): string {
    const message = timestamp + 'GET' + '/user/verify';
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    return signature;
  }

  private connectBitget() {
    this.logger.log('🔌 Connecting to Bitget Public WebSocket...');
    this.bitgetWs = new WebSocket(this.wsUrl);

    this.bitgetWs.on('open', () => {
      this.logger.log('✅ Connected to Bitget Public WebSocket');
      this.reconnectAttempts = 0;

      this.startPing();
      this.subscribeToAllActiveTickers();

      this.server.emit('bitget_connection_status', {
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });

    this.bitgetWs.on('message', (msg) => {
      try {
        const dataStr = msg.toString();

        if (dataStr === 'pong') {
          this.logger.debug('Pong received from Bitget');
          return;
        }

        const data = JSON.parse(dataStr);

        if (data.event === 'subscribe') {
          this.logger.log(`✅ Subscribed to ticker for ${data.arg?.instId}`);

        } else if (data.action === 'snapshot' && data.arg?.channel === 'ticker') {
          // Only process ticker data if there are subscribers
          if (this.tickerSubscribers.size === 0) {
            return;
          }

          if (Array.isArray(data.data)) {
            data.data.forEach((tickerData: BitgetTickerData) => {
              const priceChangePercent = (parseFloat(tickerData.change24h) * 100).toFixed(2);

              this.logger.log(
                `📈 Ticker Update [${tickerData.instId}]: ` +
                `Price: ${tickerData.lastPr}, ` +
                `Change: ${priceChangePercent}%, ` +
                `Volume: ${tickerData.quoteVolume}`
              );

              // Emit to subscribed clients only
              this.server.emit('bitget_ticker_data', {
                symbol: tickerData.instId,
                ticker: {
                  symbol: tickerData.instId,
                  lastPrice: tickerData.lastPr,
                  openPrice: tickerData.open24h,
                  highPrice: tickerData.high24h,
                  lowPrice: tickerData.low24h,
                  priceChange24h: tickerData.change24h,
                  bidPrice: tickerData.bidPr,
                  askPrice: tickerData.askPr,
                  bidSize: tickerData.bidSz,
                  askSize: tickerData.askSz,
                  baseVolume: tickerData.baseVolume,
                  quoteVolume: tickerData.quoteVolume,
                  openUtc: tickerData.openUtc,
                  changeUtc24h: tickerData.changeUtc24h,
                },
                timestamp: new Date(parseInt(tickerData.ts)).toISOString()
              });
            });
          } else {
            this.logger.warn('⚠️ No data array in ticker message');
          }

        } else if (data.event === 'error') {
          this.logger.error(`Bitget subscription error: ${data.code} - ${data.msg}`);
          this.server.emit('bitget_error', {
            code: data.code,
            message: data.msg,
            timestamp: new Date().toISOString()
          });
        } else {
          this.logger.debug(`ℹ️ PUBLIC WS Other message type: ${data.event || 'unknown'}`);
        }

      } catch (err) {
        this.logger.error('Error parsing Bitget message', err);
      }
    });

    this.bitgetWs.on('close', (code, reason) => {
      this.logger.warn(`Bitget Public WS closed. Code: ${code}, Reason: ${reason}`);
      this.clearPing();

      this.server.emit('bitget_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });

      this.handleReconnect();
    });

    this.bitgetWs.on('error', (err) => {
      this.logger.error('Bitget Public WS error', err);
      this.server.emit('bitget_connection_status', {
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle order updates from WebSocket
   * Updates database with order status changes
   * This is the PRIMARY source of truth for order data (not API response)
   */
  private async handleOrderUpdate(orderData: BitgetOrderData, userId?: string) {
    try {
      const userLabel = userId ? `[User ${userId.substring(0, 8)}...]` : '[ENV]';

      this.logger.log(
        `📦 ${userLabel} Order Update [${orderData.instId}]: ` +
        `OrderId: ${orderData.orderId}, ` +
        `Status: ${orderData.status}, ` +
        `Side: ${orderData.side}, ` +
        `Type: ${orderData.orderType}, ` +
        `Filled: ${orderData.accBaseVolume}, ` +
        `Avg Price: ${orderData.priceAvg}`
      );

      // Check if order exists in database
      const existingOrder = await this.orderRepository.findOne({
        where: { orderId: BigInt(orderData.orderId), exchange: 'BITGET' },
      });

      if (existingOrder) {
        // Update existing order
        const oldStatus = existingOrder.status;
        existingOrder.status = orderData.status.toUpperCase();
        existingOrder.executedQty = orderData.accBaseVolume || '0';

        // Update price if we have average price (crucial for market orders)
        if (orderData.priceAvg && parseFloat(orderData.priceAvg) > 0) {
          existingOrder.price = orderData.priceAvg;
        }

        if (orderData.status === 'filled' || orderData.status === 'partially_filled') {
          existingOrder.filledTimestamp = new Date();
        }

        await this.orderRepository.save(existingOrder);

        this.logger.log(
          `${userLabel} 💾 Updated order ${orderData.orderId}: ` +
          `${oldStatus} → ${orderData.status.toUpperCase()}` +
          (orderData.priceAvg ? ` @ ${orderData.priceAvg}` : '')
        );

        // Log TP/SL specific events
        if (existingOrder.metadata?.tpGroup) {
          if (orderData.status === 'filled') {
            this.logger.log(
              `${userLabel} 🎯 ${existingOrder.metadata.tpGroup} ORDER FILLED! ` +
              `Symbol: ${orderData.instId}, ` +
              `Qty: ${orderData.accBaseVolume}, ` +
              `Price: ${orderData.priceAvg}`
            );
          } else if (orderData.status === 'cancelled' || orderData.status === 'canceled') {
            this.logger.log(
              `${userLabel} ❌ ${existingOrder.metadata.tpGroup} ORDER CANCELED! ` +
              `Symbol: ${orderData.instId}, ` +
              `Reason: Manual cancellation or SL triggered`
            );
          }
        }
      } else {
        // Order not in database - this can happen for orders placed outside our system
        // or if database save failed during order placement
        this.logger.warn(
          `${userLabel} ⚠️ Order ${orderData.orderId} not found in DB. ` +
          `This might be an external order or DB save failed.`
        );

        // Optionally create the order record if it's a valid order
        if (userId) {
          try {
            const newOrder = this.orderRepository.create({
              orderId: BigInt(orderData.orderId),
              clientOrderId: orderData.clientOid || `WS_${orderData.orderId}`,
              exchange: 'BITGET',
              symbol: orderData.instId,
              side: orderData.side.toUpperCase(),
              type: orderData.orderType.toUpperCase(),
              quantity: orderData.size || orderData.accBaseVolume || '0',
              price: orderData.priceAvg || orderData.price || '0',
              executedQty: orderData.accBaseVolume || '0',
              status: orderData.status.toUpperCase(),
              orderTimestamp: new Date(parseInt(orderData.cTime)),
              filledTimestamp: (orderData.status === 'filled' || orderData.status === 'partially_filled')
                ? new Date()
                : null,
              userId: userId,
              orderRole: 'ENTRY', // Default role
              orderGroupId: null, // Will be null for external orders
            });

            await this.orderRepository.save(newOrder);
            this.logger.log(`${userLabel} 💾 Created new order record from WebSocket: ${orderData.orderId}`);
          } catch (saveError) {
            this.logger.error(`${userLabel} ❌ Failed to save new order: ${saveError.message}`);
          }
        }
      }

      // Emit order update event to connected clients
      this.server.emit('bitget_order_update', {
        userId: userId || null,
        order: {
          symbol: orderData.instId,
          orderId: orderData.orderId,
          clientOrderId: orderData.clientOid,
          price: orderData.price,
          size: orderData.size,
          newSize: orderData.newSize,
          orderType: orderData.orderType,
          side: orderData.side,
          status: orderData.status,
          filledQuantity: orderData.accBaseVolume,
          averagePrice: orderData.priceAvg,
          fillPrice: orderData.fillPrice,
          fillTime: orderData.fillTime,
          fillFee: orderData.fillFee,
          fillFeeCoin: orderData.fillFeeCoin,
          feeDetail: orderData.feeDetail,
          createdTime: orderData.cTime,
          updatedTime: orderData.uTime,
          source: orderData.enterPointSource,
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Error handling order update: ${error.message}`);
    }
  }

  private subscribeToTicker(instId: string) {
    if (this.bitgetWs && this.bitgetWs.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        op: 'subscribe',
        args: [
          {
            instType: 'SPOT',
            channel: 'ticker',
            instId,
          },
        ],
      };

      this.bitgetWs.send(JSON.stringify(subscribeMsg));
      this.logger.log(`📡 Subscribing to ticker for ${instId}`);
    }
  }

  private subscribeToAllActiveTickers() {
    const activeSymbols = Array.from(this.activeSymbolSubscriptions.keys());

    if (activeSymbols.length === 0) {
      // Subscribe to a default symbol if no active subscriptions
      activeSymbols.push('BTCUSDT');
    }

    activeSymbols.forEach(symbol => {
      this.subscribeToTicker(symbol);
    });

    this.logger.log(`📡 Subscribed to tickers for all active symbols: ${activeSymbols.join(', ')}`);
  }

  private unsubscribeFromTicker(instId: string) {
    if (this.bitgetWs && this.bitgetWs.readyState === WebSocket.OPEN) {
      const unsubscribeMsg = {
        op: 'unsubscribe',
        args: [
          {
            instType: 'SPOT',
            channel: 'ticker',
            instId,
          },
        ],
      };

      this.bitgetWs.send(JSON.stringify(unsubscribeMsg));
      this.logger.log(`📡 Unsubscribing from ticker for ${instId}`);
    }
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.bitgetWs?.readyState === WebSocket.OPEN) {
        this.bitgetWs.send('ping');
        this.logger.debug('Ping sent to Bitget Public');
      }
    }, 30000);
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      this.logger.log(`Attempting public reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        this.connectBitget();
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached for Bitget Public');
      this.server.emit('bitget_connection_status', {
        status: 'max_reconnect_attempts_reached',
        timestamp: new Date().toISOString()
      });
    }
  }

  private disconnectBitget() {
    this.clearPing();
    if (this.bitgetWs) {
      this.bitgetWs.close();
      this.bitgetWs = null;
      this.logger.log('Disconnected from Bitget Public WebSocket');

      this.server.emit('bitget_connection_status', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  }

  onModuleDestroy() {
    this.clearPing();

    // Disconnect all user WebSockets
    for (const [userId, userConn] of this.userConnections.entries()) {
      if (userConn.pingInterval) {
        clearInterval(userConn.pingInterval);
      }
      if (userConn.websocket) {
        userConn.websocket.close();
      }
      this.logger.log(`🔌 Disconnected user ${userId.substring(0, 8)}... WebSocket`);
    }
    this.userConnections.clear();

    if (this.bitgetWs) {
      this.bitgetWs.close();
    }
  }

  // ============================================
  // PUBLIC METHODS FOR MULTI-USER WEBSOCKET SUPPORT
  // ============================================

  /**
   * Connect a private WebSocket for a specific user
   * Called on module init for all active trading users
   */
  public async connectUserPrivateWebSocket(
    userId: string,
    apiKey: string,
    secretKey: string,
    passphrase: string
  ): Promise<void> {
    // Check if user already has a connection
    if (this.userConnections.has(userId)) {
      const existing = this.userConnections.get(userId)!;
      if (existing.isConnected || existing.isConnecting) {
        this.logger.log(`[User ${userId.substring(0, 8)}...] WebSocket already connected/connecting`);
        return;
      }
    }

    const userLabel = `[User ${userId.substring(0, 8)}...]`;
    this.logger.log(`${userLabel} Connecting private WebSocket...`);

    const userConn: UserConnection = {
      userId,
      websocket: null as any,
      apiKey,
      secretKey,
      passphrase,
      isConnecting: true,
      isConnected: false,
      reconnectAttempts: 0,
      pingInterval: null,
    };

    this.userConnections.set(userId, userConn);

    try {
      const ws = new WebSocket(this.privateWsUrl);
      userConn.websocket = ws;

      ws.on('open', () => {
        this.logger.log(`${userLabel} Private WebSocket connected`);
        userConn.isConnecting = false;
        userConn.isConnected = true;
        userConn.reconnectAttempts = 0;

        // Authenticate
        const timestamp = Date.now().toString();
        const sign = this.generateAuthSignature(timestamp, secretKey);

        const authMsg = {
          op: 'login',
          args: [
            {
              apiKey: apiKey,
              passphrase: passphrase,
              timestamp: timestamp,
              sign: sign,
            },
          ],
        };

        this.logger.log(`${userLabel} 🔐 Sending authentication message...`);
        this.logger.debug(`${userLabel} Auth details: timestamp=${timestamp}, apiKey=${apiKey.substring(0, 8)}...`);
        ws.send(JSON.stringify(authMsg));

        // Start ping
        userConn.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      });

      ws.on('message', async (data: Buffer) => {
        const message = data.toString();
        if (message === 'pong') {
          this.logger.debug(`${userLabel} Pong received`);
          return;
        }

        try {
          const parsed = JSON.parse(message);

          // Log ALL messages for debugging
          this.logger.log(`${userLabel} 📨 WebSocket message: ${JSON.stringify(parsed)}`);

          // Login response
          if (parsed.event === 'login') {
            if (parsed.code === '0' || parsed.code === 0) {
              this.logger.log(`${userLabel} ✅ Authentication successful!`);

              // Subscribe to orders channel
              const subscribeMsg = {
                op: 'subscribe',
                args: [{ instType: 'SPOT', channel: 'orders' }],
              };
              this.logger.log(`${userLabel} 📡 Subscribing to orders channel: ${JSON.stringify(subscribeMsg)}`);
              ws.send(JSON.stringify(subscribeMsg));
            } else {
              this.logger.error(`${userLabel} ❌ Authentication failed: ${parsed.msg || 'Unknown error'}`);
            }
          }

          // Subscription confirmation
          if (parsed.event === 'subscribe') {
            this.logger.log(`${userLabel} ✅ Subscription confirmed: ${JSON.stringify(parsed.arg)}`);
          }

          // Order updates
          if (parsed.action === 'snapshot' || parsed.action === 'update') {
            if (parsed.arg?.channel === 'orders' && parsed.data) {
              this.logger.log(`${userLabel} 📦 Received ${parsed.data.length} order update(s)`);
              for (const orderData of parsed.data) {
                await this.handleOrderUpdate(orderData, userId);
              }
            }
          }

          // Error messages
          if (parsed.event === 'error') {
            this.logger.error(`${userLabel} ❌ WebSocket error: ${JSON.stringify(parsed)}`);
          }
        } catch (e) {
          this.logger.error(`${userLabel} ❌ Failed to parse message: ${message.substring(0, 100)}`);
        }
      });

      ws.on('close', () => {
        this.logger.log(`${userLabel} Private WebSocket closed`);
        userConn.isConnected = false;
        userConn.isConnecting = false;

        if (userConn.pingInterval) {
          clearInterval(userConn.pingInterval);
          userConn.pingInterval = null;
        }

        // Attempt reconnect
        if (userConn.reconnectAttempts < this.maxReconnectAttempts) {
          userConn.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, userConn.reconnectAttempts), 30000);
          this.logger.log(`${userLabel} Reconnecting in ${delay}ms...`);
          setTimeout(() => {
            this.connectUserPrivateWebSocket(userId, apiKey, secretKey, passphrase);
          }, delay);
        }
      });

      ws.on('error', (err) => {
        this.logger.error(`${userLabel} WebSocket error: ${err.message}`);
        userConn.isConnected = false;
        userConn.isConnecting = false;
      });

    } catch (error) {
      this.logger.error(`${userLabel} Failed to connect WebSocket: ${error.message}`);
      userConn.isConnecting = false;
    }
  }

  /**
   * Disconnect a user's private WebSocket
   */
  public disconnectUserPrivateWebSocket(userId: string): void {
    const userConn = this.userConnections.get(userId);
    if (!userConn) return;

    if (userConn.pingInterval) {
      clearInterval(userConn.pingInterval);
    }
    if (userConn.websocket) {
      userConn.websocket.close();
    }

    this.userConnections.delete(userId);
    this.logger.log(`[User ${userId.substring(0, 8)}...] WebSocket disconnected`);
  }

  /**
   * Check if a user has an active WebSocket connection
   */
  public isUserConnected(userId: string): boolean {
    const userConn = this.userConnections.get(userId);
    return userConn?.isConnected ?? false;
  }

  /**
   * Get list of connected user IDs
   */
  public getConnectedUserIds(): string[] {
    return Array.from(this.userConnections.entries())
      .filter(([_, conn]) => conn.isConnected)
      .map(([userId, _]) => userId);
  }
}