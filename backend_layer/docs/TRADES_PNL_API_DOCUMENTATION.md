# Trades with PnL API Documentation

## Overview
This API endpoint provides real-time trade tracking with profit/loss calculations. It fetches data from the database, calculates realized and unrealized PnL using live market prices, and returns organized trade data ready for frontend display.

**Key Features:**
- ✅ Groups orders by trade (using `order_group_id`)
- ✅ Calculates **realized PnL** from filled exit orders
- ✅ Calculates **unrealized PnL** using **live market prices**
- ✅ Determines if trade is complete or still active
- ✅ Provides summary statistics
- ✅ Filters by exchange and/or symbol

---

## API Endpoint

### **GET** `/exchanges/trades`

**Base URL:** `http://localhost:3000` (or your production URL)

**Full URL:** `http://localhost:3000/exchanges/trades`

---

## Request

### Method
```
GET
```

### Query Parameters (Optional)

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `exchange` | string | No | Filter by exchange (BINANCE, BITGET) | `?exchange=BINANCE` |
| `symbol` | string | No | Filter by trading pair | `?symbol=ZECUSDT` |

### Examples

```bash
# Get all trades
GET http://localhost:3000/exchanges/trades

# Get only Binance trades
GET http://localhost:3000/exchanges/trades?exchange=BINANCE

# Get specific symbol trades
GET http://localhost:3000/exchanges/trades?symbol=ZECUSDT

# Get Binance ZECUSDT trades only
GET http://localhost:3000/exchanges/trades?exchange=BINANCE&symbol=ZECUSDT
```

### Request Headers
```json
{
  "Content-Type": "application/json"
}
```

---

## Response Structure

### Success Response (200 OK)

```json
{
  "status": "Success",
  "data": {
    "trades": [
      {
        "tradeId": "uuid-string",
        "entryOrder": { ... },
        "exitOrders": [ ... ],
        "pnl": { ... }
      }
    ],
    "summary": { ... }
  },
  "statusCode": 200,
  "message": "Trades fetched successfully"
}
```

---

## Detailed Response Schema

### Trade Object

```typescript
{
  tradeId: string;              // Unique trade identifier (order_group_id)
  entryOrder: {
    orderId: number;            // Exchange order ID
    symbol: string;             // Trading pair (e.g., "ZECUSDT")
    exchange: string;           // Exchange name ("BINANCE" or "BITGET")
    side: string;               // "BUY" or "SELL"
    type: string;               // "LIMIT" or "MARKET"
    quantity: number;           // Order quantity
    executedQty: number;        // Actually filled quantity
    price: number;              // Execution price
    status: string;             // Order status ("FILLED", "NEW", etc.)
    filledAt: string | null;    // ISO timestamp when filled
    createdAt: string;          // ISO timestamp when created
  };
  exitOrders: [
    {
      orderId: number;          // Exchange order ID
      role: string;             // "TP1", "TP2", or "SL"
      type: string;             // "LIMIT_MAKER" or "STOP_LOSS_LIMIT"
      quantity: number;         // Order quantity
      executedQty: number;      // Filled quantity (0 if not filled)
      price: number;            // Order price
      status: string;           // "NEW", "FILLED", "EXPIRED", "CANCELED"
      filledAt: string | null;  // ISO timestamp when filled
      createdAt: string;        // ISO timestamp when created
      updatedAt: string;        // ISO timestamp when last updated
    }
  ];
  pnl: {
    realized: number;           // Profit/loss from filled orders (USDT)
    unrealized: number;         // Estimated profit/loss from open orders (USDT)
    total: number;              // realized + unrealized (USDT)
    realizedPercent: number;    // Realized PnL as % of entry cost
    unrealizedPercent: number;  // Unrealized PnL as % of entry cost
    totalPercent: number;       // Total PnL as % of entry cost
    entryCost: number;          // Entry price × quantity (USDT)
    realizedQty: number;        // Quantity that has been sold
    unrealizedQty: number;      // Quantity still open (pending orders)
    currentMarketPrice: number | null; // Live market price (null if trade complete)
    isComplete: boolean;        // true if all exit orders are FILLED/EXPIRED/CANCELED
  };
}
```

### Summary Object

```typescript
{
  summary: {
    totalTrades: number;        // Total number of trades
    completedTrades: number;    // Number of closed trades
    activeTrades: number;       // Number of open trades
    totalRealizedPnl: number;   // Sum of all realized PnL (USDT)
    totalUnrealizedPnl: number; // Sum of all unrealized PnL (USDT)
    totalPnl: number;           // Total PnL across all trades (USDT)
  }
}
```

---

## How It Works (Backend Processing)

### **Step 1: Database Query**
When you call the endpoint, the backend:
1. Fetches all **ENTRY orders** from database (BUY orders with `order_role='ENTRY'`)
2. For each entry, fetches related **exit orders** (TP/SL orders with matching `order_group_id`)

### **Step 2: PnL Calculation**

#### Realized PnL (From Filled Orders)
```typescript
For each exit order with status='FILLED':
  pnl = (exit_price - entry_price) × executed_quantity
  realizedPnl += pnl
```

**Example:**
- Entry: BUY 0.031 ZEC @ $449.10
- Exit: SELL 0.016 ZEC @ $446.85 (SL hit)
- Realized PnL = (446.85 - 449.10) × 0.016 = **-$0.036**

#### Unrealized PnL (From Open Orders)
```typescript
For each exit order with status='NEW':
  1. Fetch LIVE market price from exchange API
  2. unrealizedPnl = (current_market_price - entry_price) × remaining_quantity
```

**Example:**
- Entry: BUY 0.031 ZEC @ $449.10
- Open Orders: TP at $451.35 (pending)
- Current Market Price: $445.00 (fetched live)
- Unrealized PnL = (445.00 - 449.10) × 0.031 = **-$0.127**

### **Step 3: Trade Status Determination**

```typescript
isComplete = ALL exit orders are (FILLED OR EXPIRED OR CANCELED)
```

- **`isComplete: false`** → Trade is still active (has pending orders)
- **`isComplete: true`** → Trade is closed (all orders resolved)

### **Step 4: Summary Calculation**

Aggregates all trades to provide:
- Total count of trades
- Count of active vs completed trades
- Sum of all realized and unrealized PnL

---

## Real-World Response Examples

### Example 1: Active Trade (All Orders Pending)

**Scenario:**
- Entry filled at $449.10
- All TP/SL orders still pending
- Market dropped to $445.00

**Request:**
```bash
GET http://localhost:3000/exchanges/trades?symbol=ZECUSDT
```

**Response:**
```json
{
  "status": "Success",
  "data": {
    "trades": [
      {
        "tradeId": "a5b8c916-3656-4741-8f64-51239583c051",
        "entryOrder": {
          "orderId": 3680313453,
          "symbol": "ZECUSDT",
          "exchange": "BINANCE",
          "side": "BUY",
          "type": "LIMIT",
          "quantity": 0.031,
          "executedQty": 0.031,
          "price": 449.1,
          "status": "FILLED",
          "filledAt": "2025-12-09T16:02:37.545Z",
          "createdAt": "2025-12-09T16:02:37.855Z"
        },
        "exitOrders": [
          {
            "orderId": 3680314948,
            "role": "TP1",
            "type": "LIMIT_MAKER",
            "quantity": 0.016,
            "executedQty": 0,
            "price": 451.35,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:39.708Z",
            "updatedAt": "2025-12-09T16:02:39.708Z"
          },
          {
            "orderId": 3680314947,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.016,
            "executedQty": 0,
            "price": 446.85,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:39.716Z",
            "updatedAt": "2025-12-09T16:02:39.716Z"
          },
          {
            "orderId": 3680315556,
            "role": "TP2",
            "type": "LIMIT_MAKER",
            "quantity": 0.015,
            "executedQty": 0,
            "price": 451.35,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:40.818Z",
            "updatedAt": "2025-12-09T16:02:40.818Z"
          },
          {
            "orderId": 3680315555,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.015,
            "executedQty": 0,
            "price": 446.85,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:40.827Z",
            "updatedAt": "2025-12-09T16:02:40.827Z"
          }
        ],
        "pnl": {
          "realized": 0,
          "unrealized": -0.1271,
          "total": -0.1271,
          "realizedPercent": 0,
          "unrealizedPercent": -0.91,
          "totalPercent": -0.91,
          "entryCost": 13.9221,
          "realizedQty": 0,
          "unrealizedQty": 0.031,
          "currentMarketPrice": 445.0,
          "isComplete": false
        }
      }
    ],
    "summary": {
      "totalTrades": 1,
      "completedTrades": 0,
      "activeTrades": 1,
      "totalRealizedPnl": 0,
      "totalUnrealizedPnl": -0.1271,
      "totalPnl": -0.1271
    }
  },
  "statusCode": 200,
  "message": "Trades fetched successfully"
}
```

---

### Example 2: Partial Fill (TP1 Filled, Others Pending)

**Scenario:**
- Entry filled at $449.10
- TP1 filled at $451.35
- SL1 expired (canceled by OCO)
- TP2 and SL2 still pending
- Market at $450.00

**Response:**
```json
{
  "status": "Success",
  "data": {
    "trades": [
      {
        "tradeId": "a5b8c916-3656-4741-8f64-51239583c051",
        "entryOrder": {
          "orderId": 3680313453,
          "symbol": "ZECUSDT",
          "exchange": "BINANCE",
          "side": "BUY",
          "type": "LIMIT",
          "quantity": 0.031,
          "executedQty": 0.031,
          "price": 449.1,
          "status": "FILLED",
          "filledAt": "2025-12-09T16:02:37.545Z",
          "createdAt": "2025-12-09T16:02:37.855Z"
        },
        "exitOrders": [
          {
            "orderId": 3680314948,
            "role": "TP1",
            "type": "LIMIT_MAKER",
            "quantity": 0.016,
            "executedQty": 0.016,
            "price": 451.35,
            "status": "FILLED",
            "filledAt": "2025-12-09T16:05:20.000Z",
            "createdAt": "2025-12-09T16:02:39.708Z",
            "updatedAt": "2025-12-09T16:05:20.123Z"
          },
          {
            "orderId": 3680314947,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.016,
            "executedQty": 0,
            "price": 446.85,
            "status": "EXPIRED",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:39.716Z",
            "updatedAt": "2025-12-09T16:05:20.200Z"
          },
          {
            "orderId": 3680315556,
            "role": "TP2",
            "type": "LIMIT_MAKER",
            "quantity": 0.015,
            "executedQty": 0,
            "price": 451.35,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:40.818Z",
            "updatedAt": "2025-12-09T16:02:40.818Z"
          },
          {
            "orderId": 3680315555,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.015,
            "executedQty": 0,
            "price": 446.85,
            "status": "NEW",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:40.827Z",
            "updatedAt": "2025-12-09T16:02:40.827Z"
          }
        ],
        "pnl": {
          "realized": 0.036,
          "unrealized": 0.0135,
          "total": 0.0495,
          "realizedPercent": 0.26,
          "unrealizedPercent": 0.10,
          "totalPercent": 0.36,
          "entryCost": 13.9221,
          "realizedQty": 0.016,
          "unrealizedQty": 0.015,
          "currentMarketPrice": 450.0,
          "isComplete": false
        }
      }
    ],
    "summary": {
      "totalTrades": 1,
      "completedTrades": 0,
      "activeTrades": 1,
      "totalRealizedPnl": 0.036,
      "totalUnrealizedPnl": 0.0135,
      "totalPnl": 0.0495
    }
  },
  "statusCode": 200,
  "message": "Trades fetched successfully"
}
```

---

### Example 3: Closed Trade (Stop Loss Hit)

**Scenario:**
- Entry filled at $449.10
- Both TP orders expired
- Both SL orders filled at $446.85
- Trade complete (loss)

**Response:**
```json
{
  "status": "Success",
  "data": {
    "trades": [
      {
        "tradeId": "a5b8c916-3656-4741-8f64-51239583c051",
        "entryOrder": {
          "orderId": 3680313453,
          "symbol": "ZECUSDT",
          "exchange": "BINANCE",
          "side": "BUY",
          "type": "LIMIT",
          "quantity": 0.031,
          "executedQty": 0.031,
          "price": 449.1,
          "status": "FILLED",
          "filledAt": "2025-12-09T16:02:37.545Z",
          "createdAt": "2025-12-09T16:02:37.855Z"
        },
        "exitOrders": [
          {
            "orderId": 3680314948,
            "role": "TP1",
            "type": "LIMIT_MAKER",
            "quantity": 0.016,
            "executedQty": 0,
            "price": 451.35,
            "status": "EXPIRED",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:39.708Z",
            "updatedAt": "2025-12-09T16:03:41.325Z"
          },
          {
            "orderId": 3680314947,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.016,
            "executedQty": 0.016,
            "price": 446.85,
            "status": "FILLED",
            "filledAt": "2025-12-09T16:03:44.448Z",
            "createdAt": "2025-12-09T16:02:39.716Z",
            "updatedAt": "2025-12-09T16:03:45.266Z"
          },
          {
            "orderId": 3680315556,
            "role": "TP2",
            "type": "LIMIT_MAKER",
            "quantity": 0.015,
            "executedQty": 0,
            "price": 451.35,
            "status": "EXPIRED",
            "filledAt": null,
            "createdAt": "2025-12-09T16:02:40.818Z",
            "updatedAt": "2025-12-09T16:03:41.326Z"
          },
          {
            "orderId": 3680315555,
            "role": "SL",
            "type": "STOP_LOSS_LIMIT",
            "quantity": 0.015,
            "executedQty": 0.015,
            "price": 446.85,
            "status": "FILLED",
            "filledAt": "2025-12-09T16:03:44.448Z",
            "createdAt": "2025-12-09T16:02:40.827Z",
            "updatedAt": "2025-12-09T16:03:45.275Z"
          }
        ],
        "pnl": {
          "realized": -0.0698,
          "unrealized": 0,
          "total": -0.0698,
          "realizedPercent": -0.50,
          "unrealizedPercent": 0,
          "totalPercent": -0.50,
          "entryCost": 13.9221,
          "realizedQty": 0.031,
          "unrealizedQty": 0,
          "currentMarketPrice": null,
          "isComplete": true
        }
      }
    ],
    "summary": {
      "totalTrades": 1,
      "completedTrades": 1,
      "activeTrades": 0,
      "totalRealizedPnl": -0.0698,
      "totalUnrealizedPnl": 0,
      "totalPnl": -0.0698
    }
  },
  "statusCode": 200,
  "message": "Trades fetched successfully"
}
```

---

## Frontend Integration Guide

### Fetching Data (React/Next.js Example)

```typescript
// api/trades.ts
export async function getTrades(exchange?: string, symbol?: string) {
  const params = new URLSearchParams();
  if (exchange) params.append('exchange', exchange);
  if (symbol) params.append('symbol', symbol);
  
  const url = `http://localhost:3000/exchanges/trades${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}
```

### Usage in Component

```typescript
// components/TradesTable.tsx
import { useEffect, useState } from 'react';
import { getTrades } from '@/api/trades';

export default function TradesTable() {
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true);
        const response = await getTrades();
        setTrades(response.data.trades);
        setSummary(response.data.summary);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();
    
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Trades Summary</h1>
      <div className="stats">
        <div>Total Trades: {summary?.totalTrades}</div>
        <div>Active: {summary?.activeTrades}</div>
        <div>Completed: {summary?.completedTrades}</div>
        <div>Total PnL: ${summary?.totalPnl?.toFixed(2)}</div>
      </div>

      <h2>Trade Details</h2>
      {trades.map(trade => (
        <TradeCard key={trade.tradeId} trade={trade} />
      ))}
    </div>
  );
}
```

### Trade Card Component

```typescript
// components/TradeCard.tsx
interface TradeCardProps {
  trade: any;
}

export default function TradeCard({ trade }: TradeCardProps) {
  const { entryOrder, exitOrders, pnl } = trade;
  
  return (
    <div className={`trade-card ${pnl.isComplete ? 'completed' : 'active'}`}>
      {/* Entry Order */}
      <div className="entry-section">
        <h3>Entry Order</h3>
        <div>
          {entryOrder.side} {entryOrder.quantity} {entryOrder.symbol.replace('USDT', '')} 
          @ ${entryOrder.price}
        </div>
        <div>Status: {entryOrder.status}</div>
        <div>Filled: {new Date(entryOrder.filledAt).toLocaleString()}</div>
      </div>

      {/* Exit Orders */}
      <div className="exit-section">
        <h3>Exit Orders</h3>
        {exitOrders.map(exit => (
          <div key={exit.orderId} className={`exit-order ${exit.status.toLowerCase()}`}>
            <span className="role-badge">{exit.role}</span>
            <span>{exit.type}</span>
            <span>{exit.quantity} @ ${exit.price}</span>
            <span className={`status ${exit.status.toLowerCase()}`}>
              {exit.status}
            </span>
            {exit.filledAt && (
              <span>{new Date(exit.filledAt).toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>

      {/* PnL Summary */}
      <div className="pnl-section">
        <h3>Profit & Loss</h3>
        
        {/* Realized PnL */}
        <div className={`pnl-item ${pnl.realized >= 0 ? 'profit' : 'loss'}`}>
          <span>Realized:</span>
          <span>${pnl.realized.toFixed(4)} ({pnl.realizedPercent.toFixed(2)}%)</span>
        </div>

        {/* Unrealized PnL (if trade is active) */}
        {!pnl.isComplete && (
          <div className={`pnl-item ${pnl.unrealized >= 0 ? 'profit' : 'loss'}`}>
            <span>Unrealized:</span>
            <span>${pnl.unrealized.toFixed(4)} ({pnl.unrealizedPercent.toFixed(2)}%)</span>
            {pnl.currentMarketPrice && (
              <small>Market: ${pnl.currentMarketPrice.toFixed(2)}</small>
            )}
          </div>
        )}

        {/* Total PnL */}
        <div className={`pnl-item total ${pnl.total >= 0 ? 'profit' : 'loss'}`}>
          <span>Total:</span>
          <span>${pnl.total.toFixed(4)} ({pnl.totalPercent.toFixed(2)}%)</span>
        </div>

        <div className="pnl-details">
          <div>Entry Cost: ${pnl.entryCost.toFixed(2)}</div>
          <div>Realized Qty: {pnl.realizedQty}</div>
          <div>Unrealized Qty: {pnl.unrealizedQty}</div>
        </div>

        {/* Trade Status Badge */}
        <div className={`status-badge ${pnl.isComplete ? 'complete' : 'active'}`}>
          {pnl.isComplete ? '✓ Trade Closed' : '⏳ Active Trade'}
        </div>
      </div>
    </div>
  );
}
```

---

## Important Notes

### Real-Time Updates
- **Database updates automatically** via WebSocket when orders fill
- **Frontend should poll** every 30-60 seconds for live PnL updates
- **Unrealized PnL changes** with market price (recalculated on each request)

### Performance
- Backend calculates everything on-demand (no caching)
- Each request fetches live market prices for unrealized PnL
- Response time: ~500ms-1000ms depending on number of trades

### Data Freshness
- **Order status**: Updated in real-time via WebSocket
- **Market price**: Fetched live on each API call
- **PnL calculations**: Computed fresh on every request

### Error Handling

```typescript
try {
  const data = await getTrades();
  // Handle success
} catch (error) {
  if (error.response?.status === 500) {
    console.error('Server error');
  }
  // Handle error in UI
}
```

---

## Calculation Formulas

### Realized PnL
```
For each FILLED exit order:
  PnL = (exit_price - entry_price) × executed_quantity
  
Total Realized PnL = Sum of all PnL values
```

### Unrealized PnL
```
For each NEW/PARTIALLY_FILLED exit order:
  Remaining Qty = order_quantity - executed_quantity
  
Fetch current_market_price from exchange

Unrealized PnL = (current_market_price - entry_price) × total_remaining_qty
```

### Percentage Calculations
```
Realized % = (realized_pnl / entry_cost) × 100
Unrealized % = (unrealized_pnl / entry_cost) × 100
Total % = (total_pnl / entry_cost) × 100

Where: entry_cost = entry_price × entry_quantity
```

---

## Use Cases

### 1. Dashboard Overview
Show summary statistics:
```typescript
const { summary } = await getTrades();
// Display: totalTrades, activeTrades, completedTrades, totalPnl
```

### 2. Active Trades Monitor
Filter for active trades:
```typescript
const { trades } = await getTrades();
const activeTrades = trades.filter(t => !t.pnl.isComplete);
```

### 3. Trade History
Show completed trades:
```typescript
const { trades } = await getTrades();
const closedTrades = trades.filter(t => t.pnl.isComplete);
```

### 4. Symbol-Specific Tracking
Monitor specific trading pair:
```typescript
const { trades } = await getTrades(undefined, 'BTCUSDT');
```

### 5. Exchange-Specific View
View trades from one exchange:
```typescript
const { trades } = await getTrades('BINANCE');
```

---

## Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful, trades returned |
| 400 | Bad Request | Invalid query parameters |
| 500 | Internal Server Error | Database or exchange API error |

---

## Related Database Tables

This endpoint queries these tables:
- **`orders`** - All order records (entry + exit orders)
  - Links: `order_group_id`, `parent_order_id`, `order_role`
  - Status: `status`, `executed_qty`, `filled_timestamp`

---

## Summary

**When to call this API:**
- On page load (fetch all trades)
- Every 30-60 seconds (refresh for live updates)
- After user places new order (refresh to see new trade)
- When filtering by exchange/symbol

**What backend does:**
1. Queries database for entry orders + exit orders
2. Fetches live market prices from exchange APIs
3. Calculates realized and unrealized PnL
4. Determines trade completion status
5. Returns structured, ready-to-display data

**What frontend does:**
1. Call API endpoint
2. Display trade cards with entry/exit orders
3. Show PnL with color coding (green profit, red loss)
4. Indicate trade status (active/complete)
5. Poll periodically for updates

**No business logic needed in frontend** - just display the data! 🎯
