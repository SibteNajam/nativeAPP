# Bitget TP/SL Implementation Guide

## Problem Statement
Binance supports **OCO (One-Cancels-Other)** orders where:
- When limit buy fills → Automatically place 2 OCO orders (TP at +5%, TP at +8%, both with SL at -5%)
- If SL hits → Both orders cancel
- If TP1 hits → First order fills, second stays active
- Orders are **linked** - managed by exchange

**Bitget does NOT support OCO orders.** We need to simulate this behavior.

---

## Bitget Order Placement Options

### 1. **Normal Order** (`tpslType=normal`)
```json
{
  "symbol": "ZECUSDT",
  "side": "sell",
  "orderType": "limit",
  "force": "gtc",
  "price": "407.925",
  "size": "0.037354"
}
```
✅ Simple limit/market orders  
❌ No automatic TP/SL  

### 2. **SPOT TP/SL Order** (`tpslType=tpsl`)
```json
{
  "symbol": "ZECUSDT",
  "side": "sell",
  "orderType": "limit",
  "triggerPrice": "407.925",
  "price": "407.925",
  "size": "0.037354",
  "tpslType": "tpsl"
}
```
✅ Trigger-based order (activates when price reaches triggerPrice)  
✅ Good for SL orders  
❌ Only supports **ONE** trigger per order  
❌ Can't link multiple orders  

### 3. **Normal Order with TP/SL Parameters**
```json
{
  "symbol": "ZECUSDT",
  "side": "sell",
  "orderType": "limit",
  "force": "gtc",
  "price": "407.925",
  "size": "0.037354",
  "presetTakeProfitPrice": "407.925",
  "executeTakeProfitPrice": "407.925",
  "presetStopLossPrice": "369.075",
  "executeStopLossPrice": "369.075"
}
```
✅ Built-in TP/SL on the order itself  
❌ Only **ONE** take-profit level (can't do +5% and +8%)  
❌ TP and SL both trigger from the **same order**  

### 4. **Plan Order** (Trigger Order)
```json
{
  "symbol": "ZECUSDT",
  "side": "sell",
  "triggerPrice": "407.925",
  "orderType": "limit",
  "executePrice": "407.925",
  "size": "0.037354",
  "triggerType": "market_price"
}
```
✅ Trigger-based conditional order  
✅ Can place multiple plan orders  
❌ Not linked - if one fills, others stay active  

---

## Recommended Solution: Hybrid Approach

Since Bitget doesn't support OCO, we'll use **Plan Orders + Manual Cancellation Logic**.

### Architecture

```
Limit Buy Fills (WebSocket Event)
         │
         ├─► Place 3 Plan Orders:
         │   ├─► Plan Order 1: TP +5% (50% qty)
         │   ├─► Plan Order 2: TP +8% (50% qty - 0.5% slippage)
         │   └─► Plan Order 3: SL -5% (100% qty)
         │
         ├─► Store order IDs in memory/database
         │
         └─► Monitor WebSocket for fills
             │
             ├─► If SL fills → Cancel both TP orders
             ├─► If TP1 fills → Cancel TP2, keep SL for remaining 50%
             └─► If TP2 fills → Cancel TP1, keep SL for remaining 50%
```

### Implementation Steps

#### **Step 1: Place Plan Orders After Limit Buy Fills**

```typescript
private async placeBitgetAutoTPSL(
  symbol: string,
  filledPrice: number,
  filledQty: number
): Promise<void> {
  try {
    const apiKey = this.configService.get<string>('BITGET_API_KEY');
    const secretKey = this.configService.get<string>('BITGET_SECRET_KEY');
    const passphrase = this.configService.get<string>('BITGET_PASSPHRASE');

    if (!apiKey || !secretKey || !passphrase) {
      this.logger.error('❌ Bitget credentials missing');
      return;
    }

    // Get current balance
    const asset = symbol.replace('USDT', '');
    const balances = await this.bitgetAccountService.getSpotAccount(apiKey, secretKey, passphrase);
    const assetBalance = balances.find((b: any) => b.coin === asset);
    const availableQty = parseFloat(assetBalance?.available || '0');

    if (availableQty <= 0) {
      this.logger.warn(`⚠️ No available ${asset} balance`);
      return;
    }

    // Calculate prices
    const tp1Price = filledPrice * 1.05; // +5%
    const tp2Price = filledPrice * 1.08; // +8%
    const slPrice = filledPrice * 0.95; // -5%

    // Calculate quantities
    const qty1 = availableQty * 0.5; // 50%
    const qty2 = availableQty * 0.5 * 0.995; // 50% with slippage

    // Get precision from exchange info
    const exchangeInfo = await this.bitgetService.getExchangeInfo(symbol);
    const quantityPrecision = parseInt(exchangeInfo.quantityPrecision || '8');
    const pricePrecision = parseInt(exchangeInfo.pricePrecision || '8');

    const alignedQty1 = qty1.toFixed(quantityPrecision);
    const alignedQty2 = qty2.toFixed(quantityPrecision);
    const alignedTp1 = tp1Price.toFixed(pricePrecision);
    const alignedTp2 = tp2Price.toFixed(pricePrecision);
    const alignedSl = slPrice.toFixed(pricePrecision);

    this.logger.log(`📈 TP1: ${alignedTp1} (+5%), Qty: ${alignedQty1}`);
    this.logger.log(`📈 TP2: ${alignedTp2} (+8%), Qty: ${alignedQty2}`);
    this.logger.log(`📉 SL: ${alignedSl} (-5%), Qty: ${availableQty.toFixed(quantityPrecision)}`);

    // Place Plan Order 1: TP +5%
    this.logger.log(`🚀 Placing Bitget Plan Order 1 (TP +5%)...`);
    const tp1Order = await this.bitgetOrderService.placePlanOrder({
      symbol: symbol,
      side: 'sell',
      triggerPrice: alignedTp1,
      orderType: 'limit',
      executePrice: alignedTp1,
      size: alignedQty1,
      triggerType: 'market_price',
      clientOid: `tp1_${Date.now()}`
    });
    this.logger.log(`✅ TP1 Plan Order placed: ${tp1Order.orderId}`);

    // Place Plan Order 2: TP +8%
    this.logger.log(`🚀 Placing Bitget Plan Order 2 (TP +8%)...`);
    const tp2Order = await this.bitgetOrderService.placePlanOrder({
      symbol: symbol,
      side: 'sell',
      triggerPrice: alignedTp2,
      orderType: 'limit',
      executePrice: alignedTp2,
      size: alignedQty2,
      triggerType: 'market_price',
      clientOid: `tp2_${Date.now()}`
    });
    this.logger.log(`✅ TP2 Plan Order placed: ${tp2Order.orderId}`);

    // Place Plan Order 3: SL -5%
    this.logger.log(`🚀 Placing Bitget Plan Order 3 (SL -5%)...`);
    const slOrder = await this.bitgetOrderService.placePlanOrder({
      symbol: symbol,
      side: 'sell',
      triggerPrice: alignedSl,
      orderType: 'market', // Market order for quick exit
      size: availableQty.toFixed(quantityPrecision),
      triggerType: 'market_price',
      clientOid: `sl_${Date.now()}`
    });
    this.logger.log(`✅ SL Plan Order placed: ${slOrder.orderId}`);

    // Store order IDs for monitoring
    // TODO: Save to database or in-memory map
    this.storeBitgetOrderGroup({
      symbol,
      tp1OrderId: tp1Order.orderId,
      tp2OrderId: tp2Order.orderId,
      slOrderId: slOrder.orderId,
      tp1Qty: alignedQty1,
      tp2Qty: alignedQty2,
    });

    this.logger.log(
      `🎉 Bitget auto TP/SL orders completed for ${symbol}! ` +
      `Filled @ ${filledPrice} → TP1: ${alignedTp1} (+5%), TP2: ${alignedTp2} (+8%), SL: ${alignedSl} (-5%)`
    );

  } catch (error) {
    this.logger.error(`❌ Error placing Bitget auto TP/SL orders: ${error.message}`);
    throw error;
  }
}
```

#### **Step 2: Monitor WebSocket for Order Fills**

You'll need to implement Bitget WebSocket monitoring (similar to Binance User Data Stream):

```typescript
// Bitget WebSocket subscription (pseudo-code)
private connectBitgetUserDataStream(): void {
  // Connect to Bitget WS: wss://ws.bitget.com/v2/ws/private
  // Subscribe to order updates
  
  this.bitgetWs.on('message', (msg) => {
    const data = JSON.parse(msg);
    
    if (data.event === 'order') {
      this.handleBitgetOrderUpdate(data);
    }
  });
}

private handleBitgetOrderUpdate(data: any): void {
  const orderId = data.orderId;
  const status = data.status; // 'filled', 'cancelled', etc.
  const symbol = data.symbol;
  
  // Check if this is one of our TP/SL orders
  const orderGroup = this.getBitgetOrderGroup(orderId);
  
  if (!orderGroup) return;
  
  if (status === 'filled') {
    if (orderId === orderGroup.tp1OrderId) {
      this.logger.log(`✅ TP1 filled for ${symbol}. Keeping TP2 active.`);
      // Optionally adjust SL to break-even or cancel it
    } else if (orderId === orderGroup.tp2OrderId) {
      this.logger.log(`✅ TP2 filled for ${symbol}. Keeping TP1 active.`);
    } else if (orderId === orderGroup.slOrderId) {
      this.logger.log(`❌ SL triggered for ${symbol}. Canceling all TP orders.`);
      // Cancel both TP orders
      await this.bitgetOrderService.cancelPlanOrder(orderGroup.tp1OrderId);
      await this.bitgetOrderService.cancelPlanOrder(orderGroup.tp2OrderId);
    }
  }
}
```

#### **Step 3: Store Order Groups**

```typescript
// In-memory storage (or use database)
private bitgetOrderGroups: Map<string, {
  symbol: string;
  tp1OrderId: string;
  tp2OrderId: string;
  slOrderId: string;
  tp1Qty: string;
  tp2Qty: string;
}> = new Map();

private storeBitgetOrderGroup(group: any): void {
  // Store by all order IDs for quick lookup
  this.bitgetOrderGroups.set(group.tp1OrderId, group);
  this.bitgetOrderGroups.set(group.tp2OrderId, group);
  this.bitgetOrderGroups.set(group.slOrderId, group);
}

private getBitgetOrderGroup(orderId: string): any {
  return this.bitgetOrderGroups.get(orderId);
}
```

---

## Alternative: Simpler TP/SL (Single Level)

If you only need **ONE** take-profit level instead of two, you can use Bitget's built-in TP/SL parameters:

```typescript
// Place normal SELL order with TP/SL attached
await this.bitgetOrderService.placeSpotOrder({
  symbol: 'ZECUSDT',
  side: 'sell',
  orderType: 'limit',
  force: 'gtc',
  price: '407.925', // Limit price
  size: '0.074708', // Full quantity
  presetTakeProfitPrice: '407.925', // TP at +5%
  executeTakeProfitPrice: '407.925',
  presetStopLossPrice: '369.075', // SL at -5%
  executeStopLossPrice: '369.075'
});
```

This gives you **one TP and one SL** automatically managed by Bitget, but you can't do the 50%/50% split with different TP levels.

---

## Comparison: Binance OCO vs Bitget Plan Orders

| Feature | Binance OCO | Bitget Plan Orders |
|---------|-------------|-------------------|
| **Linked Orders** | ✅ Yes (exchange-managed) | ❌ No (manual management) |
| **Multiple TP Levels** | ✅ Yes (via multiple OCO) | ✅ Yes (via multiple plan orders) |
| **Auto-Cancel on Fill** | ✅ Yes | ❌ No (must cancel manually) |
| **Implementation Complexity** | 🟢 Simple | 🟡 Medium (requires WebSocket monitoring) |
| **Risk of Both Orders Filling** | ❌ No (OCO prevents) | ⚠️ Yes (if price moves fast) |

---

## Recommendation

### **Option A: Implement Full Bitget WebSocket Monitoring** (Best Match for Binance Behavior)
- Place 3 plan orders (TP1, TP2, SL)
- Monitor fills via WebSocket
- Cancel conflicting orders programmatically
- **Pros**: Matches Binance behavior closely
- **Cons**: Complex, requires WebSocket implementation

### **Option B: Use Built-in TP/SL** (Simpler, Single TP Level)
- Place single order with `presetTakeProfitPrice` and `presetStopLossPrice`
- **Pros**: Simple, exchange-managed
- **Cons**: Only one TP level (can't do 50% at +5%, 50% at +8%)

### **Option C: Manual TP/SL Without Monitoring** (Simplest)
- Place 2 limit orders at TP1 and TP2 prices
- Place 1 plan order for SL
- Accept that TP orders might both fill if price moves fast
- **Pros**: Simple implementation
- **Cons**: Not true OCO behavior

---

## Next Steps

1. **Decide on approach** based on your risk tolerance and complexity preference
2. **Implement Bitget WebSocket** if going with Option A
3. **Add order group tracking** to link TP/SL orders
4. **Test with small amounts** before production use

Would you like me to implement the full WebSocket-based solution (Option A) for Bitget?
