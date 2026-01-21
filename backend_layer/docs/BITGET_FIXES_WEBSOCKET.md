# Bitget Order Fixes - WebSocket & Database Integration

## Issues Fixed

### 1. ✅ **sizeUsd Prioritization**
**Problem**: Need to ensure `sizeUsd` is prioritized when provided from exchanges controller.

**Solution**: Already implemented correctly in the code:
```typescript
if (sizeUsd && sizeUsd > 0) {
  // Use sizeUsd directly - PRIORITIZED
  totalQuantity = (sizeUsd / price).toString();
  totalEstimatedValue = sizeUsd;
} else {
  // Fall back to sizePct calculation
  const result = await this.calculateOrderQuantity(...);
}
```

### 2. ✅ **Market Order Fill Details**
**Problem**: Bitget API doesn't return fill details (price, quantity) immediately for market orders.

**API Response**:
```json
{
  "code": "00000",
  "msg": "success",
  "data": {
    "orderId": "1001",
    "clientOid": "121211212122"
  }
}
```
Only returns `orderId` and `clientOid` - NO fill price or quantity!

**Solution**: 
- Save minimal order info to database initially (orderId, symbol, side, status='NEW')
- WebSocket receives full order details when order fills
- WebSocket updates database with actual fill price and quantity

**Flow**:
```
1. Place Order → API returns orderId only
2. Save to DB with status='NEW', price='0', executedQty='0'
3. WebSocket receives order update with fill details
4. Update DB with actual price, executedQty, status='FILLED'
```

### 3. ✅ **Database Saving from WebSocket**
**Problem**: Should save/update orders from WebSocket, not from API response.

**Solution**: Enhanced `handleOrderUpdate()` in `bitget.gateway.ts`:

```typescript
private async handleOrderUpdate(orderData: BitgetOrderData, userId?: string) {
  // Check if order exists
  const existingOrder = await this.orderRepository.findOne({
    where: { orderId: parseInt(orderData.orderId), exchange: 'BITGET' },
  });

  if (existingOrder) {
    // Update existing order with WebSocket data
    existingOrder.status = orderData.status.toUpperCase();
    existingOrder.executedQty = orderData.accBaseVolume || '0';
    
    // CRUCIAL: Update price from WebSocket (for market orders)
    if (orderData.priceAvg && parseFloat(orderData.priceAvg) > 0) {
      existingOrder.price = orderData.priceAvg;
    }
    
    if (orderData.status === 'filled') {
      existingOrder.filledTimestamp = new Date();
    }
    
    await this.orderRepository.save(existingOrder);
  } else {
    // Create new order if not found (external orders or DB save failed)
    const newOrder = this.orderRepository.create({
      orderId: parseInt(orderData.orderId),
      symbol: orderData.instId,
      price: orderData.priceAvg || orderData.price || '0',
      executedQty: orderData.accBaseVolume || '0',
      status: orderData.status.toUpperCase(),
      // ... other fields
    });
    await this.orderRepository.save(newOrder);
  }
}
```

### 4. ✅ **TP/SL Cancellation Detection**
**Problem**: WebSocket not logging when TP/SL orders are manually canceled.

**Solution**: Added specific logging for TP/SL order lifecycle:

```typescript
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
```

**Now you'll see**:
```
[User abc12345...] ❌ TP1 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered
[User abc12345...] ❌ TP2 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered
```

## Files Modified

### 1. `bitget.gateway.ts`
**Changes**:
- Enhanced `handleOrderUpdate()` to be PRIMARY source of truth
- Added price update from `priceAvg` for market orders
- Added TP/SL specific logging for fills and cancellations
- Added fallback to create orders not found in DB

### 2. `order.entity.ts`
**Changes**:
- Added `tpGroup?: string` to metadata type
- Supports 'TP1' and 'TP2' values for order group tracking

### 3. `exchanges-controller.service.ts`
**Changes**:
- Added comments clarifying WebSocket will update fill details
- Ensured sizeUsd is prioritized (already working)

## Order Lifecycle

### Limit Order with TP/SL:
```
1. API Call: placeSpotOrder()
   └─ Returns: { orderId: "123", clientOid: "abc" }

2. Save to DB:
   └─ orderId: 123
   └─ status: 'NEW'
   └─ price: '0.5000' (entry price)
   └─ executedQty: '0'
   └─ metadata: { tpGroup: 'TP1', tp1: 0.5200, sl: 0.4750 }

3. WebSocket Update (when filled):
   └─ status: 'filled'
   └─ priceAvg: '0.5001' (actual fill price)
   └─ accBaseVolume: '20.5' (actual quantity)
   └─ fillTime: '1234567890'

4. DB Updated:
   └─ status: 'FILLED'
   └─ price: '0.5001' (updated from WebSocket)
   └─ executedQty: '20.5' (updated from WebSocket)
   └─ filledTimestamp: Date object

5. Log Output:
   └─ "[User abc12345...] 🎯 TP1 ORDER FILLED! Symbol: FUSDT, Qty: 20.5, Price: 0.5001"
```

### Market Order:
```
1. API Call: placeSpotOrder()
   └─ Returns: { orderId: "456", clientOid: "def" }
   └─ NO PRICE OR QUANTITY!

2. Save to DB:
   └─ orderId: 456
   └─ status: 'NEW'
   └─ price: '0' (unknown until WebSocket)
   └─ executedQty: '0'

3. WebSocket Update (immediate for market orders):
   └─ status: 'filled'
   └─ priceAvg: '0.5123' (ACTUAL fill price)
   └─ accBaseVolume: '19.8' (ACTUAL quantity)

4. DB Updated:
   └─ status: 'FILLED'
   └─ price: '0.5123' (from WebSocket - CRUCIAL!)
   └─ executedQty: '19.8' (from WebSocket)
   └─ filledTimestamp: Date object
```

### TP/SL Cancellation:
```
1. User manually cancels TP1 order on Bitget

2. WebSocket receives:
   └─ orderId: "123"
   └─ status: 'cancelled'
   └─ instId: 'FUSDT'

3. DB Updated:
   └─ status: 'CANCELED'

4. Log Output:
   └─ "[User abc12345...] ❌ TP1 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered"
```

## Testing

### Test 1: Limit Order with TP/SL
```json
{
  "symbol": "FUSDT",
  "side": "buy",
  "orderType": "limit",
  "force": "gtc",
  "price": "0.007350",
  "size": "1000",
  "presetTakeProfitPrice": "0.008000",
  "presetStopLossPrice": "0.006000"
}
```

**Expected Logs**:
```
📦 [User abc...] Order Update [FUSDT]: OrderId: 123, Status: new, Side: buy, Type: limit, Filled: 0, Avg Price: 
💾 [User abc...] Saved TP1 to DB: orderId=123

(when filled)
📦 [User abc...] Order Update [FUSDT]: OrderId: 123, Status: filled, Side: buy, Type: limit, Filled: 1000, Avg Price: 0.007351
💾 [User abc...] Updated order 123: NEW → FILLED @ 0.007351
🎯 [User abc...] TP1 ORDER FILLED! Symbol: FUSDT, Qty: 1000, Price: 0.007351
```

### Test 2: Manual Cancellation
```
(manually cancel order on Bitget)
```

**Expected Logs**:
```
📦 [User abc...] Order Update [FUSDT]: OrderId: 123, Status: cancelled, Side: buy, Type: limit, Filled: 0, Avg Price: 
💾 [User abc...] Updated order 123: NEW → CANCELED
❌ [User abc...] TP1 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered
```

### Test 3: SL Triggered
```
(price drops to SL level)
```

**Expected Logs**:
```
📦 [User abc...] Order Update [FUSDT]: OrderId: 123, Status: cancelled, Side: buy, Type: limit, Filled: 0, Avg Price: 
💾 [User abc...] Updated order 123: NEW → CANCELED
❌ [User abc...] TP1 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered

📦 [User abc...] Order Update [FUSDT]: OrderId: 124, Status: filled, Side: sell, Type: market, Filled: 500, Avg Price: 0.006001
💾 [User abc...] Updated order 124: NEW → FILLED @ 0.006001
```

## Database Queries

### Check order status:
```sql
SELECT 
  orderId,
  symbol,
  side,
  type,
  status,
  price,
  executedQty,
  metadata->>'tpGroup' as tp_group,
  orderTimestamp,
  filledTimestamp
FROM orders
WHERE exchange = 'BITGET'
  AND symbol = 'FUSDT'
ORDER BY orderTimestamp DESC;
```

### Find canceled TP/SL orders:
```sql
SELECT 
  orderId,
  symbol,
  status,
  metadata->>'tpGroup' as tp_group,
  metadata->>'tp1' as tp1_price,
  metadata->>'tp2' as tp2_price,
  metadata->>'sl' as sl_price
FROM orders
WHERE exchange = 'BITGET'
  AND status = 'CANCELED'
  AND metadata->>'tpGroup' IS NOT NULL
ORDER BY orderTimestamp DESC;
```

## Key Takeaways

1. ✅ **WebSocket is PRIMARY source of truth** for order data
2. ✅ **API response only provides orderId** - not fill details
3. ✅ **Database saves minimal info initially** - WebSocket updates with actuals
4. ✅ **Price from priceAvg** in WebSocket updates (crucial for market orders)
5. ✅ **TP/SL lifecycle fully logged** - fills, cancellations, SL triggers
6. ✅ **sizeUsd prioritized** when provided from exchanges controller

## Important Notes

### Why WebSocket is Critical:
- Bitget API doesn't return fill price for market orders
- TP/SL orders can be canceled by exchange (SL trigger)
- Manual cancellations need to be tracked
- Partial fills need real-time updates

### What Gets Saved Initially:
- orderId (from API)
- symbol, side, type
- status = 'NEW'
- price = entry price (for limit) or '0' (for market)
- executedQty = '0'
- metadata (tpGroup, tp/sl prices)

### What Gets Updated by WebSocket:
- status (NEW → FILLED/CANCELED)
- price (actual fill price from priceAvg)
- executedQty (actual filled quantity)
- filledTimestamp (when filled)

This ensures accurate tracking even when API doesn't provide complete data!
