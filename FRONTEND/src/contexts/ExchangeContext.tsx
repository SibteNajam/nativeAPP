/**
 * Exchange Context
 * Manages the currently selected exchange for API calls
 * User can have multiple exchanges connected but uses one at a time
 * 
 * OPTIMIZED: Uses centralized Zustand credentials store (no duplicate API calls)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExchangeType, CredentialResponse } from '@/types/exchange.types';

// Zustand Store - Centralized credentials data
import { useCredentialsStore } from '@/store/credentialsStore';

// Storage key
const SELECTED_EXCHANGE_KEY = 'selected_exchange';

interface ExchangeContextType {
    // Current selected exchange for API calls
    selectedExchange: ExchangeType | null;
    selectedCredential: CredentialResponse | null;

    // All connected exchanges
    connectedExchanges: CredentialResponse[];

    // Loading states
    isLoading: boolean;

    // Actions
    selectExchange: (exchangeId: ExchangeType) => Promise<void>;
    refreshExchanges: () => Promise<void>;

    // Helpers from credentials store
    isExchangeConnected: (exchangeId: ExchangeType) => boolean;
    getCredentialForExchange: (exchangeId: ExchangeType) => CredentialResponse | undefined;
}

const defaultContextValue: ExchangeContextType = {
    selectedExchange: null,
    selectedCredential: null,
    connectedExchanges: [],
    isLoading: true,
    selectExchange: async () => { },
    refreshExchanges: async () => { },
    isExchangeConnected: () => false,
    getCredentialForExchange: () => undefined,
};

const ExchangeContext = createContext<ExchangeContextType>(defaultContextValue);

export const useExchange = (): ExchangeContextType => {
    const context = useContext(ExchangeContext);
    if (!context) {
        throw new Error('useExchange must be used within an ExchangeProvider');
    }
    return context;
};

interface ExchangeProviderProps {
    children: React.ReactNode;
}

export const ExchangeProvider: React.FC<ExchangeProviderProps> = ({ children }) => {
    const [selectedExchange, setSelectedExchange] = useState<ExchangeType | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Use Zustand store for credentials (centralized - no duplicate API calls)
    const credentials = useCredentialsStore((state) => state.credentials);
    const credentialsLoading = useCredentialsStore((state) => state.isLoading);
    const fetchCredentials = useCredentialsStore((state) => state.fetchCredentials);
    const isExchangeConnected = useCredentialsStore((state) => state.isExchangeConnected);
    const getCredentialForExchange = useCredentialsStore((state) => state.getCredentialForExchange);

    // Load saved selected exchange on mount
    // Note: fetchCredentials is now called from AuthContext after successful login
    // This prevents 401 errors when app starts before user is authenticated
    useEffect(() => {
        loadSelectedExchange();
    }, []);

    // Auto-select first connected exchange if none selected
    useEffect(() => {
        if (isInitialized && !credentialsLoading && credentials.length > 0 && !selectedExchange) {
            // Auto-select priority: Binance -> First Available
            const binanceExchange = credentials.find(c => c.exchange === 'binance');
            const targetExchange = binanceExchange || credentials[0];

            if (targetExchange) {
                setSelectedExchange(targetExchange.exchange);
                saveSelectedExchange(targetExchange.exchange);
            }
        }
    }, [isInitialized, credentialsLoading, credentials, selectedExchange]);

    const loadSelectedExchange = async () => {
        try {
            const saved = await AsyncStorage.getItem(SELECTED_EXCHANGE_KEY);
            if (saved) {
                setSelectedExchange(saved as ExchangeType);
            }
        } catch (error) {
            console.error('Failed to load selected exchange:', error);
        } finally {
            setIsInitialized(true);
        }
    };

    const saveSelectedExchange = async (exchangeId: ExchangeType) => {
        try {
            await AsyncStorage.setItem(SELECTED_EXCHANGE_KEY, exchangeId);
        } catch (error) {
            console.error('Failed to save selected exchange:', error);
        }
    };

    const selectExchange = useCallback(async (exchangeId: ExchangeType) => {
        setSelectedExchange(exchangeId);
        await saveSelectedExchange(exchangeId);
    }, []);

    const refreshExchanges = useCallback(async () => {
        await fetchCredentials(true); // Force refresh
    }, [fetchCredentials]);

    // Get the credential for the selected exchange
    const selectedCredential = useMemo(() => {
        if (!selectedExchange) return null;
        return credentials.find(c => c.exchange === selectedExchange) || null;
    }, [selectedExchange, credentials]);

    const contextValue = useMemo<ExchangeContextType>(() => ({
        selectedExchange,
        selectedCredential,
        connectedExchanges: credentials,
        isLoading: credentialsLoading || !isInitialized,
        selectExchange,
        refreshExchanges,
        isExchangeConnected,
        getCredentialForExchange,
    }), [
        selectedExchange,
        selectedCredential,
        credentials,
        credentialsLoading,
        isInitialized,
        selectExchange,
        refreshExchanges,
        isExchangeConnected,
        getCredentialForExchange,
    ]);

    return (
        <ExchangeContext.Provider value={contextValue}>
            {children}
        </ExchangeContext.Provider>
    );
};

export default ExchangeContext;

