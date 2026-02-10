import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BIOMETRIC_ENABLED_KEY = 'is_biometric_enabled';
const DEVICE_TOKEN_KEY = 'biometric_device_token';
const DEVICE_ID_KEY = 'biometric_device_id';

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
            webStorage.removeItem(DEVICE_TOKEN_KEY);
            return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        // Note: We keep DEVICE_TOKEN_KEY and DEVICE_ID for biometric re-login
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
    },

    /**
     * Store device token for biometric authentication
     */
    async setDeviceToken(deviceToken: string) {
        if (Platform.OS === 'web') {
            webStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
            return;
        }
        await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, deviceToken);
    },

    /**
     * Get device token for biometric authentication
     */
    async getDeviceToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return webStorage.getItem(DEVICE_TOKEN_KEY);
        }
        return await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
    },

    /**
     * Store device ID
     */
    async setDeviceId(deviceId: string) {
        if (Platform.OS === 'web') {
            webStorage.setItem(DEVICE_ID_KEY, deviceId);
            return;
        }
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    },

    /**
     * Get device ID
     */
    async getDeviceId(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return webStorage.getItem(DEVICE_ID_KEY);
        }
        return await SecureStore.getItemAsync(DEVICE_ID_KEY);
    },

    /**
     * Clear biometric data (for logout or disable biometric)
     */
    async clearBiometricData() {
        if (Platform.OS === 'web') {
            webStorage.removeItem(DEVICE_TOKEN_KEY);
            webStorage.removeItem(DEVICE_ID_KEY);
            webStorage.removeItem(BIOMETRIC_ENABLED_KEY);
            return;
        }
        await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
        await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    }
};
