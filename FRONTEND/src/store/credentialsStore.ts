/**
 * Credentials Store (Zustand)
 * ============================
 * Centralized state management for exchange credentials.
 * Prevents duplicate API calls - data fetched once and shared.
 * 
 * Usage:
 *   import { useCredentialsStore } from '@/store/credentialsStore';
 *   
 *   // In component:
 *   const { credentials, isLoading, fetchCredentials } = useCredentialsStore();
 */

import { create } from 'zustand';
import { credentialsApi } from '@/services/api/credentials.api';
import type {
    ExchangeType,
    CredentialResponse,
    CreateCredentialRequest,
    UpdateCredentialRequest,
} from '@/types/exchange.types';

// ============================================
// Types
// ============================================

interface CredentialsState {
    // Data
    credentials: CredentialResponse[];

    // Status
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    lastFetched: number | null;

    // Actions
    fetchCredentials: (force?: boolean) => Promise<void>;
    saveCredential: (data: CreateCredentialRequest) => Promise<boolean>;
    updateCredential: (id: string, data: UpdateCredentialRequest) => Promise<boolean>;
    deleteCredential: (id: string) => Promise<boolean>;
    toggleCredential: (id: string) => Promise<boolean>;
    clearCredentials: () => void;
    setError: (error: string | null) => void;

    // Helpers
    isExchangeConnected: (exchangeId: ExchangeType) => boolean;
    getCredentialForExchange: (exchangeId: ExchangeType) => CredentialResponse | undefined;
    getCredentialById: (id: string) => CredentialResponse | undefined;
}

// Cache duration: 60 seconds
const CACHE_DURATION = 60 * 1000;

// ============================================
// Store
// ============================================

export const useCredentialsStore = create<CredentialsState>((set, get) => ({
    // Initial state
    credentials: [],
    isLoading: false,
    isSaving: false,
    error: null,
    lastFetched: null,

    /**
     * Fetch all credentials (with caching)
     */
    fetchCredentials: async (force: boolean = false) => {
        const state = get();
        const now = Date.now();

        // Skip if already loading
        if (state.isLoading) return;

        // Skip if cache is valid and not forced
        const cacheValid = state.lastFetched && (now - state.lastFetched) < CACHE_DURATION;
        if (!force && cacheValid && state.credentials.length > 0) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const data = await credentialsApi.getAll();
            set({
                credentials: data,
                isLoading: false,
                lastFetched: now,
                error: null,
            });
        } catch (err: any) {
            console.error('Failed to fetch credentials:', err);
            set({
                isLoading: false,
                error: err.response?.data?.message || 'Failed to load credentials',
            });
        }
    },

    /**
     * Save new credentials
     */
    saveCredential: async (data: CreateCredentialRequest): Promise<boolean> => {
        set({ isSaving: true, error: null });

        try {
            await credentialsApi.save(data);
            // Force refresh to get updated list
            await get().fetchCredentials(true);
            set({ isSaving: false });
            return true;
        } catch (err: any) {
            console.error('Failed to save credentials:', err);
            set({
                isSaving: false,
                error: err.response?.data?.message || 'Failed to save credentials',
            });
            return false;
        }
    },

    /**
     * Update existing credentials
     */
    updateCredential: async (id: string, data: UpdateCredentialRequest): Promise<boolean> => {
        set({ isSaving: true, error: null });

        try {
            await credentialsApi.update(id, data);
            await get().fetchCredentials(true);
            set({ isSaving: false });
            return true;
        } catch (err: any) {
            console.error('Failed to update credentials:', err);
            set({
                isSaving: false,
                error: err.response?.data?.message || 'Failed to update credentials',
            });
            return false;
        }
    },

    /**
     * Delete credentials
     */
    deleteCredential: async (id: string): Promise<boolean> => {
        set({ isSaving: true, error: null });

        try {
            await credentialsApi.delete(id);
            await get().fetchCredentials(true);
            set({ isSaving: false });
            return true;
        } catch (err: any) {
            console.error('Failed to delete credentials:', err);
            set({
                isSaving: false,
                error: err.response?.data?.message || 'Failed to delete credentials',
            });
            return false;
        }
    },

    /**
     * Toggle credential active status
     */
    toggleCredential: async (id: string): Promise<boolean> => {
        set({ isSaving: true, error: null });

        try {
            await credentialsApi.toggle(id);
            await get().fetchCredentials(true);
            set({ isSaving: false });
            return true;
        } catch (err: any) {
            console.error('Failed to toggle credentials:', err);
            set({
                isSaving: false,
                error: err.response?.data?.message || 'Failed to toggle credentials',
            });
            return false;
        }
    },

    /**
     * Clear all credentials (e.g., on logout)
     */
    clearCredentials: () => {
        set({
            credentials: [],
            isLoading: false,
            isSaving: false,
            error: null,
            lastFetched: null,
        });
    },

    /**
     * Set error message
     */
    setError: (error: string | null) => {
        set({ error });
    },

    // ============================================
    // Helpers (computed on each call)
    // ============================================

    /**
     * Check if an exchange is connected
     */
    isExchangeConnected: (exchangeId: ExchangeType): boolean => {
        return get().credentials.some(c => c.exchange === exchangeId);
    },

    /**
     * Get credential for a specific exchange
     */
    getCredentialForExchange: (exchangeId: ExchangeType): CredentialResponse | undefined => {
        return get().credentials.find(c => c.exchange === exchangeId);
    },

    /**
     * Get credential by ID
     */
    getCredentialById: (id: string): CredentialResponse | undefined => {
        return get().credentials.find(c => c.id === id);
    },
}));

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const useCredentials = () => useCredentialsStore((state) => state.credentials);
export const useCredentialsLoading = () => useCredentialsStore((state) => state.isLoading);
export const useCredentialsSaving = () => useCredentialsStore((state) => state.isSaving);
export const useCredentialsError = () => useCredentialsStore((state) => state.error);

export default useCredentialsStore;
