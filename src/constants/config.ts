/**
 * Application Configuration
 * =========================
 * Central configuration file for environment variables and app settings.
 * All environment-dependent values should be accessed through this file.
 * 
 * Usage:
 *   import { config } from '@/constants/config';
 *   const url = config.API_URL;
 */

// ===========================================
// Environment Variables
// ===========================================

/**
 * API Base URL
 * - Android Emulator: http://10.0.2.2:3000 (maps to host machine's localhost)
 * - iOS Simulator: http://localhost:3000
 * - Real Device: http://192.168.x.x:3000 (your computer's LAN IP)
 * - Production: https://api.yourdomain.com
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

/**
 * App Information
 */
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'TradeBot';
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

// ===========================================
// API Endpoints Configuration
// ===========================================

const API_ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
        VERIFY_OTP: '/auth/verify-otp',
        SEND_OTP: '/auth/send-otp',
        GOOGLE: '/auth/google',
        RESET_PASSWORD: '/auth/reset-password',
        CONFIRM_RESET: '/auth/confirm-reset',
    },
    // API Credentials
    CREDENTIALS: {
        BASE: '/api-credentials',
        SAVE: '/api-credentials/save-credentials',
        GET_ALL: '/api-credentials',
        GET_ONE: (id: string) => `/api-credentials/${id}`,
        UPDATE: (id: string) => `/api-credentials/${id}`,
        DELETE: (id: string) => `/api-credentials/${id}`,
        TOGGLE: (id: string) => `/api-credentials/${id}/toggle`,
    },
    // User
    USER: {
        PROFILE: '/user/profile',
        UPDATE_PROFILE: '/user/profile',
        CHANGE_PASSWORD: '/user/change-password',
    },
    // Trading (for future use)
    TRADING: {
        ORDERS: '/trading/orders',
        POSITIONS: '/trading/positions',
        BALANCE: '/trading/balance',
    },
    // Exchange (for future use)
    EXCHANGE: {
        CONNECT: '/exchange/connect',
        DISCONNECT: '/exchange/disconnect',
        STATUS: '/exchange/status',
    },
} as const;

// ===========================================
// App Configuration
// ===========================================

const APP_CONFIG = {
    // Timeouts
    API_TIMEOUT: 10000, // 10 seconds

    // Token storage keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'auth_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user_data',
        BIOMETRIC_ENABLED: 'is_biometric_enabled',
        THEME: 'theme_mode',
    },

    // Pagination
    DEFAULT_PAGE_SIZE: 20,

    // Validation
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 50,
} as const;

// ===========================================
// Export Configuration
// ===========================================

export const config = {
    // URLs
    API_URL,

    // App Info
    APP_NAME,
    APP_VERSION,

    // Endpoints
    ENDPOINTS: API_ENDPOINTS,

    // App Settings
    ...APP_CONFIG,

    // Helper to build full API URL
    getApiUrl: (endpoint: string): string => {
        return `${API_URL}${endpoint}`;
    },

    // Check if running in development
    isDev: __DEV__,

    // Check if running in production
    isProd: !__DEV__,
} as const;

// Type for config
export type AppConfig = typeof config;

// Default export
export default config;
