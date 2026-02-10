import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import { authStorage } from './auth.storage';
import * as Crypto from 'expo-crypto';

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
     * Get biometric type as string for API
     */
    async getBiometricTypeString(): Promise<string> {
        const type = await this.getBiometricType();
        switch (type) {
            case 'FACIAL_RECOGNITION':
                return Platform.OS === 'ios' ? 'face_id' : 'facial_recognition';
            case 'FINGERPRINT':
                return Platform.OS === 'ios' ? 'touch_id' : 'fingerprint';
            case 'IRIS':
                return 'iris';
            default:
                return 'unknown';
        }
    },

    /**
     * Generate a unique device ID
     */
    async getOrCreateDeviceId(): Promise<string> {
        let deviceId = await authStorage.getDeviceId();
        
        if (!deviceId) {
            // Generate a new UUID for this device
            deviceId = Crypto.randomUUID();
            await authStorage.setDeviceId(deviceId);
        }
        
        return deviceId;
    },

    /**
     * Get device name
     */
    getDeviceName(): string {
        const platform = Platform.OS;
        const version = Platform.Version;
        
        if (platform === 'ios') {
            return `iPhone (iOS ${version})`;
        } else if (platform === 'android') {
            return `Android Device (API ${version})`;
        } else {
            return 'Web Browser';
        }
    },

    /**
     * Prompt the user to authenticate with biometrics
     */
    async authenticate(message: string = 'Scan to log in'): Promise<boolean> {
        try {
            const hasHardware = await this.isHardwareSupported();
            const isEnrolled = await this.isEnrolled();

            if (!hasHardware) {
                Alert.alert('Not Supported', 'Biometric authentication is not supported on this device');
                return false;
            }

            if (!isEnrolled) {
                Alert.alert(
                    'Not Enrolled',
                    'Please set up biometric authentication in your device settings first'
                );
                return false;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: message,
                fallbackLabel: 'Cancel',
                disableDeviceFallback: true, // Force biometric only (no PIN/pattern fallback)
                cancelLabel: 'Cancel',
            });

            return result.success;
        } catch (error) {
            console.error('Biometric Auth Error:', error);
            return false;
        }
    },

    /**
     * Check if biometric is available and user is set up
     */
    async isBiometricAvailable(): Promise<boolean> {
        const hasHardware = await this.isHardwareSupported();
        const isEnrolled = await this.isEnrolled();
        return hasHardware && isEnrolled;
    },

    /**
     * Check if biometric login is fully configured (device registered + enabled)
     */
    async isBiometricConfigured(): Promise<boolean> {
        const isEnabled = await authStorage.getIsBiometricEnabled();
        const deviceToken = await authStorage.getDeviceToken();
        const deviceId = await authStorage.getDeviceId();
        
        return isEnabled && !!deviceToken && !!deviceId;
    },

    /**
     * Get biometric friendly name for UI
     */
    async getBiometricName(): Promise<string> {
        const type = await this.getBiometricType();
        switch (type) {
            case 'FACIAL_RECOGNITION':
                return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
            case 'FINGERPRINT':
                return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
            case 'IRIS':
                return 'Iris Scan';
            default:
                return 'Biometric';
        }
    }
};
