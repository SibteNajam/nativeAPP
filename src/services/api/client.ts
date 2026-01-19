import axios from 'axios';
import { authStorage } from '@/services/auth/auth.storage';

// Replace with your actual VPS IP or Domain
// For Android Emulator, use 'http://10.0.2.2:3000' to access localhost of the computer
// For Real Device, use your computer's LAN IP 'http://192.168.x.x:3000' or your VPS URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.your-vps.com';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request Interceptor: Attaches the JWT Token to every request
api.interceptors.request.use(
    async (config) => {
        const token = await authStorage.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handles global errors (like 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            // Option 1: Try to refresh token
            // Option 2: Logout user
            console.log('Session expired, logging out...');
            await authStorage.clearSession();
            // Ideally trigger a navigation to login screen here or state update
        }
        return Promise.reject(error);
    }
);
