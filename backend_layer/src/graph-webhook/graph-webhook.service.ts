/**
 * Graph Webhook Service
 * 
 * Sends real-time position updates to Python graph orchestrator.
 * 
 * Owner: Salman/Sibt-e-Najam
 * Status: NEW IMPLEMENTATION (10/10 Position Tracking)
 * 
 * PURPOSE:
 * Eliminates polling by pushing position updates immediately when:
 * - Orders fill (new positions)
 * - Take profit levels hit
 * - Stop loss triggered
 * - Positions manually closed
 * 
 * INTEGRATION POINTS:
 * - Called from order-sync.service.ts (Binance/Bitget order updates)
 * - Called from exchanges-controller.service.ts (manual closes)
 * - Sends webhooks to Python position webhook server (port 5006)
 * 
 * SECURITY:
 * - Signs webhooks with HMAC-SHA256
 * - Uses WEBHOOK_SECRET environment variable
 * - Retries failed webhooks with exponential backoff
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

// Webhook payload interfaces
interface PositionOpenedPayload {
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  avg_price: number;
  filled_qty: number;
  timestamp: string;
  exchange?: string;
  final_signal_id?: string;
  portfolio_id?: string;
}

interface PositionUpdatedPayload {
  position_id: string;
  update_type: 'partial_tp' | 'trailing_sl' | 'manual_update';
  current_price: number;
  unrealized_pnl: number;
  quantity_remaining?: number;
  timestamp: string;
  notes?: string;
}

interface PositionClosedPayload {
  position_id: string;
  exit_price: number;
  realized_pnl: number;
  close_reason: 'sl_hit' | 'tp_full' | 'manual_close' | 'liquidation';
  timestamp: string;
  policy_version?: string;
  exit_qty?: number;
}

interface OrderCancelledPayload {
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  cancel_reason: 'stale_order' | 'manual_cancel' | 'insufficient_balance' | 'system';
  age_minutes?: number;
  timestamp: string;
  exchange?: string;
  user_id?: string;
}

@Injectable()
export class GraphWebhookService {
  private readonly logger = new Logger(GraphWebhookService.name);
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  private readonly httpClient: AxiosInstance;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second base delay

  constructor(private readonly configService: ConfigService) {
    // Get webhook configuration from environment
    const pythonHost = this.configService.get<string>('PYTHON_GRAPH_HOST', 'localhost');
    const pythonPort = this.configService.get<string>('PYTHON_GRAPH_PORT', '5006');
    this.webhookUrl = `http://${pythonHost}:${pythonPort}/webhook`;
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET', 'change_me_in_production');

    // Initialize HTTP client with timeout
    this.httpClient = axios.create({
      timeout: 5000, // 5 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`🔗 Graph Webhook Service initialized: ${this.webhookUrl}`);
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * 
   * @param payload - Webhook payload object
   * @returns Hex-encoded signature
   */
  private generateSignature(payload: any): string {
    const payloadStr = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payloadStr);
    return hmac.digest('hex');
  }

  /**
   * Send webhook with retries and exponential backoff
   * 
   * @param endpoint - Webhook endpoint path (e.g., '/position/opened')
   * @param payload - Webhook payload
   * @param retryCount - Current retry attempt
   */
  private async sendWebhookWithRetry(
    endpoint: string,
    payload: any,
    retryCount: number = 0,
  ): Promise<boolean> {
    const url = `${this.webhookUrl}${endpoint}`;
    const signature = this.generateSignature(payload);

    try {
      this.logger.debug(`📤 Sending webhook to ${url}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

      const response = await this.httpClient.post(url, payload, {
        headers: {
          'X-Webhook-Signature': signature,
        },
      });

      if (response.status === 200) {
        this.logger.log(`✅ Webhook delivered: ${endpoint} (${payload.symbol || payload.position_id})`);
        return true;
      } else {
        this.logger.warn(`⚠️ Webhook returned status ${response.status}: ${endpoint}`);
        return false;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      this.logger.error(`❌ Webhook failed: ${endpoint} - ${errorMsg}`);

      // Retry logic with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
        this.logger.log(`⏳ Retrying webhook in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhookWithRetry(endpoint, payload, retryCount + 1);
      }

      this.logger.error(`💥 Webhook failed after ${this.maxRetries} retries: ${endpoint}`);
      return false;
    }
  }

  /**
   * Notify graph that a new position was opened (order filled)
   * 
   * Called when:
   * - Market order fills
   * - Limit order fills
   * - Any order execution completes
   * 
   * @param orderData - Order execution data
   */
  async notifyPositionOpened(orderData: {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    avgPrice: number;
    filledQty: number;
    timestamp: Date;
    exchange?: string;
    finalSignalId?: string;
    portfolioId?: string;
  }): Promise<void> {
    const payload: PositionOpenedPayload = {
      order_id: orderData.orderId,
      symbol: orderData.symbol,
      side: orderData.side,
      avg_price: orderData.avgPrice,
      filled_qty: orderData.filledQty,
      timestamp: orderData.timestamp.toISOString(),
      exchange: orderData.exchange || 'BINANCE',
      final_signal_id: orderData.finalSignalId,
      portfolio_id: orderData.portfolioId || 'Portfolio:default',
    };

    await this.sendWebhookWithRetry('/position/opened', payload);
  }

  /**
   * Notify graph that a position was updated (partial TP/SL hit)
   * 
   * Called when:
   * - Partial take profit triggered
   * - Trailing stop loss adjusted
   * - Manual position modification
   * 
   * @param updateData - Position update data
   */
  async notifyPositionUpdated(updateData: {
    positionId: string;
    updateType: 'partial_tp' | 'trailing_sl' | 'manual_update';
    currentPrice: number;
    unrealizedPnl: number;
    quantityRemaining?: number;
    timestamp: Date;
    notes?: string;
  }): Promise<void> {
    const payload: PositionUpdatedPayload = {
      position_id: updateData.positionId,
      update_type: updateData.updateType,
      current_price: updateData.currentPrice,
      unrealized_pnl: updateData.unrealizedPnl,
      quantity_remaining: updateData.quantityRemaining,
      timestamp: updateData.timestamp.toISOString(),
      notes: updateData.notes,
    };

    await this.sendWebhookWithRetry('/position/updated', payload);
  }

  /**
   * Notify graph that a position was fully closed
   * 
   * Called when:
   * - Stop loss hit
   * - All take profit levels filled
   * - Manual position close
   * - Liquidation
   * 
   * @param closeData - Position close data
   */
  async notifyPositionClosed(closeData: {
    positionId: string;
    exitPrice: number;
    realizedPnl: number;
    closeReason: 'sl_hit' | 'tp_full' | 'manual_close' | 'liquidation';
    timestamp: Date;
    policyVersion?: string;
    exitQty?: number;
  }): Promise<void> {
    const payload: PositionClosedPayload = {
      position_id: closeData.positionId,
      exit_price: closeData.exitPrice,
      realized_pnl: closeData.realizedPnl,
      close_reason: closeData.closeReason,
      timestamp: closeData.timestamp.toISOString(),
      policy_version: closeData.policyVersion || 'v1',
      exit_qty: closeData.exitQty,
    };

    await this.sendWebhookWithRetry('/position/closed', payload);
  }

  /**
   * Notify graph that an order was cancelled
   * 
   * Called when:
   * - Stale entry orders are auto-cancelled (20min timeout)
   * - Manual order cancellation
   * - System cancellation (insufficient balance, etc.)
   * 
   * @param cancelData - Order cancellation data
   */
  async notifyOrderCancelled(cancelData: {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    cancelReason: 'stale_order' | 'manual_cancel' | 'insufficient_balance' | 'system';
    ageMinutes?: number;
    timestamp: Date;
    exchange?: string;
    userId?: string;
  }): Promise<void> {
    const payload: OrderCancelledPayload = {
      order_id: cancelData.orderId,
      symbol: cancelData.symbol,
      side: cancelData.side,
      cancel_reason: cancelData.cancelReason,
      age_minutes: cancelData.ageMinutes,
      timestamp: cancelData.timestamp.toISOString(),
      exchange: cancelData.exchange || 'BINANCE',
      user_id: cancelData.userId,
    };

    await this.sendWebhookWithRetry('/order/cancelled', payload);
  }

  /**
   * Health check - verify webhook server is accessible
   * 
   * @returns True if webhook server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get(`${this.webhookUrl.replace('/webhook', '')}/health`);
      return response.status === 200;
    } catch (error) {
      this.logger.warn('⚠️ Webhook server health check failed');
      return false;
    }
  }
}

