import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Animated,
    TextInputProps,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { useTheme } from '@/contexts/ThemeContext';

// Icon Components
const MailIcon = ({ color = '#94A3B8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth="2" />
        <Path d="M2 7L12 13L22 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const LockIcon = ({ color = '#94A3B8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="10" width="16" height="12" rx="3" stroke={color} strokeWidth="2" />
        <Path d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="16" r="1.5" fill={color} />
    </Svg>
);

const UserIcon = ({ color = '#94A3B8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
        <Path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const EyeIcon = ({ color = '#94A3B8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke={color} strokeWidth="2" />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    </Svg>
);

const EyeOffIcon = ({ color = '#94A3B8', size = 20 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M2 12C2 12 5 19 12 19C19 19 22 12 22 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4 4L20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

// Icon map for easy access
const IconMap = {
    mail: MailIcon,
    lock: LockIcon,
    user: UserIcon,
} as const;

type IconType = keyof typeof IconMap;

interface FloatingLabelInputProps extends Omit<TextInputProps, 'placeholder'> {
    label: string;
    icon?: IconType;
    error?: string;
    secureTextEntry?: boolean;
}

export default function FloatingLabelInput({
    label,
    icon,
    error,
    value = '',
    onChangeText,
    onFocus,
    onBlur,
    secureTextEntry,
    ...props
}: FloatingLabelInputProps) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    const hasValue = value && value.length > 0;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isFocused || hasValue ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isFocused, hasValue, animatedValue]);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    // Animated styles for the floating label
    const labelStyle = {
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [18, -10],
        }),
        left: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [icon ? 48 : 16, 12],
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.textSecondary, isFocused ? colors.primary : error ? colors.error : colors.textLight],
        }),
        backgroundColor: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', colors.background === '#0D1117' ? '#0D1117' : colors.surface],
        }),
        paddingHorizontal: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 6],
        }),
    };

    const IconComponent = icon ? IconMap[icon] : null;
    const iconColor = isFocused ? colors.primary : error ? colors.error : colors.textLight;

    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.container,
                    isFocused && [styles.containerFocused, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }],
                    error && [styles.containerError, { borderColor: colors.error, backgroundColor: `${colors.error}10` }],
                    { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
            >
                {/* Icon */}
                {IconComponent && (
                    <View style={styles.iconContainer}>
                        <IconComponent color={iconColor} size={20} />
                    </View>
                )}

                {/* Floating Label */}
                <Animated.Text
                    style={[
                        styles.label,
                        labelStyle,
                    ]}
                    pointerEvents="none"
                >
                    {label}
                </Animated.Text>

                {/* Input Field */}
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.text },
                        icon && styles.inputWithIcon,
                        secureTextEntry && styles.inputWithEye,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={secureTextEntry && !showPassword}
                    placeholderTextColor="transparent"
                    {...props}
                />

                {/* Password Toggle */}
                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                    >
                        {showPassword ? (
                            <EyeOffIcon color={colors.textLight} size={20} />
                        ) : (
                            <EyeIcon color={colors.textLight} size={20} />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Error Message */}
            {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        height: 58,
        position: 'relative',
    },
    containerFocused: {
    },
    containerError: {
    },
    iconContainer: {
        paddingLeft: 16,
    },
    label: {
        position: 'absolute',
        fontWeight: '500',
        zIndex: 1,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    inputWithIcon: {
        paddingLeft: 12,
    },
    inputWithEye: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    errorText: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
});
