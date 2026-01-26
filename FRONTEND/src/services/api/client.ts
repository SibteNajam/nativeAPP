/**
 * API Client
 * ==========
 * Axios instance configured with interceptors for authentication.
 * All API calls should use this client.
 * 
 * Features:
 * - Auto-attaches JWT token to requests
 * - Handles 401 unauthorized responses
 * - Token refresh on expiry
 * - Request/Response logging in dev mode
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '@/constants/config';
import { authStorage } from '@/services/auth/auth.storage';
import { logRequest, logResponse, logError } from '@/utils/network-logger';
import { remoteLogger } from '@/utils/remote-logger';

// Create axios instance with base configuration
export const api = axios.create({
    baseURL: config.API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: config.API_TIMEOUT,
});

// Log API URL on startup (development only)
if (__DEV__) {
    console.log(`\n🌐 API Client initialized: ${config.API_URL}\n`);
}

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Add subscriber to wait for token refresh
 */
const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers with new token
 */
const onTokenRefreshed = (token: string) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};

/**
 * Request Interceptor
 * - Attaches JWT token to every request
 * - Logs requests in development
 */
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Get token from secure storage
        const token = await authStorage.getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request with details
        logRequest(config);

        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor
 * - Handles 401 unauthorized (token expired)
 * - Attempts token refresh
 * - Logs responses in development
 */
api.interceptors.response.use(
    (response) => {
        // Log successful response
        logResponse(response);
        
        // Send to remote logger in production
        remoteLogger.logAPI(
            response.config.method?.toUpperCase() || 'GET',
            response.config.url || '',
            response.status,
            response.data
        );
        
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log error
        logError(error);
        
        // Send error to remote logger in production
        remoteLogger.logAPI(
            error.config?.method?.toUpperCase() || 'GET',
            error.config?.url || '',
            error.response?.status || 0,
            error.response?.data
        );

        // Handle 401 Unauthorized - BUT ONLY FOR AUTH ENDPOINTS
        // Don't refresh token for exchange API errors (Binance, Bitget, etc.)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/') || originalRequest.url?.includes('/user/');
        const isExchangeEndpoint = originalRequest.url?.includes('/binance/') || 
                                   originalRequest.url?.includes('/bitget/') || 
                                   originalRequest.url?.includes('/mexc/') ||
                                   originalRequest.url?.includes('/gateio/');

        if (error.response?.status === 401 && !originalRequest._retry && isAuthEndpoint && !isExchangeEndpoint) {

            // If already refreshing, wait for it
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh token
                const refreshToken = await authStorage.getRefreshToken();

                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Call refresh endpoint
                const response = await axios.post(
                    `${config.API_URL}${config.ENDPOINTS.AUTH.REFRESH}`,
                    { refresh_token: refreshToken }
                );

                // Parse nested response structure
                const responseData = response.data;
                const payload = responseData.data?.data?.payload || responseData.data?.payload || responseData.payload;

                if (!payload?.token) {
                    throw new Error('Invalid refresh response');
                }

                const accessToken = payload.token;
                const newRefreshToken = payload.refresh_token || refreshToken;

                // Store new tokens
                await authStorage.setTokens(accessToken, newRefreshToken);

                // Notify subscribers
                onTokenRefreshed(accessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return api(originalRequest);

            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);

                // Clear session on refresh failure
                await authStorage.clearSession();

                // Note: Navigation to login should be handled by AuthContext
                // when it detects unauthenticated state

                return Promise.reject(refreshError);

            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Helper function to make authenticated requests
 * (Alternative to using api directly)
 */
export const apiRequest = {
    get: <T>(url: string, params?: object) =>
        api.get<T>(url, { params }),

    post: <T>(url: string, data?: object) =>
        api.post<T>(url, data),

    put: <T>(url: string, data?: object) =>
        api.put<T>(url, data),

    patch: <T>(url: string, data?: object) =>
        api.patch<T>(url, data),

    delete: <T>(url: string) =>
        api.delete<T>(url),
};

export default api;
