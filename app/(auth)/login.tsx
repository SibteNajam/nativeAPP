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
import { biometricService, BiometricType } from '@/services/auth/biometric.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Custom Icons
const FingerprintIcon = ({ color = '#FFFFFF', size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C8.13 2 5 5.13 5 9V15C5 18.87 8.13 22 12 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M9 9C9 7.34 10.34 6 12 6C13.66 6 15 7.34 15 9V15C15 16.66 13.66 18 12 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 10V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M19 9V15C19 18.87 15.87 22 12 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const ArrowRightIcon = ({ color = '#FFFFFF', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const GoogleIcon = ({ size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
);

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [shakeIllustration, setShakeIllustration] = useState(false);
    const [biometricType, setBiometricType] = useState<BiometricType>('UNKNOWN');
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    // Check biometric support on mount
    React.useEffect(() => {
        checkBiometricSupport();
    }, []);

    const checkBiometricSupport = async () => {
        const supported = await biometricService.isHardwareSupported();
        const enrolled = await biometricService.isEnrolled();
        const type = await biometricService.getBiometricType();

        setIsBiometricSupported(supported && enrolled);
        setBiometricType(type);
    };

    // Validation
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const triggerShakeAnimation = useCallback(() => {
        setShakeIllustration(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setShakeIllustration(false), 500);
    }, []);

    const handleLogin = useCallback(async () => {
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
            setErrors({ general: 'Invalid email or password' });
            triggerShakeAnimation();
        } finally {
            setIsLoading(false);
        }
    }, [email, password, triggerShakeAnimation]);

    const handleBiometricLogin = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const success = await biometricService.authenticate();
        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        } else {
            setErrors({ general: 'Biometric authentication failed' });
            triggerShakeAnimation();
        }
    }, [triggerShakeAnimation]);

    const handleGoogleLogin = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Implement Google login
    }, []);

    const handleForgotPassword = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Navigate to forgot password
    }, []);

    const handleSignUp = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/signup');
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
                        {/* Illustration Section */}
                        <MotiView
                            from={{ opacity: 0, translateY: -30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 800 }}
                            style={styles.illustrationContainer}
                        >
                            <AuthIllustration
                                size={SCREEN_WIDTH * 0.55}
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
                                <Text style={styles.title}>Welcome Back</Text>
                                <Text style={styles.subtitle}>
                                    Sign in to continue your trading journey
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
                                    autoComplete="password"
                                />

                                {/* Forgot Password */}
                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    style={styles.forgotButton}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.forgotText}>Forgot Password?</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Buttons */}
                            <View style={styles.buttonsContainer}>
                                {/* Sign In Button */}
                                <TouchableOpacity
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                    style={styles.signInButton}
                                >
                                    <LinearGradient
                                        colors={['#4DA6FF', '#2563EB']}
                                        style={styles.signInGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.signInText}>Sign In</Text>
                                                <ArrowRightIcon />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Divider */}
                                <View style={styles.dividerContainer}>
                                    <View style={styles.divider} />
                                    <Text style={styles.dividerText}>or continue with</Text>
                                    <View style={styles.divider} />
                                </View>

                                {/* Social & Biometric Buttons */}
                                <View style={styles.socialButtonsRow}>
                                    {/* Google Button */}
                                    <TouchableOpacity
                                        onPress={handleGoogleLogin}
                                        style={styles.socialButton}
                                        activeOpacity={0.8}
                                    >
                                        <GoogleIcon size={22} />
                                        <Text style={styles.socialButtonText}>Google</Text>
                                    </TouchableOpacity>

                                    {/* Biometric Button */}
                                    {isBiometricSupported && (
                                        <TouchableOpacity
                                            onPress={handleBiometricLogin}
                                            style={[styles.socialButton, styles.biometricButton]}
                                            activeOpacity={0.8}
                                        >
                                            <FingerprintIcon color="#8B5CF6" size={22} />
                                            <Text style={[styles.socialButtonText, styles.biometricText]}>
                                                {biometricType === 'FACIAL_RECOGNITION' ? 'Face ID' : 'Touch ID'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Sign Up Link */}
                            <View style={styles.signupContainer}>
                                <Text style={styles.signupText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
                                    <Text style={styles.signupLink}>Sign Up</Text>
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
    illustrationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    formContainer: {
        flex: 1,
    },
    headerSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
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
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -8,
        marginBottom: 8,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4DA6FF',
    },
    buttonsContainer: {
        gap: 16,
    },
    signInButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#4DA6FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    signInGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    signInText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    socialButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        paddingVertical: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    biometricButton: {
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    socialButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    biometricText: {
        color: '#A78BFA',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
    },
    signupText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    signupLink: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4DA6FF',
    },
});
