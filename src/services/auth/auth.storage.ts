import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BIOMETRIC_ENABLED_KEY = 'is_biometric_enabled';

// SecureStore is only available on iOS/Android. 
// For web, we would need a fallback (like localStorage), but for this mobile app we focus on SecureStore.

export const authStorage = {
    /**
     * Store the user's session tokens securely
     */
    async setTokens(token: string, refreshToken?: string) {
        if (Platform.OS === 'web') return; // Web handling would go here

        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        }
    },

    /**
     * Retrieve the access token
     */
    async getToken(): Promise<string | null> {
        if (Platform.OS === 'web') return null;
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    /**
     * Retrieve the refresh token
     */
    async getRefreshToken(): Promise<string | null> {
        if (Platform.OS === 'web') return null;
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Clear all auth data (Logout)
     */
    async clearSession() {
        if (Platform.OS === 'web') return;
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Check if biometric login is enabled by the user
     */
    async getIsBiometricEnabled(): Promise<boolean> {
        if (Platform.OS === 'web') return false;
        const result = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return result === 'true';
    },

    /**
     * Enable/Disable biometric login preference
     */
    async setBiometricEnabled(enabled: boolean) {
        if (Platform.OS === 'web') return;
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
    }
};
