# Database Schema Documentation - Crypto Graph Trader Backend

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Core Tables](#core-tables)
4. [Trading & Order Management Tables](#trading--order-management-tables)
5. [Market Data & Analytics Tables](#market-data--analytics-tables)
6. [Pipeline & Automation Tables](#pipeline--automation-tables)
7. [Data Relationships](#data-relationships)
8. [Performance Tracking Strategy](#performance-tracking-strategy)
9. [Recommended Enhancements](#recommended-enhancements)

---

## Overview

This backend system manages a multi-exchange crypto trading platform that connects users to their exchange accounts (Binance, Bitget, Gate.io, MEXC) and tracks trading performance. The database is built on **PostgreSQL** and uses **TypeORM** as the ORM framework.

### Database Connection
- **Primary Database**: Supabase PostgreSQL
- **Connection String**: `postgresql://postgres:BYTEBOOMpipeline@db.xxfpivpgtoxscpzglmyl.supabase.co:5432/postgres`
- **Backup Database**: Neon PostgreSQL (for specific modules)
- **ORM**: TypeORM with NestJS integration
- **Timezone**: All timestamps stored in UTC

---

## Database Architecture

### Technology Stack
- **Database**: PostgreSQL (via Supabase & Neon)
- **ORM**: TypeORM
- **Framework**: NestJS
- **Encryption**: AES-256-CBC for sensitive data
- **Authentication**: JWT (Access + Refresh Tokens)

### Key Design Principles
1. **UUID Primary Keys** for user-related tables (scalability, security)
2. **BIGSERIAL Primary Keys** for high-volume data (orders, market data)
3. **Encrypted Storage** for API credentials
4. **Soft Deletes** for user data (is_deleted flag)
5. **Automatic Timestamps** (created_at, updated_at triggers)
6. **Composite Indexes** for performance optimization

---

## Core Tables

### 1. `users` Table
**Purpose**: Stores end-user account information who use the trading platform frontend.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR | NOT NULL | User email address |
| name | VARCHAR | NOT NULL | User full name |
| date_of_birth | TIMESTAMP | NULLABLE | User's date of birth (UTC) |
| password | VARCHAR | NOT NULL | Hashed password (bcrypt) |
| is_deleted | BOOLEAN | DEFAULT FALSE | Soft delete flag |
| is_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| password_updated_at | TIMESTAMP | NULLABLE | Last password change timestamp |
| secret_token | VARCHAR | NULLABLE | Password reset/verification token |
| secret_token_created_at | TIMESTAMP | NULLABLE | Token creation timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last account update timestamp |

**Indexes**:
- Primary key on `id`
- Index on `email` for login lookups

**Related Tables**: `api_credentials`, `refreshtokens`, `orders`

---

### 2. `refreshtokens` Table
**Purpose**: Manages JWT refresh tokens for persistent user sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Token identifier |
| user | UUID | FOREIGN KEY → users(id) | Reference to user |
| isRevoked | BOOLEAN | NOT NULL | Token revocation status |
| tokenExpiry | DATE | NOT NULL | Token expiration date |
| created_at | TIMESTAMP | DEFAULT NOW() | Token creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |
| deletedAt | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Relationships**:
- `user` → Many-to-One with `users`

**Token Strategy**:
- **Access Token Expiry**: 1 hour
- **Refresh Token Expiry**: 7 days (31,556,926 seconds in code)
- **JWT Secret**: Configured in environment variable `JWT_TOKEN_SECRET`

---

### 3. `api_credentials` Table
**Purpose**: Securely stores encrypted API keys for connecting to user's exchange accounts (Binance, Bitget, Gate.io, MEXC).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Credential identifier |
| user_id | UUID | FOREIGN KEY → users(id) | Owner of credentials |
| exchange | ENUM | NOT NULL | Exchange name (binance, bitget, gateio, mexc, alpha_vantage) |
| api_key | TEXT | NOT NULL | **Encrypted** API key |
| secret_key | TEXT | NOT NULL | **Encrypted** secret key |
| passphrase | TEXT | NULLABLE | **Encrypted** passphrase (Bitget, Gate.io) |
| is_active | BOOLEAN | DEFAULT TRUE | Active status flag |
| label | VARCHAR(100) | NULLABLE | User-friendly label (e.g., "Main Binance Account") |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Encryption Details**:
- **Algorithm**: AES-256-CBC
- **Key Storage**: Environment variable `CREDENTIAL_ENCRYPTION_KEY`
- **IV Storage**: Environment variable `CREDENTIAL_IV_KEY`
- **Security**: Keys encrypted at rest, decrypted only when making API calls

**Constraints**:
- **UNIQUE (user_id, exchange)**: One credential per exchange per user
- **CHECK**: Exchange must be one of: binance, bitget, gateio, mexc, alpha_vantage

**Indexes**:
- `idx_api_credentials_user_id` on `user_id`
- `idx_api_credentials_exchange` on `exchange`
- `idx_api_credentials_user_exchange` on `(user_id, exchange) WHERE is_active = TRUE`

**Usage Flow**:
1. User enters API credentials in frontend
2. Backend encrypts and stores in this table
3. When user logs in, frontend fetches exchange data using stored credentials
4. Backend decrypts credentials on-demand for exchange API calls

---

## Trading & Order Management Tables

### 4. `orders` Table
**Purpose**: Central table for tracking all orders placed across exchanges, including entry orders and their linked TP/SL orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing order record ID |
| order_id | BIGINT | NOT NULL | Exchange-provided order ID |
| client_order_id | VARCHAR(50) | NULLABLE | Client-generated order ID |
| exchange | VARCHAR(20) | NOT NULL | Exchange name (binance, bitget, etc.) |
| symbol | VARCHAR(20) | NOT NULL | Trading pair (e.g., BTCUSDT) |
| side | VARCHAR(10) | NOT NULL | Order side: BUY or SELL |
| type | VARCHAR(20) | NOT NULL | Order type: LIMIT, MARKET, STOP_LOSS_LIMIT, etc. |
| quantity | DECIMAL(20,8) | NOT NULL | Order quantity |
| price | DECIMAL(20,8) | NULLABLE | Order price (null for market orders) |
| executed_qty | DECIMAL(20,8) | DEFAULT 0 | Filled quantity |
| status | VARCHAR(20) | NOT NULL | Order status: NEW, FILLED, PARTIALLY_FILLED, CANCELED |
| parent_order_id | BIGINT | NULLABLE | Links TP/SL orders to entry order |
| order_group_id | VARCHAR(50) | NULLABLE | UUID grouping entry + TP/SL orders |
| order_role | VARCHAR(10) | NULLABLE | ENTRY, TP1, TP2, SL |
| tp_levels | JSONB | NULLABLE | Array of TP prices [435.6, 420.3] |
| sl_price | DECIMAL(20,8) | NULLABLE | Stop loss price |
| order_timestamp | TIMESTAMPTZ | NOT NULL | Order placement time (from exchange) |
| filled_timestamp | TIMESTAMPTZ | NULLABLE | Order fill time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| note | TEXT | NULLABLE | Additional notes/metadata |
| user_id | INTEGER | NULLABLE | Reference to user (should be UUID in v2) |

**Indexes**:
- **UNIQUE (order_id, exchange)**: Prevents duplicate order records
- `idx_orders_order_id` on `order_id`
- `idx_orders_exchange_symbol` on `(exchange, symbol)`
- `idx_orders_status` on `status`
- `idx_orders_parent_order_id` on `parent_order_id`
- `idx_orders_order_group_id` on `order_group_id`
- `idx_orders_order_timestamp` on `order_timestamp`
- `idx_orders_user_id` on `user_id`

**Order Linking Strategy**:
```
Entry Order (BUY BTCUSDT)
├── order_role: 'ENTRY'
├── order_group_id: 'uuid-12345'
├── tp_levels: [45000, 46000]
├── sl_price: 42000
│
└── Child Orders:
    ├── TP1 Order (SELL BTCUSDT @ 45000)
    │   ├── parent_order_id: <entry_order_id>
    │   ├── order_group_id: 'uuid-12345'
    │   └── order_role: 'TP1'
    │
    ├── TP2 Order (SELL BTCUSDT @ 46000)
    │   ├── parent_order_id: <entry_order_id>
    │   ├── order_group_id: 'uuid-12345'
    │   └── order_role: 'TP2'
    │
    └── SL Order (SELL BTCUSDT @ 42000)
        ├── parent_order_id: <entry_order_id>
        ├── order_group_id: 'uuid-12345'
        └── order_role: 'SL'
```

**Comments** (from SQL):
- `parent_order_id`: For TP/SL orders, references the order_id of the entry (buy) order
- `order_group_id`: UUID linking entry order with its TP/SL orders
- `order_role`: Role of order: ENTRY for buy orders, TP1/TP2 for take profits, SL for stop loss
- `order_timestamp`: Timestamp from exchange when order was placed (UTC)
- `filled_timestamp`: Timestamp when order status changed to FILLED (UTC)

---

### 5. `processed_orders` Table (Bitget-specific)
**Purpose**: Stores orders that have been processed by the Bitget trading bot/automation system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol | VARCHAR(20) | NOT NULL | Trading pair |
| side | VARCHAR(10) | NOT NULL | BUY or SELL |
| entry_price | NUMERIC(10,4) | NOT NULL | Entry price |
| stop_loss | NUMERIC(10,4) | NULLABLE | Stop loss price |
| take_profit_levels | JSONB | NULLABLE | Array of TP levels with percentages |
| quantity | NUMERIC(15,6) | NOT NULL | Order quantity |
| notional | NUMERIC(15,6) | NOT NULL | Notional value (price × quantity) |
| leverage | VARCHAR(10) | NOT NULL | Leverage setting (e.g., "10x") |
| confidence | VARCHAR(10) | NOT NULL | Signal confidence (HIGH, MEDIUM, LOW) |
| timeframe | VARCHAR(10) | NOT NULL | Analysis timeframe (1h, 4h, 1d) |
| analysis_type | VARCHAR(20) | NOT NULL | Type of analysis used |
| market_condition | VARCHAR(20) | NOT NULL | Market condition at time of order |
| risk_level | VARCHAR(20) | NOT NULL | Risk assessment |
| order_type | VARCHAR(10) | NOT NULL | MARKET or LIMIT |
| force | VARCHAR(10) | NOT NULL | GTC, IOC, FOK, POST_ONLY |
| margin_mode | VARCHAR(20) | NOT NULL | ISOLATED or CROSSED |
| timestamp | TIMESTAMPTZ | NULLABLE | Order processing timestamp |
| amount_percentage | NUMERIC(5,2) | NOT NULL | Portfolio % used for position |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

**TP Levels Structure** (JSONB):
```json
[
  {"level": 1, "price": 45000, "percentage": 50},
  {"level": 2, "price": 46000, "percentage": 50}
]
```

**Use Case**: Pre-execution order analysis and configuration before placing live orders.

---

### 6. `open_orders` Table (Bitget-specific)
**Purpose**: Tracks currently open orders on Bitget exchange for real-time monitoring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol | VARCHAR(20) | NOT NULL | Trading pair |
| entry_price | NUMERIC(10,4) | NOT NULL | Entry price |
| order_type | VARCHAR(10) | NOT NULL | market or limit |
| size | VARCHAR(20) | NOT NULL | Position size |
| quantity | NUMERIC(15,6) | NOT NULL | Order quantity |
| stop_loss | VARCHAR(20) | NULLABLE | Stop loss price |
| take_profit | NUMERIC(10,4) | NOT NULL | Take profit price |
| side | VARCHAR(4) | NOT NULL | buy or sell |
| force | VARCHAR(3) | NOT NULL | gtc, post_only, fok, ioc |
| order_id | VARCHAR(50) | NOT NULL | Exchange order ID |
| client_oid | VARCHAR(100) | NOT NULL | Client order identifier |
| trade_placement_time | TIMESTAMPTZ | NOT NULL | When order was placed |
| tp_level | INTEGER | NOT NULL | Which TP level (1, 2, 3, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

**Purpose**: Real-time tracking of active orders, updated via exchange webhooks or polling.

---

## Market Data & Analytics Tables

### 7. `fredindicators` Table
**Purpose**: Stores macroeconomic indicators from FRED (Federal Reserve Economic Data) API.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | VARCHAR(100) | NOT NULL | Indicator name (e.g., GDP, CPI, UNRATE) |
| value | NUMERIC(15,8) | NOT NULL | Indicator value |
| observation_date | DATE | NOT NULL | Date of observation |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Constraints**:
- **UNIQUE (name, observation_date)**: Prevents duplicate indicator records

**Use Case**: Macroeconomic analysis for trading decisions (correlating crypto movements with economic indicators).

---

### 8. `symbols` Table
**Purpose**: Master table of trading symbols/pairs tracked across exchanges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_name | VARCHAR(20) | UNIQUE NOT NULL | Symbol name (e.g., BTC_USDT) |

**Related Tables**: `gio_open_interest`, `fund_flow_analysis`, `fund_flow_historical`, `long_short_overall`, `long_short_exchanges`

---

### 9. `timeframes` Table
**Purpose**: Master table of timeframe intervals used in market analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| timeframe | VARCHAR(10) | UNIQUE NOT NULL | Timeframe (5m, 15m, 1h, 4h, 1d, etc.) |

**Related Tables**: All market data tables that track timeframe-specific metrics.

---

### 10. `market_types` Table
**Purpose**: Categorizes different market types (spot, futures, perpetual).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | VARCHAR(20) | UNIQUE NOT NULL | Market type name (spot, futures, swap) |

---

### 11. `gio_open_interest` Table
**Purpose**: Tracks open interest data from Gate.io exchange for futures/perpetual markets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_id | INTEGER | FOREIGN KEY → symbols(id) | Reference to symbol |
| exchange | VARCHAR(50) | NOT NULL | Exchange name |
| open_interest | VARCHAR(50) | NOT NULL | Open interest value |
| change_24h | VARCHAR(50) | NULLABLE | 24-hour change in OI |
| last_updated | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Relationships**:
- `symbol_id` → Many-to-One with `symbols`

**Use Case**: Monitoring market sentiment and leverage in futures markets.

---

### 12. `fund_flow_analysis` Table
**Purpose**: Analyzes fund flows (inflows/outflows) across different order sizes and market types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_id | INTEGER | FOREIGN KEY → symbols(id) | Trading symbol |
| market_type_id | INTEGER | FOREIGN KEY → market_types(id) | Market type |
| timeframe_id | INTEGER | FOREIGN KEY → timeframes(id) | Analysis timeframe |
| order_size | VARCHAR(20) | NOT NULL | Order size category (small, medium, large) |
| net_inflow | VARCHAR(50) | NULLABLE | Net inflow amount |
| inflow | VARCHAR(50) | NULLABLE | Total inflow |
| outflow | VARCHAR(50) | NULLABLE | Total outflow |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Use Case**: Smart money tracking - identifying whale movements and institutional flows.

---

### 13. `fund_flow_historical` Table
**Purpose**: Historical fund flow data for trend analysis over time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_id | INTEGER | FOREIGN KEY → symbols(id) | Trading symbol |
| market_type_id | INTEGER | FOREIGN KEY → market_types(id) | Market type |
| timeframe_id | INTEGER | FOREIGN KEY → timeframes(id) | Analysis timeframe |
| date_time | TIMESTAMPTZ | NOT NULL | Historical timestamp |
| net_inflow | VARCHAR(50) | NULLABLE | Net inflow at that time |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Indexes**:
- Composite index on `(symbol_id, market_type_id, timeframe_id, date_time)` for efficient time-series queries

---

### 14. `long_short_overall` Table
**Purpose**: Tracks overall long/short ratio across the market for sentiment analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_id | INTEGER | FOREIGN KEY → symbols(id) | Trading symbol |
| timeframe_id | INTEGER | FOREIGN KEY → timeframes(id) | Analysis timeframe |
| long_percent | NUMERIC(10,2) | NOT NULL | Percentage of long positions |
| short_percent | NUMERIC(10,2) | NOT NULL | Percentage of short positions |
| last_updated | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Use Case**: Market sentiment gauge - extreme ratios can indicate potential reversals.

---

### 15. `long_short_exchanges` Table
**Purpose**: Exchange-specific long/short ratios with bias indicators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| symbol_id | INTEGER | FOREIGN KEY → symbols(id) | Trading symbol |
| timeframe_id | INTEGER | FOREIGN KEY → timeframes(id) | Analysis timeframe |
| exchange | VARCHAR(50) | NOT NULL | Exchange name |
| bias | VARCHAR(20) | NOT NULL | Market bias (bullish, bearish, neutral) |
| long_percent | NUMERIC(10,2) | NOT NULL | Long position percentage |
| short_percent | NUMERIC(10,2) | NOT NULL | Short position percentage |
| last_updated | TIMESTAMPTZ | NOT NULL | Last update timestamp |

**Use Case**: Cross-exchange sentiment comparison - arbitrage opportunities and market manipulation detection.

---

## Pipeline & Automation Tables

### 16. `pipeline_runs` Table
**Purpose**: Master table tracking each automated trading pipeline execution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Pipeline run identifier |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Pipeline start time |

**Related Tables**: All pipeline stage tables reference this via `run_id`.

**Pipeline Flow**:
1. Create pipeline_run record
2. Execute stages (symbols selection → VLM prediction → trade extraction → execution → validation)
3. All stage data links back to pipeline_run

---

### 17. `symbols_confidence` Table
**Purpose**: Stage 1 - Symbols selected for analysis with confidence scores.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| run_id | BIGINT | FOREIGN KEY → pipeline_runs(id) ON DELETE CASCADE | Pipeline run reference |
| symbol | TEXT | NOT NULL | Symbol name |
| confidence | NUMERIC | NOT NULL | Confidence score (0-1 or 0-100) |

---

### 18. `predictions` Table (VLM Predictions)
**Purpose**: Stage 2 - AI/VLM (Vision Language Model) predictions on chart patterns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| run_id | BIGINT | FOREIGN KEY → pipeline_runs(id) ON DELETE CASCADE | Pipeline run reference |
| symbol | TEXT | NOT NULL | Symbol analyzed |
| confidence | NUMERIC | NOT NULL | Prediction confidence |
| prediction_text | TEXT | NULLABLE | AI-generated prediction description |
| rejected | BOOLEAN | DEFAULT FALSE | True if not in top 3 predictions |

---

### 19. `vlm_screenshot` Table
**Purpose**: Stage 2 - Screenshots used for VLM analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| vlm_pred_id | BIGINT | FOREIGN KEY → vlm_predictions(id) ON DELETE CASCADE | Links to prediction |
| screenshot_url | TEXT | NOT NULL | URL of screenshot |
| timeframes | TEXT[] | NOT NULL | Array of captured timeframes |
| captured_at | TIMESTAMPTZ | NOT NULL | Screenshot capture time |

---

### 20. `trades` Table (Pipeline Trades)
**Purpose**: Stage 3 - Extracted trade parameters from predictions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| run_id | BIGINT | FOREIGN KEY → pipeline_runs(id) ON DELETE CASCADE | Pipeline run reference |
| entry_price | NUMERIC | NOT NULL | Planned entry price |
| stop_loss | NUMERIC | NOT NULL | Stop loss price |
| take_profit | NUMERIC | NOT NULL | Take profit price |
| trade_start_time | TIMESTAMPTZ | NULLABLE | Planned start time |
| trade_end_time | TIMESTAMPTZ | NULLABLE | Planned end time |
| execution_time | INTERVAL | NULLABLE | Expected execution duration |

---

### 21. `executions` Table
**Purpose**: Stage 4 - Actual trade execution records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| trade_id | BIGINT | FOREIGN KEY → trades(id) ON DELETE CASCADE | Links to planned trade |
| run_id | BIGINT | FOREIGN KEY → pipeline_runs(id) ON DELETE CASCADE | Pipeline run reference |
| status | TEXT | NOT NULL | pending, executed, failed |
| order_id | TEXT | NULLABLE | Exchange order ID |
| executed_entry_price | NUMERIC | NULLABLE | Actual entry price (may differ from planned) |
| trade_start_time | TIMESTAMPTZ | NULLABLE | Actual execution start time |
| trade_end_time | TIMESTAMPTZ | NULLABLE | Actual completion time |
| execution_duration | INTERVAL | NULLABLE | Actual time to fill order |

**Use Case**: Comparing planned vs. actual execution - slippage analysis.

---

### 22. `validations` Table
**Purpose**: Stage 5 - Post-execution validation results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Record ID |
| run_id | BIGINT | FOREIGN KEY → pipeline_runs(id) ON DELETE CASCADE | Pipeline run reference |
| validation_status | TEXT | NOT NULL | PASSED, FAILED, WARNING |
| details | JSONB | NULLABLE | Validation details and errors |

---

## Data Relationships

### Entity Relationship Diagram (Simplified)

```
users
  ├──> api_credentials (1:N) - User can have multiple exchange credentials
  ├──> refreshtokens (1:N) - User can have multiple active sessions
  └──> orders (1:N) - User owns many orders

orders
  ├──> parent_order_id (self-referencing) - TP/SL orders link to entry order
  └──> order_group_id (grouping) - Groups related orders together

pipeline_runs
  ├──> symbols_confidence (1:N)
  ├──> predictions (1:N)
  ├──> trades (1:N)
  ├──> executions (1:N)
  └──> validations (1:N)

symbols (master)
  ├──> gio_open_interest (1:N)
  ├──> fund_flow_analysis (1:N)
  ├──> fund_flow_historical (1:N)
  ├──> long_short_overall (1:N)
  └──> long_short_exchanges (1:N)

timeframes (master)
  ├──> fund_flow_analysis (1:N)
  ├──> fund_flow_historical (1:N)
  ├──> long_short_overall (1:N)
  └──> long_short_exchanges (1:N)

market_types (master)
  ├──> fund_flow_analysis (1:N)
  └──> fund_flow_historical (1:N)
```

---

## Performance Tracking Strategy

### Current State Analysis

**Problem**: The frontend displays inaccurate trading performance metrics because:
1. No dedicated `positions` or `trades_history` table
2. PnL calculations not stored in database
3. Performance metrics calculated on-the-fly without validation
4. No distinction between open and closed positions
5. Missing fee tracking and realized vs. unrealized PnL

### Recommended Database Enhancements

#### 1. Create `positions` Table
**Purpose**: Track open positions across all exchanges in real-time.

```sql
CREATE TABLE positions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    
    -- Position Details
    side VARCHAR(10) NOT NULL, -- LONG or SHORT
    entry_order_id BIGINT REFERENCES orders(order_id),
    entry_price NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    leverage INTEGER DEFAULT 1,
    margin_mode VARCHAR(20), -- ISOLATED or CROSSED
    
    -- Cost Basis
    total_cost NUMERIC(20, 8) NOT NULL, -- entry_price * quantity
    fees_paid NUMERIC(20, 8) DEFAULT 0,
    
    -- Risk Management
    stop_loss_price NUMERIC(20, 8),
    take_profit_prices JSONB, -- Array of TP levels
    
    -- Position Status
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED, LIQUIDATED
    
    -- Performance Tracking
    unrealized_pnl NUMERIC(20, 8) DEFAULT 0, -- Updated periodically
    unrealized_pnl_percentage NUMERIC(10, 4) DEFAULT 0,
    
    -- Timestamps
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    notes TEXT,
    
    -- Constraints
    CONSTRAINT unique_position UNIQUE (user_id, exchange, symbol, entry_order_id),
    CONSTRAINT valid_side CHECK (side IN ('LONG', 'SHORT')),
    CONSTRAINT valid_status CHECK (status IN ('OPEN', 'CLOSED', 'LIQUIDATED'))
);

-- Indexes for performance
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_exchange_symbol ON positions(exchange, symbol);
CREATE INDEX idx_positions_opened_at ON positions(opened_at);
```

**Usage**:
- **On Entry Order Fill**: Create new position record
- **Periodic Updates**: Update `unrealized_pnl` based on current market price
- **On Exit**: Update status to 'CLOSED' and create trade_history record

---

#### 2. Create `trade_history` Table
**Purpose**: Record closed positions with complete performance metrics.

```sql
CREATE TABLE trade_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id BIGINT REFERENCES positions(id),
    
    -- Trade Identification
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- LONG or SHORT
    
    -- Entry Details
    entry_order_id BIGINT REFERENCES orders(order_id),
    entry_price NUMERIC(20, 8) NOT NULL,
    entry_time TIMESTAMPTZ NOT NULL,
    entry_quantity NUMERIC(20, 8) NOT NULL,
    entry_fees NUMERIC(20, 8) DEFAULT 0,
    
    -- Exit Details
    exit_order_id BIGINT REFERENCES orders(order_id),
    exit_price NUMERIC(20, 8) NOT NULL,
    exit_time TIMESTAMPTZ NOT NULL,
    exit_quantity NUMERIC(20, 8) NOT NULL,
    exit_fees NUMERIC(20, 8) DEFAULT 0,
    
    -- Exit Reason
    exit_type VARCHAR(20) NOT NULL, -- TP, SL, MANUAL, LIQUIDATION
    exit_reason TEXT, -- Additional context
    
    -- Performance Metrics
    gross_pnl NUMERIC(20, 8) NOT NULL, -- Exit value - Entry value
    net_pnl NUMERIC(20, 8) NOT NULL, -- gross_pnl - fees
    pnl_percentage NUMERIC(10, 4) NOT NULL, -- (net_pnl / total_cost) * 100
    roi_percentage NUMERIC(10, 4) NOT NULL, -- Including leverage
    
    -- Trade Duration
    hold_duration INTERVAL NOT NULL, -- exit_time - entry_time
    
    -- Risk Management
    stop_loss_price NUMERIC(20, 8),
    take_profit_prices JSONB,
    max_drawdown NUMERIC(20, 8), -- Worst unrealized PnL during trade
    
    -- Additional Metadata
    leverage INTEGER DEFAULT 1,
    margin_mode VARCHAR(20),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_exit_type CHECK (exit_type IN ('TP', 'SL', 'MANUAL', 'LIQUIDATION', 'PARTIAL'))
);

-- Indexes
CREATE INDEX idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX idx_trade_history_exchange_symbol ON trade_history(exchange, symbol);
CREATE INDEX idx_trade_history_exit_time ON trade_history(exit_time);
CREATE INDEX idx_trade_history_exit_type ON trade_history(exit_type);
CREATE INDEX idx_trade_history_pnl ON trade_history(net_pnl);
```

**Calculated Fields**:
```sql
-- Gross PnL (LONG)
gross_pnl = (exit_price - entry_price) * exit_quantity

-- Gross PnL (SHORT)
gross_pnl = (entry_price - exit_price) * exit_quantity

-- Net PnL
net_pnl = gross_pnl - (entry_fees + exit_fees)

-- PnL Percentage
pnl_percentage = (net_pnl / (entry_price * entry_quantity)) * 100

-- ROI with Leverage
roi_percentage = pnl_percentage * leverage
```

---

#### 3. Create `portfolio_snapshots` Table
**Purpose**: Store daily portfolio value snapshots for equity curve tracking.

```sql
CREATE TABLE portfolio_snapshots (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    
    -- Portfolio Metrics
    total_balance NUMERIC(20, 8) NOT NULL, -- Total account balance in USDT
    available_balance NUMERIC(20, 8) NOT NULL, -- Free balance
    locked_balance NUMERIC(20, 8) NOT NULL, -- In open orders
    
    -- Position Metrics
    total_positions_value NUMERIC(20, 8) DEFAULT 0, -- Sum of all open positions
    unrealized_pnl NUMERIC(20, 8) DEFAULT 0, -- Sum of all unrealized PnL
    open_positions_count INTEGER DEFAULT 0,
    
    -- Performance Since Start
    total_realized_pnl NUMERIC(20, 8) DEFAULT 0, -- Lifetime realized PnL
    total_trades_count INTEGER DEFAULT 0,
    winning_trades_count INTEGER DEFAULT 0,
    losing_trades_count INTEGER DEFAULT 0,
    win_rate NUMERIC(10, 4) DEFAULT 0, -- (winning_trades / total_trades) * 100
    
    -- Risk Metrics
    total_fees_paid NUMERIC(20, 8) DEFAULT 0,
    average_trade_pnl NUMERIC(20, 8) DEFAULT 0,
    largest_win NUMERIC(20, 8) DEFAULT 0,
    largest_loss NUMERIC(20, 8) DEFAULT 0,
    
    -- Timestamps
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_snapshot UNIQUE (user_id, exchange, snapshot_date)
);

-- Indexes
CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_date ON portfolio_snapshots(snapshot_date);
CREATE INDEX idx_portfolio_snapshots_user_exchange ON portfolio_snapshots(user_id, exchange);
```

**Usage**:
- Run daily cron job to snapshot portfolio state
- Generate equity curves for frontend visualization
- Track portfolio growth over time

---

#### 4. Create `performance_metrics` Table
**Purpose**: Aggregate trading performance metrics per user per exchange.

```sql
CREATE TABLE performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    
    -- Time Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY, ALL_TIME
    
    -- Trade Statistics
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    breakeven_trades INTEGER DEFAULT 0,
    
    -- Win Rate
    win_rate NUMERIC(10, 4) DEFAULT 0,
    
    -- PnL Metrics
    total_gross_pnl NUMERIC(20, 8) DEFAULT 0,
    total_net_pnl NUMERIC(20, 8) DEFAULT 0,
    average_pnl_per_trade NUMERIC(20, 8) DEFAULT 0,
    largest_win NUMERIC(20, 8) DEFAULT 0,
    largest_loss NUMERIC(20, 8) DEFAULT 0,
    
    -- Profit Factor
    gross_profit NUMERIC(20, 8) DEFAULT 0, -- Sum of all winning trades
    gross_loss NUMERIC(20, 8) DEFAULT 0, -- Sum of all losing trades (absolute)
    profit_factor NUMERIC(10, 4) DEFAULT 0, -- gross_profit / gross_loss
    
    -- Risk Metrics
    total_fees NUMERIC(20, 8) DEFAULT 0,
    average_risk_per_trade NUMERIC(10, 4) DEFAULT 0, -- % of portfolio
    max_drawdown NUMERIC(10, 4) DEFAULT 0, -- Max % decline from peak
    max_drawdown_amount NUMERIC(20, 8) DEFAULT 0,
    
    -- Efficiency Metrics
    average_hold_duration INTERVAL,
    total_volume_traded NUMERIC(20, 8) DEFAULT 0,
    
    -- Sharpe Ratio (if implementing)
    sharpe_ratio NUMERIC(10, 4),
    
    -- ROI
    roi_percentage NUMERIC(10, 4) DEFAULT 0, -- Total return on investment
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_metrics UNIQUE (user_id, exchange, period_type, period_start),
    CONSTRAINT valid_period_type CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'))
);

-- Indexes
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_period ON performance_metrics(period_type, period_start);
CREATE INDEX idx_performance_metrics_user_exchange ON performance_metrics(user_id, exchange);
```

---

#### 5. Create `fees_tracking` Table
**Purpose**: Detailed fee tracking for accurate net PnL calculations.

```sql
CREATE TABLE fees_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(order_id),
    
    -- Fee Details
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    fee_amount NUMERIC(20, 8) NOT NULL,
    fee_currency VARCHAR(10) NOT NULL, -- USDT, BTC, etc.
    fee_type VARCHAR(20) NOT NULL, -- MAKER, TAKER, FUNDING, WITHDRAWAL
    
    -- Context
    transaction_type VARCHAR(20) NOT NULL, -- ORDER_FILL, TRANSFER, CONVERSION
    related_order_id BIGINT,
    
    -- Timestamps
    fee_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_fee_type CHECK (fee_type IN ('MAKER', 'TAKER', 'FUNDING', 'WITHDRAWAL', 'CONVERSION'))
);

-- Indexes
CREATE INDEX idx_fees_tracking_user_id ON fees_tracking(user_id);
CREATE INDEX idx_fees_tracking_order_id ON fees_tracking(order_id);
CREATE INDEX idx_fees_tracking_exchange ON fees_tracking(exchange);
CREATE INDEX idx_fees_tracking_timestamp ON fees_tracking(fee_timestamp);
```

---

### PnL Calculation Logic

#### Real-Time Unrealized PnL (Open Positions)
```typescript
// Update every 30 seconds or on price tick
async function updateUnrealizedPnL(positionId: number) {
  const position = await positionsRepo.findOne({ where: { id: positionId } });
  const currentPrice = await getMarketPrice(position.exchange, position.symbol);
  
  let unrealizedPnl: number;
  
  if (position.side === 'LONG') {
    unrealizedPnl = (currentPrice - position.entry_price) * position.quantity;
  } else { // SHORT
    unrealizedPnl = (position.entry_price - currentPrice) * position.quantity;
  }
  
  const unrealizedPnlPercentage = (unrealizedPnl / position.total_cost) * 100;
  
  await positionsRepo.update(positionId, {
    unrealized_pnl: unrealizedPnl,
    unrealized_pnl_percentage: unrealizedPnlPercentage,
    last_updated: new Date()
  });
}
```

#### Realized PnL (Closed Positions)
```typescript
async function closePosition(positionId: number, exitOrderId: number) {
  const position = await positionsRepo.findOne({ where: { id: positionId } });
  const exitOrder = await ordersRepo.findOne({ where: { order_id: exitOrderId } });
  
  const exitPrice = parseFloat(exitOrder.price);
  const exitQuantity = parseFloat(exitOrder.executed_qty);
  
  // Calculate gross PnL
  let grossPnl: number;
  if (position.side === 'LONG') {
    grossPnl = (exitPrice - position.entry_price) * exitQuantity;
  } else {
    grossPnl = (position.entry_price - exitPrice) * exitQuantity;
  }
  
  // Get fees
  const entryFees = await getOrderFees(position.entry_order_id);
  const exitFees = await getOrderFees(exitOrderId);
  const totalFees = entryFees + exitFees;
  
  // Calculate net PnL
  const netPnl = grossPnl - totalFees;
  const pnlPercentage = (netPnl / position.total_cost) * 100;
  const holdDuration = exitOrder.filled_timestamp - position.opened_at;
  
  // Determine exit type
  const exitType = determineExitType(exitOrder, position);
  
  // Create trade history record
  await tradeHistoryRepo.save({
    user_id: position.user_id,
    position_id: positionId,
    exchange: position.exchange,
    symbol: position.symbol,
    side: position.side,
    entry_order_id: position.entry_order_id,
    entry_price: position.entry_price,
    entry_time: position.opened_at,
    entry_quantity: position.quantity,
    entry_fees: entryFees,
    exit_order_id: exitOrderId,
    exit_price: exitPrice,
    exit_time: exitOrder.filled_timestamp,
    exit_quantity: exitQuantity,
    exit_fees: exitFees,
    exit_type: exitType,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    pnl_percentage: pnlPercentage,
    roi_percentage: pnlPercentage * position.leverage,
    hold_duration: holdDuration,
    leverage: position.leverage,
    margin_mode: position.margin_mode
  });
  
  // Update position status
  await positionsRepo.update(positionId, { status: 'CLOSED' });
  
  // Update performance metrics
  await updatePerformanceMetrics(position.user_id, position.exchange);
}
```

#### Performance Metrics Calculation
```typescript
async function updatePerformanceMetrics(userId: string, exchange: string, periodType: string = 'ALL_TIME') {
  // Get all closed trades for period
  const trades = await tradeHistoryRepo.find({
    where: { user_id: userId, exchange: exchange },
    order: { exit_time: 'ASC' }
  });
  
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.net_pnl > 0);
  const losingTrades = trades.filter(t => t.net_pnl < 0);
  const breakEvenTrades = trades.filter(t => t.net_pnl === 0);
  
  const winRate = (winningTrades.length / totalTrades) * 100;
  
  const totalNetPnl = trades.reduce((sum, t) => sum + parseFloat(t.net_pnl), 0);
  const avgPnlPerTrade = totalNetPnl / totalTrades;
  
  const largestWin = Math.max(...winningTrades.map(t => parseFloat(t.net_pnl)));
  const largestLoss = Math.min(...losingTrades.map(t => parseFloat(t.net_pnl)));
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + parseFloat(t.net_pnl), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.net_pnl), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  
  const totalFees = trades.reduce((sum, t) => sum + parseFloat(t.entry_fees) + parseFloat(t.exit_fees), 0);
  
  // Save or update metrics
  await performanceMetricsRepo.upsert({
    user_id: userId,
    exchange: exchange,
    period_type: periodType,
    period_start: trades[0]?.entry_time || new Date(),
    period_end: trades[trades.length - 1]?.exit_time || new Date(),
    total_trades: totalTrades,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    breakeven_trades: breakEvenTrades.length,
    win_rate: winRate,
    total_net_pnl: totalNetPnl,
    average_pnl_per_trade: avgPnlPerTrade,
    largest_win: largestWin,
    largest_loss: largestLoss,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    profit_factor: profitFactor,
    total_fees: totalFees,
    calculated_at: new Date()
  }, ['user_id', 'exchange', 'period_type']);
}
```

---

### Frontend API Endpoints Needed

#### 1. Get Open Positions
```typescript
GET /api/positions/open
Response: {
  positions: [
    {
      id: 123,
      symbol: "BTCUSDT",
      side: "LONG",
      entry_price: 43000,
      quantity: 0.5,
      current_price: 44000,
      unrealized_pnl: 500,
      unrealized_pnl_percentage: 2.33,
      leverage: 10,
      opened_at: "2025-12-09T10:30:00Z"
    }
  ],
  total_unrealized_pnl: 500,
  total_positions: 1
}
```

#### 2. Get Trade History
```typescript
GET /api/trades/history?period=30d
Response: {
  trades: [
    {
      id: 456,
      symbol: "ETHUSDT",
      side: "LONG",
      entry_price: 2200,
      exit_price: 2300,
      quantity: 2,
      net_pnl: 195.50,
      pnl_percentage: 4.43,
      exit_type: "TP",
      hold_duration: "2h 15m",
      entry_time: "2025-12-08T08:00:00Z",
      exit_time: "2025-12-08T10:15:00Z"
    }
  ],
  total_trades: 45,
  total_pnl: 1234.56
}
```

#### 3. Get Performance Metrics
```typescript
GET /api/performance/metrics?period=monthly
Response: {
  period: "MONTHLY",
  period_start: "2025-12-01T00:00:00Z",
  period_end: "2025-12-31T23:59:59Z",
  total_trades: 45,
  winning_trades: 30,
  losing_trades: 15,
  win_rate: 66.67,
  total_net_pnl: 1234.56,
  profit_factor: 2.15,
  largest_win: 250.00,
  largest_loss: -120.00,
  average_pnl_per_trade: 27.43,
  roi_percentage: 12.34,
  total_fees: 145.30
}
```

#### 4. Get Portfolio Snapshot
```typescript
GET /api/portfolio/snapshot
Response: {
  exchange: "binance",
  total_balance: 10000,
  available_balance: 8500,
  locked_balance: 1500,
  total_positions_value: 5000,
  unrealized_pnl: 250,
  open_positions_count: 3,
  total_realized_pnl: 1234.56,
  win_rate: 66.67,
  snapshot_date: "2025-12-09"
}
```

#### 5. Get Equity Curve
```typescript
GET /api/portfolio/equity-curve?period=90d
Response: {
  data_points: [
    {
      date: "2025-09-10",
      balance: 10000,
      realized_pnl: 0,
      unrealized_pnl: 0
    },
    {
      date: "2025-09-11",
      balance: 10050,
      realized_pnl: 50,
      unrealized_pnl: 0
    },
    // ... more data points
    {
      date: "2025-12-09",
      balance: 11234.56,
      realized_pnl: 1234.56,
      unrealized_pnl: 250
    }
  ],
  initial_balance: 10000,
  current_balance: 11234.56,
  total_return_percentage: 12.35
}
```

---

## Migration Scripts

### Step 1: Create New Tables
```sql
-- Run all CREATE TABLE statements from sections above
-- Order: positions → trade_history → portfolio_snapshots → performance_metrics → fees_tracking
```

### Step 2: Migrate Existing Orders to Positions
```sql
-- Identify open entry orders and create position records
INSERT INTO positions (
  user_id,
  exchange,
  symbol,
  side,
  entry_order_id,
  entry_price,
  quantity,
  total_cost,
  opened_at,
  status
)
SELECT 
  o.user_id,
  o.exchange,
  o.symbol,
  CASE WHEN o.side = 'BUY' THEN 'LONG' ELSE 'SHORT' END,
  o.order_id,
  o.price::NUMERIC,
  o.executed_qty::NUMERIC,
  (o.price::NUMERIC * o.executed_qty::NUMERIC),
  o.filled_timestamp,
  'OPEN'
FROM orders o
WHERE o.order_role = 'ENTRY'
  AND o.status = 'FILLED'
  AND NOT EXISTS (
    -- Check if position was closed (has corresponding TP or SL filled)
    SELECT 1 FROM orders exit_order
    WHERE exit_order.parent_order_id = o.order_id
      AND exit_order.status = 'FILLED'
  );
```

### Step 3: Migrate Closed Trades to Trade History
```sql
-- Identify completed trades (entry + exit) and create trade_history records
INSERT INTO trade_history (
  user_id,
  exchange,
  symbol,
  side,
  entry_order_id,
  entry_price,
  entry_time,
  entry_quantity,
  exit_order_id,
  exit_price,
  exit_time,
  exit_quantity,
  exit_type,
  gross_pnl,
  net_pnl,
  pnl_percentage,
  hold_duration
)
SELECT 
  entry.user_id,
  entry.exchange,
  entry.symbol,
  CASE WHEN entry.side = 'BUY' THEN 'LONG' ELSE 'SHORT' END,
  entry.order_id,
  entry.price::NUMERIC,
  entry.filled_timestamp,
  entry.executed_qty::NUMERIC,
  exit_order.order_id,
  exit_order.price::NUMERIC,
  exit_order.filled_timestamp,
  exit_order.executed_qty::NUMERIC,
  CASE 
    WHEN exit_order.order_role LIKE 'TP%' THEN 'TP'
    WHEN exit_order.order_role = 'SL' THEN 'SL'
    ELSE 'MANUAL'
  END,
  -- Gross PnL calculation
  CASE 
    WHEN entry.side = 'BUY' THEN 
      (exit_order.price::NUMERIC - entry.price::NUMERIC) * entry.executed_qty::NUMERIC
    ELSE 
      (entry.price::NUMERIC - exit_order.price::NUMERIC) * entry.executed_qty::NUMERIC
  END,
  -- Net PnL (same as gross for now, fees to be added separately)
  CASE 
    WHEN entry.side = 'BUY' THEN 
      (exit_order.price::NUMERIC - entry.price::NUMERIC) * entry.executed_qty::NUMERIC
    ELSE 
      (entry.price::NUMERIC - exit_order.price::NUMERIC) * entry.executed_qty::NUMERIC
  END,
  -- PnL Percentage
  (
    CASE 
      WHEN entry.side = 'BUY' THEN 
        (exit_order.price::NUMERIC - entry.price::NUMERIC) * entry.executed_qty::NUMERIC
      ELSE 
        (entry.price::NUMERIC - exit_order.price::NUMERIC) * entry.executed_qty::NUMERIC
    END / (entry.price::NUMERIC * entry.executed_qty::NUMERIC)
  ) * 100,
  -- Hold duration
  (exit_order.filled_timestamp - entry.filled_timestamp)
FROM orders entry
INNER JOIN orders exit_order ON exit_order.parent_order_id = entry.order_id
WHERE entry.order_role = 'ENTRY'
  AND entry.status = 'FILLED'
  AND exit_order.status = 'FILLED';
```

---

## Database Security Best Practices

### 1. Encryption
- ✅ **API credentials**: Encrypted with AES-256-CBC
- ✅ **Encryption keys**: Stored in environment variables
- ⚠️ **Passwords**: Hashed with bcrypt (ensure salt rounds ≥ 10)

### 2. Access Control
- Implement Row-Level Security (RLS) policies in Supabase
- Restrict user access to their own data only

```sql
-- Example RLS policy for positions table
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
ON positions FOR SELECT
USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert own positions"
ON positions FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id);
```

### 3. Connection Security
- ✅ SSL/TLS enabled on database connections
- ✅ Connection pooling via Supabase pooler
- ⚠️ Rotate database credentials regularly

### 4. Audit Logging
Consider adding audit trail table:

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
  table_name VARCHAR(50) NOT NULL,
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Performance Optimization

### 1. Indexing Strategy
All critical indexes already defined in table schemas above. Key indexes:
- User lookups: `users(email)`, `api_credentials(user_id, exchange)`
- Order queries: `orders(user_id, status)`, `orders(order_group_id)`
- Performance queries: `trade_history(user_id, exit_time)`, `positions(user_id, status)`

### 2. Query Optimization
- Use `EXPLAIN ANALYZE` for slow queries
- Implement database-level pagination for large result sets
- Use materialized views for complex aggregations

Example materialized view for performance dashboard:
```sql
CREATE MATERIALIZED VIEW user_performance_summary AS
SELECT 
  user_id,
  exchange,
  COUNT(*) as total_trades,
  SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(net_pnl) as total_pnl,
  AVG(net_pnl) as avg_pnl,
  MAX(net_pnl) as largest_win,
  MIN(net_pnl) as largest_loss
FROM trade_history
GROUP BY user_id, exchange;

-- Refresh periodically (e.g., every hour)
CREATE INDEX ON user_performance_summary(user_id, exchange);
```

### 3. Caching Strategy
- Cache frequently accessed data in Redis:
  - User credentials (after decryption, with TTL)
  - Current market prices (30-second TTL)
  - Performance metrics (5-minute TTL)

---

## Backup & Disaster Recovery

### Backup Strategy
1. **Automated Backups**: Supabase provides daily automated backups
2. **Point-in-Time Recovery**: Available with Supabase Pro/Enterprise
3. **Manual Exports**: Regular PostgreSQL dumps

```bash
# Manual backup script (run daily)
pg_dump $PSQL_CONNECTION_STRING > backup_$(date +%Y%m%d).sql

# Backup to S3
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-bucket/db-backups/
```

### Recovery Procedures
1. Restore from latest backup
2. Replay transaction logs (if using PITR)
3. Verify data integrity
4. Update DNS/connection strings
5. Notify users of any data loss window

---

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Database Performance**:
   - Query response times
   - Connection pool usage
   - Disk I/O
   - Table bloat

2. **Application Metrics**:
   - Failed login attempts
   - API credential encryption/decryption errors
   - Order placement success rate
   - WebSocket connection stability

3. **Business Metrics**:
   - Daily active users
   - Total trading volume
   - Average PnL per user
   - Order fill rate

### Recommended Tools
- **Supabase Dashboard**: Built-in monitoring
- **Datadog/New Relic**: APM and database monitoring
- **PagerDuty**: Alert management
- **Grafana**: Custom dashboards

---

## Conclusion

This database schema provides a solid foundation for:
1. ✅ **User Management**: Secure authentication and multi-exchange credential storage
2. ✅ **Order Tracking**: Comprehensive order history with TP/SL relationships
3. ✅ **Market Data**: Multi-source market intelligence and sentiment tracking
4. ✅ **Automation**: Pipeline-driven trading system with full audit trail

### Next Steps (Implementation Priority)
1. **HIGH PRIORITY**: Implement `positions` and `trade_history` tables
2. **HIGH PRIORITY**: Create PnL calculation service
3. **MEDIUM PRIORITY**: Add `portfolio_snapshots` for equity curve
4. **MEDIUM PRIORITY**: Implement `performance_metrics` aggregation
5. **LOW PRIORITY**: Add `fees_tracking` for precise net PnL
6. **LOW PRIORITY**: Set up Row-Level Security policies

### Estimated Implementation Time
- Database migrations: 2-3 days
- PnL calculation service: 3-5 days
- Frontend integration: 5-7 days
- Testing & validation: 3-5 days


Created 7 todos

Read [](file:///d%3A/ByteBoom/code/frontend/src)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio)

Read [](file:///d%3A/ByteBoom/code/frontend/src/hooks/portfolio)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/PortfolioApi.ts#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/CredentialsApi.ts)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/filledOrders.tsx#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/PortfolioApi.ts#200-200), lines 200 to 500

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/filledOrders.tsx#200-200), lines 200 to 500

Starting: *Examine portfolio components in detail* (2/7)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/tradePairingLogic.ts)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/openOrders.tsx)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/balances.tsx#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/overview.tsx)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/performance.tsx#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/performanceAnalysis.tsx#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/PortfolioApi.ts#500-500), lines 500 to 800

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/TradingBotApi.ts#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/WalletApi.ts#1-1), lines 1 to 200

Starting: *Identify API integrations with backend* (3/7)

Read [](file:///d%3A/ByteBoom/code/frontend/src/hooks/portfolio/portfoliodata.ts)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/features/trades/tradeSlice.ts#1-1), lines 1 to 100

Read [](file:///d%3A/ByteBoom/code/frontend/src/lib/tokenStorage.ts)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/features)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/store)

Read [](file:///d%3A/ByteBoom/code/frontend/src/hooks/useExchange.tsx#1-1), lines 1 to 100

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/features/auth/authSlice.ts#1-1), lines 1 to 100

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/features/exchange/exchangeSlice.ts#1-1), lines 1 to 200

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/features/credentials)

Read [](file:///d%3A/ByteBoom/code/frontend/src/infrastructure/api/PortfolioApi.ts#800-800), lines 800 to 1238

Starting: *Analyze hooks and data fetching* (5/7)

Read [](file:///d%3A/ByteBoom/code/frontend/src/app/%28dashboard%29/portfolio/page.tsx#1-1), lines 1 to 100

Read [](file:///d%3A/ByteBoom/code/frontend/src/app/%28dashboard%29/portfolio/page.tsx#100-100), lines 100 to 300

Read [](file:///d%3A/ByteBoom/code/frontend/src/lib/auth.ts#1-1), lines 1 to 100

Read [](file:///d%3A/ByteBoom/code/frontend/src/types/auth.ts)

Starting: *Document frontend architecture* (6/7)

Read [](file:///d%3A/ByteBoom/code/frontend/src/components/portfolio/filledOrders.tsx#500-500), lines 500 to 827

Now I have a comprehensive understanding of the frontend codebase. Let me update the database documentation with detailed frontend information. 

Starting: *Update database documentation* (7/7)

The documentation file is outside the current workspace. Since I cannot edit files outside the workspace, let me search for any documentation files within the frontend workspace that might need updating, or create the documentation content to be added to the existing file. 

Searched for files matching `**/*.md`, 10 matches

Read [](file:///d%3A/ByteBoom/code/frontend/README.md)

The README appears to be a development notes file rather than formal documentation. Since the DATABASE_SCHEMA_DOCUMENTATION.md file is in a different workspace (backend_layer), I cannot directly edit it from this frontend workspace.

However, I can provide you with the comprehensive frontend documentation that should be added to that file. Let me generate the documentation content:

Based on my thorough analysis of the frontend codebase, here is the comprehensive documentation to be **added to the DATABASE_SCHEMA_DOCUMENTATION.md file**:

---

## Frontend Application Documentation

Since I cannot directly edit the file as it's outside this workspace, here is the complete **Frontend Section** that should be appended to your `DATABASE_SCHEMA_DOCUMENTATION.md`:

```markdown

---

## Frontend Application Integration (CryptoFrontEnd)

### Overview

The frontend is a **Next.js 14+ application** using **TypeScript**, **Redux Toolkit** for state management, and **Tailwind CSS** for styling. It connects to the NestJS backend layer for all API operations and provides a comprehensive trading dashboard for managing crypto portfolios across multiple exchanges.

**Repository**: CryptoFrontEnd  
**Branch**: Trading_Bot  
**Framework**: Next.js (App Router)  
**State Management**: Redux Toolkit  
**Styling**: Tailwind CSS  

---

### Frontend Architecture

#### Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── portfolio/            # Portfolio management page
│   │   ├── auto-trade/           # Auto trading interface
│   │   ├── wallet/               # Wallet management
│   │   └── dashboard/            # Main dashboard
│   ├── login/                    # Authentication - Login
│   ├── signup/                   # Authentication - Signup
│   └── tv/                       # TradingView integration
├── components/                   # Reusable UI components
│   ├── portfolio/                # Portfolio-specific components
│   ├── charts/                   # Chart components
│   ├── dashboard/                # Dashboard components
│   ├── wallet/                   # Wallet components
│   └── ui/                       # Generic UI components
├── infrastructure/               # Core infrastructure layer
│   ├── api/                      # API service layer
│   ├── features/                 # Redux slices
│   └── store/                    # Redux store configuration
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
├── types/                        # TypeScript type definitions
└── utils/                        # Utility functions
```

---

### Backend API Integration

#### Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000      # NestJS backend base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000     # Alternative API base URL
NEXT_PUBLIC_TRADING_BOT_API=http://localhost:8001  # FastAPI Trading Bot URL
```

#### API Service Files

| File | Purpose | Backend Endpoints |
|------|---------|-------------------|
| PortfolioApi.ts | Portfolio data management | `/binance/*`, `/bitget/*` |
| CredentialsApi.ts | Exchange credentials CRUD | `/api-credentials/*` |
| TradingBotApi.ts | Trading bot operations | FastAPI endpoints |
| WalletApi.ts | Wallet deposits/withdrawals | `/binance/deposit-history`, `/binance/withdraw-history` |

---

### Authentication Flow

#### Token Storage (tokenStorage.ts)

```typescript
class TokenStorage {
    static ACCESS_TOKEN_KEY = 'access_token';
    static REFRESH_TOKEN_KEY = 'refresh_token';
    
    // Methods: getAccessToken(), getRefreshToken(), setTokens(), clearTokens()
}
```

**Flow**:
1. User logs in via `/auth/login` endpoint
2. Backend returns JWT `access_token` and `refresh_token`
3. Frontend stores tokens in `localStorage`
4. All subsequent API calls include `Authorization: Bearer <token>` header
5. Backend validates JWT and extracts `user_id` from token

#### Auth State (authSlice.ts)

**Maps to Database Tables**: `users`, `refreshtokens`

```typescript
interface AuthState {
    user: User | null;           // Maps to users table
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

interface User {
    id: string;                  // users.id (UUID)
    email: string;               // users.email
    displayName: string;         // users.name
    createdAt: string;           // users.created_at
    configuredExchanges?: string[]; // Derived from api_credentials table
}
```

---

### Exchange Credentials Integration

#### Credentials State (exchangeSlice.ts)

**Maps to Database Table**: `api_credentials`

```typescript
interface ExchangeCredentials {
    exchange: 'binance' | 'bitget';     // api_credentials.exchange
    apiKey: string;                      // api_credentials.api_key (encrypted)
    secretKey: string;                   // api_credentials.secret_key (encrypted)
    passphrase?: string;                 // api_credentials.passphrase (Bitget only)
    label: string;                       // api_credentials.label
    id?: string;                         // api_credentials.id
    isActive?: boolean;                  // api_credentials.is_active
}
```

#### API Endpoint Mapping

| Frontend Action | Backend Endpoint | Database Operation |
|----------------|------------------|-------------------|
| Save credentials | `POST /api-credentials/save-credentials` | `INSERT INTO api_credentials` |
| Get credentials | `GET /api-credentials/user/:userId` | `SELECT FROM api_credentials WHERE user_id = :id` |
| Update credentials | `PUT /api-credentials/:id` | `UPDATE api_credentials SET ...` |
| Delete credentials | `DELETE /api-credentials/:id` | `UPDATE api_credentials SET is_active = false` |

---

### Portfolio Module (Deep Dive)

#### Portfolio Page (page.tsx)

**Main Component**: Orchestrates all portfolio tabs and data fetching.

**State Variables**:
```typescript
const [accountData, setAccountData] = useState<NormalizedAccountInfo | null>(null);
const [openOrders, setOpenOrders] = useState<Order[]>([]);
const [orderHistory, setOrderHistory] = useState<Array<{ symbol: string; orders: Order[] }>>([]);
const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshotResponse | null>(null);
const [userAssets, setUserAssets] = useState<NormalizedUserAsset[]>([]);
```

**Data Flow**:
```
User Login → Redux Auth State → Portfolio Page Load
                                      ↓
                           fetchBasicData() called
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
        getAccountInfoByExchange()           getOpenOrdersByExchange()
                    ↓                                   ↓
             Backend API                         Backend API
                    ↓                                   ↓
        Exchange API (Binance/Bitget)    Exchange API (Binance/Bitget)
                    ↓                                   ↓
                    └─────────────────┬─────────────────┘
                                      ↓
                           Redux State Updated
                                      ↓
                    fetchEnhancedData() (background)
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
        getAccountSnapshotByExchange()      getUserAssetsByExchange()
```

---

### Portfolio Components Detail

#### 1. Overview Tab (overview.tsx)

**Purpose**: Displays account summary, permissions, and top assets.

**Data Source**: `NormalizedAccountInfo` from exchange API

**Database Mapping**: No direct database mapping - real-time exchange data

```typescript
interface NormalizedAccountInfo {
    makerCommission: number;
    takerCommission: number;
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    accountType: string;
    balances: Balance[];        // Real-time from exchange
    permissions: string[];
    exchange: 'binance' | 'bitget';
}
```

---

#### 2. Balances Tab (balances.tsx)

**Purpose**: Shows all asset balances with USD valuations.

**Data Source**: `NormalizedUserAsset[]` from exchange API

**Key Features**:
- Real-time price fetching via `/bitget/tickers` or Binance API
- BGB conversion for small balances (Bitget-specific)
- Search, filter, and sort capabilities

```typescript
interface NormalizedUserAsset {
    asset: string;              // Token symbol (BTC, ETH, USDT)
    free: string;               // Available balance
    locked: string;             // In open orders
    freeze: string;             // Frozen balance
    withdrawing: string;        // Pending withdrawal
    exchange: 'binance' | 'bitget';
    usdValue?: number;          // Calculated USD value
    pricePerUnit?: number;      // Current price
}
```

---

#### 3. Open Orders Tab (openOrders.tsx)

**Purpose**: Displays currently active orders.

**Data Source**: Exchange APIs via `getOpenOrdersByExchange()`

**Backend Endpoint**: 
- Binance: `GET /binance/open-orders`
- Bitget: `GET /bitget/order/all-open-orders`

**Database Mapping**: 
- Corresponds to `orders` table where `status = 'NEW'` or `status = 'PARTIALLY_FILLED'`

```typescript
// Binance Order Format
interface Order {
    orderId: number;            // orders.order_id
    clientOrderId: string;      // orders.client_order_id
    symbol: string;             // orders.symbol
    side: string;               // orders.side
    type: string;               // orders.type
    price: string;              // orders.price
    origQty: string;            // orders.quantity
    executedQty: string;        // orders.executed_qty
    status: string;             // orders.status
    time: number;               // orders.order_timestamp
}

// Bitget Order Format
interface BitgetOrder {
    orderId: string;
    symbol: string;
    side: string;
    orderType: string;
    priceAvg: string;
    size: string;
    status: string;
    presetTakeProfitPrice: string;    // For TP/SL tracking
    presetStopLossPrice: string;
    cTime: string;
}
```

---

#### 4. Filled Orders Tab (filledOrders.tsx)

**Purpose**: Shows completed trades with PnL calculations.

**Data Source**: `GET /bitget/order/trade-fills`

**Key Features**:
- Trade pairing logic (matches buys with sells)
- PnL calculation including fees
- Date range filtering (up to 80 days lookback)
- Caching (5-minute TTL)

**Redux State** (tradeSlice.ts):
```typescript
interface TradesState {
    tradeHistory: TradeHistory[];     // All fetched trades
    symbolGroups: SymbolGroupData[];  // Grouped by symbol
    historyDays: number;
    lastFetchTime: number | null;
    loading: boolean;
    error: string | null;
}

interface TradeHistory {
    tradeId: string;
    orderId: string;
    symbol: string;
    side: string;           // 'buy' or 'sell'
    price: string;
    size: string;
    amount?: string;        // price * size
    feeDetail: {
        feeCoin: string;    // Fee currency (USDT, BTC, etc.)
        totalFee: string;   // Fee amount
    };
    cTime: string;          // Timestamp in milliseconds
}
```

**PnL Calculation Logic** (tradePairingLogic.ts):

```typescript
/**
 * Trade Pairing Algorithm:
 * 1. Sort trades chronologically (oldest first)
 * 2. Track net position (buys - sells)
 * 3. Create pair when position closes (net ≈ 0)
 * 4. Handle cross-day positions
 * 5. Account for fees in both asset and USDT
 */

// BUY Calculations:
totalBuyCost = Σ(buySize × buyPrice) + USDT_fees
effectiveBuySize = Σ(buySize - asset_fees)  // When fee paid in bought asset
avgBuyPrice = totalBuyCost / effectiveBuySize

// SELL Calculations:
totalSellRevenue = Σ(sellSize × sellPrice) - all_fees
avgSellPrice = totalSellRevenue / totalSellSize

// PNL Calculations:
matchedSize = min(totalBuySize, totalSellSize)
costBasis = matchedSize × avgBuyPrice
pnl = totalSellRevenue - costBasis
pnlPercent = (pnl / costBasis) × 100
```

**Database Correlation**:
- Maps to proposed `trade_history` table structure
- Currently calculated client-side; should migrate to backend

---

#### 5. Trade Analysis Tab (performanceAnalysis.tsx)

**Purpose**: Advanced analytics and visualization of trading performance.

**Features**:
- Symbol-level PnL aggregation
- Win/Loss distribution charts (Pie Chart)
- Top performing symbols (Bar Chart)
- Cumulative PnL over time
- Uses Recharts library for visualization

**Data Source**: Same as Filled Orders - processes `tradeHistory` from Redux

**Visualizations**:
1. **Win/Loss Pie Chart**: Winning vs losing trades ratio
2. **Top Symbols Bar Chart**: Best/worst performing symbols by PnL
3. **Cumulative PnL Line Chart**: PnL growth over time

---

#### 6. Performance Tab (performance.tsx)

**Purpose**: Portfolio performance tracking over time.

**Data Source**: `AccountSnapshotResponse` from `getAccountSnapshotByExchange()`

**Backend Endpoint**: `GET /binance/account-snapshot`

**Database Mapping**: Maps to proposed `portfolio_snapshots` table

```typescript
interface AccountSnapshotResponse {
    totalSnapshots: number;
    period: string;
    snapshots: Snapshot[];
    currentValue: number;              // Current portfolio USD value
    initialValue: number;
    meaningfulInitialValue: number;    // First non-trivial balance
    performance: {
        totalReturn: string;           // Percentage return
        rawTotalReturn: string;
        days: number;
        avgDailyReturn: string;
    };
    summary: {
        totalPortfolioValue: string;
        topAssets: TopAsset[];
    };
}

interface Snapshot {
    date: string;                      // YYYY-MM-DD
    totalValueUSD: number;
    totalAssetOfBtc: number;
    balances: Balance[];
    updateTime: number;
    change24h: number;
}
```

---

#### 7. Order History Tab (`orderHistory.tsx`)

**Purpose**: Historical order records.

**Backend Endpoint**: `GET /binance/order-history`

**Database Mapping**: `orders` table (all statuses)

---

#### 8. Transfer History Tab (`transferHistory.tsx`)

**Purpose**: Internal transfer records (Spot ↔ Futures).

**Backend Endpoint**: `GET /binance/transfer-history`

**Database Mapping**: Not currently stored in database - exchange API only

---

### Multi-Exchange Support Architecture

#### Exchange Normalization Layer (PortfolioApi.ts)

The frontend normalizes data from different exchanges into unified formats:

```typescript
// Wrapper Functions
getAccountInfoByExchange(exchange, credentials)     // Returns NormalizedAccountInfo
getUserAssetsByExchange(exchange, credentials)      // Returns NormalizedUserAsset[]
getOpenOrdersByExchange(exchange, credentials)      // Returns Order[] | BitgetOrder[]
getAccountSnapshotByExchange(exchange, credentials) // Returns AccountSnapshotResponse

// Normalization Functions
normalizeBitgetToUserAsset(bitgetAssets)           // BitgetAsset[] → NormalizedUserAsset[]
normalizeBinanceUserAsset(binanceAssets)           // UserAsset[] → NormalizedUserAsset[]
normalizeBitgetToAccountInfo(bitgetAssets)         // BitgetAsset[] → NormalizedAccountInfo
normalizeBitgetToAccountSnapshot(bitgetAssets)     // BitgetAsset[] → AccountSnapshotResponse
```

#### Price Fetching

```typescript
// Bitget
getBitgetTicker(symbol)                            // Single symbol price
getBitgetPrices(assets)                            // Multiple assets → { asset: price }

// Binance (via public API)
fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`)
```

---

### Trading Bot Integration

#### API Service (TradingBotApi.ts)

**Backend**: FastAPI Trading Bot (port 8001)

```typescript
interface TradingBotApi {
    // Exchange Management
    initializeExchange(data: ExchangeInitRequest): Promise<ExchangeInitResponse>;
    getActiveExchange(): Promise<ActiveExchangeResponse>;
    switchExchange(data: ExchangeInitRequest): Promise<ExchangeInitResponse>;
    
    // Trading Configuration
    getTradingConfig(): Promise<TradingConfig>;
    updateTradingConfig(config: TradingConfig): Promise<...>;
    
    // Statistics & Monitoring
    getStats(): Promise<TradingStats>;
    getProcessingStatus(): Promise<ProcessingStatusResponse>;
    getPlacedOrders(): Promise<{ placed: string[] }>;
    getBalanceHistory(): Promise<{ history: any[]; start_balance: number }>;
}

interface TradingConfig {
    amount_percentage: number;          // % of balance per trade
    tp_level_count: number;             // Number of take-profit levels
    tp1_percentage: number;             // TP1 distance %
    tp2_percentage: number;             // TP2 distance %
    tp3_percentage: number;             // TP3 distance %
    stop_loss_percentage: number;       // SL distance %
}

interface TradingStats {
    start_balance: number;
    current_balance: number;
    profit: number;
    queue_size: number;
    processing_symbol: string | null;
    stats: {
        logic_checks: number;
        symbols_queued: number;
        symbols_processed: number;
        pipeline_successes: number;
        pipeline_failures: number;
        buy_signals_found: number;
        // ... more stats
    };
}
```

**Database Correlation**:
- Maps to `processed_orders` and `open_orders` tables (Bitget-specific)
- Pipeline operations map to `pipeline_runs`, `predictions`, `trades`, `executions` tables

---

### Wallet Integration

#### Deposit/Withdrawal Tracking (WalletApi.ts)

**Backend Endpoints**:
- `GET /binance/deposit-history`
- `GET /binance/withdraw-history`
- `GET /bitget/deposit-records`
- `GET /bitget/withdrawal-records`

**Normalized Types**:
```typescript
interface NormalizedDeposit {
    id: string;
    amount: string;
    coin: string;
    network: string;
    status: 'pending' | 'success' | 'failed' | 'unknown';
    address: string;
    txId: string;
    timestamp: number;
    exchange: 'binance' | 'bitget';
}

interface NormalizedWithdrawal {
    id: string;
    amount: string;
    coin: string;
    network: string;
    status: 'pending' | 'success' | 'failed' | 'unknown';
    address: string;
    txId: string;
    fee?: string;
    timestamp: number;
    exchange: 'binance' | 'bitget';
}
```

---

### State Management Summary

#### Redux Slices

| Slice | File | State | Database Tables |
|-------|------|-------|-----------------|
| `auth` | authSlice.ts | User authentication | `users`, `refreshtokens` |
| `exchange` | exchangeSlice.ts | Exchange selection & credentials | `api_credentials` |
| `trades` | tradeSlice.ts | Trade history & pairs | `orders`, (proposed: `trade_history`) |

#### Local Storage Keys

| Key | Purpose |
|-----|---------|
| `access_token` | JWT access token |
| `refresh_token` | JWT refresh token |
| `reduxState` | Persisted Redux state (auth, exchange) |
| `filled_orders_cache` | Cached filled orders (5-min TTL) |
| `portfolio_account_{exchange}` | Cached account info |
| `portfolio_orders_{exchange}` | Cached open orders |

---

### Frontend → Backend API Mapping Summary

| Frontend Function | Backend Endpoint | HTTP Method | Database Tables Affected |
|-------------------|------------------|-------------|-------------------------|
| `login()` | `/auth/login` | POST | `users`, `refreshtokens` |
| `signup()` | `/user/register-user` | POST | `users` |
| `logout()` | `/auth/logout` | POST | `refreshtokens` |
| `saveCredentialsToDatabase()` | `/api-credentials/save-credentials` | POST | `api_credentials` |
| `getAccountInfo()` | `/binance/account-info` | GET | None (live exchange) |
| `getUserAssets()` | `/binance/user-assets` | GET | None (live exchange) |
| `getOpenOrders()` | `/binance/open-orders` | GET | None (live exchange) |
| `getBitgetOpenOrders()` | `/bitget/order/all-open-orders` | GET | `open_orders` |
| `getOrderHistory()` | `/binance/order-history` | GET | `orders` |
| `getAccountSnapshot()` | `/binance/account-snapshot` | GET | None (live exchange) |
| `getDepositHistory()` | `/binance/deposit-history` | GET | None (live exchange) |
| `getWithdrawHistory()` | `/binance/withdraw-history` | GET | None (live exchange) |
| `getTransferHistory()` | `/binance/transfer-history` | GET | None (live exchange) |
| `fetchTradeHistory()` | `/bitget/order/trade-fills` | GET | None (live exchange) |
| `getBitgetSpotAssets()` | `/bitget/account/spot/assets` | GET | None (live exchange) |

---

### Known Issues & Gaps (Frontend ↔ Backend)

1. **PnL Not Persisted**: Trade pairing and PnL calculations happen client-side in filledOrders.tsx and tradePairingLogic.ts. Should migrate to backend with `trade_history` table.

2. **Performance Snapshots**: `AccountSnapshotResponse` for Bitget is calculated client-side from current balances. No historical data stored. Needs `portfolio_snapshots` table.

3. **Order Syncing**: Open orders from exchanges not synced to `orders` table in real-time. Only stored when orders are placed through the platform.

4. **Fee Tracking**: Fees extracted from `feeDetail` in trade responses but not stored in dedicated `fees_tracking` table.

5. **User-Order Relationship**: `orders.user_id` is `INTEGER` but should be `UUID` to match `users.id`. Foreign key relationship is weak.

6. **Exchange Credentials Caching**: Credentials stored in Redux + localStorage (encrypted by backend). Consider session-based approach for security.

---

### Recommended Frontend Improvements

1. **Implement Real-Time Order Sync**
   - Use WebSocket connections to exchange APIs
   - Sync order status changes to backend `orders` table

2. **Add Portfolio Snapshot Scheduler**
   - Create daily snapshot capture
   - Store in `portfolio_snapshots` table
   - Enable equity curve visualization

3. **Migrate PnL to Backend**
   - Move tradePairingLogic.ts to backend service
   - Store results in `trade_history` table
   - Provide API endpoint for historical PnL

4. **Add Position Tracking UI**
   - New component for open positions
   - Real-time unrealized PnL display
   - Maps to proposed `positions` table

5. **Fee Tracking Integration**
   - Parse and store all fees
   - Display fee summaries in portfolio
   - Enable fee-adjusted PnL reporting

---

Last Updated: December 9, 2025
Version: 1.0.0 (Frontend Section)
``` 

Completed: *Update database documentation* (7/7)

I've completed a thorough analysis of your frontend codebase. Since the `DATABASE_SCHEMA_DOCUMENTATION.md` file is located outside this workspace (in backend_layer), I cannot directly edit it.

**Here's what you need to do:**

Copy the comprehensive **Frontend Application Integration** section I provided above and append it to your `DATABASE_SCHEMA_DOCUMENTATION.md` file. This documentation covers:

### Key Findings Summary:

1. **Authentication Flow**: Maps to `users` and `refreshtokens` tables via JWT tokens stored in `localStorage`

2. **Credentials Management**: exchangeSlice.ts → `api_credentials` table with encrypted storage

3. **Portfolio Module Components**:
   - overview.tsx - Account summary (real-time exchange data)
   - balances.tsx - Asset holdings with USD valuations
   - openOrders.tsx - Maps to `orders` table (status=NEW)
   - filledOrders.tsx - Trade history with client-side PnL calculations
   - performanceAnalysis.tsx - Analytics visualizations
   - performance.tsx - Portfolio snapshots

4. **Critical Gap Identified**: 
   - PnL calculations in tradePairingLogic.ts happen **client-side only**
   - No `trade_history` or `positions` tables currently populated
   - This explains the "inaccurate performance metrics" mentioned in the database documentation

5. **API Integration Points**:
   - PortfolioApi.ts - Main API layer (1238 lines)
   - CredentialsApi.ts - Credentials CRUD
   - TradingBotApi.ts - FastAPI trading bot
   - WalletApi.ts - Deposit/withdrawal tracking

The documentation includes detailed type definitions, data flow diagrams, database mappings, and recommendations for improving the frontend-backend integration.