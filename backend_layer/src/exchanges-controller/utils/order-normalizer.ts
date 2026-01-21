/**
 * Order normalization utilities for unified exchange API responses
 */

/**
 * Normalized order interface
 */
export interface NormalizedOrder {
  symbol: string;
  orderId: string;
  clientOrderId: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  type: string;
  side: string;
  time: number;
  updateTime: number;
  exchange: string;
}

/**
 * Normalized balance interface
 */
export interface NormalizedBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  exchange: string;
}

/**
 * Normalize Binance order format to unified format
 */
export function normalizeBinanceOrder(order: any): NormalizedOrder {
  return {
    symbol: order.symbol,
    orderId: order.orderId.toString(),
    clientOrderId: order.clientOrderId,
    price: order.price,
    quantity: order.origQty,
    executedQty: order.executedQty,
    status: order.status,
    type: order.type,
    side: order.side,
    time: order.time,
    updateTime: order.updateTime,
    exchange: 'BINANCE'
  };
}

/**
 * Normalize Bitget order format to unified format
 */
export function normalizeBitgetOrder(order: any): NormalizedOrder {
  return {
    symbol: order.symbol,
    orderId: order.orderId,
    clientOrderId: order.clientOid,
    price: order.priceAvg,
    quantity: order.size,
    executedQty: '0', // Bitget doesn't provide executed quantity in unfilled orders
    status: order.status,
    type: order.orderType,
    side: order.side,
    time: parseInt(order.cTime),
    updateTime: parseInt(order.uTime),
    exchange: 'BITGET'
  };
}

/**
 * Normalize Binance balance format to unified format
 */
export function normalizeBinanceBalance(balance: any): NormalizedBalance {
  const free = parseFloat(balance.free || '0');
  const locked = parseFloat(balance.locked || '0');
  const total = free + locked;

  return {
    asset: balance.asset,
    free: balance.free || '0',
    locked: balance.locked || '0',
    total: total.toString(),
    exchange: 'BINANCE'
  };
}

/**
 * Normalize Bitget balance format to unified format
 */
export function normalizeBitgetBalance(balance: any): NormalizedBalance {
  const free = parseFloat(balance.available || '0');
  const locked = parseFloat(balance.frozen || '0') + parseFloat(balance.locked || '0');
  const total = free + locked;

  return {
    asset: balance.coin,
    free: balance.available || '0',
    locked: locked.toString(),
    total: total.toString(),
    exchange: 'BITGET'
  };
}