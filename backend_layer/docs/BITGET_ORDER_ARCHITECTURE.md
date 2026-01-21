# Bitget Order Architecture - Multi-User TP/SL Implementation

## Overview
This document describes the architecture for Bitget order management with automatic TP/SL splitting across multiple users, similar to Binance but adapted for Bitget's API capabilities.

## Key Differences from Binance
- **Binance**: Uses OCO (One-Cancels-Other) orders placed AFTER entry fills via WebSocket
- **Bitget**: Places entry orders WITH embedded TP/SL parameters in a single API call

## Architecture Components

### 1. Order Flow
```
Graph Webhook → ExchangesController → placeBitgetOrderWithCredentials()
                                     ↓
                        Split into 2 orders per user (50/50)
                                     ↓
                        Order 1: Entry + TP (4%) + SL (5%)
                        Order 2: Entry + TP (8%) + SL (5%)
                                     ↓
                        Place via BitgetOrderService
                                     ↓
                        Save to DB with same orderGroupId
                                     ↓
                        WebSocket monitors order fills
                                     ↓
                        Update DB when filled/canceled
```

### 2. Order Splitting Logic

For each active Bitget user:
- **Total Amount**: e.g., 20 USDT
- **Split**: 50/50 = 10 USDT each

**Order 1** (TP1 Group):
```json
{
  "symbol": "XRPUSDT",
  "side": "buy",
  "orderType": "limit",
  "force": "gtc",
  "price": "0.5000",  // Entry price
  "size": "20",       // 10 USDT worth at entry price
  "presetTakeProfitPrice": "0.5200",  // +4%
  "presetStopLossPrice": "0.4750"     // -5%
}
```

**Order 2** (TP2 Group):
```json
{
  "symbol": "XRPUSDT",
  "side": "buy",
  "orderType": "limit",
  "force": "gtc",
  "price": "0.5000",  // Entry price
  "size": "20",       // 10 USDT worth at entry price
  "presetTakeProfitPrice": "0.5400",  // +8%
  "presetStopLossPrice": "0.4750"     // -5%
}
```

### 3. Database Schema

**Entry Order Record** (orderRole: 'ENTRY'):
```typescript
{
  orderId: 123456,
  clientOrderId: "TP1_GROUP_uuid",
  exchange: "BITGET",
  symbol: "XRPUSDT",
  side: "BUY",
  type: "LIMIT",
  quantity: "20",
  price: "0.5000",
  status: "NEW",
  orderGroupId: "uuid-1234",  // Same for both orders
  orderRole: "ENTRY",
  userId: "user-uuid",
  metadata: {
    tp1: 0.5200,  // For Order 1
    tp2: 0.5400,  // For Order 2
    sl: 0.4750,
    tpGroup: "TP1" // or "TP2"
  }
}
```

### 4. TP/SL Configuration

Environment variables (or hardcoded):
```env
TP1_PERCENT=0.04  # 4%
TP2_PERCENT=0.08  # 8%
SL_PERCENT=0.05   # 5%
ORDER_SPLIT_PCT=0.5  # 50/50 split
```

### 5. WebSocket Monitoring

**BitgetGateway** monitors order updates:
- When order status changes to `FILLED` → Update DB
- When order status changes to `CANCELED` → Update DB
- Track which TP level was hit (TP1 or TP2)

### 6. Order Group Management

Each user's two orders share:
- Same `orderGroupId` (UUID)
- Same `userId`
- Different `metadata.tpGroup` ("TP1" or "TP2")

Query all orders in a group:
```sql
SELECT * FROM orders 
WHERE orderGroupId = 'uuid-1234' 
AND userId = 'user-uuid'
ORDER BY metadata->>'tpGroup';
```

## Implementation Files

### Modified Files:
1. **`exchanges-controller.service.ts`**
   - `placeBitgetOrderWithCredentials()` - Split order logic
   - `saveBitgetOrderGroup()` - Save both orders to DB

2. **`bitget/services/orders.service.ts`**
   - Already supports `presetTakeProfitPrice` and `presetStopLossPrice`

3. **`bitget/websocket/bitget.gateway.ts`**
   - `handleOrderUpdate()` - Update DB on order status changes

4. **`bitget/dto/spotorder.dto.ts`**
   - Already has TP/SL fields

## Advantages of This Approach

1. **Atomic Execution**: TP/SL set at order placement, no race conditions
2. **Exchange-Native**: Uses Bitget's built-in TP/SL functionality
3. **Simpler Logic**: No need for price monitoring or manual SL execution
4. **Multi-User**: Each user gets independent order groups
5. **Database Tracking**: Full audit trail of all orders

## Disadvantages

1. **Less Flexible**: Can't adjust TP/SL after order placed
2. **Exchange Dependent**: Relies on Bitget's TP/SL implementation
3. **No Partial Fills**: Unlike Binance OCO, can't handle partial TP fills

## Migration from Old Logic

**Removed** (from BitgetGateway):
- ❌ Price monitoring intervals
- ❌ Manual SL execution via market orders
- ❌ TP order placement after entry fills
- ❌ OrderGroup tracking in memory

**Added**:
- ✅ Order splitting in ExchangesController
- ✅ Embedded TP/SL in initial order
- ✅ Database-driven order group tracking
- ✅ WebSocket status updates only

## Example Complete Flow

### Step 1: Webhook Received
```
POST /exchanges/place-order
{
  "symbol": "XRPUSDT",
  "side": "BUY",
  "sizePct": 0.1,  // 10% of portfolio
  "tpLevels": [4, 8],  // Not used for Bitget
  "sl": 5  // Not used for Bitget
}
```

### Step 2: Fetch Active Users
```
User 1: 100 USDT balance → 10 USDT order
User 2: 200 USDT balance → 20 USDT order
```

### Step 3: Split Each User's Order
**User 1**:
- Order 1: 5 USDT @ TP +4%
- Order 2: 5 USDT @ TP +8%

**User 2**:
- Order 1: 10 USDT @ TP +4%
- Order 2: 10 USDT @ TP +8%

### Step 4: Place Orders
```
4 total orders placed (2 per user)
```

### Step 5: Save to Database
```
4 database records created
- 2 with orderGroupId="uuid-user1"
- 2 with orderGroupId="uuid-user2"
```

### Step 6: WebSocket Monitoring
```
Order fills → DB updated
TP/SL triggers → DB updated
```

## Query Examples

### Get all orders for a user's group:
```typescript
const orders = await orderRepository.find({
  where: { orderGroupId, userId },
  order: { orderTimestamp: 'ASC' }
});
```

### Get TP1 vs TP2 orders:
```typescript
const tp1Orders = orders.filter(o => o.metadata?.tpGroup === 'TP1');
const tp2Orders = orders.filter(o => o.metadata?.tpGroup === 'TP2');
```

### Check if any TP hit:
```typescript
const tpFilled = orders.some(o => 
  o.orderRole === 'ENTRY' && 
  o.status === 'FILLED' &&
  o.metadata?.tpGroup
);
```
