import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import AuthIllustration from '@/components/illustrations/AuthIllustration';
import FloatingLabelInput from '@/components/common/FloatingLabelInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Icons
const ChevronLeftIcon = ({ color = '#FFFFFF', size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ArrowRightIcon = ({ color = '#FFFFFF', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [shakeIllustration, setShakeIllustration] = useState(false);

    // Password strength
    const getPasswordStrength = (pass: string): PasswordStrength => {
        if (pass.length < 6) return 'weak';
        if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return 'medium';
        return 'strong';
    };

    const passwordStrength = getPasswordStrength(password);

    const getStrengthColor = () => {
        switch (passwordStrength) {
            case 'weak': return '#EF4444';
            case 'medium': return '#F59E0B';
            case 'strong': return '#10B981';
        }
    };

    const getStrengthWidth = (): `${number}%` => {
        switch (passwordStrength) {
            case 'weak': return '33%';
            case 'medium': return '66%';
            case 'strong': return '100%';
        }
    };

    // Validation
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const triggerShakeAnimation = useCallback(() => {
        setShakeIllustration(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setShakeIllustration(false), 500);
    }, []);

    const handleSignup = useCallback(async () => {
        if (!validateForm()) {
            triggerShakeAnimation();
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Success haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error) {
            setErrors({ general: 'Something went wrong. Please try again.' });
            triggerShakeAnimation();
        } finally {
            setIsLoading(false);
        }
    }, [name, email, password, confirmPassword, triggerShakeAnimation]);

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, []);

    const handleLogin = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/login');
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#0A1628', '#0F2744', '#0A1628']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Background decorative elements */}
                <View style={styles.bgPattern}>
                    <View style={[styles.bgCircle, styles.bgCircle1]} />
                    <View style={[styles.bgCircle, styles.bgCircle2]} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header with Back Button */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={handleBack}
                                style={styles.backButton}
                                activeOpacity={0.7}
                            >
                                <ChevronLeftIcon />
                            </TouchableOpacity>
                        </View>

                        {/* Illustration Section */}
                        <MotiView
                            from={{ opacity: 0, translateY: -30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 800 }}
                            style={styles.illustrationContainer}
                        >
                            <AuthIllustration
                                size={SCREEN_WIDTH * 0.45}
                                isShaking={shakeIllustration}
                            />
                        </MotiView>

                        {/* Form Section */}
                        <MotiView
                            from={{ opacity: 0, translateY: 50 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 800, delay: 300 }}
                            style={styles.formContainer}
                        >
                            {/* Header */}
                            <View style={styles.headerSection}>
                                <Text style={styles.title}>Create Account</Text>
                                <Text style={styles.subtitle}>
                                    Start your trading journey today
                                </Text>
                            </View>

                            {/* Error Message */}
                            <AnimatePresence>
                                {errors.general && (
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={styles.errorContainer}
                                    >
                                        <Text style={styles.generalError}>{errors.general}</Text>
                                    </MotiView>
                                )}
                            </AnimatePresence>

                            {/* Input Fields with Floating Labels */}
                            <View style={styles.inputsContainer}>
                                <FloatingLabelInput
                                    label="Full Name"
                                    icon="user"
                                    value={name}
                                    onChangeText={setName}
                                    error={errors.name}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                />

                                <FloatingLabelInput
                                    label="Email Address"
                                    icon="mail"
                                    value={email}
                                    onChangeText={setEmail}
                                    error={errors.email}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />

                                <FloatingLabelInput
                                    label="Password"
                                    icon="lock"
                                    value={password}
                                    onChangeText={setPassword}
                                    error={errors.password}
                                    secureTextEntry
                                    autoComplete="new-password"
                                />

                                {/* Password Strength Indicator */}
                                {password.length > 0 && (
                                    <View style={styles.strengthContainer}>
                                        <View style={styles.strengthBar}>
                                            <View
                                                style={[
                                                    styles.strengthFill,
                                                    {
                                                        backgroundColor: getStrengthColor(),
                                                        width: getStrengthWidth()
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                                            {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)} password
                                        </Text>
                                    </View>
                                )}

                                <FloatingLabelInput
                                    label="Confirm Password"
                                    icon="lock"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    error={errors.confirmPassword}
                                    secureTextEntry
                                    autoComplete="new-password"
                                />
                            </View>

                            {/* Create Account Button */}
                            <TouchableOpacity
                                onPress={handleSignup}
                                disabled={isLoading}
                                activeOpacity={0.8}
                                style={styles.signupButton}
                            >
                                <LinearGradient
                                    colors={['#4DA6FF', '#2563EB']}
                                    style={styles.signupGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Text style={styles.signupText}>Create Account</Text>
                                            <ArrowRightIcon />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Terms */}
                            <Text style={styles.termsText}>
                                By signing up, you agree to our{' '}
                                <Text style={styles.termsLink}>Terms of Service</Text>
                                {' '}and{' '}
                                <Text style={styles.termsLink}>Privacy Policy</Text>
                            </Text>

                            {/* Login Link */}
                            <View style={styles.loginContainer}>
                                <Text style={styles.loginText}>Already have an account? </Text>
                                <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
                                    <Text style={styles.loginLink}>Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    bgPattern: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    bgCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    bgCircle1: {
        width: 300,
        height: 300,
        backgroundColor: 'rgba(77, 166, 255, 0.08)',
        top: -100,
        right: -100,
    },
    bgCircle2: {
        width: 250,
        height: 250,
        backgroundColor: 'rgba(139, 92, 246, 0.06)',
        bottom: -50,
        left: -100,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 30,
    },
    header: {
        marginBottom: 8,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    illustrationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    formContainer: {
        flex: 1,
    },
    headerSection: {
        marginBottom: 20,
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 22,
    },
    errorContainer: {
        marginBottom: 16,
    },
    generalError: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        overflow: 'hidden',
    },
    inputsContainer: {
        marginBottom: 8,
    },
    strengthContainer: {
        marginTop: -12,
        marginBottom: 16,
    },
    strengthBar: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        marginBottom: 6,
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '500',
    },
    signupButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#4DA6FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 16,
    },
    signupGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    signupText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    termsText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: '#4DA6FF',
        fontWeight: '500',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    loginText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    loginLink: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4DA6FF',
    },
});
