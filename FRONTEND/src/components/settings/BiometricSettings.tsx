/**
 * Biometric Settings Component
 * ==========================
 * Toggle for enabling/disabling biometric authentication
 * Can be integrated into any settings or profile screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

// Services & Context
import { useAuth } from '@/contexts/AuthContext';
import { biometricService } from '@/services/auth/biometric.service';
import { useTheme } from '@/contexts/ThemeContext';

export default function BiometricSettings() {
    const { colors } = useTheme();
    const { enableBiometric, disableBiometric } = useAuth();

    const [isEnabled, setIsEnabled] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [biometricName, setBiometricName] = useState('Biometric');
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitching, setIsSwitching] = useState(false);

    /**
     * Check biometric availability on mount
     */
    useEffect(() => {
        checkBiometricStatus();
    }, []);

    const checkBiometricStatus = async () => {
        try {
            setIsLoading(true);

            // Check if hardware supports biometrics
            const available = await biometricService.isBiometricAvailable();
            setIsAvailable(available);

            if (available) {
                // Get friendly name
                const name = await biometricService.getBiometricName();
                setBiometricName(name);

                // Check if currently enabled
                const configured = await biometricService.isBiometricConfigured();
                setIsEnabled(configured);
            }
        } catch (error) {
            console.error('Error checking biometric status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle toggle switch
     */
    const handleToggle = async () => {
        if (isSwitching) return;

        setIsSwitching(true);

        try {
            if (!isEnabled) {
                // Enable biometric
                const result = await enableBiometric?.();
                
                if (result?.success) {
                    setIsEnabled(true);
                    Alert.alert(
                        'Success',
                        `${biometricName} authentication enabled. You can now use ${biometricName.toLowerCase()} to unlock the app.`,
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert(
                        'Failed',
                        result?.message || 'Failed to enable biometric authentication',
                        [{ text: 'OK' }]
                    );
                }
            } else {
                // Disable biometric - ask for confirmation
                Alert.alert(
                    'Disable Biometric?',
                    `Are you sure you want to disable ${biometricName} authentication? You'll need to log in with your password next time.`,
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Disable',
                            style: 'destructive',
                            onPress: async () => {
                                const result = await disableBiometric?.();
                                
                                if (result?.success) {
                                    setIsEnabled(false);
                                } else {
                                    Alert.alert(
                                        'Failed',
                                        result?.message || 'Failed to disable biometric authentication',
                                        [{ text: 'OK' }]
                                    );
                                }
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Biometric toggle error:', error);
            Alert.alert('Error', error.message || 'An error occurred', [{ text: 'OK' }]);
        } finally {
            setIsSwitching(false);
        }
    };

    // Don't render if biometric is not available
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    if (!isAvailable) {
        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                        name="fingerprint-off"
                        size={24}
                        color={colors.textSecondary}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.textSecondary }]}>
                        Biometric Login
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textLight }]}>
                        Not available on this device
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
        >
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                        name={
                            biometricName.includes('Face')
                                ? 'face-recognition'
                                : 'fingerprint'
                        }
                        size={24}
                        color={isEnabled ? colors.primary : colors.textSecondary}
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {biometricName} Login
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {isEnabled
                            ? `Unlock with ${biometricName.toLowerCase()}`
                            : `Enable quick login with ${biometricName.toLowerCase()}`}
                    </Text>
                </View>

                <Switch
                    value={isEnabled}
                    onValueChange={handleToggle}
                    disabled={isSwitching}
                    color={colors.primary}
                />
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginVertical: 4,
    },
    iconContainer: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
    },
});
