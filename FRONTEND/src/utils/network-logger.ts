/**
 * API Network Logger
 * ==================
 * Detailed network request/response logging for debugging.
 * Only active in development mode (__DEV__).
 * 
 * View logs in:
 * 1. Metro terminal (where expo runs)
 * 2. Press 'j' to open Chrome DevTools
 * 3. React Native Debugger (standalone app)
 */

import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Colors for terminal output
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

/**
 * Format request for logging
 */
export const logRequest = (config: AxiosRequestConfig) => {
    if (!__DEV__) return;

    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const timestamp = new Date().toLocaleTimeString();

    console.log('\n' + '═'.repeat(60));
    console.log(`📤 ${COLORS.cyan}[API REQUEST]${COLORS.reset} ${timestamp}`);
    console.log(`   ${COLORS.bright}${method}${COLORS.reset} ${url}`);

    if (config.params && Object.keys(config.params).length > 0) {
        console.log(`   ${COLORS.dim}Params:${COLORS.reset}`, config.params);
    }

    if (config.data) {
        // Don't log passwords
        const safeData = { ...config.data };
        if (safeData.password) safeData.password = '***';
        if (safeData.confirmPassword) safeData.confirmPassword = '***';
        console.log(`   ${COLORS.dim}Body:${COLORS.reset}`, JSON.stringify(safeData, null, 2));
    }

    console.log('─'.repeat(60));
};

/**
 * Format response for logging
 */
export const logResponse = (response: AxiosResponse) => {
    if (!__DEV__) return;

    const method = response.config.method?.toUpperCase() || 'GET';
    const url = response.config.url || '';
    const status = response.status;
    const timestamp = new Date().toLocaleTimeString();

    const statusColor = status < 400 ? COLORS.green : COLORS.red;
    const icon = status < 400 ? '📥' : '❌';

    console.log(`${icon} ${COLORS.cyan}[API RESPONSE]${COLORS.reset} ${timestamp}`);
    console.log(`   ${COLORS.bright}${method}${COLORS.reset} ${url}`);
    console.log(`   ${COLORS.dim}Status:${COLORS.reset} ${statusColor}${status}${COLORS.reset}`);

    if (response.data) {
        // Truncate large responses
        const dataStr = JSON.stringify(response.data);
        if (dataStr.length > 500) {
            console.log(`   ${COLORS.dim}Data:${COLORS.reset} ${dataStr.substring(0, 500)}... [truncated]`);
        } else {
            console.log(`   ${COLORS.dim}Data:${COLORS.reset}`, response.data);
        }
    }

    console.log('═'.repeat(60) + '\n');
};

/**
 * Format error for logging
 */
export const logError = (error: AxiosError) => {
    if (!__DEV__) return;

    const method = error.config?.method?.toUpperCase() || 'GET';
    const url = error.config?.url || '';
    const status = error.response?.status || 'Network Error';
    const timestamp = new Date().toLocaleTimeString();

    console.log('\n' + '═'.repeat(60));
    console.log(`❌ ${COLORS.red}[API ERROR]${COLORS.reset} ${timestamp}`);
    console.log(`   ${COLORS.bright}${method}${COLORS.reset} ${url}`);
    console.log(`   ${COLORS.dim}Status:${COLORS.reset} ${COLORS.red}${status}${COLORS.reset}`);
    console.log(`   ${COLORS.dim}Message:${COLORS.reset} ${error.message}`);

    if (error.response?.data) {
        console.log(`   ${COLORS.dim}Response:${COLORS.reset}`, error.response.data);
    }

    console.log('═'.repeat(60) + '\n');
};

/**
 * Simple one-line log for quick debugging
 */
export const quickLog = {
    request: (method: string, url: string) => {
        if (!__DEV__) return;
        console.log(`📤 [${method.toUpperCase()}] ${url}`);
    },
    success: (method: string, url: string, status: number) => {
        if (!__DEV__) return;
        console.log(`📥 [${method.toUpperCase()}] ${url} → ${status}`);
    },
    error: (method: string, url: string, status: number | string) => {
        if (!__DEV__) return;
        console.log(`❌ [${method.toUpperCase()}] ${url} → ${status}`);
    },
};
