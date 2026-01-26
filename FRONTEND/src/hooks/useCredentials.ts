/**
 * useCredentials Hook
 * Custom hook for managing exchange credentials
 * Separates data fetching logic from UI components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { credentialsApi } from '@/services/api/credentials.api';
import {
    ExchangeType,
    CredentialResponse,
    CreateCredentialRequest,
    UpdateCredentialRequest,
} from '@/types/exchange.types';

interface UseCredentialsReturn {
    // Data
    credentials: CredentialResponse[];
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // Helpers
    isExchangeConnected: (exchangeId: ExchangeType) => boolean;
    getCredentialForExchange: (exchangeId: ExchangeType) => CredentialResponse | undefined;
    getCredentialById: (id: string) => CredentialResponse | undefined;

    // Actions
    fetchCredentials: () => Promise<void>;
    saveCredential: (data: CreateCredentialRequest) => Promise<boolean>;
    updateCredential: (id: string, data: UpdateCredentialRequest) => Promise<boolean>;
    deleteCredential: (id: string) => Promise<boolean>;
    toggleCredential: (id: string) => Promise<boolean>;
    clearError: () => void;
}

/**
 * Custom hook for managing exchange credentials
 */
export function useCredentials(): UseCredentialsReturn {
    const { isAuthenticated } = useAuth();
    const [credentials, setCredentials] = useState<CredentialResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch all credentials for the authenticated user
     */
    const fetchCredentials = useCallback(async () => {
        // Don't fetch if not authenticated
        if (!isAuthenticated) {
            setIsLoading(false);
            setCredentials([]);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const data = await credentialsApi.getAll();
            setCredentials(data);
        } catch (err: any) {
            console.error('Failed to fetch credentials:', err);
            setError(err.response?.data?.message || 'Failed to load credentials');
            setCredentials([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Save new credentials
     */
    const saveCredential = useCallback(async (data: CreateCredentialRequest): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            await credentialsApi.save(data);
            await fetchCredentials(); // Refresh the list
            return true;
        } catch (err: any) {
            console.error('Failed to save credentials:', err);
            setError(err.response?.data?.message || 'Failed to save credentials');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [fetchCredentials]);

    /**
     * Update existing credentials
     */
    const updateCredential = useCallback(async (id: string, data: UpdateCredentialRequest): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            await credentialsApi.update(id, data);
            await fetchCredentials(); // Refresh the list
            return true;
        } catch (err: any) {
            console.error('Failed to update credentials:', err);
            setError(err.response?.data?.message || 'Failed to update credentials');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [fetchCredentials]);

    /**
     * Delete credentials
     */
    const deleteCredential = useCallback(async (id: string): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            await credentialsApi.delete(id);
            await fetchCredentials(); // Refresh the list
            return true;
        } catch (err: any) {
            console.error('Failed to delete credentials:', err);
            setError(err.response?.data?.message || 'Failed to delete credentials');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [fetchCredentials]);

    /**
     * Toggle credential active status
     */
    const toggleCredential = useCallback(async (id: string): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            await credentialsApi.toggle(id);
            await fetchCredentials(); // Refresh the list
            return true;
        } catch (err: any) {
            console.error('Failed to toggle credentials:', err);
            setError(err.response?.data?.message || 'Failed to toggle credentials');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [fetchCredentials]);

    /**
     * Check if an exchange is connected
     */
    const isExchangeConnected = useCallback((exchangeId: ExchangeType): boolean => {
        return credentials.some(c => c.exchange === exchangeId);
    }, [credentials]);

    /**
     * Get credential for a specific exchange
     */
    const getCredentialForExchange = useCallback((exchangeId: ExchangeType): CredentialResponse | undefined => {
        return credentials.find(c => c.exchange === exchangeId);
    }, [credentials]);

    /**
     * Get credential by ID
     */
    const getCredentialById = useCallback((id: string): CredentialResponse | undefined => {
        return credentials.find(c => c.id === id);
    }, [credentials]);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Fetch credentials on mount
    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    return {
        // Data
        credentials,
        isLoading,
        isSaving,
        error,

        // Helpers
        isExchangeConnected,
        getCredentialForExchange,
        getCredentialById,

        // Actions
        fetchCredentials,
        saveCredential,
        updateCredential,
        deleteCredential,
        toggleCredential,
        clearError,
    };
}

export default useCredentials;
