import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
    Button,
    TextInput,
    Surface,
    IconButton,
    Divider,
    HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import theme hook
import { useTheme } from '@/contexts/ThemeContext';

interface FormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export default function LoginScreen() {
    const { colors, isDark, toggleTheme } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

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

    const handleLogin = useCallback(async () => {
        if (!validateForm()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        } catch (error) {
            setErrors({ general: 'Invalid email or password' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    }, [email, password]);

    const handleSignUp = () => {
        router.push('/signup');
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor={colors.text}
                    size={24}
                    onPress={handleBack}
                    style={[styles.backButton, { backgroundColor: colors.surface }]}
                />
                <IconButton
                    icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
                    iconColor={colors.primary}
                    size={22}
                    onPress={toggleTheme}
                    style={[styles.themeToggle, { backgroundColor: colors.surface }]}
                />
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
                    {/* Logo & Title */}
                    <View style={styles.titleSection}>
                        <Surface style={[styles.logoIcon, { backgroundColor: colors.surface }]} elevation={2}>
                            <MaterialCommunityIcons name="robot" size={32} color={colors.primary} />
                        </Surface>
                        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue trading</Text>
                    </View>

                    {/* Error Message */}
                    {errors.general && (
                        <Surface style={[styles.errorBanner, { backgroundColor: colors.errorLight }]} elevation={0}>
                            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
                            <Text style={[styles.errorBannerText, { color: colors.error }]}>{errors.general}</Text>
                        </Surface>
                    )}

                    {/* Form */}
                    <View style={styles.formSection}>
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            error={!!errors.email}
                            left={<TextInput.Icon icon="email-outline" color={colors.textLight} />}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            outlineStyle={styles.inputOutline}
                        />
                        {errors.email && (
                            <HelperText type="error" visible={!!errors.email}>
                                {errors.email}
                            </HelperText>
                        )}

                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            autoComplete="password"
                            error={!!errors.password}
                            left={<TextInput.Icon icon="lock-outline" color={colors.textLight} />}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                                    color={colors.textLight}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            }
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            outlineStyle={styles.inputOutline}
                        />
                        {errors.password && (
                            <HelperText type="error" visible={!!errors.password}>
                                {errors.password}
                            </HelperText>
                        )}

                        <Button
                            mode="text"
                            textColor={colors.primary}
                            style={styles.forgotButton}
                            labelStyle={styles.forgotButtonLabel}
                        >
                            Forgot Password?
                        </Button>
                    </View>

                    {/* Sign In Button */}
                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.signInButton}
                        contentStyle={styles.signInButtonContent}
                        labelStyle={styles.signInButtonLabel}
                        buttonColor={colors.primary}
                    >
                        Sign In
                    </Button>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.textLight }]}>or continue with</Text>
                        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Social Buttons */}
                    <View style={styles.socialButtons}>
                        <Button
                            mode="outlined"
                            onPress={() => { }}
                            style={[styles.socialButton, { borderColor: colors.border }]}
                            contentStyle={styles.socialButtonContent}
                            labelStyle={[styles.socialButtonLabel, { color: colors.text }]}
                            textColor={colors.text}
                            icon={({ size }) => (
                                <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                            )}
                        >
                            Google
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => { }}
                            style={[styles.socialButton, { borderColor: colors.border }]}
                            contentStyle={styles.socialButtonContent}
                            labelStyle={[styles.socialButtonLabel, { color: colors.text }]}
                            textColor={colors.text}
                            icon={({ size }) => (
                                <MaterialCommunityIcons name="fingerprint" size={20} color={colors.primary} />
                            )}
                        >
                            Biometric
                        </Button>
                    </View>

                    {/* Sign Up Link */}
                    <View style={styles.signUpContainer}>
                        <Text style={[styles.signUpText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                        <Button
                            mode="text"
                            onPress={handleSignUp}
                            textColor={colors.primary}
                            compact
                            labelStyle={styles.signUpLink}
                        >
                            Sign Up
                        </Button>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 44,
        paddingHorizontal: 12,
    },
    backButton: {
        margin: 0,
    },
    themeToggle: {
        margin: 0,
        borderRadius: 12,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    titleSection: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 32,
    },
    logoIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        gap: 10,
    },
    errorBannerText: {
        fontSize: 14,
        flex: 1,
    },
    formSection: {
        marginBottom: 24,
    },
    input: {
        marginBottom: 4,
    },
    inputOutline: {
        borderRadius: 12,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotButtonLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    signInButton: {
        borderRadius: 28,
        marginBottom: 24,
    },
    signInButtonContent: {
        height: 56,
    },
    signInButtonLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    socialButton: {
        flex: 1,
        borderRadius: 14,
    },
    socialButtonContent: {
        height: 52,
    },
    socialButtonLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        fontSize: 15,
    },
    signUpLink: {
        fontSize: 15,
        fontWeight: '600',
    },
});
