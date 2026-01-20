/**
 * Authentication Context
 * Provides global authentication state and actions
 * Single source of truth for auth across the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { authApi } from '@/services/api/auth.api';
import { authStorage } from '@/services/auth/auth.storage';
import {
    AuthContextType,
    AuthStatus,
    User,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    VerifyOTPRequest,
} from '@/types/auth.types';

// Default context value
const defaultContextValue: AuthContextType = {
    user: null,
    status: 'idle',
    isLoading: true,
    isAuthenticated: false,
    error: null,
    login: async () => ({ success: false, message: 'Not initialized' }),
    register: async () => ({ success: false, message: 'Not initialized' }),
    logout: async () => { },
    refreshSession: async () => false,
    clearError: () => { },
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// Hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth Provider Props
interface AuthProviderProps {
    children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<AuthStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Initialize auth state on app start
     * Check if user has a valid session
     */
    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            setStatus('loading');

            // Check if we have a stored token
            const token = await authStorage.getToken();

            if (!token) {
                setStatus('unauthenticated');
                setIsLoading(false);
                return;
            }

            // Validate token by fetching current user
            const currentUser = await authApi.getCurrentUser();

            if (currentUser) {
                setUser(currentUser);
                setStatus('authenticated');
            } else {
                // Token is invalid, clear session
                await authStorage.clearSession();
                setStatus('unauthenticated');
            }
        } catch (err) {
            console.error('Auth initialization error:', err);
            setStatus('unauthenticated');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Login handler
     */
    const login = useCallback(async (data: LoginRequest): Promise<AuthResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authApi.login(data);

            if (response.success && response.user) {
                setUser(response.user);
                setStatus('authenticated');

                // Navigate to main dashboard (has sidebar drawer for exchange management)
                router.replace('/(tabs)');
            } else {
                setError(response.message);
            }

            return response;
        } catch (err: any) {
            const message = err.message || 'Login failed';
            setError(message);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Register handler
     */
    const register = useCallback(async (data: RegisterRequest): Promise<AuthResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authApi.register(data);

            if (response.success) {
                // Don't auto-login after registration
                // User should go to login page
                // This allows for OTP verification flow later
            } else {
                setError(response.message);
            }

            return response;
        } catch (err: any) {
            const message = err.message || 'Registration failed';
            setError(message);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Logout handler
     */
    const logout = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);

            await authApi.logout();

            setUser(null);
            setStatus('unauthenticated');
            setError(null);

            // Navigate to welcome/login
            router.replace('/(onboarding)/welcome');
        } catch (err) {
            console.error('Logout error:', err);
            // Still clear local state even if API fails
            setUser(null);
            setStatus('unauthenticated');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Refresh session (token refresh)
     */
    const refreshSession = useCallback(async (): Promise<boolean> => {
        try {
            const tokens = await authApi.refreshToken();

            if (tokens) {
                // Re-fetch user after refresh
                const currentUser = await authApi.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setStatus('authenticated');
                    return true;
                }
            }

            // Refresh failed, logout
            setUser(null);
            setStatus('unauthenticated');
            return false;
        } catch (err) {
            console.error('Session refresh error:', err);
            setUser(null);
            setStatus('unauthenticated');
            return false;
        }
    }, []);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Verify OTP (for future use)
     */
    const verifyOTP = useCallback(async (data: VerifyOTPRequest): Promise<AuthResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authApi.verifyOTP(data);

            if (response.success && response.user) {
                setUser(response.user);
                setStatus('authenticated');
            }

            return response;
        } catch (err: any) {
            const message = err.message || 'OTP verification failed';
            setError(message);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<AuthContextType>(() => ({
        user,
        status,
        isLoading,
        isAuthenticated: status === 'authenticated',
        error,
        login,
        register,
        logout,
        refreshSession,
        clearError,
        verifyOTP,
    }), [user, status, isLoading, error, login, register, logout, refreshSession, clearError, verifyOTP]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
