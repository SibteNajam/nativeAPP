import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Circle, Rect, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

interface AuthIllustrationProps {
    size?: number;
    isShaking?: boolean;
}

/**
 * Beautiful authentication illustration with floating animation
 * Clean modern design with lock, shield and user elements
 */
export default function AuthIllustration({ size = 280, isShaking = false }: AuthIllustrationProps) {
    const { colors } = useTheme();
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Floating animation container */}
            <MotiView
                from={{ translateY: 0 }}
                animate={{
                    translateY: isShaking ? 0 : -10,
                    translateX: isShaking ? [-6, 6, -6, 6, 0] : 0,
                }}
                transition={{
                    translateY: {
                        type: 'timing',
                        duration: 2500,
                        loop: true,
                        repeatReverse: true,
                    },
                    translateX: {
                        type: 'timing',
                        duration: 400,
                    }
                }}
                style={styles.svgContainer}
            >
                <Svg width={size} height={size} viewBox="0 0 280 280">
                    <Defs>
                        <LinearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.15" />
                            <Stop offset="50%" stopColor={colors.accent} stopOpacity="0.1" />
                            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
                        </LinearGradient>
                        <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primaryLight} />
                            <Stop offset="100%" stopColor={colors.primary} />
                        </LinearGradient>
                        <LinearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.warning} />
                            <Stop offset="100%" stopColor={colors.warning} stopOpacity={0.8} />
                        </LinearGradient>
                        <LinearGradient id="phoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor={colors.surface} />
                            <Stop offset="100%" stopColor={colors.background} />
                        </LinearGradient>
                        <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.success} />
                            <Stop offset="100%" stopColor={colors.success} stopOpacity={0.7} />
                        </LinearGradient>
                    </Defs>

                    {/* Background glow circles */}
                    <Circle cx="140" cy="140" r="130" fill="url(#bgGlow)" />
                    <Circle cx="140" cy="140" r="95" fill={`${colors.primary}15`} />
                    <Circle cx="140" cy="140" r="60" fill={`${colors.accent}0D`} />

                    {/* Phone/Device */}
                    <G transform="translate(90, 55)">
                        {/* Phone body */}
                        <Rect x="0" y="0" width="100" height="170" rx="16" fill="url(#phoneGrad)" />
                        <Rect x="4" y="4" width="92" height="162" rx="12" fill={colors.surface} />

                        {/* Screen */}
                        <Rect x="8" y="20" width="84" height="130" rx="4" fill={colors.background} />

                        {/* Screen content - User avatar */}
                        <Circle cx="50" cy="65" r="22" fill={`${colors.primary}33`} />
                        <Circle cx="50" cy="60" r="10" fill={colors.primary} />
                        <Path d="M32 85 Q32 72 50 72 Q68 72 68 85" fill={colors.primary} />

                        {/* Input fields on screen */}
                        <Rect x="18" y="100" width="64" height="12" rx="4" fill="rgba(255,255,255,0.1)" />
                        <Rect x="18" y="118" width="64" height="12" rx="4" fill="rgba(255,255,255,0.1)" />

                        {/* Login button */}
                        <Rect x="18" y="136" width="64" height="10" rx="5" fill="url(#shieldGrad)" />

                        {/* Camera notch */}
                        <Circle cx="50" cy="10" r="3" fill={colors.border} />

                        {/* Home indicator */}
                        <Rect x="35" y="158" width="30" height="4" rx="2" fill={colors.border} />
                    </G>

                    {/* Floating Shield with Lock - Top right */}
                    <G transform="translate(175, 35)">
                        {/* Shield background */}
                        <Path
                            d="M30 5 L55 15 L55 40 C55 55 30 70 30 70 C30 70 5 55 5 40 L5 15 Z"
                            fill="url(#shieldGrad)"
                        />
                        {/* Shield highlight */}
                        <Path
                            d="M30 10 L50 18 L50 38 C50 50 30 62 30 62"
                            fill="none"
                            stroke={colors.textLight}
                            strokeOpacity={0.3}
                            strokeWidth="2"
                        />
                        {/* Lock on shield */}
                        <Rect x="22" y="32" width="16" height="14" rx="3" fill="url(#lockGrad)" />
                        <Path
                            d="M26 32 L26 28 C26 23 30 21 34 28 L34 32"
                            fill="none"
                            stroke={colors.warning}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </G>

                    {/* Verification checkmark - Left side */}
                    <G transform="translate(20, 100)">
                        <Circle cx="25" cy="25" r="22" fill="url(#greenGrad)" />
                        <Path
                            d="M15 25 L22 32 L35 18"
                            fill="none"
                            stroke={colors.textOnPrimary}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </G>

                    {/* Fingerprint icon - Bottom left */}
                    <G transform="translate(35, 185)">
                        <Circle cx="20" cy="20" r="18" fill={`${colors.accent}33`} />
                        <G stroke={colors.accent} strokeWidth="2" fill="none">
                            <Path d="M15 20 Q15 13 20 13 Q25 13 25 20" />
                            <Path d="M12 22 Q12 10 20 10 Q28 10 28 22" />
                            <Path d="M9 24 Q9 7 20 7 Q31 7 31 24" />
                            <Path d="M20 20 L20 28" strokeLinecap="round" />
                        </G>
                    </G>

                    {/* Key icon - Bottom right */}
                    <G transform="translate(195, 190)">
                        <Circle cx="20" cy="20" r="18" fill={`${colors.warning}33`} />
                        <Circle cx="16" cy="16" r="6" stroke={colors.warning} strokeWidth="3" fill="none" />
                        <Path d="M20 20 L30 30" stroke={colors.warning} strokeWidth="3" strokeLinecap="round" />
                        <Path d="M26 26 L28 24" stroke={colors.warning} strokeWidth="3" strokeLinecap="round" />
                        <Path d="M28 28 L30 26" stroke={colors.warning} strokeWidth="3" strokeLinecap="round" />
                    </G>

                    {/* Floating dots decoration */}
                    <Circle cx="60" cy="50" r="5" fill={colors.primary} opacity="0.4" />
                    <Circle cx="230" cy="130" r="4" fill={colors.accent} opacity="0.5" />
                    <Circle cx="45" cy="170" r="3" fill={colors.success} opacity="0.6" />
                    <Circle cx="240" cy="200" r="6" fill={colors.warning} opacity="0.3" />
                    <Circle cx="80" cy="240" r="4" fill={colors.primary} opacity="0.4" />
                    <Circle cx="200" cy="250" r="5" fill={colors.accent} opacity="0.3" />

                    {/* Connection lines */}
                    <Path
                        d="M70 125 L90 125"
                        stroke={colors.success}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        opacity="0.5"
                    />
                    <Path
                        d="M190 90 L205 70"
                        stroke={colors.primary}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        opacity="0.5"
                    />
                </Svg>
            </MotiView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    svgContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
