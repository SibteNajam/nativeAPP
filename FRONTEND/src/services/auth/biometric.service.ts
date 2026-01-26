import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

export type BiometricType = 'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS' | 'UNKNOWN';

export const biometricService = {
    /**
     * Check if hardware supports biometrics
     */
    async isHardwareSupported(): Promise<boolean> {
        return await LocalAuthentication.hasHardwareAsync();
    },

    /**
     * Check if user has enrolled biometrics (e.g. registered a face or finger)
     */
    async isEnrolled(): Promise<boolean> {
        return await LocalAuthentication.isEnrolledAsync();
    },

    /**
     * Get the type of biometrics supported (FaceID vs TouchID)
     */
    async getBiometricType(): Promise<BiometricType> {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'FACIAL_RECOGNITION';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'FINGERPRINT';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'IRIS';
        }
        return 'UNKNOWN';
    },

    /**
     * Prompt the user to authenticate
     */
    async authenticate(message: string = 'Scan to log in'): Promise<boolean> {
        try {
            const hasHardware = await this.isHardwareSupported();
            const isEnrolled = await this.isEnrolled();

            if (!hasHardware || !isEnrolled) {
                return false;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: message,
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            });

            return result.success;
        } catch (error) {
            console.error('Biometric Auth Error:', error);
            return false;
        }
    }
};
