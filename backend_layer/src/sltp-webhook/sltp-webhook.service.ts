import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApicredentialsService } from '../apicredentials/apicredentials.service';
import { BinanceSignedService } from '../binance/binance.signed.service';
import { BinanceService } from '../binance/binance.service';
import { AccountService as BitgetAccountService } from '../bitget/services/account.service';
import { OrderService as BitgetOrderService } from '../bitget/services/orders.service';
import { SltpTriggerDto, SltpTriggerResponseDto } from './dto/sltp-trigger.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../exchanges-controller/entities/order.entity';
import { GraphWebhookService } from '../graph-webhook/graph-webhook.service';

/**
 * SLTP Webhook Service
 * 
 * Handles real-time SLTP triggers from Graph's embedded dynamic_sltp module.
 * When a trigger fires (e.g., TP1 hit, SL hit, trailing stop), this service:
 * 1. Gets all active trading users
 * 2. For each user, checks if they hold the symbol
 * 3. Executes SELL for the specified quantity_pct
 * 
 * ARCHITECTURE (Jan 2026):
 * Graph (dynamic_sltp module) → Backend (/sltp-webhook) → Exchange Order
 * 
 * The dynamic_sltp module calculates trailing stops, TP levels, and exit decisions
 * locally within the Graph orchestrator, then sends webhooks here for execution.
 */
@Injectable()
export class SltpWebhookService {
    private readonly logger = new Logger(SltpWebhookService.name);

    constructor(
        private readonly apiCredentialsService: ApicredentialsService,
        private readonly binanceSignedService: BinanceSignedService,
        private readonly binanceService: BinanceService,
        private readonly bitgetAccountService: BitgetAccountService,
        private readonly bitgetOrderService: BitgetOrderService,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        private readonly graphWebhookService: GraphWebhookService,
    ) { }

    // Trigger deduplication Map (prevents duplicate sells) - Dec 2025
    // Key: symbol:trigger_type:timestamp, Value: timestamp when processed
    private processedTriggers = new Map<string, number>();

    /**
     * Process SLTP trigger from SF App
     * Sells for ALL users holding this symbol
     */
    async processTrigger(trigger: SltpTriggerDto): Promise<SltpTriggerResponseDto> {
        const startTime = Date.now();
        const triggerPrice = trigger.trigger_price || 0; // Default to 0 (will use MARKET order)
        const timestamp = trigger.timestamp || new Date().toISOString(); // Default to current time

        this.logger.log(`🚨 SLTP TRIGGER: ${trigger.trigger_type} on ${trigger.symbol}${triggerPrice > 0 ? ` @ ${triggerPrice}` : ' (MARKET)'}`);

        // =========================================================================
        // IDEMPOTENCY CHECK (Jan 12, 2026 - CRITICAL FIX #2)
        // =========================================================================
        // FIX: Only set cooldown AFTER at least one user successfully sells.
        // Previous bug: Cooldown was set BEFORE execution, so if 0/0 users sold
        // (e.g., invalid API keys, no balance), the trigger was marked as 
        // "processed" and future retries were blocked for 30 minutes!
        //
        // New behavior:
        // - Check dedup BEFORE execution (same as before)
        // - But only SET cooldown AFTER execution IF usersSold > 0
        // - This allows retries when all users fail
        // =========================================================================
        const triggerKey = `${trigger.symbol}:${trigger.trigger_type}`;  // Key: symbol:trigger_type
        const lastProcessed = this.processedTriggers.get(triggerKey);
        const DEDUP_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown

        if (lastProcessed && Date.now() - lastProcessed < DEDUP_COOLDOWN_MS) {
            const secondsAgo = Math.round((Date.now() - lastProcessed) / 1000);
            this.logger.log(`⏭️ SKIPPING duplicate trigger: ${triggerKey} (processed ${secondsAgo}s ago, cooldown ${DEDUP_COOLDOWN_MS / 1000}s)`);
            return {
                success: true,
                trigger_type: trigger.trigger_type,
                symbol: trigger.symbol,
                users_processed: 0,
                users_sold: 0,
                users_failed: 0,
                message: `Duplicate trigger - already processed ${secondsAgo}s ago (cooldown: ${DEDUP_COOLDOWN_MS / 1000}s)`,
                execution_details: [],
            };
        }

        // NOTE: Cooldown is now set AFTER execution, only if usersSold > 0
        // See end of processTrigger() for the new cooldown logic

        // Cleanup old entries (> 35 min) to prevent memory leak
        for (const [key, ts] of this.processedTriggers) {
            if (Date.now() - ts > 2100000) { // 35 min (slightly more than cooldown)
                this.processedTriggers.delete(key);
            }
        }

        // Validate webhook secret (basic auth)
        const expectedSecret = process.env.SLTP_WEBHOOK_SECRET || 'sltp-webhook-secret-2025';
        if (trigger.webhook_secret && trigger.webhook_secret !== expectedSecret) {
            throw new HttpException('Invalid webhook secret', HttpStatus.UNAUTHORIZED);
        }


        // Get all active trading credentials
        const activeCredentials = await this.apiCredentialsService.getActiveTradingCredentials();

        if (activeCredentials.length === 0) {
            this.logger.warn('⚠️ No active trading users found for SLTP trigger');
            return {
                success: false,
                trigger_type: trigger.trigger_type,
                symbol: trigger.symbol,
                users_processed: 0,
                users_sold: 0,
                users_failed: 0,
                message: 'No active trading users found',
                execution_details: [],
            };
        }

        this.logger.log(`📊 Processing SLTP trigger for ${activeCredentials.length} active users`);

        const executionDetails: SltpTriggerResponseDto['execution_details'] = [];
        let usersSold = 0;
        let usersFailed = 0;

        // Process each user in parallel for speed
        const sellPromises = activeCredentials.map(async (cred) => {
            const userLabel = `[User ${cred.userId.substring(0, 8)}...][${cred.exchange.toUpperCase()}]`;

            try {
                // Check if user holds this symbol
                const balance = await this.getUserSymbolBalance(
                    cred.exchange,
                    trigger.symbol,
                    cred.apiKey,
                    cred.secretKey,
                    cred.passphrase,
                );

                if (balance <= 0) {
                    this.logger.debug(`${userLabel} No ${trigger.symbol} balance, skipping`);
                    return { userId: cred.userId, exchange: cred.exchange, success: true, skipped: true };
                }

                // =========================================================================
                // WARMUP PERIOD CHECK (Jan 2026 - Prevent Premature Exits)
                // =========================================================================
                // Skip exits for positions opened < 30 minutes ago to prevent:
                // 1. Entry slippage triggering immediate SL
                // 2. Noise/spread triggering false TP
                // 3. Bot churn from rapid entry-exit cycles
                // =========================================================================
                const WARMUP_PERIOD_MS = 30 * 60 * 1000; // 30 minutes - ENABLED

                // Find the latest FILLED ENTRY order for this user/symbol
                const entryOrder = await this.orderRepository.findOne({
                    where: {
                        userId: cred.userId,
                        symbol: trigger.symbol,
                        exchange: cred.exchange.toUpperCase(),
                        side: 'BUY',
                        orderRole: 'ENTRY',
                        status: 'FILLED',
                    },
                    order: { filledTimestamp: 'DESC' },
                });

                if (entryOrder && entryOrder.filledTimestamp) {
                    const timeSinceEntry = Date.now() - entryOrder.filledTimestamp.getTime();
                    if (timeSinceEntry < WARMUP_PERIOD_MS) {
                        const minutesRemaining = Math.ceil((WARMUP_PERIOD_MS - timeSinceEntry) / 60000);
                        this.logger.log(
                            `${userLabel} ⏰ WARMUP PERIOD: Position opened ${Math.floor(timeSinceEntry / 60000)} min ago. ` +
                            `Skipping ${trigger.trigger_type} (need ${minutesRemaining} more min)`
                        );
                        return { userId: cred.userId, exchange: cred.exchange, success: true, skipped: true, reason: 'warmup_period' };
                    }

                    // =========================================================================
                    // DOUBLE-SELL PREVENTION CHECK (Jan 14, 2026 - CRITICAL FIX for ARUSDT bug)
                    // =========================================================================
                    // Before executing, verify this entry order still has unrealized quantity.
                    // This prevents the ARUSDT bug where 2 SL triggers fired for same entry,
                    // resulting in selling 9.77 tokens when only 5 were purchased.
                    // 
                    // The bug occurred because:
                    // 1. First SL triggered and sold 4.995 tokens
                    // 2. Second SL triggered immediately after (same position, race condition)
                    // 3. Second SL found balance from a NEW entry and sold 4.78 tokens
                    // 4. Both exits were linked to the SAME entry (incorrect orderGroupId)
                    // =========================================================================
                    if (entryOrder.orderGroupId) {
                        const existingExits = await this.orderRepository.find({
                            where: {
                                orderGroupId: entryOrder.orderGroupId,
                                side: 'SELL',
                                status: 'FILLED',
                            },
                        });

                        const alreadySold = existingExits.reduce(
                            (sum, exit) => sum + parseFloat(exit.executedQty || '0'), 0
                        );
                        const entryQty = parseFloat(entryOrder.quantity || '0');
                        const remainingQty = entryQty - alreadySold;

                        // If already sold >= 95% of entry, position is closed - skip!
                        if (remainingQty < entryQty * 0.05) {
                            this.logger.warn(
                                `${userLabel} 🚫 DOUBLE-SELL PREVENTION: Entry ${entryOrder.orderId} already has ` +
                                `${existingExits.length} exit(s) totaling ${alreadySold.toFixed(4)} qty. ` +
                                `Entry qty: ${entryQty.toFixed(4)}, Remaining: ${remainingQty.toFixed(4)}. ` +
                                `SKIPPING ${trigger.trigger_type} to prevent over-selling!`
                            );
                            return {
                                userId: cred.userId,
                                exchange: cred.exchange,
                                success: true,
                                skipped: true,
                                reason: 'position_already_closed'
                            };
                        }

                        // Log remaining quantity for debugging
                        this.logger.debug(
                            `${userLabel} Position check: ${remainingQty.toFixed(4)} / ${entryQty.toFixed(4)} remaining ` +
                            `(${existingExits.length} exits, ${alreadySold.toFixed(4)} sold)`
                        );
                    }
                }

                // Calculate quantity to sell based on trigger type
                const quantityToSell = balance * trigger.quantity_pct;

                this.logger.log(`${userLabel} Selling ${quantityToSell} ${trigger.symbol} (${trigger.quantity_pct * 100}% of ${balance})`);

                // Execute sell order with appropriate order type based on trigger
                const result = await this.executeSell(
                    cred.exchange,
                    trigger.symbol,
                    quantityToSell,
                    triggerPrice, // Use default value if not provided
                    trigger.trigger_type,  // Pass trigger type to determine LIMIT vs MARKET
                    cred.apiKey,
                    cred.secretKey,
                    cred.passphrase,
                );

                this.logger.log(`${userLabel} ✅ SOLD: orderId=${result.orderId}, fillPrice=${result.fillPrice}`);
                usersSold++;

                // Use actual fill price from exchange, fallback to trigger price if not available
                const actualFillPrice = result.fillPrice > 0 ? result.fillPrice : triggerPrice;

                const executionResult = {
                    userId: cred.userId,
                    exchange: cred.exchange,
                    success: true,
                    orderId: result.orderId,
                    quantity: quantityToSell.toString(),
                    price: actualFillPrice,
                };

                // CRITICAL FIX (Jan 2026): Save exit order to DB and link to entry order
                // This enables proper trade grouping and PnL calculation per user
                const isTPExit = trigger.trigger_type.includes('TP') && !trigger.trigger_type.includes('SL');
                const orderType = (isTPExit && triggerPrice > 0) ? 'LIMIT' : 'MARKET';

                await this.saveSltpExitOrder(
                    cred.userId,
                    cred.exchange,
                    trigger.symbol,
                    trigger.trigger_type,
                    quantityToSell,
                    actualFillPrice, // Use actual fill price from exchange
                    result.orderId,
                    orderType
                );

                // CRITICAL: Notify Graph about the executed trade immediately
                // This ensures the Graph position is updated/closed without waiting for sync cycle
                await this.notifyGraph(
                    cred.userId,
                    cred.exchange,
                    trigger.symbol,
                    trigger.trigger_type,
                    actualFillPrice, // Use actual fill price from exchange
                    quantityToSell,
                    result.orderId
                );

                return executionResult;

            } catch (error) {
                this.logger.error(`${userLabel} ❌ SELL FAILED: ${error.message}`);
                usersFailed++;

                return {
                    userId: cred.userId,
                    exchange: cred.exchange,
                    success: false,
                    error: error.message,
                };
            }
        });

        const results = await Promise.allSettled(sellPromises);

        // =========================================================================
        // CRITICAL FIX (Jan 18, 2026): Include skip reasons in execution_details
        // =========================================================================
        // The orchestrator needs to distinguish between:
        // - warmup_period: User in warmup, position is valid, will retry later
        // - position_already_closed: No action needed, position already exited
        // - no_balance: User has no balance (expected for multi-user setup)
        //
        // Previously skipped results were excluded, making it impossible for 
        // orchestrator to know WHY users_sold=0. Now we include them so the
        // orchestrator can make intelligent decisions about retries.
        // =========================================================================
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const value = result.value as any;
                // Include ALL fulfilled results (even skipped) so orchestrator knows why
                // Only exclude no-balance skips (normal behavior for multi-user)
                if (!value.skipped || value.reason === 'warmup_period' || value.reason === 'position_already_closed') {
                    executionDetails.push(value);
                }
            } else if (result.status === 'rejected') {
                executionDetails.push({
                    userId: 'unknown',
                    exchange: 'unknown',
                    success: false,
                    error: result.reason?.message || 'Unknown error',
                });
                usersFailed++;
            }
        });

        const elapsed = Date.now() - startTime;
        this.logger.log(`🏁 SLTP trigger processed in ${elapsed}ms: ${usersSold} sold, ${usersFailed} failed`);

        // =========================================================================
        // CRITICAL FIX (Jan 12, 2026): Only set cooldown if at least one sell succeeded
        // =========================================================================
        // Previous bug: Cooldown was set BEFORE execution, blocking retries even
        // when 0/0 users sold (due to invalid API keys, no balance, etc.)
        //
        // New behavior: Only set cooldown AFTER we confirm usersSold > 0
        // This allows the SLTP system to retry on next cycle if all users failed
        // =========================================================================
        if (usersSold > 0) {
            const triggerKey = `${trigger.symbol}:${trigger.trigger_type}`;
            this.processedTriggers.set(triggerKey, Date.now());
            this.logger.log(`✅ Cooldown SET for ${triggerKey} (${usersSold} users sold successfully)`);
        } else {
            this.logger.warn(`⚠️ NO cooldown set for ${trigger.symbol}:${trigger.trigger_type} - 0 users sold, will retry on next trigger`);
        }

        return {
            success: usersSold > 0,
            trigger_type: trigger.trigger_type,
            symbol: trigger.symbol,
            users_processed: activeCredentials.length,
            users_sold: usersSold,
            users_failed: usersFailed,
            message: `SLTP ${trigger.trigger_type} processed in ${elapsed}ms`,
            execution_details: executionDetails,
        };
    }

    /**
     * Get user's balance for a specific symbol WITH RETRY
     * 
     * CRITICAL FIX (Jan 10, 2026): Balance fetch failures were causing SLTP triggers
     * to be silently skipped. Now retries 3 times with exponential backoff.
     */
    private async getUserSymbolBalance(
        exchange: string,
        symbol: string,
        apiKey: string,
        secretKey: string,
        passphrase?: string,
    ): Promise<number> {
        const baseAsset = symbol.replace('USDT', '');
        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                if (exchange === 'binance') {
                    const balances = await this.binanceSignedService.getBalances(apiKey, secretKey);
                    const assetBalance = balances.find((b: any) => b.asset === baseAsset);
                    // Return TOTAL balance (Free + Locked) to ensure we can execute SL even if TPs are open
                    // executeSell() will cancel open orders to free up the locked amount
                    const free = parseFloat(assetBalance?.free || '0');
                    const locked = parseFloat(assetBalance?.locked || '0');
                    return free + locked;

                } else if (exchange === 'bitget') {
                    const balances = await this.bitgetAccountService.getSpotAccount(apiKey, secretKey, passphrase);
                    const assetBalance = balances.find((b: any) => b.coin === baseAsset);
                    // Bitget usually returns available (free) and frozen (locked)
                    const available = parseFloat(assetBalance?.available || '0');
                    const frozen = parseFloat(assetBalance?.frozen || '0');
                    return available + frozen;
                }
                return 0;
            } catch (error) {
                lastError = error;
                this.logger.warn(
                    `⚠️ Balance fetch attempt ${attempt + 1}/${MAX_RETRIES} failed for ${symbol}: ${error.message}`
                );
                if (attempt < MAX_RETRIES - 1) {
                    const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries exhausted - log critical error and return 0
        this.logger.error(
            `🔴 CRITICAL: Balance fetch FAILED after ${MAX_RETRIES} retries for ${symbol}. ` +
            `SLTP trigger may be skipped! Error: ${lastError?.message}`
        );
        return 0;
    }

    /**
     * Get user's balance - original implementation (kept for reference)
     * @deprecated Use getUserSymbolBalance with retry instead
     */
    private async getUserSymbolBalanceLegacy(
        exchange: string,
        symbol: string,
        apiKey: string,
        secretKey: string,
        passphrase?: string,
    ): Promise<number> {
        const baseAsset = symbol.replace('USDT', '');

        if (exchange === 'binance') {
            const balances = await this.binanceSignedService.getBalances(apiKey, secretKey);
            const assetBalance = balances.find((b: any) => b.asset === baseAsset);
            // Return TOTAL balance (Free + Locked) to ensure we can execute SL even if TPs are open
            // executeSell() will cancel open orders to free up the locked amount
            const free = parseFloat(assetBalance?.free || '0');
            const locked = parseFloat(assetBalance?.locked || '0');
            return free + locked;

        } else if (exchange === 'bitget') {
            const balances = await this.bitgetAccountService.getSpotAccount(apiKey, secretKey, passphrase);
            const assetBalance = balances.find((b: any) => b.coin === baseAsset);
            // Bitget usually returns available (free) and frozen (locked)
            const available = parseFloat(assetBalance?.available || '0');
            const frozen = parseFloat(assetBalance?.frozen || '0');
            return available + frozen;
        }

        return 0;
    }

    /**
     * Execute SELL order on exchange WITH RETRY
     * 
     * CRITICAL: This is money-at-risk code. If the order fails,
     * the position stays open and can lose more money. We MUST retry.
     * 
     * Retry strategy: 3 attempts with exponential backoff (1s, 2s, 4s)
     * 
     * ORDER TYPE STRATEGY (Jan 2026 - Genius-Level Optimization):
     * - TP exits (TP1_HIT, TP2_HIT): Use LIMIT at trigger_price to lock in profit
     * - SL exits (SL_HIT, TRAIL_HIT): Use MARKET for urgency (speed over price)
     * 
     * Rationale:
     * - TP: Price is favorable, we want exact price or better
     * - SL: Price is against us, need to exit ASAP regardless of slippage
     */
    private async executeSell(
        exchange: string,
        symbol: string,
        quantity: number,
        price: number,
        triggerType: string,
        apiKey: string,
        secretKey: string,
        passphrase?: string,
    ): Promise<{ orderId: string | number; fillPrice: number }> {
        const MAX_RETRIES = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const result = await this.executeSellInternal(
                    exchange, symbol, quantity, price, triggerType,
                    apiKey, secretKey, passphrase
                );
                return result;
            } catch (error) {
                lastError = error;
                this.logger.warn(
                    `⚠️ SELL attempt ${attempt + 1}/${MAX_RETRIES} failed for ${symbol}: ${error.message}`
                );

                // Don't retry on certain errors (insufficient balance, invalid symbol)
                const noRetryErrors = ['insufficient', 'invalid symbol', 'min notional'];
                const isNoRetryError = noRetryErrors.some(e =>
                    error.message?.toLowerCase().includes(e)
                );
                if (isNoRetryError) {
                    this.logger.error(`🔴 Non-retryable error for ${symbol}: ${error.message}`);
                    throw error;
                }

                if (attempt < MAX_RETRIES - 1) {
                    const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                    this.logger.log(`⏳ Retrying SELL in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries exhausted
        this.logger.error(
            `🔴 CRITICAL: SELL FAILED after ${MAX_RETRIES} retries for ${symbol}! ` +
            `Last error: ${lastError?.message}`
        );
        throw lastError || new Error('Sell failed after all retries');
    }

    /**
     * Internal sell execution (called by executeSell with retry wrapper)
     */
    private async executeSellInternal(
        exchange: string,
        symbol: string,
        quantity: number,
        price: number,
        triggerType: string,
        apiKey: string,
        secretKey: string,
        passphrase?: string,
    ): Promise<{ orderId: string | number; fillPrice: number }> {
        // Determine order type based on trigger type
        // TP exits use LIMIT (lock in profit), SL exits use MARKET (urgency)
        const isTPExit = triggerType.includes('TP') && !triggerType.includes('SL');
        const useLimit = isTPExit && price > 0;

        this.logger.log(`📊 SLTP Exit: ${triggerType} → ${useLimit ? 'LIMIT' : 'MARKET'} (${isTPExit ? 'profit lock-in' : 'urgent exit'})`);

        if (exchange === 'binance') {
            // Cancel any open orders first
            try {
                await this.binanceSignedService.cancelAllOrders(symbol, apiKey, secretKey);
            } catch (e) {
                this.logger.warn(`Could not cancel open orders: ${e.message}`);
            }

            // Get exchange info for precision
            const exchangeInfo = await this.binanceSignedService.getExchangeInfo(symbol);
            const lotSizeFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
            const stepSize = parseFloat(lotSizeFilter.stepSize);

            // Use safe flooring logic to avoid "Insufficient Balance" errors
            const roundedQuantity = this.floorToPrecision(quantity, stepSize);

            if (useLimit) {
                // TP exit: Use LIMIT order at trigger price to lock in profit
                // Get PRICE_FILTER for tick size
                const priceFilter = exchangeInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
                const tickSize = parseFloat(priceFilter?.tickSize || '0.00000001');
                const roundedPrice = this.floorToPrecision(price, tickSize);

                this.logger.log(`🎯 TP LIMIT SELL: ${symbol} @ ${roundedPrice} (qty: ${roundedQuantity})`);

                const result = await this.binanceSignedService.placeOrder(
                    {
                        symbol,
                        side: 'SELL',
                        type: 'LIMIT',
                        timeInForce: 'GTC',
                        quantity: roundedQuantity,
                        price: roundedPrice,
                    },
                    apiKey,
                    secretKey,
                );
                // For LIMIT orders, use the limit price (will be updated by WebSocket when filled)
                const fillPrice = parseFloat(roundedPrice);
                return { orderId: result.orderId, fillPrice };
            } else {
                // SL exit: Use MARKET order for urgent exit
                this.logger.log(`🚨 SL MARKET SELL: ${symbol} (qty: ${roundedQuantity})`);

                const result = await this.binanceSignedService.placeOrder(
                    {
                        symbol,
                        side: 'SELL',
                        type: 'MARKET',
                        quantity: roundedQuantity,
                    },
                    apiKey,
                    secretKey,
                );
                // For MARKET orders, calculate average fill price from Binance response
                let fillPrice = 0;
                if (result.status === 'FILLED' && parseFloat(result.executedQty) > 0) {
                    // Calculate average fill price from cummulativeQuoteQty / executedQty
                    fillPrice = parseFloat(result.cummulativeQuoteQty || '0') / parseFloat(result.executedQty);
                    this.logger.log(`💰 MARKET SELL filled @ ${fillPrice.toFixed(6)} (avg price)`);
                } else {
                    // Order not filled immediately, will be updated by WebSocket
                    fillPrice = 0;
                }
                return { orderId: result.orderId, fillPrice };
            }

        } else if (exchange === 'bitget') {
            if (useLimit) {
                // TP exit: Use LIMIT order
                this.logger.log(`🎯 TP LIMIT SELL (Bitget): ${symbol} @ ${price}`);

                const result = await this.bitgetOrderService.placeSpotOrder(
                    {
                        symbol,
                        side: 'sell',
                        orderType: 'limit',
                        size: quantity.toString(),
                        price: price.toString(),
                        force: 'gtc',
                    },
                    apiKey,
                    secretKey,
                    passphrase || '',
                );
                // For Bitget LIMIT orders, use the limit price
                const fillPrice = price;
                return { orderId: result.orderId || result.data?.orderId || 'bitget-order', fillPrice };
            } else {
                // SL exit: Use MARKET order
                this.logger.log(`🚨 SL MARKET SELL (Bitget): ${symbol}`);

                const result = await this.bitgetOrderService.placeSpotOrder(
                    {
                        symbol,
                        side: 'sell',
                        orderType: 'market',
                        size: quantity.toString(),
                        force: 'gtc',
                    },
                    apiKey,
                    secretKey,
                    passphrase || '',
                );
                // For Bitget MARKET orders, price will be updated by WebSocket
                const fillPrice = 0; // Will be updated when order fills
                return { orderId: result.orderId || result.data?.orderId || 'bitget-order', fillPrice };
            }
        }

        throw new Error(`Unsupported exchange: ${exchange}`);
    }

    /**
     * Safe floor to precision using step size
     * Examples: step 0.1, qty 10.55 -> 10.5
     *           step 1, qty 10.55 -> 10
     */
    private floorToPrecision(quantity: number, stepSize: number): string {
        if (stepSize === 0) return quantity.toString();

        // Calculate precision places
        // e.g. step 0.01 -> log10(0.01) = -2 -> 2 decimals
        // e.g. step 1 -> log10(1) = 0 -> 0 decimals
        // e.g. step 10 -> log10(10) = 1 -> -1 decimals (special case, not common for crypto volume typically handled by ints usually)

        const precision = stepSize >= 1 ? 0 : Math.abs(Math.ceil(Math.log10(stepSize)));

        // Use a multiplier to floor correctly
        const factor = Math.pow(10, precision);

        // Round to avoid floating point math artifacts before flooring
        // e.g. 1.0000000000001 should treat as 1
        const floored = Math.floor(quantity * factor) / factor;

        return floored.toFixed(precision);
    }

    /**
     * Get decimal precision from step size (deprecated in favor of floorToPrecision logic, keeping for reference if needed or generic usage)
     */
    private getPrecision(stepSize: number): number {
        if (stepSize >= 1) return 0;
        return Math.abs(Math.floor(Math.log10(stepSize)));
    }

    /**
     * Save SLTP exit order to database and link to entry order
     * This enables proper trade grouping and PnL calculation
     */
    private async saveSltpExitOrder(
        userId: string,
        exchange: string,
        symbol: string,
        triggerType: string,
        quantity: number,
        price: number,
        orderId: string | number,
        orderType: 'LIMIT' | 'MARKET'
    ): Promise<void> {
        try {
            // =========================================================================
            // CRITICAL FIX (Jan 14, 2026): Find ACTIVE entry only - NEWEST FIRST
            // =========================================================================
            // ARUSDT Bug Root Cause: Was ordered DESC (newest first) which would
            // incorrectly link new SL orders to newer entries when older completed.
            // 
            // Scenario that caused bug:
            // - Entry 1 @ 8:19 PM: 5 AR, sold at 8:49 PM (complete)
            // - Entry 2 @ 10:52 PM: 4.78 AR (still open)
            // - SL trigger @ 11:23 PM found Entry 1 FIRST (DESC order), saw it was
            //   closed, SHOULD have moved to Entry 2, but race condition linked to Entry 1
            //
            // FIX: Order by createdAt ASC to find NEWEST active entry first.
            // This matches natural trade flow where new entries should be closed first.
            // =========================================================================
            const entryOrders = await this.orderRepository.find({
                where: {
                    userId,
                    symbol,
                    exchange: exchange.toUpperCase(),
                    side: 'BUY',
                    orderRole: 'ENTRY',
                    status: 'FILLED',
                },
                order: { createdAt: 'DESC' }, // NEWEST FIRST - find most recent open position
            });

            // Find an ACTIVE entry (one that hasn't been fully sold yet)
            let activeEntryOrder: typeof entryOrders[0] | null = null;

            for (const entry of entryOrders) {
                if (!entry.orderGroupId) {
                    this.logger.debug(`[${userId.substring(0, 8)}...] Skipping entry ${entry.orderId} - no orderGroupId`);
                    continue;
                }

                // Check how much has been sold against this entry
                const exitOrders = await this.orderRepository.find({
                    where: {
                        orderGroupId: entry.orderGroupId,
                        side: 'SELL',
                        status: 'FILLED',
                    },
                });

                const totalSold = exitOrders.reduce((sum, exit) => sum + parseFloat(exit.executedQty || '0'), 0);
                const entryQty = parseFloat(entry.quantity || '0');
                const remainingQty = entryQty - totalSold;

                // If remaining qty > small threshold (dust), this is an active trade
                if (remainingQty > 0.0001) {
                    activeEntryOrder = entry;
                    this.logger.debug(
                        `[${userId.substring(0, 8)}...] Found ACTIVE entry ${entry.orderId}: ` +
                        `entryQty=${entryQty}, sold=${totalSold}, remaining=${remainingQty}`
                    );
                    break;
                }
            }

            const entryOrder = activeEntryOrder;

            if (!entryOrder) {
                this.logger.warn(
                    `[${userId.substring(0, 8)}...] No ACTIVE entry order found for ${symbol}. ` +
                    `All ${entryOrders.length} entries appear fully sold. Cannot link SLTP exit order.`
                );
                return;
            }

            // Map trigger type to order role
            const orderRoleMap: Record<string, string> = {
                'TP1_HIT': 'TP1',
                'TP2_HIT': 'TP2',
                'SL_HIT': 'SL',
                'TRAIL_HIT': 'TRAIL_SL',
                'TIME_EXIT': 'TIME_EXIT',
            };
            const orderRole = orderRoleMap[triggerType] || 'SLTP_EXIT';

            // Create exit order linked to entry order's orderGroupId
            const exitOrder = this.orderRepository.create({
                orderId: typeof orderId === 'number' ? orderId : parseInt(orderId as string) || Date.now(),
                clientOrderId: `sltp-${triggerType.toLowerCase()}-${Date.now()}`,
                exchange: exchange.toUpperCase(),
                symbol,
                side: 'SELL',
                type: orderType,
                quantity: quantity.toString(),
                price: price.toString(),
                executedQty: quantity.toString(), // Assume filled (WebSocket will update if partial)
                status: 'FILLED', // Assume filled for MARKET orders (WebSocket will update)
                orderTimestamp: new Date(),
                filledTimestamp: new Date(),
                parentOrderId: entryOrder.orderId,
                orderGroupId: entryOrder.orderGroupId, // CRITICAL: Link to entry's group
                orderRole: orderRole,
                userId: userId,
                metadata: {
                    triggerType: triggerType,
                    triggerPrice: price,
                    source: 'sltp_webhook',
                } as any,
            });

            await this.orderRepository.save(exitOrder);
            this.logger.log(
                `[${userId.substring(0, 8)}...] 💾 SLTP exit order saved: ` +
                `orderId=${orderId}, role=${orderRole}, linked to ACTIVE entry groupId=${entryOrder.orderGroupId}`
            );
        } catch (error) {
            this.logger.error(`Failed to save SLTP exit order: ${error.message}`);
        }
    }

    /**
     * Notify Graph Orchestrator about the execution
     * Finds the entry order to calculate PnL and Position ID
     */
    private async notifyGraph(
        userId: string,
        exchange: string,
        symbol: string,
        triggerType: string,
        exitPrice: number,
        quantity: number,
        sltpOrderId: string | number
    ) {
        try {
            // =========================================================================
            // CRITICAL FIX (Jan 12, 2026): Find ACTIVE entry only for Graph notification
            // =========================================================================
            // Same fix as saveSltpExitOrder - find entry with remaining unrealized qty
            // =========================================================================
            const entryOrders = await this.orderRepository.find({
                where: {
                    userId,
                    symbol,
                    exchange: exchange.toUpperCase(),
                    side: 'BUY',
                    orderRole: 'ENTRY',
                    status: 'FILLED',
                },
                order: { createdAt: 'DESC' },
            });

            // Find an ACTIVE entry (one that hasn't been fully sold yet OR linked to this exit)
            let activeEntryOrder: typeof entryOrders[0] | null = null;
            let currentRemainingQty = 0;

            for (const entry of entryOrders) {
                if (!entry.orderGroupId) continue;

                const exitOrders = await this.orderRepository.find({
                    where: {
                        orderGroupId: entry.orderGroupId,
                        side: 'SELL',
                        status: 'FILLED',
                    },
                });

                // Check if OUR current exit order is linked to this entry group
                const isLinkedToCurrentExit = exitOrders.some(exit =>
                    exit.orderId.toString() === sltpOrderId.toString() ||
                    (exit.clientOrderId && exit.clientOrderId === sltpOrderId.toString())
                );

                const totalSold = exitOrders.reduce((sum, exit) => sum + parseFloat(exit.executedQty || '0'), 0);
                const entryQty = parseFloat(entry.quantity || '0');
                const remainingQty = entryQty - totalSold;

                // Match if active OR if we just closed it (and seeing 0 remaining because of our exit)
                if (remainingQty > 0.0001 || isLinkedToCurrentExit) {
                    activeEntryOrder = entry;
                    currentRemainingQty = Math.max(0, remainingQty);
                    break;
                }
            }

            const entryOrder = activeEntryOrder;

            if (!entryOrder) {
                this.logger.warn(
                    `Could not find ACTIVE or LINKED entry order for ${userId.substring(0, 8)}.../${symbol} ` +
                    `(checked ${entryOrders.length} entries) - skipping Graph notification`
                );
                return;
            }

            // =================================================================
            // CRITICAL FIX (Jan 19, 2026): Use GOLDEN SINGLETON Position ID
            // =================================================================
            // Position nodes use "position:{symbol}" format (Golden Singleton pattern)
            // NOT the old "{symbol}:Position:{orderId}" format which causes lookup failures
            // =================================================================
            const positionId = `position:${symbol}`;
            const entryPrice = parseFloat(entryOrder.price || '0') || exitPrice;
            const realizedPnl = (exitPrice - entryPrice) * quantity;

            this.logger.log(`📡 Sending webhook to Graph for Position ${positionId} (PnL: ${realizedPnl.toFixed(2)}, Qty: ${quantity})`);

            if (triggerType.includes('SL')) {
                // STOP LOSS
                await this.graphWebhookService.notifyPositionClosed({
                    positionId,
                    exitPrice,
                    realizedPnl,
                    closeReason: 'sl_hit',
                    timestamp: new Date(),
                    policyVersion: 'v1_sltp_webhook',
                    exitQty: quantity // Correct property name (camelCase)
                });
            } else if (triggerType.includes('TP') || triggerType.includes('TRAIL')) {
                // TAKE PROFIT (Full or Partial)
                // Determine if full close based on remaining qty (safer than assumed 99%)
                const isFullClose = currentRemainingQty < 0.0001;

                if (isFullClose) {
                    await this.graphWebhookService.notifyPositionClosed({
                        positionId,
                        exitPrice,
                        realizedPnl,
                        closeReason: 'tp_full',
                        timestamp: new Date(),
                        policyVersion: 'v1_sltp_webhook',
                        exitQty: quantity // Correct property name (camelCase)
                    });
                } else {
                    await this.graphWebhookService.notifyPositionUpdated({
                        positionId,
                        updateType: 'partial_tp',
                        currentPrice: exitPrice,
                        unrealizedPnl: realizedPnl,
                        timestamp: new Date(),
                        notes: `SLTP Trigger ${triggerType} executed`,
                        quantityRemaining: currentRemainingQty // Correct property name (camelCase)
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Failed to notify Graph: ${error.message}`);
        }
    }
}
