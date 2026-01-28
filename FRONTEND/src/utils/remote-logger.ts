/**
 * Remote Logger
 * Sends logs to your backend server so you can track production issues
 */

import { config } from '@/constants/config';

interface LogData {
    level: 'info' | 'error' | 'warn';
    message: string;
    data?: any;
    timestamp: string;
    userId?: string;
    deviceInfo?: any;
}

class RemoteLogger {
    private enabled = !__DEV__; // Only log in production APK
    private queue: LogData[] = [];
    private sendInterval: NodeJS.Timeout | null = null;

    // Sensitive keys that should never be logged
    private static readonly SENSITIVE_KEYS = [
        'token', 'access_token', 'accessToken', 'refresh_token', 'refreshToken',
        'password', 'secret', 'apiKey', 'api_key', 'apiSecret', 'api_secret',
        'secretKey', 'secret_key', 'privateKey', 'private_key', 'passphrase',
        'authorization', 'auth', 'cookie', 'session', 'credential'
    ];

    constructor() {
        // Send queued logs every 10 seconds
        if (this.enabled) {
            this.sendInterval = setInterval(() => this.flush(), 10000);
        }
    }

    /**
     * Sanitize sensitive data from objects before logging
     * Replaces sensitive values with '[REDACTED]'
     */
    private sanitizeData(data: any, depth: number = 0): any {
        // Prevent infinite recursion
        if (depth > 5) return '[MAX_DEPTH]';
        if (data === null || data === undefined) return data;

        // Handle primitive types
        if (typeof data !== 'object') return data;

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item, depth + 1));
        }

        // Handle objects
        const sanitized: Record<string, any> = {};
        for (const key of Object.keys(data)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = RemoteLogger.SENSITIVE_KEYS.some(
                sensitive => lowerKey.includes(sensitive.toLowerCase())
            );

            if (isSensitive) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = this.sanitizeData(data[key], depth + 1);
            }
        }
        return sanitized;
    }

    /**
     * Log API request/response for tracking
     * Automatically sanitizes sensitive data
     */
    logAPI(method: string, url: string, status: number, data?: any) {
        if (!this.enabled) return;

        // Sanitize the response data before logging
        const sanitizedData = data ? this.sanitizeData(data) : undefined;

        this.queue.push({
            level: status >= 400 ? 'error' : 'info',
            message: `[${method}] ${url} - ${status}`,
            data: {
                method,
                url,
                status,
                response: sanitizedData,
            },
            timestamp: new Date().toISOString(),
        });

        // Auto-flush if queue gets large
        if (this.queue.length >= 10) {
            this.flush();
        }
    }

    /**
     * Log general info
     */
    info(message: string, data?: any) {
        if (!this.enabled) {
            console.log(message, data);
            return;
        }

        this.queue.push({
            level: 'info',
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log errors
     */
    error(message: string, error?: any) {
        // Always log errors, even in dev
        console.error(message, error);

        if (!this.enabled) return;

        this.queue.push({
            level: 'error',
            message,
            data: {
                error: error?.message || error,
                stack: error?.stack,
            },
            timestamp: new Date().toISOString(),
        });

        // Flush errors immediately
        this.flush();
    }

    /**
     * Send logs to backend
     */
    private async flush() {
        if (this.queue.length === 0) return;

        const logsToSend = [...this.queue];
        this.queue = [];

        try {
            await fetch(`${config.API_URL}/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logs: logsToSend }),
            });
        } catch (error) {
            // Silent fail - don't want to break the app if logging fails
            console.warn('Failed to send logs to server:', error);
            // Put logs back in queue to retry later
            this.queue.unshift(...logsToSend);
        }
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
        }
        this.flush();
    }
}

export const remoteLogger = new RemoteLogger();
