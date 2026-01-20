/**
 * Login Screen
 * Clean login form with proper validation
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { TextInput, Button, IconButton, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

// Theme
import { useTheme } from '@/contexts/ThemeContext';

// Auth
import { useAuth } from '@/contexts/AuthContext';

// Validation
import { validateLoginForm, hasErrors, FormErrors } from '@/utils/validation';

export default function LoginScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const { login, isLoading, error, clearError } = useAuth();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    /**
     * Handle field blur - mark field as touched for validation display
     */
    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    /**
     * Validate form and submit
     */
    const handleLogin = useCallback(async () => {
        // Clear any previous auth errors
        clearError();

        // Validate all fields
        const validationErrors = validateLoginForm(email, password);
        setErrors(validationErrors);

        // Mark all fields as touched
        setTouched({
            email: true,
            password: true,
        });

        if (hasErrors(validationErrors)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Submit login
        const response = await login({
            email: email.trim().toLowerCase(),
            password,
        });

        if (response.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Navigation is handled by AuthContext
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [email, password, login, clearError]);

    /**
     * Navigate to signup
     */
    const handleSignUp = () => {
        router.push('/signup');
    };

    /**
     * Navigate back
     */
    const handleBack = () => {
        router.back();
    };

    /**
     * Forgot password handler
     */
    const handleForgotPassword = () => {
        // TODO: Navigate to forgot password screen
        // router.push('/forgot-password');
    };

    /**
     * Get error message for a field (only if touched)
     */
    const getFieldError = (field: string): string | undefined => {
        return touched[field] ? errors[field] : undefined;
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500 }}
                >
                    <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Sign in to continue trading
                    </Text>
                </MotiView>

                {/* Form */}
                <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500, delay: 100 }}
                    style={styles.form}
                >
                    {/* Auth Error Display */}
                    {error && (
                        <View style={[styles.errorBanner, { backgroundColor: `${colors.error}15` }]}>
                            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
                            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
                        </View>
                    )}

                    {/* Email */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            onBlur={() => handleBlur('email')}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            error={!!getFieldError('email')}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            left={<TextInput.Icon icon="email" color={colors.textLight} />}
                        />
                        {getFieldError('email') && (
                            <HelperText type="error" visible>
                                {getFieldError('email')}
                            </HelperText>
                        )}
                    </View>

                    {/* Password */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            onBlur={() => handleBlur('password')}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            error={!!getFieldError('password')}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            left={<TextInput.Icon icon="lock" color={colors.textLight} />}
                            right={
                                <TextInput.Icon
                                    icon={showPassword ? 'eye-off' : 'eye'}
                                    color={colors.textLight}
                                    onPress={() => setShowPassword(!showPassword)}
                                />
                            }
                        />
                        {getFieldError('password') && (
                            <HelperText type="error" visible>
                                {getFieldError('password')}
                            </HelperText>
                        )}
                    </View>

                    {/* Forgot Password */}
                    <Pressable onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
                        <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                            Forgot Password?
                        </Text>
                    </Pressable>

                    {/* Submit Button */}
                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.submitButton}
                        contentStyle={styles.submitButtonContent}
                        labelStyle={styles.submitButtonLabel}
                        buttonColor={colors.primary}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.textLight }]}>OR</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Social Login Placeholder */}
                    <Button
                        mode="outlined"
                        onPress={() => { }}
                        style={styles.socialButton}
                        contentStyle={styles.socialButtonContent}
                        labelStyle={[styles.socialButtonLabel, { color: colors.text }]}
                        icon={({ color }) => (
                            <MaterialCommunityIcons name="google" size={20} color={colors.text} />
                        )}
                    >
                        Continue with Google
                    </Button>
                </MotiView>

                {/* Signup Link */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 500, delay: 300 }}
                    style={styles.footer}
                >
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Don't have an account?{' '}
                    </Text>
                    <Pressable onPress={handleSignUp}>
                        <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
                    </Pressable>
                </MotiView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 44,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    backButton: {
        margin: 0,
    },
    themeToggle: {
        margin: 0,
        borderRadius: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 40,
    },
    form: {
        gap: 4,
    },
    inputContainer: {
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 14,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 16,
        paddingVertical: 4,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
    },
    submitButton: {
        borderRadius: 28,
    },
    submitButtonContent: {
        height: 56,
    },
    submitButtonLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
    },
    socialButton: {
        borderRadius: 28,
        borderColor: '#DDD',
    },
    socialButtonContent: {
        height: 52,
    },
    socialButtonLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 15,
    },
    footerLink: {
        fontSize: 15,
        fontWeight: '600',
    },
});
