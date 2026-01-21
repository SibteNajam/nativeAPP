# Bitget WebSocket Debugging Guide

## Current Status

From your logs:
```
[Nest] 34444  - 12/19/2025, 2:12:52 PM     LOG [BitgetGateway] 📊 Found 2 active trading user(s) for Bitget
[Nest] 34444  - 12/19/2025, 2:12:52 PM     LOG [BitgetGateway] [User accc1976...] Connecting private WebSocket...
[Nest] 34444  - 12/19/2025, 2:12:52 PM     LOG [BitgetGateway] [User 1d8183d3...] Connecting private WebSocket...
[Nest] 34444  - 12/19/2025, 2:12:52 PM     LOG [BitgetGateway] ✅ Initialized 2 WebSocket connection(s) for active trading users
[Nest] 34444  - 12/19/2025, 2:12:53 PM     LOG [BitgetGateway] [User 1d8183d3...] Private WebSocket connected
[Nest] 34444  - 12/19/2025, 2:12:54 PM     LOG [BitgetGateway] [User accc1976...] Private WebSocket connected
```

✅ **WebSockets ARE connecting** but we need to see:
1. Authentication response
2. Subscription confirmation
3. Order update messages

## Enhanced Logging Added

### 1. Connection Phase
```
[User abc...] Connecting private WebSocket...
[User abc...] Private WebSocket connected
[User abc...] 🔐 Sending authentication message...
```

### 2. Authentication Phase
```
[User abc...] 📨 WebSocket message: {"event":"login","code":"0","msg":"success"}
[User abc...] ✅ Authentication successful!
[User abc...] 📡 Subscribing to orders channel: {"op":"subscribe","args":[{"instType":"SPOT","channel":"orders"}]}
```

### 3. Subscription Phase
```
[User abc...] 📨 WebSocket message: {"event":"subscribe","arg":{"instType":"SPOT","channel":"orders"}}
[User abc...] ✅ Subscription confirmed: {"instType":"SPOT","channel":"orders"}
```

### 4. Order Updates
```
[User abc...] 📨 WebSocket message: {"action":"snapshot","arg":{"channel":"orders"},"data":[...]}
[User abc...] 📦 Received 1 order update(s)
[User abc...] 📦 Order Update [FUSDT]: OrderId: 123, Status: new, Side: buy, Type: limit, Filled: 0, Avg Price: 
[User abc...] 💾 Updated order 123: NEW → NEW
```

### 5. Order Fills
```
[User abc...] 📨 WebSocket message: {"action":"update","arg":{"channel":"orders"},"data":[...]}
[User abc...] 📦 Received 1 order update(s)
[User abc...] 📦 Order Update [FUSDT]: OrderId: 123, Status: filled, Side: buy, Type: limit, Filled: 1000, Avg Price: 0.007351
[User abc...] 💾 Updated order 123: NEW → FILLED @ 0.007351
[User abc...] 🎯 TP1 ORDER FILLED! Symbol: FUSDT, Qty: 1000, Price: 0.007351
```

### 6. Order Cancellations
```
[User abc...] 📨 WebSocket message: {"action":"update","arg":{"channel":"orders"},"data":[...]}
[User abc...] 📦 Received 1 order update(s)
[User abc...] 📦 Order Update [FUSDT]: OrderId: 123, Status: cancelled, Side: buy, Type: limit, Filled: 0, Avg Price: 
[User abc...] 💾 Updated order 123: NEW → CANCELED
[User abc...] ❌ TP1 ORDER CANCELED! Symbol: FUSDT, Reason: Manual cancellation or SL triggered
```

## What to Check After Restart

### 1. Restart the application:
```bash
npm run start:dev
```

### 2. Look for these logs in order:

**Step 1: Connection**
```
✅ [BitgetGateway] 📊 Found 2 active trading user(s) for Bitget
✅ [BitgetGateway] [User xxx...] Connecting private WebSocket...
✅ [BitgetGateway] [User xxx...] Private WebSocket connected
```

**Step 2: Authentication**
```
✅ [BitgetGateway] [User xxx...] 🔐 Sending authentication message...
✅ [BitgetGateway] [User xxx...] 📨 WebSocket message: {"event":"login",...}
✅ [BitgetGateway] [User xxx...] ✅ Authentication successful!
```

**Step 3: Subscription**
```
✅ [BitgetGateway] [User xxx...] 📡 Subscribing to orders channel: {...}
✅ [BitgetGateway] [User xxx...] 📨 WebSocket message: {"event":"subscribe",...}
✅ [BitgetGateway] [User xxx...] ✅ Subscription confirmed: {...}
```

### 3. Place a test order via Swagger:
```json
{
  "symbol": "FUSDT",
  "side": "buy",
  "orderType": "limit",
  "force": "gtc",
  "price": "0.007490",
  "size": "800",
  "presetTakeProfitPrice": "0.008000",
  "presetStopLossPrice": "0.006000"
}
```

### 4. Watch for order update logs:
```
✅ [BitgetGateway] [User xxx...] 📨 WebSocket message: {"action":"snapshot",...}
✅ [BitgetGateway] [User xxx...] 📦 Received 1 order update(s)
✅ [BitgetGateway] [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: new, ...
```

### 5. If order fills, you should see:
```
✅ [BitgetGateway] [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: filled, ...
✅ [BitgetGateway] [User xxx...] 💾 Updated order xxx: NEW → FILLED @ 0.007xxx
✅ [BitgetGateway] [User xxx...] 🎯 TP1 ORDER FILLED! Symbol: FUSDT, ...
```

### 6. If you manually cancel, you should see:
```
✅ [BitgetGateway] [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: cancelled, ...
✅ [BitgetGateway] [User xxx...] 💾 Updated order xxx: NEW → CANCELED
✅ [BitgetGateway] [User xxx...] ❌ TP1 ORDER CANCELED! Symbol: FUSDT, ...
```

## Troubleshooting

### If you DON'T see authentication logs:
**Problem**: WebSocket connected but no auth message received
**Possible causes**:
- Invalid API credentials
- Bitget API down
- Network issue

**Check**:
```
[User xxx...] 🔐 Sending authentication message...
[User xxx...] Auth details: timestamp=xxx, apiKey=xxx...
```

### If authentication fails:
**Problem**: Authentication message sent but failed
**Look for**:
```
[User xxx...] ❌ Authentication failed: Invalid signature
```

**Solution**: Check API key, secret, and passphrase in database

### If no subscription confirmation:
**Problem**: Authenticated but not subscribed
**Look for**:
```
[User xxx...] 📡 Subscribing to orders channel: {...}
```

**Solution**: Check if subscription message was sent

### If no order updates:
**Problem**: Subscribed but not receiving updates
**Possible causes**:
- Order placed with different credentials
- Order not in database
- WebSocket disconnected

**Check**:
1. Verify order exists in database
2. Check WebSocket is still connected
3. Verify userId matches

## Database Verification

### Check if order was saved:
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
  userId,
  orderTimestamp
FROM orders
WHERE exchange = 'BITGET'
  AND symbol = 'FUSDT'
  AND orderTimestamp > NOW() - INTERVAL '1 hour'
ORDER BY orderTimestamp DESC;
```

### Check user's WebSocket connection:
Look for logs showing:
```
[User YOUR_USER_ID...] Private WebSocket connected
[User YOUR_USER_ID...] ✅ Authentication successful!
[User YOUR_USER_ID...] ✅ Subscription confirmed
```

## Expected Complete Flow

```
1. Application starts
   └─ [BitgetGateway] 🚀 Bitget Gateway Module Initializing...
   └─ [BitgetGateway] 🔍 Fetching all active trading credentials from database...
   └─ [BitgetGateway] 📊 Found 2 active trading user(s) for Bitget

2. Connect WebSockets
   └─ [User xxx...] Connecting private WebSocket...
   └─ [User xxx...] Private WebSocket connected
   └─ [User xxx...] 🔐 Sending authentication message...

3. Authenticate
   └─ [User xxx...] 📨 WebSocket message: {"event":"login","code":"0"}
   └─ [User xxx...] ✅ Authentication successful!

4. Subscribe
   └─ [User xxx...] 📡 Subscribing to orders channel: {...}
   └─ [User xxx...] 📨 WebSocket message: {"event":"subscribe",...}
   └─ [User xxx...] ✅ Subscription confirmed: {...}

5. Place order (via Swagger or API)
   └─ [OrderService] Final order payload to Bitget: {...}
   └─ Order placed on Bitget

6. Receive order update (WebSocket)
   └─ [User xxx...] 📨 WebSocket message: {"action":"snapshot",...}
   └─ [User xxx...] 📦 Received 1 order update(s)
   └─ [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: new, ...
   └─ [User xxx...] 💾 Updated order xxx: NEW → NEW

7. Order fills
   └─ [User xxx...] 📨 WebSocket message: {"action":"update",...}
   └─ [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: filled, ...
   └─ [User xxx...] 💾 Updated order xxx: NEW → FILLED @ 0.007xxx
   └─ [User xxx...] 🎯 TP1 ORDER FILLED! Symbol: FUSDT, Qty: xxx, Price: xxx

8. Manual cancellation
   └─ [User xxx...] 📨 WebSocket message: {"action":"update",...}
   └─ [User xxx...] 📦 Order Update [FUSDT]: OrderId: xxx, Status: cancelled, ...
   └─ [User xxx...] 💾 Updated order xxx: NEW → CANCELED
   └─ [User xxx...] ❌ TP1 ORDER CANCELED! Symbol: FUSDT, ...
```

## Next Steps

1. **Restart the application** and watch for the enhanced logs
2. **Verify authentication** - should see "✅ Authentication successful!"
3. **Verify subscription** - should see "✅ Subscription confirmed"
4. **Place a test order** via Swagger
5. **Watch for order updates** - should see "📦 Received X order update(s)"
6. **Test cancellation** - manually cancel and watch for "❌ ORDER CANCELED!"

If you still don't see logs after restart, share the complete startup logs and we'll debug further!
