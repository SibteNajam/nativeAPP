/**
 * Trades API Client
 * Handles fetching bot trading history with PnL data
 */

import apiClient from './client';
import type { TradesResponse } from '@/types/trades.types';

/**
 * Get trading bot trades with PnL for the authenticated user
 * @param exchange Exchange name (e.g., 'binance', 'bitget')
 * @param symbol Optional symbol filter (e.g., 'BTCUSDT')
 */
export const getBotTrades = async (
  exchange?: string,
  symbol?: string
): Promise<TradesResponse> => {
  try {
    const params: Record<string, string> = {};
    if (exchange) params.exchange = exchange;
    if (symbol) params.symbol = symbol;

    const response = await apiClient.get<TradesResponse>('/exchanges/trades', {
      params,
    });

    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch bot trades:', error);
    throw error;
  }
};

/**
 * Get trades for a specific symbol on an exchange
 */
export const getTradesBySymbol = async (
  symbol: string,
  exchange?: string
): Promise<TradesResponse> => {
  try {
    return await getBotTrades(exchange, symbol);
  } catch (error: any) {
    console.error(`Failed to fetch trades for ${symbol}:`, error);
    throw error;
  }
};
