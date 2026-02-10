/**
 * OTP Verification Screen
 * ======================
 * Allows users to verify their email using a 6-digit OTP code
 * Features:
 * - 6-digit OTP input with auto-focus
 * - 10-minute countdown timer
 * - Resend OTP with cooldown
 * - Professional UI with theme colors
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Animated,
    Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/services/api/auth.api';
import { useTheme } from '@/contexts/ThemeContext';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export default function OTPVerificationScreen() {
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ email: string }>();
    const email = params.email || '';

    // OTP State
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_MINUTES * 60); // 10 minutes in seconds
    const [resendCooldown, setResendCooldown] = useState(0);

    // Refs for OTP inputs
    const inputRefs = useRef<TextInput[]>([]);

    // Animation
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    // Countdown Timer Effect
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    Alert.alert('OTP Expired', 'Your OTP has expired. Please request a new one.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // Resend Cooldown Timer
    useEffect(() => {
        if (resendCooldown <= 0) return;

        const timer = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle OTP input change
    const handleOtpChange = (value: string, index: number) => {
        setError(''); // Clear error on input

        // Only allow numbers
        if (value && !/^\d+$/.test(value)) return;

        const newOtp = [...otp];

        if (value === '') {
            // Handle backspace
            newOtp[index] = '';
            setOtp(newOtp);
            
            // Focus previous input
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else {
            // Handle digit input
            newOtp[index] = value[value.length - 1]; // Take last digit if paste
            setOtp(newOtp);

            // Auto-focus next input
            if (index < OTP_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
            } else {
                // Last digit entered, trigger verification
                inputRefs.current[index]?.blur();
                handleVerifyOTP(newOtp.join(''));
            }
        }
    };

    // Handle OTP key press (for backspace)
    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Shake animation for errors
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    // Verify OTP
    const handleVerifyOTP = async (otpCode: string) => {
        if (otpCode.length !== OTP_LENGTH) {
            setError('Please enter complete OTP code');
            triggerShake();
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authApi.verifyOTP({
                email,
                otp: otpCode,
            });

            if (response.success) {
                setShowSuccessModal(true);
                setTimeout(() => {
                    setShowSuccessModal(false);
                    router.replace('/(auth)/login');
                }, 2000);
            } else {
                setError(response.message || 'Invalid OTP code');
                triggerShake();
                setOtp(Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            }
        } catch {
            setError('Verification failed. Please try again.');
            triggerShake();
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;

        setLoading(true);
        setError('');

        try {
            const response = await authApi.resendOTP(email);

            if (response.success) {
                Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
                setTimeLeft(OTP_EXPIRY_MINUTES * 60); // Reset timer
                setResendCooldown(RESEND_COOLDOWN_SECONDS); // Start cooldown
                setOtp(Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            } else {
                setError(response.message || 'Failed to resend OTP');
            }
        } catch {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Manual verify button (if user doesn't want auto-submit)
    const handleManualVerify = () => {
        const otpCode = otp.join('');
        handleVerifyOTP(otpCode);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.surface }]}
                        onPress={() => router.back()}
                        disabled={loading}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Verify Email</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name="mail-outline" size={80} color={colors.primary} />
                </View>

                {/* Title and Description */}
                <Text style={[styles.title, { color: colors.text }]}>Enter Verification Code</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    We&apos;ve sent a 6-digit code to{'\n'}
                    <Text style={[styles.email, { color: colors.primary }]}>{email}</Text>
                </Text>

                {/* Timer */}
                <View style={styles.timerContainer}>
                    <Ionicons
                        name="time-outline"
                        size={16}
                        color={timeLeft < 60 ? colors.error : colors.textSecondary}
                    />
                    <Text
                        style={[
                            styles.timer,
                            { color: colors.textSecondary },
                            timeLeft < 60 && { color: colors.error },
                        ]}
                    >
                        {formatTime(timeLeft)}
                    </Text>
                </View>

                {/* OTP Input */}
                <Animated.View
                    style={[
                        styles.otpContainer,
                        { transform: [{ translateX: shakeAnimation }] },
                    ]}
                >
                    {otp.map((digit, index) => (
                        /* @ts-ignore - React Native TextInput key prop and ref type false positives */
                        <TextInput
                            key={index}
                            ref={(ref: any) => {
                                if (ref) inputRefs.current[index] = ref;
                            }}
                            style={[
                                styles.otpInput,
                                { 
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                },
                                digit !== '' && { 
                                    borderColor: colors.primary,
                                    backgroundColor: colors.surfaceLight,
                                },
                                error && { borderColor: colors.error },
                            ]}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            editable={!loading}
                        />
                    ))}
                </Animated.View>

                {/* Error Message */}
                {error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    </View>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity
                    style={[
                        styles.verifyButton,
                        { backgroundColor: colors.primary },
                        (loading || otp.join('').length !== OTP_LENGTH) && styles.verifyButtonDisabled,
                    ]}
                    onPress={handleManualVerify}
                    disabled={loading || otp.join('').length !== OTP_LENGTH}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={[styles.verifyButtonText, { color: colors.white }]}>Verify Email</Text>
                    )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                    <Text style={[styles.resendText, { color: colors.textSecondary }]}>Didn&apos;t receive the code? </Text>
                    <TouchableOpacity
                        onPress={handleResendOTP}
                        disabled={loading || resendCooldown > 0}
                    >
                        <Text
                            style={[
                                styles.resendButton,
                                { color: colors.primary },
                                (loading || resendCooldown > 0) && styles.resendButtonDisabled,
                            ]}
                        >
                            {resendCooldown > 0
                                ? `Resend (${resendCooldown}s)`
                                : 'Resend OTP'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={[styles.successIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Success! 🎉</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                            Your email has been verified.{'\n'}Redirecting to login...
                        </Text>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    email: {
        fontWeight: '600',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 32,
    },
    timer: {
        fontSize: 14,
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 2,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
    },
    errorText: {
        fontSize: 14,
    },
    verifyButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    verifyButtonDisabled: {
        opacity: 0.5,
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resendText: {
        fontSize: 14,
    },
    resendButton: {
        fontSize: 14,
        fontWeight: '600',
    },
    resendButtonDisabled: {
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    successIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
