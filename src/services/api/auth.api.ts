/**
 * Auth API Service
 * =================
 * Handles all authentication-related API calls.
 * Uses centralized config for endpoints.
 * 
 * Usage:
 *   import { authApi } from '@/services/api/auth.api';
 *   const result = await authApi.login({ email, password });
 */

import { api } from '@/services/api/client';
import { config } from '@/constants/config';
import { authStorage } from '@/services/auth/auth.storage';
import {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    AuthTokens,
    User,
    VerifyOTPRequest,
} from '@/types/auth.types';

// Destructure endpoints for cleaner code
const { AUTH } = config.ENDPOINTS;

/**
 * Auth API Service
 * All API calls related to authentication
 */
export const authApi = {
    /**
     * Login with email and password
     * 
     * Backend Response Format (wrapped):
     * {
     *   status: "Success",
     *   statusCode: 200,
     *   message: "Login Succesfully",
     *   data: {
     *     data: {
     *       user: { id, email, name, ... },
     *       payload: { type, token, refresh_token }
     *     }
     *   }
     * }
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.LOGIN, {
                email: data.email.trim().toLowerCase(),
                password: data.password,
            });

            // Backend wraps response in: { status, data: { data: { user, payload } } }
            // Navigate through the nested structure
            const responseData = response.data;

            // Try different possible response structures
            let user, payload;

            if (responseData.data?.data?.user) {
                // Nested wrapper: { data: { data: { user, payload } } }
                user = responseData.data.data.user;
                payload = responseData.data.data.payload;
            } else if (responseData.data?.user) {
                // Single wrapper: { data: { user, payload } }
                user = responseData.data.user;
                payload = responseData.data.payload;
            } else if (responseData.user) {
                // Direct: { user, payload }
                user = responseData.user;
                payload = responseData.payload;
            } else {
                console.error('Unexpected login response structure:', responseData);
                return {
                    success: false,
                    message: 'Login failed: Unexpected response format',
                };
            }

            // Map backend field names to our frontend expectations
            const accessToken = payload?.token;
            const refreshToken = payload?.refresh_token;

            if (!accessToken) {
                console.error('Login response missing token. User:', user, 'Payload:', payload);
                return {
                    success: false,
                    message: 'Login failed: No token received',
                };
            }

            // Store tokens securely
            await authStorage.setTokens(accessToken, refreshToken);

            // Map user fields (backend uses 'name', we use 'firstName')
            const mappedUser: User = {
                id: user.id,
                email: user.email,
                firstName: user.name || user.firstName || 'User',
                lastName: user.lastName || '',
                isVerified: user.isVerified ?? true,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };

            return {
                success: true,
                message: 'Login successful',
                user: mappedUser,
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: 604800, // 7 days in seconds (default)
                },
            };
        } catch (error: any) {
            console.error('Login error:', error.response?.data || error.message);

            return {
                success: false,
                message: error.response?.data?.message || 'Login failed. Please check your credentials.',
            };
        }
    },

    /**
     * Register a new user
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.REGISTER, {
                firstName: data.firstName.trim(),
                lastName: data.lastName?.trim() || '',
                email: data.email.trim().toLowerCase(),
                password: data.password,
                confirmPassword: data.confirmPassword,
            });

            return {
                success: true,
                message: response.data.message || 'Registration successful! Please login.',
                user: response.data.user,
            };
        } catch (error: any) {
            console.error('Register error:', error.response?.data || error.message);

            // Handle validation errors from backend
            const backendMessage = error.response?.data?.message;
            const validationErrors = error.response?.data?.errors;

            let message = 'Registration failed. Please try again.';

            if (validationErrors && typeof validationErrors === 'object') {
                const firstErrorKey = Object.keys(validationErrors)[0];
                if (firstErrorKey) {
                    const errorArr = validationErrors[firstErrorKey];
                    message = Array.isArray(errorArr) ? errorArr[0] : String(errorArr);
                }
            } else if (backendMessage) {
                message = backendMessage;
            }

            return {
                success: false,
                message,
            };
        }
    },

    /**
     * Logout the current user
     */
    async logout(): Promise<void> {
        try {
            await api.post(AUTH.LOGOUT);
        } catch (error) {
            console.log('Logout API call failed, clearing local session anyway');
        } finally {
            await authStorage.clearSession();
        }
    },

    /**
     * Refresh the access token
     * 
     * Backend Response Format:
     * {
     *   status: "Success",
     *   statusCode: 200,
     *   message: "Token refreshed successfully",
     *   data: {
     *     data: {
     *       user: { ... },
     *       payload: { token, refresh_token }
     *     }
     *   }
     * }
     */
    async refreshToken(): Promise<AuthTokens | null> {
        try {
            const refreshToken = await authStorage.getRefreshToken();

            if (!refreshToken) {
                console.log('No refresh token found');
                return null;
            }

            const response = await api.post(AUTH.REFRESH, {
                refresh_token: refreshToken, // Backend expects 'refresh_token'
            });

            // Backend wraps response in nested structure
            const responseData = response.data;
            const payload = responseData.data?.data?.payload || responseData.data?.payload || responseData.payload;

            if (!payload?.token) {
                console.error('Unexpected refresh token response structure:', responseData);
                return null;
            }

            const accessToken = payload.token;
            const newRefreshToken = payload.refresh_token || refreshToken;

            await authStorage.setTokens(accessToken, newRefreshToken);

            console.log('Token refreshed successfully');
            return {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: 604800, // 7 days default
            };
        } catch (error: any) {
            console.error('Token refresh failed:', error.response?.data || error.message);
            await authStorage.clearSession();
            return null;
        }
    },

    /**
     * Get current user profile
     * 
     * Backend Response Format:
     * {
     *   status: "Success",
     *   statusCode: 200,
     *   message: "User retrieved successfully",
     *   data: {
     *     user: { id, email, name, ... }
     *   }
     * }
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            const token = await authStorage.getToken();

            if (!token) {
                console.log('No token found, cannot get current user');
                return null;
            }

            const response = await api.get(AUTH.ME);
            
            // Backend wraps response in: { status, data: { user } }
            const responseData = response.data;
            const user = responseData.data?.user || responseData.user;

            if (!user) {
                console.error('Unexpected getCurrentUser response structure:', responseData);
                return null;
            }

            // Map user fields (backend uses 'name', we use 'firstName')
            const mappedUser: User = {
                id: user.id,
                email: user.email,
                firstName: user.name || user.firstName || 'User',
                lastName: user.lastName || '',
                isVerified: user.isVerified ?? true,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };

            console.log('Current user retrieved:', mappedUser.email);
            return mappedUser;
        } catch (error: any) {
            console.error('Get current user failed:', error);
            
            // If 401, token is invalid - clear storage
            if (error.response?.status === 401) {
                await authStorage.clearSession();
            }
            
            return null;
        }
    },

    /**
     * Verify OTP code
     */
    async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.VERIFY_OTP, {
                email: data.email.trim().toLowerCase(),
                otp: data.otp,
            });

            const { user, accessToken, refreshToken, expiresIn } = response.data;

            if (accessToken) {
                await authStorage.setTokens(accessToken, refreshToken);
            }

            return {
                success: true,
                message: 'OTP verified successfully',
                user,
                tokens: accessToken ? { accessToken, refreshToken, expiresIn } : undefined,
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'OTP verification failed',
            };
        }
    },

    /**
     * Send OTP to email
     */
    async sendOTP(email: string): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.SEND_OTP, {
                email: email.trim().toLowerCase(),
            });

            return {
                success: true,
                message: response.data.message || 'OTP sent successfully',
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send OTP',
            };
        }
    },

    /**
     * Login with Google
     */
    async loginWithGoogle(idToken: string): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.GOOGLE, {
                idToken,
            });

            const { user, accessToken, refreshToken, expiresIn } = response.data;

            await authStorage.setTokens(accessToken, refreshToken);

            return {
                success: true,
                message: 'Google login successful',
                user,
                tokens: { accessToken, refreshToken, expiresIn },
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Google login failed',
            };
        }
    },

    /**
     * Request password reset
     */
    async resetPassword(email: string): Promise<AuthResponse> {
        try {
            const response = await api.post(AUTH.RESET_PASSWORD, {
                email: email.trim().toLowerCase(),
            });

            return {
                success: true,
                message: response.data.message || 'Password reset email sent',
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send reset email',
            };
        }
    },
};

export default authApi;
