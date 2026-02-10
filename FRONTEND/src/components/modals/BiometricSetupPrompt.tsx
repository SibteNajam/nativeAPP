/**
 * Biometric Setup Prompt
 * ======================
 * Modal/Dialog to prompt users to enable biometric after successful login
 * Can be shown after first login or when biometric is available but not configured
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

// Services & Context
import { useAuth } from '@/contexts/AuthContext';
import { biometricService } from '@/services/auth/biometric.service';
import { useTheme } from '@/contexts/ThemeContext';

interface BiometricSetupPromptProps {
    visible: boolean;
    onDismiss: () => void;
    onSetupComplete?: () => void;
}

export default function BiometricSetupPrompt({
    visible,
    onDismiss,
    onSetupComplete,
}: BiometricSetupPromptProps) {
    const { colors } = useTheme();
    const { enableBiometric } = useAuth();

    const [biometricName, setBiometricName] = useState('Biometric');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadBiometricName();
        }
    }, [visible]);

    const loadBiometricName = async () => {
        const name = await biometricService.getBiometricName();
        setBiometricName(name);
    };

    const handleEnable = async () => {
        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const result = await enableBiometric?.();

            if (result?.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSetupComplete?.();
                onDismiss();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                // Error is handled by enableBiometric with alerts
            }
        } catch (error) {
            console.error('Biometric setup error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDismiss();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.backdrop} onPress={handleSkip}>
                <Pressable style={{ width: '100%', alignItems: 'center' }}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 300 }}
                        style={[
                            styles.container,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        {/* Icon */}
                        <View
                            style={[
                                styles.iconCircle,
                                { backgroundColor: `${colors.primary}15` },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={
                                    biometricName.includes('Face')
                                        ? 'face-recognition'
                                        : 'fingerprint'
                                }
                                size={48}
                                color={colors.primary}
                            />
                        </View>

                        {/* Title */}
                        <Text style={[styles.title, { color: colors.text }]}>
                            Enable {biometricName}?
                        </Text>

                        {/* Description */}
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            Unlock the app quickly and securely with{' '}
                            {biometricName.toLowerCase()} instead of entering your password.
                        </Text>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <Pressable
                                onPress={handleEnable}
                                disabled={isLoading}
                                style={({ pressed }) => [
                                    styles.button,
                                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                                ]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.buttonLabel}>Enable {biometricName}</Text>
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleSkip}
                                disabled={isLoading}
                                style={({ pressed }) => [
                                    styles.skipButton,
                                    { opacity: pressed ? 0.7 : 1 }
                                ]}
                            >
                                <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>
                                    Maybe Later
                                </Text>
                            </Pressable>
                        </View>
                    </MotiView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    skipButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
});
