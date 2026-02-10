/**
 * Authentication Context
 * Provides global authentication state and actions
 * Single source of truth for auth across the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { authApi } from '@/services/api/auth.api';
import { authStorage } from '@/services/auth/auth.storage';
import { biometricService } from '@/services/auth/biometric.service';
import { Platform } from 'react-native';
import {
    AuthContextType,
    AuthStatus,
    User,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    VerifyOTPRequest,
} from '@/types/auth.types';

// Credentials store - for fetching exchange credentials after login
import { useCredentialsStore } from '@/store/credentialsStore';

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

            // Check if biometric is enabled and configured
            const isBiometricEnabled = await authStorage.getIsBiometricEnabled();
            const isBiometricConfigured = await biometricService.isBiometricConfigured();

            if (isBiometricEnabled && isBiometricConfigured) {
                // Try biometric authentication first
                console.log('Biometric is configured, attempting biometric login...');
                
                const biometricResult = await loginWithBiometric();
                
                if (biometricResult.success) {
                    // Biometric login successful
                    setIsLoading(false);
                    return;
                }
                
                // If biometric fails, fall through to token check
                console.log('Biometric login failed, checking for existing token...');
            }

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

                // Fetch user's exchange credentials for authenticated session
                useCredentialsStore.getState().fetchCredentials(true);
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

                // Fetch user's exchange credentials after successful login
                // This ensures the dashboard shows connected exchanges immediately
                useCredentialsStore.getState().fetchCredentials(true);

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

            // Clear credentials store
            useCredentialsStore.getState().clearCredentials();

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

    /**
     * Enable biometric authentication for current user
     * Must be called after successful login
     */
    const enableBiometric = useCallback(async (): Promise<{
        success: boolean;
        message: string;
    }> => {
        try {
            // 1. Check if biometric hardware is available
            const isAvailable = await biometricService.isBiometricAvailable();
            if (!isAvailable) {
                return {
                    success: false,
                    message: 'Biometric authentication is not available on this device',
                };
            }

            // 2. Get or create device ID
            const deviceId = await biometricService.getOrCreateDeviceId();
            const deviceName = biometricService.getDeviceName();
            const deviceType = Platform.OS;
            const biometricType = await biometricService.getBiometricTypeString();

            // 3. Register device with backend
            const response = await authApi.registerBiometricDevice({
                deviceId,
                deviceName,
                deviceType,
                biometricType,
            });

            if (!response.success || !response.deviceToken) {
                return {
                    success: false,
                    message: response.message || 'Failed to register biometric device',
                };
            }

            // 4. Store device token securely
            await authStorage.setDeviceToken(response.deviceToken);
            await authStorage.setBiometricEnabled(true);

            console.log('Biometric enabled successfully');

            return {
                success: true,
                message: 'Biometric authentication enabled',
            };
        } catch (error: any) {
            console.error('Enable biometric error:', error);
            return {
                success: false,
                message: error.message || 'Failed to enable biometric authentication',
            };
        }
    }, []);

    /**
     * Disable biometric authentication
     */
    const disableBiometric = useCallback(async (): Promise<{
        success: boolean;
        message: string;
    }> => {
        try {
            const deviceId = await authStorage.getDeviceId();
            
            if (deviceId) {
                // Optionally revoke device on backend
                await authApi.revokeBiometricDevice(deviceId, 'User disabled biometric');
            }

            // Clear local biometric data
            await authStorage.clearBiometricData();

            console.log('Biometric disabled successfully');

            return {
                success: true,
                message: 'Biometric authentication disabled',
            };
        } catch (error: any) {
            console.error('Disable biometric error:', error);
            return {
                success: false,
                message: error.message || 'Failed to disable biometric authentication',
            };
        }
    }, []);

    /**
     * Login with biometric authentication
     * Called when app opens and biometric is enabled
     */
    const loginWithBiometric = useCallback(async (): Promise<AuthResponse> => {
        try {
            setIsLoading(true);
            setError(null);

            // 1. Check if biometric is configured
            const isConfigured = await biometricService.isBiometricConfigured();
            if (!isConfigured) {
                return {
                    success: false,
                    message: 'Biometric authentication not configured',
                };
            }

            // 2. Prompt for biometric authentication
            const biometricName = await biometricService.getBiometricName();
            const authenticated = await biometricService.authenticate(
                `Unlock with ${biometricName}`
            );

            if (!authenticated) {
                return {
                    success: false,
                    message: 'Biometric authentication cancelled or failed',
                };
            }

            // 3. Get stored device credentials
            const deviceId = await authStorage.getDeviceId();
            const deviceToken = await authStorage.getDeviceToken();

            if (!deviceId || !deviceToken) {
                return {
                    success: false,
                    message: 'Device credentials not found',
                };
            }

            // 4. Authenticate with backend
            const response = await authApi.loginWithBiometric(deviceId, deviceToken);

            if (response.success && response.user) {
                setUser(response.user);
                setStatus('authenticated');

                // Fetch user's exchange credentials
                useCredentialsStore.getState().fetchCredentials(true);

                // Navigate to main dashboard
                router.replace('/(tabs)');
            } else {
                setError(response.message);
            }

            return response;
        } catch (err: any) {
            const message = err.message || 'Biometric login failed';
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
        enableBiometric,
        disableBiometric,
        loginWithBiometric,
    }), [
        user, 
        status, 
        isLoading, 
        error, 
        login, 
        register, 
        logout, 
        refreshSession, 
        clearError, 
        verifyOTP,
        enableBiometric,
        disableBiometric,
        loginWithBiometric,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
