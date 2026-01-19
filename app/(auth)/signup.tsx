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
    HelperText,
    ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import theme hook
import { useTheme } from '@/contexts/ThemeContext';

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

export default function SignupScreen() {
    const { colors, isDark, toggleTheme } = useTheme();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const getPasswordStrength = (pass: string): PasswordStrength => {
        if (pass.length < 6) return 'weak';
        if (pass.length < 10 || !/[A-Z]/.test(pass) || !/[0-9]/.test(pass)) return 'medium';
        return 'strong';
    };

    const passwordStrength = getPasswordStrength(password);

    const getStrengthInfo = () => {
        switch (passwordStrength) {
            case 'weak': return { progress: 0.33, color: colors.error, label: 'Weak' };
            case 'medium': return { progress: 0.66, color: colors.warning, label: 'Medium' };
            case 'strong': return { progress: 1, color: colors.success, label: 'Strong' };
        }
    };

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

    const handleSignup = useCallback(async () => {
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
            setErrors({ general: 'Something went wrong. Please try again.' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    }, [name, email, password, confirmPassword]);

    const handleBack = () => {
        router.back();
    };

    const handleSignIn = () => {
        router.push('/login');
    };

    const strengthInfo = getStrengthInfo();

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
                    {/* Title */}
                    <View style={styles.titleSection}>
                        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your trading journey today</Text>
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
                            label="Full Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            autoCapitalize="words"
                            autoComplete="name"
                            error={!!errors.name}
                            left={<TextInput.Icon icon="account-outline" color={colors.textLight} />}
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            outlineStyle={styles.inputOutline}
                        />
                        {errors.name && (
                            <HelperText type="error" visible={!!errors.name}>
                                {errors.name}
                            </HelperText>
                        )}

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
                            autoComplete="new-password"
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

                        {/* Password Strength */}
                        {password.length > 0 && (
                            <View style={styles.strengthContainer}>
                                <ProgressBar
                                    progress={strengthInfo.progress}
                                    color={strengthInfo.color}
                                    style={[styles.strengthBar, { backgroundColor: colors.border }]}
                                />
                                <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                                    {strengthInfo.label} password
                                </Text>
                            </View>
                        )}

                        {errors.password && (
                            <HelperText type="error" visible={!!errors.password}>
                                {errors.password}
                            </HelperText>
                        )}

                        <TextInput
                            label="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            mode="outlined"
                            secureTextEntry={!showConfirmPassword}
                            autoComplete="new-password"
                            error={!!errors.confirmPassword}
                            left={<TextInput.Icon icon="lock-check-outline" color={colors.textLight} />}
                            right={
                                <TextInput.Icon
                                    icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    color={colors.textLight}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                />
                            }
                            style={[styles.input, { backgroundColor: colors.surface }]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            outlineStyle={styles.inputOutline}
                        />
                        {errors.confirmPassword && (
                            <HelperText type="error" visible={!!errors.confirmPassword}>
                                {errors.confirmPassword}
                            </HelperText>
                        )}
                    </View>

                    {/* Sign Up Button */}
                    <Button
                        mode="contained"
                        onPress={handleSignup}
                        loading={isLoading}
                        disabled={isLoading}
                        style={styles.signUpButton}
                        contentStyle={styles.signUpButtonContent}
                        labelStyle={styles.signUpButtonLabel}
                        buttonColor={colors.primary}
                    >
                        Create Account
                    </Button>

                    {/* Terms */}
                    <Text style={[styles.termsText, { color: colors.textLight }]}>
                        By signing up, you agree to our{' '}
                        <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text>
                        {' '}and{' '}
                        <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>
                    </Text>

                    {/* Sign In Link */}
                    <View style={styles.signInContainer}>
                        <Text style={[styles.signInText, { color: colors.textSecondary }]}>Already have an account? </Text>
                        <Button
                            mode="text"
                            onPress={handleSignIn}
                            textColor={colors.primary}
                            compact
                            labelStyle={styles.signInLink}
                        >
                            Sign In
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
        marginTop: 16,
        marginBottom: 28,
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
    strengthContainer: {
        marginTop: 4,
        marginBottom: 8,
    },
    strengthBar: {
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
    },
    signUpButton: {
        borderRadius: 28,
        marginBottom: 16,
    },
    signUpButtonContent: {
        height: 56,
    },
    signUpButtonLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 24,
    },
    termsLink: {
        fontWeight: '500',
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 15,
    },
    signInLink: {
        fontSize: 15,
        fontWeight: '600',
    },
});
