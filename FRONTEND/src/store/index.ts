/**
 * Store Index
 * ============
 * Central export for all Zustand stores
 * 
 * Usage:
 *   import { useTradesStore, useTodayPnL } from '@/store';
 */

// Trades Store
export {
    useTradesStore,
    useTodayPnL,
    useTodayTradesCount,
    useTradesLoading,
    useAllTrades,
    useTradesSummary,
} from './tradesStore';

// Credentials Store
export {
    useCredentialsStore,
    useCredentials,
    useCredentialsLoading,
    useCredentialsSaving,
    useCredentialsError,
} from './credentialsStore';
