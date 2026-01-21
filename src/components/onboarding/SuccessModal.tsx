/**
 * Success Modal Component
 * Shows animated success popup after onboarding
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface SuccessModalProps {
    visible: boolean;
    onContinue: () => void;
}

export default function SuccessModal({ visible, onContinue }: SuccessModalProps) {
    const { colors, isDark } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={[styles.overlay, { backgroundColor: `${colors.background}E6` }]}>
                <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                        type: 'spring', 
                        damping: 20,
                        stiffness: 200,
                    }}
                    style={styles.container}
                >
                    <Surface
                        style={[styles.card, { backgroundColor: colors.surface }]}
                        elevation={5}
                    >
                        {/* Success Animation */}
                        <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: 'spring',
                                damping: 18,
                                stiffness: 150,
                                delay: 100,
                            }}
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: `${colors.success}20`,
                                },
                            ]}
                        >
                            <MotiView
                                from={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    damping: 15,
                                    delay: 300,
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={80}
                                    color={colors.success}
                                />
                            </MotiView>
                        </MotiView>

                        {/* Confetti-like particles */}
                        {[...Array(8)].map((_, i) => {
                            const angle = (i * 45 * Math.PI) / 180;
                            const distance = 100;
                            return (
                                <MotiView
                                    key={i}
                                    from={{
                                        translateX: 0,
                                        translateY: 0,
                                        opacity: 0,
                                        scale: 0,
                                    }}
                                    animate={{
                                        translateX: Math.cos(angle) * distance,
                                        translateY: Math.sin(angle) * distance,
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0.5],
                                    }}
                                    transition={{
                                        type: 'spring',
                                        damping: 15,
                                        stiffness: 100,
                                        delay: 500 + i * 40,
                                    }}
                                    style={[
                                        styles.particle,
                                        {
                                            backgroundColor:
                                                i % 3 === 0
                                                    ? colors.primary
                                                    : i % 3 === 1
                                                    ? colors.success
                                                    : colors.accent,
                                        },
                                    ]}
                                />
                            );
                        })}

                        {/* Text Content */}
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ 
                                type: 'spring', 
                                damping: 20,
                                delay: 600,
                            }}
                        >
                            <Text style={[styles.title, { color: colors.text }]}>
                                Welcome to ByteBoom!
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Create your account to start automated trading
                            </Text>
                        </MotiView>

                        {/* Stats Row */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                                type: 'spring', 
                                damping: 20,
                                delay: 900,
                            }}
                            style={styles.statsRow}
                        >
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.success }]}>
                                    24/7
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                    Trading
                                </Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>
                                    AI
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                    Powered
                                </Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.accent }]}>
                                    0%
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                    Fees
                                </Text>
                            </View>
                        </MotiView>

                        {/* CTA Button */}
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ 
                                type: 'spring', 
                                damping: 20,
                                delay: 1200,
                            }}
                        >
                            <Pressable
                                onPress={onContinue}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.8 : 1,
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="rocket-launch"
                                    size={24}
                                    color="#fff"
                                />
                                <Text style={styles.buttonText}>Sign Up Now</Text>
                                <MaterialCommunityIcons
                                    name="arrow-right"
                                    size={24}
                                    color="#fff"
                                />
                            </Pressable>
                        </MotiView>

                        {/* Trust Badge */}
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ 
                                type: 'timing', 
                                duration: 400, 
                                delay: 1500,
                            }}
                            style={styles.trustBadge}
                        >
                            <MaterialCommunityIcons
                                name="shield-check"
                                size={14}
                                color={colors.success}
                            />
                            <Text style={[styles.trustText, { color: colors.textLight }]}>
                                Bank-grade security • Encrypted
                            </Text>
                        </MotiView>
                    </Surface>
                </MotiView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
    },
    card: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    particle: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        top: 102,
        left: '50%',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        width: '100%',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        width: 1,
        height: 40,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
    },
    trustText: {
        fontSize: 12,
    },
});
