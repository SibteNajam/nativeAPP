import * as SecureStore from 'expo-secure-store';
import { biometricService } from './biometric.service';
import { authStorage } from './auth.storage';
// We will use a mock API request for now, replacing supabase
// import { api } from '../api/client'; 

export const authService = {
    /**
     * 1. Google Login Flow
     * - Get Identity Token from Google (Client Side)
     * - Send Token to YOUR VPS Backend
     * - VPS Backend returns your System JWT
     */
    async signInWithGoogle() {
        try {
            console.log("Starting Google Sign In...");

            // SIMULATION: In real app, use GoogleSignin.signIn() to get idToken
            // const { idToken } = await GoogleSignin.signIn();
            const mockIdToken = "google_id_token_example_123";

            // Exchange this token with YOUR VPS
            return await this.exchangeTokenWithBackend(mockIdToken);

        } catch (error) {
            console.error('Google Sign In Error:', error);
            return { success: false, error };
        }
    },

    /**
     * 2. Exchange Google Token with Custom Backend (VPS)
     */
    async exchangeTokenWithBackend(googleIdToken: string) {
        try {
            // SIMULATION: API Call to your VPS
            // const response = await api.post('/auth/google', { token: googleIdToken });
            // const { jwt, user } = response.data;

            console.log("Sending token to VPS:", googleIdToken);
            await new Promise(r => setTimeout(r, 1000)); // Network delay

            // Mock Response from VPS
            const vpsJwt = "your_vps_jwt_token_xyz_987";
            const user = { id: 1, email: "user@example.com", name: "Demo User" };

            // Securely Store the JWT for future requests
            await authStorage.setTokens(vpsJwt);

            return { success: true, user, token: vpsJwt };
        } catch (error) {
            return { success: false, error: 'Backend validation failed' };
        }
    },

    /**
     * 3. Biometric Login
     * - Check if biometrics enabled
     * - Prompt User
     * - If success, retrieve the Stored JWT
     */
    async loginWithBiometrics() {
        // 1. Check if we have a stored token
        const token = await authStorage.getToken();
        if (!token) return { success: false, error: 'No session found' };

        // 2. Perform Biometric Auth
        const bioSuccess = await biometricService.authenticate();
        if (!bioSuccess) return { success: false, error: 'Biometric failed' };

        // 3. If success, we just return true (the token is already in storage ready to use)
        return { success: true };
    },

    /**
     * 4. Email/Password Login (Legacy/Alternative)
     */
    async loginWithEmail(email: string, pass: string) {
        // Call your VPS 'login' endpoint
        // const res = await api.post('/auth/login', { email, pass });
        return { success: true };
    },

    async logout() {
        await authStorage.clearSession();
    }
};
