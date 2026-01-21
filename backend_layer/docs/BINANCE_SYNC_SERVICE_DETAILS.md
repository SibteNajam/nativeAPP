# Binance Sync Service: The Safety Net

The `BinanceSyncService` acts as a fail-safe mechanism to ensure your database stays in sync with Binance and no positions are left unprotected (without TP/SL), even if WebSockets fail or the server crashes.

## 🔄 Triggers
1. **On Startup:** Runs 15 seconds after application boot.
2. **Periodically:** Runs every **5 minutes**.

## 🛡️ Core Functions

### 1. Sync Unfilled Orders
**Goal:** Fix statuses for orders that might have filled or canceled while the system was offline.

- **Step 1:** Queries DB for all `NEW` or `PARTIALLY_FILLED` orders.
- **Step 2:** Checks their *actual* status on Binance API.
- **Step 3:** Matches? Do nothing.
- **Step 4:** Mismatch? Update DB status (e.g., set to `FILLED` or `CANCELED`).
- **Step 5:** If an entry order is found to be `FILLED` (and wasn't before), it triggers the **OCO Placement Logic** to set TP/SL.

### 2. Safety Net: Missing OCO Check (Critical)
**Goal:** Ensure every filled Buy order has corresponding TP/SL orders.

- **Scope:** Checks all `FILLED` entry orders from the last **3 days**.
- **Check:** Does this order have associated TP/SL orders in the database?
- **Logic:**
  - If **NO TP/SL found**:
    1. Verify on Binance that order is indeed `FILLED`.
    2. Check user wallet balance: Do they still hold the coin? (Prevents selling what isn't there).
    3. **Action:** Immediately calculate and place missing OCO (TP/SL) orders.

## ⚙️ Configuration
- **Sync Interval:** 5 Minutes (`SYNC_INTERVAL_MS`)
- **Startup Delay:** 15 Seconds (`STARTUP_DELAY_MS`)
- **Lookback Window:** 3 Days (`MAX_ORDER_AGE_DAYS`)
- **Rate Limit:** 150ms delay between API calls (to prevent bans)

## 📌 Why is this needed?
If your server crashes **immediately** after a Buy order fills but **before** the TP/SL orders generate:
- Without this service: You hold a "naked" position with no Stop Loss.
- With this service: Within 5 minutes (or on restart), the system detects the missing SL and places it automatically.
