/**
 * Trades Store (Zustand)
 * =====================
 * Centralized state management for trades data.
 * Fetches data once and shares across all components.
 * 
 * Usage:
 *   import { useTradesStore } from '@/store/tradesStore';
 *   
 *   // In component:
 *   const { trades, summary, todayPnL, todayTrades, isLoading, fetchTrades } = useTradesStore();
 */

import { create } from 'zustand';
import { getBotTrades } from '@/services/api/trades.api';
import type { Trade, TradesSummary } from '@/types/trades.types';

// ============================================
// Types
// ============================================

interface TodayStats {
    pnl: number;
    trades: number;
    completedTrades: Trade[];
}

interface TradesState {
    // Data
    trades: Trade[];
    summary: TradesSummary | null;
    todayStats: TodayStats;

    // Status
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null; // Timestamp of last fetch
    currentExchange: string | null;

    // Actions
    fetchTrades: (exchange: string, force?: boolean) => Promise<void>;
    clearTrades: () => void;
    setError: (error: string | null) => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate today's stats from trades array
 */
const calculateTodayStats = (trades: Trade[]): TodayStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter trades completed today
    const completedTrades = trades.filter((trade) => {
        if (!trade.pnl.isComplete || !trade.entryOrder.filledAt) return false;
        const tradeDate = new Date(trade.entryOrder.filledAt);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
    });

    // Calculate total PnL from today's completed trades
    const pnl = completedTrades.reduce((sum, trade) => sum + trade.pnl.realized, 0);

    return {
        pnl,
        trades: completedTrades.length,
        completedTrades,
    };
};

// ============================================
// Store
// ============================================

// Cache duration: 30 seconds (in milliseconds)
const CACHE_DURATION = 30 * 1000;

export const useTradesStore = create<TradesState>((set, get) => ({
    // Initial state
    trades: [],
    summary: null,
    todayStats: { pnl: 0, trades: 0, completedTrades: [] },
    isLoading: false,
    error: null,
    lastFetched: null,
    currentExchange: null,

    /**
     * Fetch trades from API
     * @param exchange - Exchange to fetch trades for
     * @param force - Force refresh even if cache is valid
     */
    fetchTrades: async (exchange: string, force: boolean = false) => {
        const state = get();
        const now = Date.now();

        // Skip fetch if:
        // 1. Already loading
        // 2. Same exchange AND cache is still valid AND not forced
        if (state.isLoading) {
            return;
        }

        const isSameExchange = state.currentExchange === exchange;
        const cacheValid = state.lastFetched && (now - state.lastFetched) < CACHE_DURATION;

        if (!force && isSameExchange && cacheValid) {
            // Cache is still valid, skip API call
            return;
        }

        set({ isLoading: true, error: null });

        try {
            // Backend expects uppercase exchange names (e.g., 'BINANCE' not 'binance')
            const exchangeUppercase = exchange.toUpperCase();
            const response = await getBotTrades(exchangeUppercase);

            if (response.status === 'Success') {
                const trades = response.data.trades;
                const summary = response.data.summary;
                const todayStats = calculateTodayStats(trades);

                set({
                    trades,
                    summary,
                    todayStats,
                    isLoading: false,
                    lastFetched: now,
                    currentExchange: exchange,
                    error: null,
                });
            } else {
                set({
                    isLoading: false,
                    error: response.message || 'Failed to fetch trades',
                });
            }
        } catch (error: any) {
            console.error('Failed to fetch trades:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch trades',
            });
        }
    },

    /**
     * Clear all trades data (e.g., on logout or exchange disconnect)
     */
    clearTrades: () => {
        set({
            trades: [],
            summary: null,
            todayStats: { pnl: 0, trades: 0, completedTrades: [] },
            isLoading: false,
            error: null,
            lastFetched: null,
            currentExchange: null,
        });
    },

    /**
     * Set error message
     */
    setError: (error: string | null) => {
        set({ error });
    },
}));

// ============================================
// Selectors (for convenience)
// ============================================

/**
 * Select only today's PnL (optimized - won't re-render if other state changes)
 */
export const useTodayPnL = () => useTradesStore((state) => state.todayStats.pnl);

/**
 * Select only today's trade count
 */
export const useTodayTradesCount = () => useTradesStore((state) => state.todayStats.trades);

/**
 * Select loading state
 */
export const useTradesLoading = () => useTradesStore((state) => state.isLoading);

/**
 * Select all trades
 */
export const useAllTrades = () => useTradesStore((state) => state.trades);

/**
 * Select trades summary
 */
export const useTradesSummary = () => useTradesStore((state) => state.summary);

export default useTradesStore;
