import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import * as crypto from 'crypto';
import WebSocket from 'ws';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { ExchangesControllerService } from '../exchanges-controller/exchanges-controller.service';

interface GateioCredential {
  userId: string;
  exchange: string;
  apiKey: string;
  secretKey: string;
  passphrase?: string;
  activeTrading?: boolean;
}

@Injectable()
export class GateioGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GateioGateway.name);
  private readonly url = 'wss://api.gateio.ws/ws/v4/';
  private sockets: Map<string, WebSocket> = new Map(); // key = `${userId}:${exchange}`
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly apicredentialsService: ApicredentialsService,
    @Inject(forwardRef(() => ExchangesControllerService))
    private readonly exchangesService: ExchangesControllerService,
  ) {}

  async onModuleInit() {
    this.logger.log('GateioGateway initializing - opening websockets for active credentials');
    await this.initForActiveCredentials();
    // Periodically refresh credentials (adds new/removed credentials)
    setInterval(() => this.refreshCredentials().catch(err => this.logger.error(err)), 60_000);
  }

  async onModuleDestroy() {
    this.logger.log('GateioGateway shutting down - closing sockets');
    for (const [k, ws] of this.sockets.entries()) {
      try { ws.close(); } catch {}
      const t = this.pingIntervals.get(k);
      if (t) clearInterval(t);
    }
    this.sockets.clear();
  }

  private genSign(channel: string, event: string, timestamp: number, secret: string): string {
    const msg = `channel=${channel}&event=${event}&time=${timestamp}`;
    return crypto.createHmac('sha512', secret).update(msg, 'utf8').digest('hex');
  }

  private keyFor(cred: GateioCredential) {
    return `${cred.userId}:${(cred.exchange || 'GATEIO').toLowerCase()}`;
  }

  async initForActiveCredentials() {
    // Fetch all credentials and open sockets for those with activeTrading === true
    const all = await this.apicredentialsService.getActiveTradingCredentials();
    const creds: GateioCredential[] = (all || []).filter((c: any) => c.exchange === 'GATEIO' && c.activeTrading);

    
    for (const c of creds) {
      const key = this.keyFor(c as GateioCredential);
      if (this.sockets.has(key)) continue;
      this.openSocketForCredential(c as GateioCredential).catch(err => this.logger.error(err));
    }
  }

  private async refreshCredentials() {
    const all = await this.apicredentialsService.getActiveTradingCredentials();
    const activeKeys = new Set<string>();
    const creds: GateioCredential[] = (all || []).filter((c: any) => c.exchange === 'GATEIO' && c.activeTrading);
    for (const c of creds) activeKeys.add(this.keyFor(c as GateioCredential));

    // Close sockets that are no longer active
    for (const existingKey of Array.from(this.sockets.keys())) {
      if (!activeKeys.has(existingKey)) {
        this.logger.log(`Closing socket for removed credential ${existingKey}`);
        const ws = this.sockets.get(existingKey);
        try { ws?.close(); } catch {}
        this.sockets.delete(existingKey);
        const t = this.pingIntervals.get(existingKey);
        if (t) clearInterval(t);
        this.pingIntervals.delete(existingKey);
      }
    }

    // Add newly active
    for (const c of creds) {
      const key = this.keyFor(c as GateioCredential);
      if (!this.sockets.has(key)) {
        this.openSocketForCredential(c as GateioCredential).catch(err => this.logger.error(err));
      }
    }
  }

  private async openSocketForCredential(cred: GateioCredential) {
    const key = this.keyFor(cred);
    this.logger.log(`Opening Gate.io WS for ${key}`);

    const ws = new WebSocket(this.url);

    ws.on('open', () => {
      this.logger.log(`WS open for ${key}`);
      // Subscribe to private orders channel
      try {
        const now = Math.floor(Date.now() / 1000);
        const channel = 'spot.orders';
        const event = 'subscribe';
        const sign = this.genSign(channel, event, now, cred.secretKey || '');
        const auth = {
          method: 'api_key',
          KEY: cred.apiKey,
          SIGN: sign,
        };

        const req = {
          time: now,
          channel,
          event,
          payload: [], // empty → server may send all user order updates
          auth,
        };

        ws.send(JSON.stringify(req));
        this.logger.log(`Subscribed to ${channel} for ${key}`);

        // Start ping + spot.ping every 25s
        const pingT = setInterval(() => {
          try {
            ws.ping();
            const pingReq = { time: Math.floor(Date.now() / 1000), channel: 'spot.ping' };
            ws.send(JSON.stringify(pingReq));
          } catch (e) {
            this.logger.debug(`Ping error for ${key}: ${e}`);
          }
        }, 25_000);
        this.pingIntervals.set(key, pingT);
      } catch (err) {
        this.logger.error(`Subscribe error for ${key}: ${err}`);
      }
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const txt = typeof data === 'string' ? data : data.toString();
        const msg = JSON.parse(txt);

        // Primary: handle private order updates and persist them against the userId
        if (msg && msg.channel === 'spot.orders' && msg.result) {
          const results = Array.isArray(msg.result) ? msg.result : [msg.result];

          for (const r of results) {
            try {
              // Best-effort extraction of Gate.io order fields (defensive)
              const rawId = r.id || r.order_id || r.orderId || r.client_oid || r.clientOrderId;
              const orderId = rawId ? Number(rawId) : NaN;
              const rawStatus = r.status || r.state || r.side_status || r.text || '';

              const executedQty = (r.filled_size || r.filled_amount || r.filled_qty || r.filled || r.filled_qty_str) ? String(r.filled_size || r.filled_amount || r.filled_qty || r.filled || r.filled_qty_str) : undefined;

              const avgPrice = r.avg_price || r.price_avg || r.filled_avg_price || undefined;

              const updateTime = r.update_time || r.create_time || msg.time || Date.now();

              const mappedStatus = this.mapGateioStatus(String(rawStatus || '').toLowerCase());

              if (!isNaN(orderId)) {
                const timestampMs = this.normalizeTimestampMs(updateTime);
                // Call exchanges service to associate this order update with the user
                this.exchangesService.updateOrderStatus(
                  Number(orderId),
                  'GATEIO',
                  mappedStatus,
                  executedQty,
                  timestampMs,
                  cred.userId,
                  avgPrice ? Number(avgPrice) : undefined,
                ).catch(e => this.logger.error(`Failed to update order ${orderId} for ${key}: ${e.message || e}`));

                this.logger.log(`GateIO WS [${key}] order=${orderId} status=${mappedStatus} user=${cred.userId.substring(0,8)}...`);
              } else {
                this.logger.debug(`GateIO WS [${key}] could not determine numeric orderId from ${JSON.stringify(r)}`);
              }
            } catch (inner) {
              this.logger.debug(`GateIO WS [${key}] per-result handler error: ${inner}`);
            }
          }
        } else if (msg && msg.channel && msg.channel.startsWith('spot.')) {
          // Other spot.* messages - log at debug level with user trace
          this.logger.debug(`GateIO WS [${key}] channel=${msg.channel} event=${msg.event} result=${JSON.stringify(msg.result)}`);
        } else {
          this.logger.debug(`GateIO WS [${key}] raw message: ${txt}`);
        }
      } catch (err) {
        this.logger.debug(`GateIO WS [${key}] message parse error: ${err}`);
      }
    });

    ws.on('error', (err) => {
      this.logger.error(`WS error for ${key}: ${err.message || err}`);
    });

    ws.on('close', (code, reason) => {
      this.logger.warn(`WS closed for ${key} code=${code} reason=${reason}`);
      this.sockets.delete(key);
      const t = this.pingIntervals.get(key);
      if (t) clearInterval(t);
      this.pingIntervals.delete(key);
      // Reconnect with backoff
      setTimeout(() => this.openSocketForCredential(cred).catch(e => this.logger.error(e)), 5000);
    });

    this.sockets.set(key, ws);
  }

  private mapGateioStatus(raw: string): string {
    // Normalize common Gate.io statuses to internal status strings
    // Internal statuses used across system: NEW, PARTIALLY_FILLED, FILLED, CANCELED, EXPIRED
    if (!raw) return 'NEW';
    raw = raw.toLowerCase();
    if (raw.includes('filled') || raw === 'finished' || raw === 'closed' || raw === 'done' || raw === 'settled') return 'FILLED';
    if (raw.includes('partial') || raw.includes('partially') || raw.includes('partially_filled')) return 'PARTIALLY_FILLED';
    if (raw.includes('cancel') || raw.includes('canceled') || raw.includes('cancelled')) return 'CANCELED';
    if (raw.includes('expired')) return 'EXPIRED';
    if (raw === 'new' || raw === 'open' || raw === 'created') return 'NEW';
    // Fallback
    return raw.toUpperCase();
  }

  private normalizeTimestampMs(t: any): number | undefined {
    if (!t) return undefined;
    const n = Number(t);
    if (isNaN(n)) return undefined;
    // If timestamp looks like seconds (10 digits), convert to ms
    if (n < 1e12) return n * 1000;
    return n;
  }
}

export default GateioGateway;
