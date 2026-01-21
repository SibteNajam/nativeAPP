/**
 * Types for trading bot trades and PnL data
 */

export interface OrderBase {
  orderId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'LIMIT_MAKER' | 'STOP_LOSS_LIMIT';
  quantity: number;
  executedQty: number;
  price: number;
  status: 'FILLED' | 'MANUALLY_CLOSED' | 'CANCELED';
  filledAt: string | null;
  createdAt: string;
}

export interface EntryOrder extends OrderBase {
  // Entry orders are always BUY
  side: 'BUY';
}

export interface ExitOrder extends OrderBase {
  role: 'TP1' | 'TP2' | 'SL' | 'TIME_EXIT' | 'MANUAL_SELL';
  updatedAt: string;
}

export interface TradePnL {
  realized: number;
  unrealized: number;
  total: number;
  realizedPercent: number;
  unrealizedPercent: number;
  totalPercent: number;
  entryCost: number;
  realizedQty: number;
  unrealizedQty: number;
  currentMarketPrice: number;
  isComplete: boolean;
  hasDataIntegrityIssue: boolean;
}

export interface Trade {
  tradeId: string;
  entryOrder: EntryOrder;
  exitOrders: ExitOrder[];
  pnl: TradePnL;
}

export interface TradesSummary {
  totalTrades: number;
  completedTrades: number;
  activeTrades: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  totalPnl: number;
}

export interface TradesResponse {
  status: 'Success' | 'Error';
  data: {
    trades: Trade[];
    summary: TradesSummary;
  };
  statusCode: number;
  message: string;
}
