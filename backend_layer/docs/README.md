# Crypto Graph Trader - Backend Documentation

> **NestJS-based backend for multi-exchange cryptocurrency trading with real-time order monitoring, automated TP/SL placement, and comprehensive portfolio management.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Architecture Overview](#architecture-overview)
4. [Core Modules](#core-modules)
   - [Binance Module](#binance-module)
   - [Bitget Module](#bitget-module)
   - [Gate.io Module](#gateio-module)
   - [MEXC Module](#mexc-module)
   - [Exchanges Controller](#exchanges-controller)
   - [API Credentials Module](#api-credentials-module)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
   - [Unified Exchange Endpoints](#unified-exchange-endpoints)
   - [Binance Endpoints](#binance-endpoints)
   - [Bitget Endpoints](#bitget-endpoints)
   - [Gate.io Endpoints](#gateio-endpoints)
   - [MEXC Endpoints](#mexc-endpoints)
   - [OCO Order Endpoints](#oco-order-endpoints)
7. [Real-Time WebSocket](#real-time-websocket)
8. [Authentication & Security](#authentication--security)
9. [Error Handling](#error-handling)
10. [Deployment](#deployment)

---

## Project Overview

This backend system manages a multi-exchange crypto trading platform that connects users to their exchange accounts (Binance, Bitget, Gate.io, MEXC) and tracks trading performance.

### Key Features

- ✅ **Multi-Exchange Support**: Trade on Binance, Bitget, Gate.io, MEXC from unified API
- ✅ **Portfolio-Based Sizing**: Calculate position size as percentage of portfolio
- ✅ **Automatic TP/SL Orders**: Auto-place OCO orders when entry fills
- ✅ **Real-Time Monitoring**: WebSocket-based order status updates
- ✅ **User-Specific Credentials**: Encrypted API keys per user
- ✅ **Multi-User Support**: Concurrent order placement for all active traders
- ✅ **Database Persistence**: Full order history with PnL tracking

### Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL (Supabase/Neon)
- **ORM**: TypeORM
- **Real-Time**: Socket.IO + WebSocket
- **Authentication**: JWT (Access + Refresh Tokens)
- **Encryption**: AES-256-CBC for API credentials

---

## Getting Started

### Prerequisites

```bash
Node.js >= 18.x
PostgreSQL 14+
npm or yarn
```

### Environment Setup

Create a `.env` file in the root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_TOKEN_SECRET=your-jwt-secret
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=31556926

# Encryption Keys (MUST be exactly these lengths)
CREDENTIAL_ENCRYPTION_KEY=your-32-byte-encryption-key!!
CREDENTIAL_IV_KEY=your-16-byte-iv!!

# Exchange API Keys (fallback - user credentials override)
BINANCE_API_KEY=your_binance_key
BINANCE_SECRET_KEY=your_binance_secret
BITGET_API_KEY=your_bitget_key
BITGET_SECRET_KEY=your_bitget_secret
BITGET_PASSPHRASE=your_passphrase
```

### Installation & Running

```bash
# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# With PM2 (process manager)
npm run start:pm2
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NestJS Backend                                   │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Binance    │  │   Bitget     │  │   Gate.io    │  │    MEXC      │ │
│  │   Module     │  │   Module     │  │   Module     │  │   Module     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │          │
│         └─────────────────┴─────────────────┴─────────────────┘          │
│                                    │                                     │
│                      ┌─────────────┴─────────────┐                       │
│                      │  Exchanges Controller      │                       │
│                      │  (Unified API)             │                       │
│                      └─────────────┬─────────────┘                       │
│                                    │                                     │
│  ┌──────────────────┬──────────────┴──────────────┬──────────────────┐  │
│  │                  │                              │                  │  │
│  │  API Credentials │      Order Repository        │  WebSocket       │  │
│  │  (Encrypted)     │      (PostgreSQL)            │  Gateway         │  │
│  └──────────────────┴──────────────────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Controllers**: Handle HTTP requests and responses → Endpoints which call service methods
2. **Services**: Contain business logic and external API integrations
3. **Gateways**: Manage WebSocket connections for real-time data
4. **Entities**: Database models using TypeORM
5. **DTOs**: Data Transfer Objects for API validation

---

## Core Modules

### Binance Module

**Location**: `src/binance/`

Comprehensive Binance exchange integration with:
- Market data (tickers, klines, orderbook)
- Signed order placement (market, limit, OCO)
- User Data Stream WebSocket for real-time order updates
- Automatic OCO order placement on entry fill

**Key Features**:
- Multi-user WebSocket connections
- Automatic listenKey management (refresh every 30 min)
- Auto-reconnect with exponential backoff

**Architecture**:

```
BinanceGateway (WebSocket)
├── User Data Stream (per-user)
│   ├── Order updates (executionReport)
│   ├── Balance updates (outboundAccountPosition)
│   └── OCO updates (listStatus)
│
├── Auto OCO Placement
│   ├── TP1 at +4% (50% qty)
│   ├── TP2 at +6% (remaining qty)
│   └── SL at -5%
│
└── Market Data Stream
    ├── Ticker updates
    └── Kline/candlestick data
```

### Bitget Module

**Location**: `src/bitget/`

Bitget exchange integration with:
- Spot trading
- Plan orders for TP/SL simulation
- Private WebSocket for order monitoring

**Note**: Bitget doesn't support OCO natively - we simulate with Plan Orders + manual cancellation.

### Gate.io Module

**Location**: `src/gio_market/` and `src/gateio_account/`

Market and account endpoints:

**Market (Public)**:
- `GET /gateio/spot/currencies` - All currencies
- `GET /gateio/spot/tickers` - Price tickers
- `GET /gateio/spot/order_book` - Order book depth
- `GET /gateio/spot/candlesticks` - OHLCV data

**Account (Signed)**:
- `GET /gateio-account/spot/assets` - Account balances
- `POST /gateio-account/wallet/transfers` - Internal transfers

### MEXC Module

**Location**: `src/mexc-order/` and `src/mexc-account/`

**Order Endpoints**:
- `POST /mexc/orders` - Place new order
- `POST /mexc/orders/batch` - Batch orders (max 20)
- `DELETE /mexc/orders` - Cancel order
- `GET /mexc/orders/open` - Open orders

**Quick Reference**:
- MARKET BUY → use `quantity` or `quoteOrderQty`
- LIMIT BUY/SELL → use `quantity` + `price`
- Minimum order = 1 USDT

### Exchanges Controller

**Location**: `src/exchanges-controller/`

Unified API layer that routes to exchange-specific implementations.

**Key Endpoints**:
- `POST /exchanges/place-order` - Place order on any exchange
- `GET /exchanges/balance` - Get account balances
- `GET /exchanges/open-positions` - Current holdings with USD values
- `GET /exchanges/open-orders` - Pending orders
- `GET /exchanges/trades` - Trade history with PnL
- `DELETE /exchanges/cancel-order` - Cancel specific order
- `DELETE /exchanges/cancel-all-orders` - Cancel all symbol orders
- `POST /exchanges/place-oco-order` - Place OCO order

### API Credentials Module

**Location**: `src/apicredentials/`

Secure storage for user exchange API keys:

**Endpoints**:
- `POST /api-credentials` - Store new credentials
- `GET /api-credentials` - List user's exchanges
- `PATCH /api-credentials/:id` - Update credentials
- `DELETE /api-credentials/:id` - Remove credentials
- `PATCH /api-credentials/:id/toggle` - Toggle active status

**Security**:
- AES-256-CBC encryption at rest
- Decrypted only when making API calls
- Per-user isolation

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with authentication |
| `refreshtokens` | JWT refresh token management |
| `api_credentials` | Encrypted exchange API keys |
| `orders` | All orders with TP/SL linking |
| `fredindicators` | Macroeconomic data from FRED |

### Orders Table Structure

```sql
orders (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,           -- Exchange order ID
  user_id UUID,                        -- User who placed order
  exchange VARCHAR(20),                -- BINANCE, BITGET, etc.
  symbol VARCHAR(20),                  -- BTCUSDT
  side VARCHAR(10),                    -- BUY, SELL
  type VARCHAR(20),                    -- LIMIT, MARKET, STOP_LOSS_LIMIT
  quantity DECIMAL(20,8),
  price DECIMAL(20,8),
  status VARCHAR(20),                  -- NEW, FILLED, CANCELED
  order_role VARCHAR(10),              -- ENTRY, TP1, TP2, SL
  order_group_id VARCHAR(50),          -- Links related orders
  parent_order_id BIGINT,              -- For TP/SL → entry reference
  tp_levels JSONB,                     -- [45000, 46000]
  sl_price DECIMAL(20,8)
)
```

### Order Linking Strategy

```
Entry Order (BUY BTCUSDT)
├── order_role: 'ENTRY'
├── order_group_id: 'uuid-12345'
│
└── Child Orders:
    ├── TP1 Order (parent_order_id → entry)
    ├── TP2 Order (parent_order_id → entry)
    └── SL Order (parent_order_id → entry)
```

---

## API Documentation

### Unified Exchange Endpoints

#### Place Order

```http
POST /exchanges/place-order
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "sizePct": 0.1,              // 10% of portfolio
  "tpLevels": [105000, 110000],
  "sl": 95000,
  "exchange": "BINANCE",
  "type": "MARKET"             // or "LIMIT" with price
}
```

**Alternative with fixed USD**:
```json
{
  "symbol": "AIAUSDT",
  "side": "BUY",
  "sizeUsd": 50,               // Fixed $50
  "exchange": "BITGET"
}
```

**Response**:
```json
{
  "status": "Success",
  "data": {
    "orderId": "123456789",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": "0.001",
    "status": "FILLED"
  }
}
```

#### Get Balance

```http
GET /exchanges/balance?exchange=BINANCE
```

**Response**:
```json
{
  "data": [
    {"asset": "USDT", "free": "1000.50", "locked": "250.00", "total": "1250.50"},
    {"asset": "BTC", "free": "0.5", "locked": "0", "total": "0.5"}
  ]
}
```

#### Get Trades with PnL

```http
GET /exchanges/trades?exchange=BINANCE
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "data": [
    {
      "entryOrder": {...},
      "relatedOrders": [...],
      "entryPriceAvg": 45000,
      "currentPnL": 250.50,
      "pnlPercentage": 2.5
    }
  ]
}
```

### OCO Order Endpoints

#### Place OCO with Automatic Quantity

```http
POST /exchanges/place-oco-order?exchange=BINANCE

{
  "symbol": "ZECUSDT",
  "sizePct": 1.0,                        // 100% of holdings
  "aboveType": "TAKE_PROFIT_LIMIT",
  "abovePrice": "395",
  "aboveStopPrice": "395",
  "aboveTimeInForce": "GTC",
  "belowType": "STOP_LOSS_LIMIT",
  "belowPrice": "369.90",
  "belowStopPrice": "370",
  "belowTimeInForce": "GTC"
}
```

**Calculation**:
- Fetches your ZEC balance
- Applies 0.5% slippage buffer: `balance × sizePct × 0.995`
- Validates both orders meet $5 USDT minimum notional

---

## Real-Time WebSocket

### Binance User Data Stream

Automatically connects for all users with `active_trading = true`.

**Events Emitted**:

```typescript
// Order updates
socket.on('order_update', (data) => {
  console.log(data.orderStatus); // NEW, FILLED, CANCELED
});

// Balance updates
socket.on('balance_update', (data) => {
  console.log(data.balances);
});

// OCO order updates
socket.on('list_status_update', (data) => {
  console.log(data.listOrderStatus);
});

// Auto OCO placed notification
socket.on('auto_oco_placed', (data) => {
  console.log(data.tp1Price, data.slPrice);
});
```

### Connection Lifecycle

```
Module Init → Fetch Active Trading Users → Create ListenKey per User
     ↓
Connect WebSocket per User → Start Keep-Alive (30 min interval)
     ↓
Receive Events → Process → Update DB → Emit to Frontend
     ↓
On Order Fill → Auto-place OCO Orders → Save to DB
```

---

## Authentication & Security

### JWT Authentication

```typescript
// Login
POST /auth/login
{ "email": "user@example.com", "password": "pass" }

// Response
{ "access_token": "...", "refresh_token": "..." }

// Use in requests
Authorization: Bearer <access_token>
```

### Credential Security

1. **Encryption**: AES-256-CBC for all API keys
2. **Per-User Isolation**: Users only see their own credentials
3. **No Key Exposure**: Encrypted values never in API responses
4. **Environment Keys**: Encryption keys in environment variables

---

## Error Handling

### Common Errors

| Error | Status | Solution |
|-------|--------|----------|
| "Exchange parameter required" | 400 | Add `?exchange=BINANCE` |
| "Insufficient balance" | 400 | Reduce `sizePct` or check balance |
| "Credentials not found" | 404 | User needs to add API keys |
| "Order value too low" | 400 | Increase position size (min $5) |
| "Signature validation failed" | 401 | Check API keys are correct |

### OCO Order Troubleshooting

**"Notional too low"**:
- Minimum order value: $5 USDT
- Formula: `quantity × price >= $5`
- Solution: Increase holdings or use wider price range

---

## Deployment

### PM2 Process Manager

```bash
# Start
npm run start:pm2

# Monitor
pm2 status
pm2 logs

# Restart
npm run restart:pm2
```

### Docker

```yaml
# docker-compose.yml
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

### Health Monitoring

- **Endpoint**: `GET /health`
- **PM2 Dashboard**: Real-time CPU/memory
- **Docker Health Checks**: Container monitoring

### Reliability Features

- ✅ **Automatic Restarts**: PM2 restarts crashed processes
- ✅ **Memory Limits**: 1GB limit with auto-restart
- ✅ **Network Resilience**: Handles API failures gracefully
- ✅ **WebSocket Reconnect**: Auto-reconnect with exponential backoff
- ✅ **ListenKey Refresh**: Every 30 minutes to prevent expiration

---

---

## OCO Order Error Troubleshooting

### "Insufficient Balance" Error

This error occurs when the OCO order doesn't meet Binance's minimum notional requirements.

#### Root Causes & Solutions

**1. Order Notional Value Too Low**

The calculated order value (price × quantity) must be at least **$5 USDT** per order.

**Example Calculation:**
```
Your ZEC balance: 0.028 ZEC
sizePct: 1 (100%)
Calculated quantity: 0.028 × 1 × 0.995 = 0.02786 ZEC

TP price: 395 → Notional = 395 × 0.02786 = $11.03 ✅ OK
SL price: 370 → Notional = 370 × 0.02786 = $10.31 ✅ OK
```

**If balance is too small:**
```
Your ZEC balance: 0.01 ZEC
Calculated quantity: 0.01 × 1 × 0.995 = 0.00995 ZEC
TP price: 395 → Notional = 395 × 0.00995 = $3.93 ❌ Below $5!
```

#### Solutions

| Solution | Action |
|----------|--------|
| Increase Position | Buy more of the asset (need min: $5 ÷ price) |
| Use Full Balance | Set `sizePct: 1` for maximum quantity |
| Adjust Prices | Use prices closer to current price |
| Check Balance First | `GET /exchanges/balance?exchange=BINANCE` |

#### Quick Reference: Minimum Positions

| Price | Minimum ZEC | Minimum USD |
|-------|-------------|-------------|
| 395 (TP) | 0.01266 | $5.00 |
| 370 (SL) | 0.01351 | $5.00 |
| **Need both** | **0.01351 ZEC** | **$5.00** |

#### Error Summary

| Error | Cause | Solution |
|-------|-------|----------|
| Notional too low | Balance too small | Buy more asset |
| Notional too low | Prices too tight | Widen TP/SL range |
| Notional too low | Using low sizePct | Use sizePct: 1 |
| Insufficient balance | Account issues | Try smaller trade |

---

## Bitget TP/SL Implementation

### Problem Statement

Binance supports **OCO (One-Cancels-Other)** orders natively. **Bitget does NOT support OCO orders** - we simulate this behavior using Plan Orders + Manual Cancellation.

### Bitget Order Types

| Type | Use Case | Limitations |
|------|----------|-------------|
| Normal Order | Simple limit/market | No automatic TP/SL |
| SPOT TP/SL | Trigger-based | Only ONE trigger per order |
| Normal + TP/SL params | Built-in TP/SL | Only ONE take-profit level |
| Plan Order | Conditional triggers | Not linked to other orders |

### Recommended Architecture

```
Limit Buy Fills (WebSocket Event)
         │
         ├─► Place 3 Plan Orders:
         │   ├─► Plan Order 1: TP +5% (50% qty)
         │   ├─► Plan Order 2: TP +8% (50% qty)
         │   └─► Plan Order 3: SL -5% (100% qty)
         │
         ├─► Store order IDs in database
         │
         └─► Monitor WebSocket for fills
             │
             ├─► If SL fills → Cancel both TP orders
             ├─► If TP1 fills → Adjust SL for remaining 50%
             └─► If TP2 fills → Adjust SL for remaining 50%
```

### Binance OCO vs Bitget Plan Orders

| Feature | Binance OCO | Bitget Plan Orders |
|---------|-------------|-------------------|
| Linked Orders | ✅ Exchange-managed | ❌ Manual management |
| Multiple TP Levels | ✅ Yes | ✅ Yes (multiple orders) |
| Auto-Cancel on Fill | ✅ Yes | ❌ Must cancel manually |
| Implementation | 🟢 Simple | 🟡 Medium complexity |
| Risk of Both Filling | ❌ No (OCO prevents) | ⚠️ Yes (if price moves fast) |

### Implementation Options

**Option A: Full WebSocket Monitoring** (Best)
- Place 3 plan orders (TP1, TP2, SL)
- Monitor fills via WebSocket
- Cancel conflicting orders programmatically

**Option B: Built-in TP/SL** (Simpler)
- Single order with `presetTakeProfitPrice` and `presetStopLossPrice`
- Only one TP level supported

**Option C: Manual Orders** (Simplest)
- Place 2 limit orders at TP1/TP2 prices
- Place 1 plan order for SL
- Accept both TPs might fill if price moves fast

---

## Database Schema Reference

### Core Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, password, created_at |
| `refreshtokens` | JWT refresh tokens | id, user_id, token, expires_at |
| `api_credentials` | Encrypted exchange keys | id, user_id, exchange, api_key_encrypted, active_trading |
| `orders` | All orders with linking | order_id, user_id, symbol, side, type, status, order_role, parent_order_id |
| `fredindicators` | Macroeconomic data | id, series_id, value, date |

### Orders Table Structure

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,           -- Exchange order ID
  user_id UUID,                        -- References users(id)
  exchange VARCHAR(20),                -- BINANCE, BITGET, etc.
  symbol VARCHAR(20),                  -- Trading pair (BTCUSDT)
  side VARCHAR(10),                    -- BUY, SELL
  type VARCHAR(20),                    -- LIMIT, MARKET, STOP_LOSS_LIMIT
  quantity DECIMAL(20,8),
  price DECIMAL(20,8),
  status VARCHAR(20),                  -- NEW, FILLED, CANCELED
  order_role VARCHAR(10),              -- ENTRY, TP1, TP2, SL
  order_group_id VARCHAR(50),          -- Links related orders
  parent_order_id BIGINT,              -- For TP/SL → entry reference
  tp_levels JSONB,                     -- [45000, 46000]
  sl_price DECIMAL(20,8),
  filled_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Order Linking Strategy

```
Entry Order (BUY BTCUSDT)
├── order_role: 'ENTRY'
├── order_group_id: 'uuid-12345'
│
└── Child Orders (linked via parent_order_id):
    ├── TP1 Order (order_role: 'TP1')
    ├── TP2 Order (order_role: 'TP2')
    └── SL Order (order_role: 'SL')
```

### Proposed Enhancement Tables

For full PnL tracking, consider adding:

| Table | Purpose |
|-------|---------|
| `positions` | Open position tracking with real-time PnL |
| `trade_history` | Closed trades with entry/exit details |
| `portfolio_snapshots` | Daily balance snapshots for equity curve |
| `performance_metrics` | Aggregated trading statistics |
| `fees_tracking` | Detailed fee tracking for net PnL |

---

## Support

- **API Docs**: http://localhost:3000/api-docs (Swagger UI)
- **Repository**: [crypto-graph-trader](https://github.com/byteboom-ai/crypto-graph-trader)
- **Issues**: GitHub Issues

---

*Last Updated: December 2025*



///order synced logic doen on dec 12 2025



Backend Startup / Scheduled Interval
             ↓
     Order Sync Service
     ----------------
     1. Fetch unfilled orders from DB
     2. Group orders by user
     3. For each user:
        - Get API credentials
        - Query Binance for each order
        - Compare status
        - Update DB if changed
        - Trigger follow-up actions (OCO placement or cancel siblings)
             ↓
Database updated & actions triggered
When to Run
Trigger	Timing
Startup Sync	On backend start
Periodic Sync	Every 5-10 min
Manual Sync	Admin/API trigger

Which Orders to Check
sql
Copy code
SELECT * FROM orders 
WHERE status IN ('NEW', 'PARTIALLY_FILLED')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY user_id, created_at;
Only check recent unfilled orders.

Group by user to minimize credential lookups.

Binance API
Endpoint: GET /api/v3/order

Parameters: symbol, orderId, timestamp, signature

Important response fields:

status → order status

executedQty → filled quantity

cummulativeQuoteQty → total quote spent

updateTime → last update timestamp

Steps to Sync
Fetch unfilled orders from DB

Group orders by user

For each user, sync orders:

Get credentials

Query Binance for each order

Compare status

Update DB if status changed

Trigger follow-up actions:

Entry filled → place OCO orders

TP/SL filled → cancel sibling orders

Handle errors:

-2013 → order not found → mark EXPIRED

Rate limits → delay and retry

Rate Limiting
Binance allows 1200 weight per minute

GET /api/v3/order = weight 4 → max 300 orders/min

Safe: 100ms delay between API calls

Example Flow
sql
Copy code
Startup → Fetch unfilled orders → Group by user
        → For each order:
          • Query Binance
          • If status changed → update DB
          • If ENTRY filled → place OCO
          • If TP/SL filled → cancel siblings
Repeat every 5-10 minutes
Files
File	Purpose
order-sync.service.ts	Main sync service
binance.signed.service.ts	Add getOrderStatus()
exchanges-controller.module.ts	Register sync service

Summary
Sync unfilled orders on startup and periodically.

Update DB if Binance order status changed.

Place OCO for filled entry orders.

Cancel siblings for filled TP/SL orders.

Respect rate limits (100ms delay).

This ensures no orders are missed even if the backend crashes.