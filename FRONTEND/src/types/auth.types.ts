/**
 * Authentication Types
 * Central type definitions for authentication system
 */

// ============ User Types ============
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

// ============ Request Types ============
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface VerifyOTPRequest {
    email: string;
    otp: string;
}

export interface ResetPasswordRequest {
    email: string;
}

export interface ConfirmResetPasswordRequest {
    token: string;
    newPassword: string;
    confirmPassword: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// ============ Response Types ============
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    tokens?: AuthTokens;
}

export interface ApiError {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
    statusCode?: number;
}

// ============ Auth State Types ============
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
    user: User | null;
    status: AuthStatus;
    isLoading: boolean;
    error: string | null;
}

// ============ Form Validation Types ============
export interface ValidationError {
    field: string;
    message: string;
}

export interface FormErrors {
    [key: string]: string | undefined;
}

// ============ Auth Context Types ============
export interface AuthContextType {
    user: User | null;
    status: AuthStatus;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;

    // Actions
    login: (data: LoginRequest) => Promise<AuthResponse>;
    register: (data: RegisterRequest) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<boolean>;
    clearError: () => void;

    // Biometric authentication
    enableBiometric?: () => Promise<{ success: boolean; message: string }>;
    disableBiometric?: () => Promise<{ success: boolean; message: string }>;
    loginWithBiometric?: () => Promise<AuthResponse>;

    // OTP verification
    verifyOTP?: (data: VerifyOTPRequest) => Promise<AuthResponse>;
    
    // Social login (future)
    loginWithGoogle?: () => Promise<AuthResponse>;
}
