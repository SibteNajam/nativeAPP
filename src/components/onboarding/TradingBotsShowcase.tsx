/**
 * Trading Bots Showcase
 * Display available bot strategies
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface Bot {
    id: string;
    name: string;
    icon: string;
    strategy: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    avgReturn: string;
    winRate: string;
    color: string;
    badge?: string;
}

export default function TradingBotsShowcase() {
    const { colors, isDark } = useTheme();

    const bots: Bot[] = [
        {
            id: 'conservative',
            name: 'Conservative Trader',
            icon: 'shield-check',
            strategy: 'DCA + Trend Following',
            riskLevel: 'Low',
            avgReturn: '8-12%',
            winRate: '89%',
            color: colors.success,
            badge: 'Best for Beginners',
        },
        {
            id: 'aggressive',
            name: 'Aggressive Scalper',
            icon: 'lightning-bolt',
            strategy: 'Scalping + Mean Reversion',
            riskLevel: 'High',
            avgReturn: '20-35%',
            winRate: '76%',
            color: colors.warning,
            badge: 'High Frequency',
        },
        {
            id: 'balanced',
            name: 'Balanced Growth',
            icon: 'scale-balance',
            strategy: 'Swing Trading + MA Crossover',
            riskLevel: 'Medium',
            avgReturn: '12-18%',
            winRate: '82%',
            color: colors.primary,
            badge: 'Most Popular',
        },
        {
            id: 'arbitrage',
            name: 'Arbitrage Hunter',
            icon: 'swap-horizontal-bold',
            strategy: 'Cross-Exchange Arbitrage',
            riskLevel: 'Low',
            avgReturn: '5-8%',
            winRate: '95%',
            color: colors.info,
            badge: 'Low Risk',
        },
    ];

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low':
                return colors.success;
            case 'Medium':
                return colors.warning;
            case 'High':
                return colors.error;
            default:
                return colors.text;
        }
    };

    return (
        <View style={styles.container}>
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600 }}
            >
                <Text style={[styles.title, { color: colors.text }]}>
                    Our Trading Bots
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    4 proven strategies powered by advanced AI algorithms
                </Text>
            </MotiView>

            <View style={styles.botsGrid}>
                {bots.map((bot, index) => (
                    <MotiView
                        key={bot.id}
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            type: 'spring',
                            delay: index * 120,
                            damping: 14,
                        }}
                    >
                        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                            <Surface
                                style={[
                                    styles.botCard,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor:
                                            bot.badge === 'Most Popular'
                                                ? bot.color
                                                : colors.border,
                                        borderWidth: bot.badge === 'Most Popular' ? 2 : 1,
                                    },
                                ]}
                                elevation={bot.badge === 'Most Popular' ? 3 : 1}
                            >
                                {bot.badge && (
                                    <View
                                        style={[
                                            styles.badge,
                                            { backgroundColor: bot.color },
                                        ]}
                                    >
                                        <Text style={styles.badgeText}>{bot.badge}</Text>
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.iconContainer,
                                        {
                                            backgroundColor: `${bot.color}${isDark ? '25' : '15'}`,
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={bot.icon as any}
                                        size={32}
                                        color={bot.color}
                                    />
                                </View>

                                <Text style={[styles.botName, { color: colors.text }]}>
                                    {bot.name}
                                </Text>
                                <Text
                                    style={[styles.strategy, { color: colors.textSecondary }]}
                                >
                                    {bot.strategy}
                                </Text>

                                <View style={styles.statsContainer}>
                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                            Risk Level
                                        </Text>
                                        <View style={styles.riskBadge}>
                                            <View
                                                style={[
                                                    styles.riskDot,
                                                    {
                                                        backgroundColor: getRiskColor(
                                                            bot.riskLevel
                                                        ),
                                                    },
                                                ]}
                                            />
                                            <Text
                                                style={[
                                                    styles.statValue,
                                                    { color: getRiskColor(bot.riskLevel) },
                                                ]}
                                            >
                                                {bot.riskLevel}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                            Avg Return
                                        </Text>
                                        <Text
                                            style={[styles.statValue, { color: bot.color }]}
                                        >
                                            {bot.avgReturn}
                                        </Text>
                                    </View>

                                    <View style={styles.statRow}>
                                        <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                            Win Rate
                                        </Text>
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: colors.success },
                                            ]}
                                        >
                                            {bot.winRate}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.activeBadge, { backgroundColor: `${bot.color}15` }]}>
                                    <View style={[styles.activeDot, { backgroundColor: bot.color }]} />
                                    <Text style={[styles.activeText, { color: bot.color }]}>
                                        Active & Trading
                                    </Text>
                                </View>
                            </Surface>
                        </Pressable>
                    </MotiView>
                ))}
            </View>
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
    botsGrid: {
        gap: 16,
    },
    botCard: {
        borderRadius: 16,
        padding: 20,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    botName: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    strategy: {
        fontSize: 13,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    statsContainer: {
        gap: 10,
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    riskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    riskDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
