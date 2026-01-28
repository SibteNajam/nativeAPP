import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BIOMETRIC_ENABLED_KEY = 'is_biometric_enabled';

/**
 * Web Storage Helper
 * Provides localStorage fallback for web platform
 * Note: localStorage is NOT as secure as SecureStore - only use for development/testing
 */
const webStorage = {
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    },
    removeItem: (key: string): void => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
    },
};

export const authStorage = {
    /**
     * Store the user's session tokens securely
     * Uses SecureStore on mobile, localStorage on web
     */
    async setTokens(token: string, refreshToken?: string) {
        if (Platform.OS === 'web') {
            webStorage.setItem(TOKEN_KEY, token);
            if (refreshToken) {
                webStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            }
            return;
        }

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        }
    },

    /**
     * Retrieve the access token
     */
    async getToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return webStorage.getItem(TOKEN_KEY);
        }
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    /**
     * Retrieve the refresh token
     */
    async getRefreshToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return webStorage.getItem(REFRESH_TOKEN_KEY);
        }
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Clear all auth data (Logout)
     */
    async clearSession() {
        if (Platform.OS === 'web') {
            webStorage.removeItem(TOKEN_KEY);
            webStorage.removeItem(REFRESH_TOKEN_KEY);
            return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Check if biometric login is enabled by the user
     */
    async getIsBiometricEnabled(): Promise<boolean> {
        if (Platform.OS === 'web') {
            return webStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
        }
        const result = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return result === 'true';
    },

    /**
     * Enable/Disable biometric login preference
     */
    async setBiometricEnabled(enabled: boolean) {
        if (Platform.OS === 'web') {
            webStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
            return;
        }
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
    }
};
