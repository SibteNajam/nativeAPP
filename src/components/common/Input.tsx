import React, { useState, useCallback } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    placeholder?: string;
    icon?: LucideIcon;
    error?: string;
    secureTextEntry?: boolean;
}

export default function Input({
    label,
    placeholder,
    icon: Icon,
    error,
    secureTextEntry,
    value,
    onChangeText,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleFocus = useCallback((e: any) => {
        setIsFocused(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    }, [onBlur]);

    const togglePassword = useCallback(() => {
        setShowPassword(prev => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const hasError = !!error;
    const isSecure = secureTextEntry && !showPassword;

    // Dynamic styles based on state
    const getBorderColor = () => {
        if (hasError) return Colors.danger;
        if (isFocused) return Colors.primary;
        return isDark ? Colors.borderDark : Colors.borderLight;
    };

    const getBackgroundColor = () => {
        if (isDark) {
            return isFocused ? Colors.surfaceDarkHover : Colors.surfaceDark;
        }
        return isFocused ? Colors.creamLight : Colors.surfaceLight;
    };

    return (
        <View style={styles.container}>
            {label && (
                <MotiView
                    from={{ opacity: 0, translateY: -5 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 200 }}
                >
                    <Text style={[
                        styles.label,
                        { color: isDark ? Colors.textLight : Colors.textPrimary }
                    ]}>
                        {label}
                    </Text>
                </MotiView>
            )}

            <MotiView
                animate={{
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor(),
                    scale: isFocused ? 1.01 : 1,
                }}
                transition={{
                    type: 'timing',
                    duration: 200,
                }}
                style={[
                    styles.inputContainer,
                    hasError && styles.inputError,
                ]}
            >
                {Icon && (
                    <MotiView
                        animate={{
                            scale: isFocused ? 1.1 : 1,
                        }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <Icon
                            size={20}
                            color={hasError ? Colors.danger : (isFocused ? Colors.primary : Colors.textMuted)}
                            strokeWidth={1.5}
                        />
                    </MotiView>
                )}

                <TextInput
                    style={[
                        styles.input,
                        { color: isDark ? Colors.textLight : Colors.textPrimary },
                        Icon && styles.inputWithIcon,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isSecure}
                    autoCapitalize={props.autoCapitalize || 'none'}
                    {...props}
                />

                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={togglePassword}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MotiView
                            animate={{ rotate: showPassword ? '180deg' : '0deg' }}
                            transition={{ type: 'timing', duration: 200 }}
                        >
                            {showPassword ? (
                                <EyeOff size={20} color={Colors.textMuted} strokeWidth={1.5} />
                            ) : (
                                <Eye size={20} color={Colors.textMuted} strokeWidth={1.5} />
                            )}
                        </MotiView>
                    </TouchableOpacity>
                )}
            </MotiView>

            {hasError && (
                <MotiView
                    from={{ opacity: 0, translateY: -5 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 200 }}
                >
                    <Text style={styles.errorText}>{error}</Text>
                </MotiView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.sm,
        fontWeight: Typography.medium,
        marginBottom: Spacing.sm,
        letterSpacing: 0.3,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        minHeight: 56,
        gap: Spacing.sm,
    },
    inputError: {
        borderColor: Colors.danger,
    },
    input: {
        flex: 1,
        fontSize: Typography.base,
        fontWeight: Typography.regular,
        padding: 0,
        margin: 0,
    },
    inputWithIcon: {
        marginLeft: Spacing.xs,
    },
    errorText: {
        color: Colors.danger,
        fontSize: Typography.xs,
        marginTop: Spacing.xs,
        marginLeft: Spacing.xs,
    },
});
