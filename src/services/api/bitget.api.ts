/**
 * Bitget Exchange API Service
 * ================================
 * Handles all Bitget-specific API calls for account data, orders, and trades.
 * Uses JWT authentication from the backend.
 * 
 * Usage:
 *   import { bitgetApi } from '@/services/api/bitget.api';
 *   const balances = await bitgetApi.getSpotAssets();
 */

import { api } from './client';

// API endpoints
const BITGET_BASE = '/bitget';

export interface BitgetAsset {
    coin: string;
    available: string;
    frozen: string;
    locked: string;
    limitAvailable: string;
    uTime: string;
}

export interface BitgetOrder {
    userId: string;
    symbol: string;
    orderId: string;
    clientOid?: string;
    price: string;
    size: string;
    orderType: 'limit' | 'market';
    side: 'buy' | 'sell';
    status: 'new' | 'partial_fill' | 'full_fill' | 'cancelled' | 'expired';
    priceAvg: string;
    baseVolume: string;
    quoteVolume: string;
    enterPointSource: string;
    orderSource: string;
    cTime: string;
    uTime: string;
}

export interface BitgetTradeFill {
    userId: string;
    symbol: string;
    orderId: string;
    tradeId: string;
    orderType: 'limit' | 'market';
    side: 'buy' | 'sell';
    priceAvg: string;
    size: string;
    amount: string;
    feeDetail: {
        deduction: string;
        feeCoin: string;
        totalDeductionFee: string;
        totalFee: string;
    };
    tradeScope: string;
    cTime: string;
    uTime: string;
}

export interface BitgetPlanOrder {
    orderId: string;
    clientOid?: string;
    symbol: string;
    size: string;
    executePrice: string;
    triggerPrice: string;
    status: 'live' | 'executed' | 'cancelled' | 'failed';
    orderType: 'limit' | 'market';
    side: 'buy' | 'sell';
    triggerType: 'fill_price' | 'mark_price';
    enterPointSource: string;
    cTime: string;
    uTime: string;
}

/**
 * Bitget API Service
 */
export const bitgetApi = {
    /**
     * Get spot account assets (balances)
     * Returns all assets in the spot account
     */
    async getSpotAssets(): Promise<BitgetAsset[]> {
        try {
            const response = await api.get(`${BITGET_BASE}/account/spot/assets`);
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get spot assets error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget spot assets');
        }
    },

    /**
     * Get specific coin asset in spot account
     * @param coin - Coin symbol (e.g., 'BTC', 'USDT')
     */
    async getSpotCoinAsset(coin: string): Promise<BitgetAsset> {
        try {
            const response = await api.get(`${BITGET_BASE}/account/spot/asset`, {
                params: { coin }
            });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get spot coin asset error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget coin asset');
        }
    },

    /**
     * Get unfilled (open) spot orders
     * @param symbol - Optional trading pair filter (e.g., 'BTCUSDT')
     * @param tpslType - Order type filter ('normal' | 'tpsl')
     */
    async getUnfilledOrders(symbol?: string, tpslType?: 'normal' | 'tpsl'): Promise<BitgetOrder[]> {
        try {
            const params: any = {};
            if (symbol) params.symbol = symbol;
            if (tpslType) params.tpslType = tpslType;

            const response = await api.get(`${BITGET_BASE}/order/unfilled-spot-orders`, { params });
            return response.data.unfilledOrders || [];
        } catch (error: any) {
            console.error('[Bitget API] Get unfilled orders error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget unfilled orders');
        }
    },

    /**
     * Get all open orders (unfilled + plan orders combined)
     * @param symbol - Optional trading pair filter (e.g., 'BTCUSDT')
     */
    async getAllOpenOrders(symbol?: string): Promise<{
        unfilledOrders: BitgetOrder[];
        planOrders: BitgetPlanOrder[];
    }> {
        try {
            const params = symbol ? { symbol } : {};
            const response = await api.get(`${BITGET_BASE}/order/all-open-orders`, { params });
            return {
                unfilledOrders: response.data.unfilledOrders || [],
                planOrders: response.data.planOrders || []
            };
        } catch (error: any) {
            console.error('[Bitget API] Get all open orders error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget open orders');
        }
    },

    /**
     * Get trade fills (filled orders) history
     * @param params - Query parameters for filtering
     */
    async getTradeFills(params?: {
        symbol?: string;
        orderId?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
        idLessThan?: string;
    }): Promise<BitgetTradeFill[]> {
        try {
            const response = await api.get(`${BITGET_BASE}/order/trade-fills`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get trade fills error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget trade fills');
        }
    },

    /**
     * Get plan (conditional) orders
     * @param symbol - Optional trading pair filter (e.g., 'BTCUSDT')
     */
    async getPlanOrders(symbol?: string): Promise<BitgetPlanOrder[]> {
        try {
            const params = symbol ? { symbol } : {};
            const response = await api.get(`${BITGET_BASE}/order/plan-orders`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get plan orders error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget plan orders');
        }
    },

    /**
     * Get spot account bills (transaction history)
     * @param params - Query parameters for filtering
     */
    async getSpotAccountBills(params?: {
        coin?: string;
        groupType?: string;
        businessType?: string;
        after?: string;
        before?: string;
        limit?: number;
    }): Promise<any[]> {
        try {
            const response = await api.get(`${BITGET_BASE}/account/spot/bills`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get spot bills error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget spot bills');
        }
    },

    /**
     * Place a spot order
     */
    async placeSpotOrder(orderData: {
        symbol: string;
        side: 'buy' | 'sell';
        orderType: 'limit' | 'market';
        force: 'gtc' | 'ioc' | 'fok' | 'post_only';
        price?: string;
        size: string;
        clientOid?: string;
    }): Promise<BitgetOrder> {
        try {
            const response = await api.post(`${BITGET_BASE}/order/spot`, orderData);
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Place spot order error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to place Bitget order');
        }
    },

    /**
     * Cancel a spot order
     */
    async cancelSpotOrder(symbol: string, orderId: string): Promise<any> {
        try {
            const response = await api.post(`${BITGET_BASE}/order/cancel-spot-order`, {
                symbol,
                orderId
            });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Cancel spot order error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to cancel Bitget order');
        }
    },

    /**
     * Get deposit history
     */
    async getDepositHistory(params?: {
        coin?: string;
        orderId?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
        idLessThan?: string;
    }): Promise<any[]> {
        try {
            const response = await api.get(`${BITGET_BASE}/account/deposit-history`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get deposit history error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget deposit history');
        }
    },

    /**
     * Get withdrawal history
     */
    async getWithdrawalHistory(params?: {
        coin?: string;
        orderId?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
        idLessThan?: string;
    }): Promise<any[]> {
        try {
            const response = await api.get(`${BITGET_BASE}/account/withdrawal-history`, { params });
            return response.data;
        } catch (error: any) {
            console.error('[Bitget API] Get withdrawal history error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to fetch Bitget withdrawal history');
        }
    },
};

export default bitgetApi;
