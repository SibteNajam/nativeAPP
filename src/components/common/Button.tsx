import React, { useCallback } from 'react';
import {
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    View,
    useColorScheme,
} from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';

type ButtonVariant = 'gradient' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
}

export default function Button({
    title,
    onPress,
    variant = 'gradient',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = true,
    hapticFeedback = 'medium',
}: ButtonProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handlePress = useCallback(() => {
        if (disabled || loading) return;

        if (hapticFeedback !== 'none') {
            const feedbackStyle = {
                light: Haptics.ImpactFeedbackStyle.Light,
                medium: Haptics.ImpactFeedbackStyle.Medium,
                heavy: Haptics.ImpactFeedbackStyle.Heavy,
            }[hapticFeedback];
            Haptics.impactAsync(feedbackStyle);
        }

        onPress();
    }, [disabled, loading, hapticFeedback, onPress]);

    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return {
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.md,
                    fontSize: Typography.sm,
                    iconSize: 16,
                    height: 40,
                };
            case 'lg':
                return {
                    paddingVertical: Spacing.lg,
                    paddingHorizontal: Spacing.xl,
                    fontSize: Typography.lg,
                    iconSize: 22,
                    height: 60,
                };
            default:
                return {
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    fontSize: Typography.base,
                    iconSize: 20,
                    height: 56,
                };
        }
    };

    const sizeStyles = getSizeStyles();
    const isDisabled = disabled || loading;

    const renderContent = () => {
        const textColor = variant === 'outline' || variant === 'ghost' || variant === 'text'
            ? (isDark ? Colors.primaryLight : Colors.primary)
            : Colors.textLight;

        return (
            <View style={styles.contentContainer}>
                {loading ? (
                    <ActivityIndicator color={textColor} size="small" />
                ) : (
                    <>
                        {Icon && iconPosition === 'left' && (
                            <Icon
                                size={sizeStyles.iconSize}
                                color={textColor}
                                strokeWidth={2}
                                style={{ marginRight: Spacing.sm }}
                            />
                        )}
                        <Text
                            style={[
                                styles.text,
                                { fontSize: sizeStyles.fontSize, color: textColor },
                                isDisabled && styles.textDisabled,
                            ]}
                        >
                            {title}
                        </Text>
                        {Icon && iconPosition === 'right' && (
                            <Icon
                                size={sizeStyles.iconSize}
                                color={textColor}
                                strokeWidth={2}
                                style={{ marginLeft: Spacing.sm }}
                            />
                        )}
                    </>
                )}
            </View>
        );
    };

    const getOutlineStyles = () => ({
        borderWidth: 1.5,
        borderColor: isDark ? Colors.primaryLight : Colors.primary,
        backgroundColor: 'transparent',
    });

    const getGhostStyles = () => ({
        backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceMuted,
    });

    const getSecondaryStyles = () => ({
        backgroundColor: isDark ? Colors.bgDark : Colors.cream,
        borderWidth: 1,
        borderColor: isDark ? Colors.borderDark : Colors.borderLight,
    });

    if (variant === 'gradient') {
        return (
            <MotiView
                from={{ scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
            >
                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={0.9}
                    disabled={isDisabled}
                    style={[fullWidth && styles.fullWidth]}
                >
                    <MotiView
                        animate={{
                            scale: isDisabled ? 1 : 1,
                            opacity: isDisabled ? 0.5 : 1,
                        }}
                    >
                        <LinearGradient
                            colors={isDark ? ['#5A9DE8', '#7B8FE8'] : ['#4A90D9', '#6B7FD9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.button,
                                { height: sizeStyles.height },
                                Shadows.md,
                            ]}
                        >
                            {renderContent()}
                        </LinearGradient>
                    </MotiView>
                </TouchableOpacity>
            </MotiView>
        );
    }

    if (variant === 'text') {
        return (
            <TouchableOpacity
                onPress={handlePress}
                disabled={isDisabled}
                style={[styles.textButton, fullWidth && styles.fullWidth]}
                activeOpacity={0.7}
            >
                <MotiView
                    animate={{
                        opacity: isDisabled ? 0.5 : 1,
                    }}
                >
                    {renderContent()}
                </MotiView>
            </TouchableOpacity>
        );
    }

    return (
        <MotiView
            from={{ scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
        >
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.8}
                disabled={isDisabled}
                style={[fullWidth && styles.fullWidth]}
            >
                <MotiView
                    animate={{
                        opacity: isDisabled ? 0.5 : 1,
                    }}
                    style={[
                        styles.button,
                        { height: sizeStyles.height },
                        variant === 'primary' && styles.primaryButton,
                        variant === 'secondary' && getSecondaryStyles(),
                        variant === 'outline' && getOutlineStyles(),
                        variant === 'ghost' && getGhostStyles(),
                        !isDisabled && variant !== 'outline' && variant !== 'ghost' && Shadows.sm,
                    ]}
                >
                    {renderContent()}
                </MotiView>
            </TouchableOpacity>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: Typography.semibold,
        letterSpacing: 0.5,
    },
    textDisabled: {
        opacity: 0.7,
    },
    textButton: {
        padding: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
});
