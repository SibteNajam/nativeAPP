/**
 * Binance Exchange API Service
 * ================================
 * Handles all Binance-specific API calls for account data, orders, and trades.
 * Uses JWT authentication from the backend.
 * 
 * Usage:
 *   import { binanceApi } from '@/services/api/binance.api';
 *   const balances = await binanceApi.getAccountBalances();
 */

import { api } from './client';

// API endpoints
const BINANCE_BASE = '/binance';

export interface BinanceBalance {
    asset: string;
    free: string;
    locked: string;
    total?: string;
}

export interface BinanceOrder {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'PENDING_CANCEL' | 'REJECTED' | 'EXPIRED';
    timeInForce: 'GTC' | 'IOC' | 'FOK';
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
    side: 'BUY' | 'SELL';
    stopPrice?: string;
    icebergQty?: string;
    time: number;
    updateTime: number;
    isWorking: boolean;
    origQuoteOrderQty: string;
}

export interface BinanceTrade {
    symbol: string;
    id: number;
    orderId: number;
    orderListId: number;
    price: string;
    qty: string;
    quoteQty: string;
    commission: string;
    commissionAsset: string;
    time: number;
    isBuyer: boolean;
    isMaker: boolean;
    isBestMatch: boolean;
}

export interface BinanceAccountInfo {
    makerCommission: number;
    takerCommission: number;
    buyerCommission: number;
    sellerCommission: number;
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    updateTime: number;
    accountType: string;
    balances: BinanceBalance[];
    permissions: string[];
}

/**
 * Binance API Service
 */
export const binanceApi = {
    /**
     * Get account balances
     * Returns all assets with non-zero balances
     */
    async getAccountBalances(): Promise<BinanceBalance[]> {
        try {
            const response = await api.get(`${BINANCE_BASE}/account-balances`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get balances error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance balances');
        }
    },

    /**
     * Get full account information
     * Includes permissions, commissions, and all balances
     */
    async getAccountInfo(): Promise<BinanceAccountInfo> {
        try {
            const response = await api.get(`${BINANCE_BASE}/account-info`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get account info error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance account info');
        }
    },

    /**
     * Get user assets (user-specific assets endpoint)
     */
    async getUserAssets(): Promise<BinanceBalance[]> {
        try {
            const response = await api.get(`${BINANCE_BASE}/user-assets`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get user assets error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance user assets');
        }
    },

    /**
     * Get all open orders
     * @param symbol - Optional symbol filter (e.g., 'BTCUSDT')
     */
    async getOpenOrders(symbol?: string): Promise<BinanceOrder[]> {
        try {
            const params = symbol ? { symbol } : {};
            const response = await api.get(`${BINANCE_BASE}/open-orders`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get open orders error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance open orders');
        }
    },

    /**
     * Get order history for a symbol
     */
    async getOrderHistory(): Promise<BinanceOrder[]> {
        try {
            const response = await api.get(`${BINANCE_BASE}/order-history`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get order history error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance order history');
        }
    },

    /**
     * Get trade history for a symbol
     * @param symbol - Trading pair (e.g., 'BTCUSDT')
     * @param limit - Number of trades to return (default: 10)
     */
    async getMyTrades(symbol: string, limit: number = 10): Promise<BinanceTrade[]> {
        try {
            const response = await api.get(`${BINANCE_BASE}/my-trades`, {
                params: { symbol, limit }
            });
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get my trades error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance trades');
        }
    },

    /**
     * Get open positions (for futures/margin)
     */
    async getOpenPositions(): Promise<any[]> {
        try {
            const response = await api.get(`${BINANCE_BASE}/open-positions`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get open positions error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance positions');
        }
    },

    /**
     * Get account snapshot (historical balances)
     * Returns daily snapshots for the last 30 days
     */
    async getAccountSnapshot(): Promise<any> {
        try {
            const response = await api.get(`${BINANCE_BASE}/account-snapshot`);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Get account snapshot error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Binance account snapshot');
        }
    },

    /**
     * Place a new order
     */
    async placeOrder(orderData: {
        symbol: string;
        side: 'BUY' | 'SELL';
        type: 'LIMIT' | 'MARKET';
        quantity: string;
        price?: string;
        timeInForce?: 'GTC' | 'IOC' | 'FOK';
    }): Promise<BinanceOrder> {
        try {
            const response = await api.post(`${BINANCE_BASE}/place-order`, orderData);
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Place order error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to place Binance order');
        }
    },

    /**
     * Cancel an order
     */
    async cancelOrder(symbol: string, orderId: string): Promise<any> {
        try {
            const response = await api.delete(`${BINANCE_BASE}/cancel-order`, {
                params: { symbol, orderId }
            });
            return response.data;
        } catch (error: any) {
            console.error('[Binance API] Cancel order error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to cancel Binance order');
        }
    },
};

export default binanceApi;
