/**
 * Signup Screen
 * Clean registration form with proper validation
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
    Alert,
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
import { validateRegisterForm, hasErrors, FormErrors } from '@/utils/validation';

export default function SignupScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const { register, isLoading, error, clearError } = useAuth();

    // Form state
    const [firstName, setFirstName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const handleSignup = useCallback(async () => {
        // Clear any previous auth errors
        clearError();

        // Validate all fields
        const validationErrors = validateRegisterForm(firstName, email, password, confirmPassword);
        setErrors(validationErrors);

        // Mark all fields as touched
        setTouched({
            firstName: true,
            email: true,
            password: true,
            confirmPassword: true,
        });

        if (hasErrors(validationErrors)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Submit registration
        const response = await register({
            firstName: firstName.trim(),
            email: email.trim().toLowerCase(),
            password,
            confirmPassword,
        });

        if (response.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Show success message
            Alert.alert(
                'Registration Successful! 🎉',
                'Your account has been created. Please login to continue.',
                [
                    {
                        text: 'Go to Login',
                        onPress: () => router.replace('/login'),
                    },
                ]
            );
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [firstName, email, password, confirmPassword, register, clearError]);

    /**
     * Navigate to login
     */
    const handleLogin = () => {
        router.push('/login');
    };

    /**
     * Navigate back
     */
    const handleBack = () => {
        router.back();
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
                    <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Start your trading journey today
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

                    {/* First Name */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            onBlur={() => handleBlur('firstName')}
                            mode="outlined"
                            autoCapitalize="words"
                            autoComplete="name"
                            error={!!getFieldError('firstName')}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            left={<TextInput.Icon icon="account" color={colors.textLight} />}
                        />
                        {getFieldError('firstName') && (
                            <HelperText type="error" visible>
                                {getFieldError('firstName')}
                            </HelperText>
                        )}
                    </View>

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

                    {/* Confirm Password */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            label="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            onBlur={() => handleBlur('confirmPassword')}
                            mode="outlined"
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            error={!!getFieldError('confirmPassword')}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            left={<TextInput.Icon icon="lock-check" color={colors.textLight} />}
                            right={
                                <TextInput.Icon
                                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                                    color={colors.textLight}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                />
                            }
                        />
                        {getFieldError('confirmPassword') && (
                            <HelperText type="error" visible>
                                {getFieldError('confirmPassword')}
                            </HelperText>
                        )}
                    </View>

                    {/* Submit Button */}
                    <Button
                        mode="contained"
                        onPress={handleSignup}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.submitButton}
                        contentStyle={styles.submitButtonContent}
                        labelStyle={styles.submitButtonLabel}
                        buttonColor={colors.primary}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>

                    {/* Terms */}
                    <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                        By signing up, you agree to our{' '}
                        <Text style={{ color: colors.primary }}>Terms of Service</Text>
                        {' '}and{' '}
                        <Text style={{ color: colors.primary }}>Privacy Policy</Text>
                    </Text>
                </MotiView>

                {/* Login Link */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 500, delay: 300 }}
                    style={styles.footer}
                >
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Already have an account?{' '}
                    </Text>
                    <Pressable onPress={handleLogin}>
                        <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
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
        marginBottom: 32,
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
    submitButton: {
        marginTop: 16,
        borderRadius: 28,
    },
    submitButtonContent: {
        height: 56,
    },
    submitButtonLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
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
