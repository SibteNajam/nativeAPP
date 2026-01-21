import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Order } from '../exchanges-controller/entities/order.entity';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { ExchangeType } from '../apicredentials/entities/api-credential.entity';
import { BinanceSignedService } from '../binance/binance.signed.service';
import { GraphWebhookService } from '../graph-webhook/graph-webhook.service';

/**
 * Binance Order Sync Service
 * 
 * PURPOSE: 
 * Periodically checks and cancels stale entry orders that remain unfilled for too long.
 * This prevents limit orders from filling at unfavorable prices after price has moved away.
 * 
 * FUNCTIONALITY:
 * - Runs on startup (after 15s delay) and then every 5 minutes
 * - Checks ALL active users' unfilled BUY orders
 * - Cancels ENTRY orders that remain NEW for > 20 minutes
 * - Notifies graph orchestrator when orders are cancelled
 * - Deletes cancelled orders from database
 * 
 * NOTE: OCO placement functionality has been removed. 
 * Exit orders (TP/SL) are managed by the SF SLTP trigger system.
 */

export interface SyncResult {
    totalChecked: number;
    cancelledCount: number;
    errorsCount: number;
    details: {
        orderId: number;
        symbol: string;
        action: string;
        ageMinutes?: number;
    }[];
}

@Injectable()
export class BinanceSyncService implements OnModuleInit {
    private readonly logger = new Logger(BinanceSyncService.name);
    private syncInterval: NodeJS.Timeout | null = null;
    private isSyncing = false;

    // Sync configuration
    private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly STARTUP_DELAY_MS = 15 * 1000; // 15 seconds after startup
    private readonly RATE_LIMIT_DELAY_MS = 150; // 150ms between API calls
    private readonly MAX_ORDER_AGE_DAYS = 3; // Don't check orders older than 3 days
    private readonly STALE_ORDER_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        private readonly credentialsService: ApicredentialsService,
        private readonly binanceSignedService: BinanceSignedService,
        private readonly graphWebhookService: GraphWebhookService,
    ) { }

    async onModuleInit() {
        // Run sync after startup delay
        setTimeout(() => {
            this.logger.log('🔄 Running startup stale order check...');
            this.syncAllBinanceOrders().catch(err => {
                this.logger.error(`Startup sync failed: ${err.message}`);
            });
        }, this.STARTUP_DELAY_MS);

        // Schedule periodic sync
        this.syncInterval = setInterval(() => {
            this.logger.log('🔄 Running periodic stale order check...');
            this.syncAllBinanceOrders().catch(err => {
                this.logger.error(`Periodic sync failed: ${err.message}`);
            });
        }, this.SYNC_INTERVAL_MS);

        this.logger.log(`📅 Stale order check scheduled: startup in ${this.STARTUP_DELAY_MS / 1000}s, then every ${this.SYNC_INTERVAL_MS / 60000} minutes`);
    }

    /**
     * Main sync method - checks and cancels stale orders for all users
     */
    async syncAllBinanceOrders(): Promise<SyncResult> {
        // Prevent concurrent syncs
        if (this.isSyncing) {
            this.logger.warn('Sync already in progress, skipping...');
            return { totalChecked: 0, cancelledCount: 0, errorsCount: 0, details: [] };
        }

        this.isSyncing = true;
        const startTime = Date.now();
        const result: SyncResult = {
            totalChecked: 0,
            cancelledCount: 0,
            errorsCount: 0,
            details: [],
        };

        try {
            // Get all unfilled Binance ENTRY orders from database
            const unfilledOrders = await this.getUnfilledEntryOrders();
            result.totalChecked = unfilledOrders.length;

            if (unfilledOrders.length === 0) {
                this.logger.log('✅ No unfilled entry orders to check');
            } else {
                this.logger.log(`📋 Found ${unfilledOrders.length} unfilled entry orders to check`);

                // Group orders by userId
                const ordersByUser = this.groupOrdersByUser(unfilledOrders);
                this.logger.log(`👥 Orders belong to ${ordersByUser.size} user(s)`);

                // Process each user's orders
                for (const [userId, orders] of ordersByUser) {
                    try {
                        const userResult = await this.checkAndCancelStaleOrders(userId, orders);
                        result.cancelledCount += userResult.cancelledCount;
                        result.errorsCount += userResult.errorsCount;
                        result.details.push(...userResult.details);
                    } catch (error) {
                        this.logger.error(`Error processing orders for user ${userId.substring(0, 8)}...: ${error.message}`);
                        result.errorsCount++;
                    }
                }
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Stale order check completed in ${duration}ms. ` +
                `Checked: ${result.totalChecked}, Cancelled: ${result.cancelledCount}, Errors: ${result.errorsCount}`
            );

            return result;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get all unfilled ENTRY orders from database
     */
    private async getUnfilledEntryOrders(): Promise<Order[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.MAX_ORDER_AGE_DAYS);

        return this.orderRepository.find({
            where: {
                exchange: 'BINANCE',
                status: In(['NEW', 'PARTIALLY_FILLED']),
                orderRole: 'ENTRY',
                side: 'BUY', // Only check unfilled BUY orders
                createdAt: MoreThan(cutoffDate),
            },
            order: { userId: 'ASC', createdAt: 'ASC' },
        });
    }

    /**
     * Group orders by userId
     */
    private groupOrdersByUser(orders: Order[]): Map<string, Order[]> {
        const grouped = new Map<string, Order[]>();

        for (const order of orders) {
            if (!order.userId) continue; // Skip orders without userId

            if (!grouped.has(order.userId)) {
                grouped.set(order.userId, []);
            }
            grouped.get(order.userId)!.push(order);
        }

        return grouped;
    }

    /**
     * Check and cancel stale orders for a specific user
     */
    private async checkAndCancelStaleOrders(userId: string, orders: Order[]): Promise<SyncResult> {
        const result: SyncResult = {
            totalChecked: orders.length,
            cancelledCount: 0,
            errorsCount: 0,
            details: [],
        };

        // Get user's Binance credentials
        const credentials = await this.credentialsService.getActiveTradingCredential(userId, 'binance' as ExchangeType);

        if (!credentials) {
            this.logger.warn(`No Binance credentials for user ${userId.substring(0, 8)}..., skipping ${orders.length} orders`);
            return result;
        }

        this.logger.log(`🔍 Checking ${orders.length} orders for user ${userId.substring(0, 8)}...`);

        // Process each order with rate limiting
        for (const order of orders) {
            try {
                const cancelled = await this.checkAndCancelIfStale(order, credentials.apiKey, credentials.secretKey, userId);
                if (cancelled) {
                    result.cancelledCount++;
                    result.details.push(cancelled);
                }

                // Rate limiting delay
                await this.delay(this.RATE_LIMIT_DELAY_MS);
            } catch (error) {
                this.logger.error(`Error checking order ${order.orderId}: ${error.message}`);
                result.errorsCount++;
            }
        }

        return result;
    }

    /**
     * Check if an order is stale and cancel it if so
     */
    private async checkAndCancelIfStale(
        order: Order,
        apiKey: string,
        secretKey: string,
        userId: string
    ): Promise<{ orderId: number; symbol: string; action: string; ageMinutes?: number } | null> {
        try {
            // Query order status from Binance to make sure it's still NEW
            const exchangeOrder = await this.binanceSignedService.queryOrder(
                order.symbol,
                Number(order.orderId),
                apiKey,
                secretKey
            );

            // If order is no longer NEW on exchange, update DB and skip cancellation
            if (exchangeOrder.status !== 'NEW' && exchangeOrder.status !== 'PARTIALLY_FILLED') {
                // Order already filled/cancelled on exchange, just update DB
                if (exchangeOrder.status !== order.status) {
                    await this.orderRepository.update(order.id, {
                        status: exchangeOrder.status,
                        executedQty: parseFloat(exchangeOrder.executedQty).toString(),
                        filledTimestamp: exchangeOrder.status === 'FILLED' ? new Date(exchangeOrder.updateTime) : null,
                        updatedAt: new Date(),
                    });
                    this.logger.log(`📊 Order ${order.orderId} status synced: ${order.status} → ${exchangeOrder.status}`);
                }
                return null;
            }

            // Check if order is stale (older than 20 minutes)
            const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();

            if (orderAgeMs > this.STALE_ORDER_TIMEOUT_MS) {
                const ageMinutes = Math.floor(orderAgeMs / 60000);
                this.logger.warn(
                    `⏳ [STALE ORDER] Entry order ${order.orderId} (${order.symbol}) has been NEW for ${ageMinutes}m. Canceling...`
                );

                try {
                    // Cancel on Binance
                    await this.binanceSignedService.cancelOrder(
                        order.symbol,
                        Number(order.orderId),
                        apiKey,
                        secretKey
                    );

                    // Delete from database
                    await this.orderRepository.delete(order.id);

                    // Notify graph about cancellation
                    await this.graphWebhookService.notifyOrderCancelled({
                        orderId: String(order.orderId),
                        symbol: order.symbol,
                        side: order.side as 'BUY' | 'SELL',
                        cancelReason: 'stale_order',
                        ageMinutes: ageMinutes,
                        timestamp: new Date(),
                        exchange: 'BINANCE',
                        userId: userId,
                    });

                    this.logger.log(`✅ [STALE ORDER] Cancelled and removed order ${order.orderId} (${order.symbol}) after ${ageMinutes}m`);

                    return {
                        orderId: Number(order.orderId),
                        symbol: order.symbol,
                        action: `Auto-cancelled stale entry order (${ageMinutes}m old)`,
                        ageMinutes: ageMinutes,
                    };
                } catch (cancelError: any) {
                    // Handle case where order was already cancelled
                    if (cancelError.message?.includes('UNKNOWN_ORDER') || cancelError.message?.includes('ORDER_NOT_FOUND')) {
                        this.logger.warn(`Order ${order.orderId} already cancelled on exchange, removing from DB`);
                        await this.orderRepository.delete(order.id);
                        return {
                            orderId: Number(order.orderId),
                            symbol: order.symbol,
                            action: 'Order already cancelled on exchange, removed from DB',
                        };
                    }
                    throw cancelError;
                }
            }

            return null; // Order not stale yet
        } catch (error: any) {
            // Handle order not found (already cancelled/expired on exchange)
            if (error.message?.includes('ORDER_NOT_FOUND') || error.message?.includes('UNKNOWN_ORDER')) {
                this.logger.warn(`Order ${order.orderId} not found on Binance, removing from DB`);
                await this.orderRepository.delete(order.id);
                return {
                    orderId: Number(order.orderId),
                    symbol: order.symbol,
                    action: 'Order not found on exchange, removed from DB',
                };
            }

            throw error;
        }
    }

    /**
     * Manual sync trigger - can be called from controller
     */
    async triggerManualSync(): Promise<SyncResult> {
        this.logger.log('🔄 Manual sync triggered');
        return this.syncAllBinanceOrders();
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
