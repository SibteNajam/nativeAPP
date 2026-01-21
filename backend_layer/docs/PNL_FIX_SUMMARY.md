# PnL Calculation Logic Fix

## Issue
The previous PnL calculation logic was incorrectly calculating `unrealizedQty` by summing the `remainingQuantity` of all open exit orders. 
Since OCO orders (TP/SL) are placed as separate orders but cover the same coins, this led to **double counting** the open position size.

**Example of Error:**
- Entry: 200 coins
- TP2 (Open): 100 coins
- SL (Open): 100 coins
- **Old Calculation:** 100 + 100 = 200 coins unrealized (should be 100)

## Fix Implemented

**1. Corrected `unrealizedQty` Calculation:**
Instead of summing open exit orders, we now calculate it as:
```typescript
const unrealizedQty = Math.max(0, entryQty - realizedQty);
```
Where `realizedQty` is the sum of quantities from `FILLED` exit orders.

**2. Increased Precision:**
All financial values (PnL, Prices, Percentages) are now formatted to **8 decimal places** (previously 4) to ensure maximum accuracy and match database precision.

```typescript
pnl: {
  realized: parseFloat(realizedPnl.toFixed(8)),
  unrealized: parseFloat(unrealizedPnl.toFixed(8)),
  total: parseFloat(totalPnl.toFixed(8)),
  // ...
  unrealizedQty: parseFloat(unrealizedQty.toFixed(8)),
}
```

## Result
- **Accurate Position Tracking:** Overlapping OCO orders no longer inflate the unrealized quantity.
- **Precise Data:** Small PnL values are now visible down to 8 decimal places.
- **Correct Total PnL:** Since `unrealizedPnL` relies on `unrealizedQty`, the Total PnL is now also correct.
