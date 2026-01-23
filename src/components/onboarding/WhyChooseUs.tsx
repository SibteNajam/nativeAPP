/**
 * Why Choose Us Component
 * Highlights key differentiators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface Reason {
    icon: string;
    title: string;
    description: string;
    color: string;
    stat: string;
}

export default function WhyChooseUs() {
    const { colors, isDark } = useTheme();

    const reasons: Reason[] = [
        {
            icon: 'brain',
            title: 'Advanced AI',
            description: 'Powered by machine learning trained on millions of trades',
            color: colors.primary,
            stat: '94.7%',
        },
        {
            icon: 'shield-check',
            title: 'Bank-Level Security',
            description: 'Military-grade encryption keeps your funds safe',
            color: colors.success,
            stat: '100%',
        },
        {
            icon: 'lightning-bolt',
            title: 'Lightning Fast',
            description: 'Execute trades in milliseconds, never miss an opportunity',
            color: colors.warning,
            stat: '<50ms',
        },
        {
            icon: 'account-group',
            title: 'Trusted Community',
            description: 'Join 50,000+ traders making consistent profits',
            color: colors.accent,
            stat: '50K+',
        },
    ];

    return (
        <View style={styles.container}>
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600 }}
            >
                <Text style={[styles.title, { color: colors.text }]}>
                    Why Traders Choose Us
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    The smartest way to automate your trading
                </Text>
            </MotiView>

            <View style={styles.reasonsGrid}>
                {reasons.map((reason, index) => (
                    <MotiView
                        key={reason.title}
                        from={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            type: 'spring',
                            delay: index * 100,
                            damping: 12,
                        }}
                        style={styles.reasonWrapper}
                    >
                        <Surface
                            style={[styles.reasonCard, { backgroundColor: colors.surface }]}
                            elevation={1}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: `${reason.color}${isDark ? '25' : '15'}` },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={reason.icon as any}
                                    size={28}
                                    color={reason.color}
                                />
                            </View>

                            <View
                                style={[
                                    styles.statBadge,
                                    { backgroundColor: `${reason.color}${isDark ? '20' : '10'}` },
                                ]}
                            >
                                <Text style={[styles.statText, { color: reason.color }]}>
                                    {reason.stat}
                                </Text>
                            </View>

                            <Text style={[styles.reasonTitle, { color: colors.text }]}>
                                {reason.title}
                            </Text>
                            <Text
                                style={[
                                    styles.reasonDescription,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                {reason.description}
                            </Text>
                        </Surface>
                    </MotiView>
                ))}
            </View>

            {/* Trust Indicators */}
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 600, delay: 500 }}
            >
                <Surface
                    style={[
                        styles.trustBar,
                        { backgroundColor: `${colors.success}${isDark ? '15' : '08'}` },
                    ]}
                    elevation={0}
                >
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons
                            name="shield-star"
                            size={20}
                            color={colors.success}
                        />
                        <Text style={[styles.trustText, { color: colors.text }]}>
                            SOC 2 Certified
                        </Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons
                            name="lock-check"
                            size={20}
                            color={colors.success}
                        />
                        <Text style={[styles.trustText, { color: colors.text }]}>
                            256-bit Encryption
                        </Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons
                            name="heart-pulse"
                            size={20}
                            color={colors.success}
                        />
                        <Text style={[styles.trustText, { color: colors.text }]}>
                            99.9% Uptime
                        </Text>
                    </View>
                </Surface>
            </MotiView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
    },
    reasonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    reasonWrapper: {
        width: '48%',
    },
    reasonCard: {
        borderRadius: 16,
        padding: 16,
        minHeight: 180,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    statText: {
        fontSize: 13,
        fontWeight: '800',
    },
    reasonTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    reasonDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    trustBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 16,
        borderRadius: 16,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trustText: {
        fontSize: 12,
        fontWeight: '600',
    },
    trustDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(128, 128, 128, 0.2)',
    },
});
