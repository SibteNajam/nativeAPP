/**
 * Trading Bots Showcase
 * Display available bot strategies with realistic returns
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';
import { FONTS } from '@/constants/fonts';

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
    details: {
        description: string;
        tradingFrequency: string;
        timeframe: string;
        indicators: string[];
        idealFor: string[];
        minInvestment: string;
        maxDrawdown: string;
        avgTradeDuration: string;
        backtestPeriod: string;
        performance: {
            monthly: string;
            quarterly: string;
            yearly: string;
        };
    };
}

export default function TradingBotsShowcase() {
    const { colors, isDark } = useTheme();
    const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const bots: Bot[] = [
        {
            id: 'conservative',
            name: 'Conservative Trader',
            icon: 'shield-check',
            strategy: 'Long-term DCA with risk management',
            riskLevel: 'Low',
            avgReturn: '2-3%',
            winRate: '78%',
            color: colors.success,
            badge: 'Best for Beginners',
            details: {
                description: 'A conservative approach focusing on capital preservation with steady, modest gains. Uses dollar-cost averaging to minimize market timing risk and builds positions gradually.',
                tradingFrequency: '2-5 trades per week',
                timeframe: '4H - Daily charts',
                indicators: ['50/200 EMA', 'RSI (30/70)', 'Volume Profile', 'Support/Resistance'],
                idealFor: ['Risk-averse investors', 'Long-term holders', 'First-time bot users', 'Portfolio diversification'],
                minInvestment: '$500',
                maxDrawdown: '8-12%',
                avgTradeDuration: '3-7 days',
                backtestPeriod: '2 years (2022-2024)',
                performance: {
                    monthly: '+2.1%',
                    quarterly: '+6.8%',
                    yearly: '+28.5%',
                },
            },
        },
        {
            id: 'scalper',
            name: 'Active Scalper',
            icon: 'lightning-bolt',
            strategy: 'High-frequency micro-profit capture',
            riskLevel: 'Medium',
            avgReturn: '4-7%',
            winRate: '65%',
            color: colors.warning,
            badge: 'Most Active',
            details: {
                description: 'Executes multiple short-term trades capturing small price movements. Requires higher capital for effective returns. Best suited for volatile markets with good liquidity.',
                tradingFrequency: '15-30 trades per week',
                timeframe: '5m - 15m charts',
                indicators: ['VWAP', 'Bollinger Bands', 'Order Flow', 'Level 2 Data'],
                idealFor: ['Active traders', 'Medium risk tolerance', 'Liquid assets', 'Volatile markets'],
                minInvestment: '$1,000',
                maxDrawdown: '15-20%',
                avgTradeDuration: '30min - 4 hours',
                backtestPeriod: '18 months (2023-2024)',
                performance: {
                    monthly: '+5.2%',
                    quarterly: '+16.4%',
                    yearly: '+71.8%',
                },
            },
        },
        {
            id: 'balanced',
            name: 'Balanced Growth',
            icon: 'scale-balance',
            strategy: 'Swing trading with trend confirmation',
            riskLevel: 'Medium',
            avgReturn: '7-9%',
            winRate: '72%',
            color: colors.primary,
            badge: 'Most Popular',
            details: {
                description: 'Combines trend-following with swing trading techniques for optimal risk-reward balance. Captures medium-term price movements while managing downside risk through dynamic stop-losses.',
                tradingFrequency: '8-15 trades per week',
                timeframe: '1H - 4H charts',
                indicators: ['Moving Average Crossover', 'MACD', 'Fibonacci Retracements', 'Volume Analysis'],
                idealFor: ['Growth-focused investors', 'Balanced risk appetite', 'Medium-term horizon', 'Diversified portfolio'],
                minInvestment: '$750',
                maxDrawdown: '12-18%',
                avgTradeDuration: '1-3 days',
                backtestPeriod: '2 years (2022-2024)',
                performance: {
                    monthly: '+7.8%',
                    quarterly: '+24.5%',
                    yearly: '+115.2%',
                },
            },
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

    const openBotDetails = (bot: Bot) => {
        setSelectedBot(bot);
        setModalVisible(true);
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
                    3 proven strategies with realistic, sustainable returns
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
                        <Pressable
                            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                            onPress={() => openBotDetails(bot)}
                        >
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

                                <Text style={[styles.botName, { color: colors.text, fontFamily: FONTS.display }]}>
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
                                            Monthly Return
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

                                <Pressable
                                    style={[styles.detailsButton, { backgroundColor: bot.color }]}
                                    onPress={() => openBotDetails(bot)}
                                >
                                    <Text style={styles.detailsButtonText}>View Details</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                                </Pressable>
                            </Surface>
                        </Pressable>
                    </MotiView>
                ))}
            </View>

            {/* Bot Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedBot && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={[styles.modalIconContainer, { backgroundColor: `${selectedBot.color}20` }]}>
                                            <MaterialCommunityIcons name={selectedBot.icon as any} size={40} color={selectedBot.color} />
                                        </View>
                                        <Text style={[styles.modalTitle, { color: colors.text, fontFamily: FONTS.display }]}>
                                            {selectedBot.name}
                                        </Text>
                                        <Text style={[styles.modalStrategy, { color: colors.textSecondary }]}>
                                            {selectedBot.strategy}
                                        </Text>
                                        <Pressable
                                            style={styles.closeButton}
                                            onPress={() => setModalVisible(false)}
                                        >
                                            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                                        </Pressable>
                                    </View>

                                    <View style={styles.modalBody}>
                                        {/* Description */}
                                        <View style={styles.section}>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                                About This Bot
                                            </Text>
                                            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                                                {selectedBot.details.description}
                                            </Text>
                                        </View>

                                        {/* Performance Metrics */}
                                        <View style={styles.section}>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                                Performance Track Record
                                            </Text>
                                            <View style={styles.performanceGrid}>
                                                <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
                                                    <Text style={[styles.performanceLabel, { color: colors.textLight }]}>Monthly</Text>
                                                    <Text style={[styles.performanceValue, { color: colors.success }]}>
                                                        {selectedBot.details.performance.monthly}
                                                    </Text>
                                                </View>
                                                <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
                                                    <Text style={[styles.performanceLabel, { color: colors.textLight }]}>Quarterly</Text>
                                                    <Text style={[styles.performanceValue, { color: colors.success }]}>
                                                        {selectedBot.details.performance.quarterly}
                                                    </Text>
                                                </View>
                                                <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
                                                    <Text style={[styles.performanceLabel, { color: colors.textLight }]}>Yearly</Text>
                                                    <Text style={[styles.performanceValue, { color: colors.success }]}>
                                                        {selectedBot.details.performance.yearly}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Trading Details */}
                                        <View style={styles.section}>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                                Trading Specifications
                                            </Text>
                                            <View style={styles.detailsList}>
                                                <DetailRow
                                                    icon="clock-outline"
                                                    label="Frequency"
                                                    value={selectedBot.details.tradingFrequency}
                                                    colors={colors}
                                                />
                                                <DetailRow
                                                    icon="chart-timeline-variant"
                                                    label="Timeframe"
                                                    value={selectedBot.details.timeframe}
                                                    colors={colors}
                                                />
                                                <DetailRow
                                                    icon="clock-time-four-outline"
                                                    label="Avg Duration"
                                                    value={selectedBot.details.avgTradeDuration}
                                                    colors={colors}
                                                />
                                                <DetailRow
                                                    icon="cash"
                                                    label="Min Investment"
                                                    value={selectedBot.details.minInvestment}
                                                    colors={colors}
                                                />
                                                <DetailRow
                                                    icon="arrow-collapse-down"
                                                    label="Max Drawdown"
                                                    value={selectedBot.details.maxDrawdown}
                                                    colors={colors}
                                                />
                                                <DetailRow
                                                    icon="calendar-range"
                                                    label="Backtest Period"
                                                    value={selectedBot.details.backtestPeriod}
                                                    colors={colors}
                                                />
                                            </View>
                                        </View>

                                        {/* Indicators */}
                                        <View style={styles.section}>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                                Technical Indicators
                                            </Text>
                                            <View style={styles.chipsList}>
                                                {selectedBot.details.indicators.map((indicator, idx) => (
                                                    <View key={idx} style={[styles.indicatorChip, { backgroundColor: `${selectedBot.color}15` }]}>
                                                        <Text style={[styles.indicatorText, { color: selectedBot.color }]}>
                                                            {indicator}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Ideal For */}
                                        <View style={styles.section}>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                                Ideal For
                                            </Text>
                                            {selectedBot.details.idealFor.map((item, idx) => (
                                                <View key={idx} style={styles.idealForItem}>
                                                    <MaterialCommunityIcons
                                                        name="check-circle"
                                                        size={20}
                                                        color={colors.success}
                                                    />
                                                    <Text style={[styles.idealForText, { color: colors.text }]}>
                                                        {item}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Note */}
                                        <View style={[styles.noteBox, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
                                            <MaterialCommunityIcons name="information" size={20} color={colors.warning} />
                                            <Text style={[styles.noteText, { color: colors.text }]}>
                                                Past performance doesn't guarantee future results. All trading involves risk.
                                            </Text>
                                        </View>
                                    </View>

                                    <Button
                                        mode="contained"
                                        onPress={() => setModalVisible(false)}
                                        style={[styles.modalButton, { backgroundColor: selectedBot.color }]}
                                        labelStyle={styles.modalButtonLabel}
                                    >
                                        Got It
                                    </Button>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Helper component for detail rows
const DetailRow = ({ icon, label, value, colors }: any) => (
    <View style={styles.detailRow}>
        <View style={styles.detailLeft}>
            <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
);

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
        marginBottom: 12,
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
    detailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    detailsButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 8,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalStrategy: {
        fontSize: 15,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 8,
    },
    modalBody: {
        marginBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
    },
    performanceGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    performanceCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    performanceLabel: {
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    performanceValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    detailsList: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    chipsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    indicatorChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    indicatorText: {
        fontSize: 13,
        fontWeight: '600',
    },
    idealForItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    idealForText: {
        fontSize: 14,
        flex: 1,
    },
    noteBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        marginTop: 8,
    },
    noteText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    modalButton: {
        marginTop: 12,
        paddingVertical: 8,
    },
    modalButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
});

