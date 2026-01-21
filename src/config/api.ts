/**
 * API Configuration
 * Centralized configuration for API endpoints and WebSocket connections
 */

// Get environment variables with fallbacks
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

// Validate in production
if (!__DEV__ && !API_URL) {
  console.error('⚠️ EXPO_PUBLIC_API_URL is not defined in production!');
}

export const apiConfig = {
  // REST API Base URL
  baseURL: API_URL || 'http://localhost:3000/api',
  
  // WebSocket URL
  wsURL: WS_URL || 'ws://localhost:3000',
  
  // Request timeout (30 seconds)
  timeout: 30000,
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

// Helper function to build full URL
export const buildURL = (endpoint: string): string => {
  const baseURL = apiConfig.baseURL.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseURL}${path}`;
};

// Log configuration in development
if (__DEV__) {
  console.log('📡 API Configuration:');
  console.log('  - Base URL:', apiConfig.baseURL);
  console.log('  - WebSocket:', apiConfig.wsURL);
  console.log('  - Environment:', __DEV__ ? 'Development' : 'Production');
}

export default apiConfig;
