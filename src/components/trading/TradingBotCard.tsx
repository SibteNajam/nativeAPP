/**
 * Trading Bot Card Component
 * Interactive power-button style activation
 * Dynamic animated visuals when bot is active
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withSpring,
    Easing,
    interpolate,
    withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/contexts/ThemeContext';
import { useExchange } from '@/contexts/ExchangeContext';
import { useCredentials } from '@/hooks/useCredentials';
import { getExchangeInfo } from '@/types/exchange.types';
import BotSelectionModal from './BotSelectionModal';

type BotStatus = 'idle' | 'activating' | 'active' | 'deactivating';

interface TradingBotCardProps {
    onStatusChange?: (isActive: boolean) => void;
}

const SELECTED_BOT_KEY = '@selected_trading_bot';

export default function TradingBotCard({ onStatusChange }: TradingBotCardProps) {
    const { colors } = useTheme();
    const { selectedExchange, selectedCredential, refreshExchanges } = useExchange();
    const { toggleCredential } = useCredentials();

    const [botStatus, setBotStatus] = useState<BotStatus>('idle');
    const [showBotModal, setShowBotModal] = useState(false);
    const [selectedBot, setSelectedBot] = useState<{ id: string; name: string } | null>(null);

    // Load selected bot from storage
    useEffect(() => {
        loadSelectedBot();
    }, []);

    const loadSelectedBot = async () => {
        try {
            const saved = await AsyncStorage.getItem(SELECTED_BOT_KEY);
            if (saved) {
                setSelectedBot(JSON.parse(saved));
            } else {
                // Default to Conservative Trader
                setSelectedBot({ id: 'conservative-trader', name: 'Conservative Trader' });
            }
        } catch (error) {
            console.error('Failed to load selected bot:', error);
        }
    };

    const handleBotSelection = async (botId: string, botName: string) => {
        const bot = { id: botId, name: botName };
        setSelectedBot(bot);
        try {
            await AsyncStorage.setItem(SELECTED_BOT_KEY, JSON.stringify(bot));
        } catch (error) {
            console.error('Failed to save selected bot:', error);
        }
    };

    // Sync bot status with backend activeTrading state
    useEffect(() => {
        if (selectedCredential?.activeTrading) {
            setBotStatus('active');
        } else {
            setBotStatus('idle');
        }
    }, [selectedCredential?.activeTrading, selectedExchange]);

    // Idle state animations
    const ringScale = useSharedValue(1);
    const ringOpacity = useSharedValue(0.3);
    const iconRotate = useSharedValue(0);
    const progressValue = useSharedValue(0);
    const glowScale = useSharedValue(1);

    // Active state animations - Robot & Signals
    const robotBounce = useSharedValue(0);
    const signalWave1 = useSharedValue(0);
    const signalWave2 = useSharedValue(0);
    const signalWave3 = useSharedValue(0);
    const pulseRing1 = useSharedValue(1);
    const pulseRing2 = useSharedValue(1);
    const pulseRing3 = useSharedValue(1);
    const chartLine = useSharedValue(0);
    const dataFlow = useSharedValue(0);

    // Active state - Robot animation
    useEffect(() => {
        if (botStatus === 'active') {
            // Robot bounce animation
            robotBounce.value = withRepeat(
                withSequence(
                    withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Signal waves - staggered
            signalWave1.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1500 }),
                    withTiming(0, { duration: 0 })
                ),
                -1
            );
            signalWave2.value = withDelay(500,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500 }),
                        withTiming(0, { duration: 0 })
                    ),
                    -1
                )
            );
            signalWave3.value = withDelay(1000,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500 }),
                        withTiming(0, { duration: 0 })
                    ),
                    -1
                )
            );

            // Pulse rings expanding outward
            pulseRing1.value = withRepeat(
                withSequence(
                    withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 0 })
                ),
                -1
            );
            pulseRing2.value = withDelay(700,
                withRepeat(
                    withSequence(
                        withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }),
                        withTiming(1, { duration: 0 })
                    ),
                    -1
                )
            );
            pulseRing3.value = withDelay(1400,
                withRepeat(
                    withSequence(
                        withTiming(1.4, { duration: 2000, easing: Easing.out(Easing.ease) }),
                        withTiming(1, { duration: 0 })
                    ),
                    -1
                )
            );

            // Data flow animation
            dataFlow.value = withRepeat(
                withTiming(1, { duration: 3000, easing: Easing.linear }),
                -1
            );

            // Chart line animation
            chartLine.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 2000 }),
                    withTiming(0.3, { duration: 1500 }),
                    withTiming(0.8, { duration: 1000 })
                ),
                -1,
                true
            );

        } else if (botStatus === 'idle') {
            // Reset all active animations
            robotBounce.value = withTiming(0, { duration: 300 });
            signalWave1.value = 0;
            signalWave2.value = 0;
            signalWave3.value = 0;
            pulseRing1.value = 1;
            pulseRing2.value = 1;
            pulseRing3.value = 1;
            dataFlow.value = 0;
            chartLine.value = 0;
        }
    }, [botStatus]);

    // Idle/Activating animations
    useEffect(() => {
        if (botStatus === 'activating') {
            iconRotate.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1
            );
            ringScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                true
            );
        } else if (botStatus === 'idle') {
            iconRotate.value = withTiming(0, { duration: 300 });
            ringScale.value = withTiming(1, { duration: 300 });
            ringOpacity.value = withTiming(0.3, { duration: 300 });
        }
    }, [botStatus]);

    // Animated styles
    const idleRingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringScale.value }],
        opacity: ringOpacity.value,
    }));

    const iconSpinStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${iconRotate.value}deg` }],
    }));

    const robotStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: robotBounce.value }],
    }));

    const signalWave1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(signalWave1.value, [0, 1], [1, 1.8]) }],
        opacity: interpolate(signalWave1.value, [0, 0.5, 1], [0.8, 0.4, 0]),
    }));

    const signalWave2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(signalWave2.value, [0, 1], [1, 1.8]) }],
        opacity: interpolate(signalWave2.value, [0, 0.5, 1], [0.8, 0.4, 0]),
    }));

    const signalWave3Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(signalWave3.value, [0, 1], [1, 1.8]) }],
        opacity: interpolate(signalWave3.value, [0, 0.5, 1], [0.8, 0.4, 0]),
    }));

    const pulseRing1Style = useAnimatedStyle(() => ({
        transform: [{ scale: pulseRing1.value }],
        opacity: interpolate(pulseRing1.value, [1, 1.4], [0.6, 0]),
    }));

    const pulseRing2Style = useAnimatedStyle(() => ({
        transform: [{ scale: pulseRing2.value }],
        opacity: interpolate(pulseRing2.value, [1, 1.4], [0.5, 0]),
    }));

    const pulseRing3Style = useAnimatedStyle(() => ({
        transform: [{ scale: pulseRing3.value }],
        opacity: interpolate(pulseRing3.value, [1, 1.4], [0.4, 0]),
    }));

    // Handlers
    const handleActivate = async () => {
        if (botStatus !== 'idle' || !selectedCredential) return;

        // Open bot selection modal
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowBotModal(true);
    };

    const handleStartTrading = async () => {
        if (botStatus !== 'idle' || !selectedCredential) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setBotStatus('activating');
        progressValue.value = withTiming(1, { duration: 2000 });

        try {
            // Toggle on backend
            const success = await toggleCredential(selectedCredential.id);
            if (success) {
                await refreshExchanges();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setBotStatus('active');
            } else {
                setBotStatus('idle');
            }
        } catch (error) {
            console.error('Failed to activate bot:', error);
            setBotStatus('idle');
        } finally {
            progressValue.value = 0;
            onStatusChange?.(true);
        }
    };

    const handleDeactivate = async () => {
        if (botStatus !== 'active' || !selectedCredential) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setBotStatus('deactivating');

        try {
            // Toggle on backend
            const success = await toggleCredential(selectedCredential.id);
            if (success) {
                await refreshExchanges();
                setBotStatus('idle');
            } else {
                setBotStatus('active');
            }
        } catch (error) {
            console.error('Failed to deactivate bot:', error);
            setBotStatus('active');
        } finally {
            onStatusChange?.(false);
        }
    };

    const exchangeInfo = selectedExchange ? getExchangeInfo(selectedExchange) : null;

    // No exchange selected state
    if (!selectedExchange || !exchangeInfo) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={0}>
                <View style={styles.noExchangeContent}>
                    <View style={[styles.noExchangeIcon, { backgroundColor: `${colors.textLight}10` }]}>
                        <MaterialCommunityIcons name="link-variant-off" size={32} color={colors.textLight} />
                    </View>
                    <Text style={[styles.noExchangeTitle, { color: colors.text }]}>
                        Select an Exchange
                    </Text>
                    <Text style={[styles.noExchangeText, { color: colors.textSecondary }]}>
                        Open sidebar to choose your exchange
                    </Text>
                </View>
            </Surface>
        );
    }

    const getStatusColor = () => {
        switch (botStatus) {
            case 'active': return colors.primary;
            case 'activating': return colors.primaryLight;
            case 'deactivating': return colors.textSecondary;
            default: return colors.primary;
        }
    };

    const statusColor = getStatusColor();

    // ========================================
    // ACTIVE STATE - Completely different UI
    // ========================================
    if (botStatus === 'active') {
        return (
            <>
                <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={0}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.exchangeIcon, { backgroundColor: `${exchangeInfo.color}15` }]}>
                                <MaterialCommunityIcons
                                    name={exchangeInfo.icon as any}
                                    size={18}
                                    color={exchangeInfo.color}
                                />
                            </View>
                            <Text style={[styles.exchangeName, { color: colors.text }]}>
                                {exchangeInfo.name}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}20` }]}>
                            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                                LIVE TRADING
                            </Text>
                        </View>
                    </View>

                    {/* Selected Bot Indicator */}
                    {selectedBot && (
                        <View style={[styles.botIndicator, { backgroundColor: colors.background }]}>
                            <MaterialCommunityIcons
                                name={selectedBot.id === 'conservative-trader' ? 'shield-check' : 'lightning-bolt'}
                                size={16}
                                color={selectedBot.id === 'conservative-trader' ? '#10b981' : '#f59e0b'}
                            />
                            <Text style={[styles.botIndicatorText, { color: colors.text }]}>
                                Strategy: {selectedBot.name}
                            </Text>
                        </View>
                    )}

                {/* Active Trading Animation Area */}
                <View style={styles.activeContainer}>
                    {/* Expanding pulse rings */}
                    <Animated.View style={[
                        styles.pulseRing,
                        { borderColor: colors.primary },
                        pulseRing1Style,
                    ]} />
                    <Animated.View style={[
                        styles.pulseRing,
                        { borderColor: colors.primaryLight },
                        pulseRing2Style,
                    ]} />
                    <Animated.View style={[
                        styles.pulseRing,
                        { borderColor: colors.primary },
                        pulseRing3Style,
                    ]} />

                    {/* Signal waves emanating from robot */}
                    <Animated.View style={[
                        styles.signalWave,
                        { backgroundColor: colors.primary },
                        signalWave1Style,
                    ]} />
                    <Animated.View style={[
                        styles.signalWave,
                        { backgroundColor: colors.primaryLight },
                        signalWave2Style,
                    ]} />
                    <Animated.View style={[
                        styles.signalWave,
                        { backgroundColor: colors.primary },
                        signalWave3Style,
                    ]} />

                    {/* Central Robot Icon - bouncing */}
                    <Animated.View style={[styles.robotContainer, robotStyle]}>
                        <Pressable
                            onPress={handleDeactivate}
                            style={({ pressed }) => [
                                styles.robotButton,
                                {
                                    backgroundColor: `${colors.primary}20`,
                                    borderColor: colors.primary,
                                    transform: [{ scale: pressed ? 0.95 : 1 }],
                                },
                            ]}
                        >
                            <View style={styles.robotInner}>
                                <MaterialCommunityIcons
                                    name="robot"
                                    size={48}
                                    color={colors.primary}
                                />
                                {/* Activity indicator dots */}
                                <View style={styles.activityDots}>
                                    <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
                                    <View style={[styles.dot, styles.dotActive, { backgroundColor: colors.primary }]} />
                                    <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
                                </View>
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* Floating icons around robot */}
                    <View style={[styles.floatingIcon, styles.floatingIcon1, { backgroundColor: `${colors.primary}1A` }]}>
                        <MaterialCommunityIcons name="chart-line-variant" size={20} color={colors.primary} />
                    </View>
                    <View style={[styles.floatingIcon, styles.floatingIcon2, { backgroundColor: `${colors.primary}1A` }]}>
                        <MaterialCommunityIcons name="swap-horizontal-bold" size={20} color={colors.primaryLight} />
                    </View>
                    <View style={[styles.floatingIcon, styles.floatingIcon3, { backgroundColor: `${colors.primary}1A` }]}>
                        <MaterialCommunityIcons name="currency-usd" size={20} color={colors.primary} />
                    </View>
                    <View style={[styles.floatingIcon, styles.floatingIcon4, { backgroundColor: `${colors.primary}1A` }]}>
                        <MaterialCommunityIcons name="trending-up" size={20} color={colors.primaryLight} />
                    </View>
                </View>

                {/* Status Text */}
                <View style={styles.statusTextContainer}>
                    <Text style={[styles.statusTitle, { color: colors.primary }]}>
                        🤖 Bot is Actively Trading
                    </Text>
                    <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                        Scanning markets • Executing trades • 24/7 monitoring
                    </Text>
                </View>

                {/* Stats */}
                <View style={styles.activeActions}>
                    <View style={[styles.statItem, { backgroundColor: `${colors.primary}15` }]}>
                        <MaterialCommunityIcons name="chart-areaspline" size={20} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.text }]}>$0.00</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's P/L</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: `${colors.primary}10` }]}>
                        <MaterialCommunityIcons name="repeat" size={20} color={colors.primaryLight} />
                        <Text style={[styles.statText, { color: colors.text }]}>0</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trades</Text>
                    </View>
                </View>

                {/* Stop button hint */}
                <View style={styles.footerHint}>
                    <MaterialCommunityIcons name="gesture-tap" size={14} color={colors.textLight} />
                    <Text style={[styles.footerHintText, { color: colors.textLight }]}>
                        Tap the robot to stop trading
                    </Text>
                </View>
            </Surface>

            {/* Bot Selection Modal */}
            <BotSelectionModal
                visible={showBotModal}
                onClose={() => setShowBotModal(false)}
                onSelectBot={handleBotSelection}
                currentlySelected={selectedBot?.id}
            />
        </>
        );
    }

    // ========================================
    // IDLE / ACTIVATING / DEACTIVATING STATE
    // ========================================
    return (
        <>
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={0}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.exchangeIcon, { backgroundColor: `${exchangeInfo.color}15` }]}>
                            <MaterialCommunityIcons
                                name={exchangeInfo.icon as any}
                                size={18}
                                color={exchangeInfo.color}
                            />
                        </View>
                        <Text style={[styles.exchangeName, { color: colors.text }]}>
                            {exchangeInfo.name}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor}15` }
                    ]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {botStatus === 'activating' ? 'CONNECTING' :
                                botStatus === 'deactivating' ? 'STOPPING' : 'OFFLINE'}
                        </Text>
                    </View>
                </View>

                {/* Selected Bot Indicator */}
                {selectedBot && (
                    <View style={[styles.botIndicator, { backgroundColor: colors.background }]}>
                        <MaterialCommunityIcons
                            name={selectedBot.id === 'conservative-trader' ? 'shield-check' : 'lightning-bolt'}
                            size={16}
                            color={selectedBot.id === 'conservative-trader' ? '#10b981' : '#f59e0b'}
                        />
                        <Text style={[styles.botIndicatorText, { color: colors.text }]}>
                            Selected: {selectedBot.name}
                        </Text>
                        <Pressable
                            onPress={() => setShowBotModal(true)}
                            style={({ pressed }) => [{
                                opacity: pressed ? 0.6 : 1,
                            }]}
                        >
                            <Text style={[styles.changeBotText, { color: colors.primary }]}>
                                Change
                            </Text>
                        </Pressable>
                    </View>
                )}

            {/* Power Button Area */}
            <View style={styles.powerButtonContainer}>
                {/* Outer ring */}
                <Animated.View style={[
                    styles.outerRing,
                    { borderColor: statusColor },
                    idleRingStyle,
                ]} />

                {/* Progress ring (during activation) */}
                {botStatus === 'activating' && (
                    <Animated.View style={[
                        styles.progressRing,
                        { borderColor: colors.primaryLight, borderTopColor: 'transparent' },
                        iconSpinStyle,
                    ]} />
                )}

                {/* Power button */}
                <Pressable
                    onPress={botStatus === 'idle' ? handleActivate : undefined}
                    disabled={botStatus !== 'idle'}
                    style={({ pressed }) => [
                        styles.powerButton,
                        {
                            backgroundColor: `${statusColor}15`,
                            transform: [{ scale: pressed && botStatus === 'idle' ? 0.95 : 1 }],
                        },
                    ]}
                >
                    {botStatus === 'activating' ? (
                        <Animated.View style={iconSpinStyle}>
                            <MaterialCommunityIcons
                                name="loading"
                                size={40}
                                color={statusColor}
                            />
                        </Animated.View>
                    ) : (
                        <MaterialCommunityIcons
                            name="rocket-launch"
                            size={40}
                            color={statusColor}
                        />
                    )}
                </Pressable>
            </View>

            {/* Status Text */}
            <View style={styles.statusTextContainer}>
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                    {botStatus === 'activating' ? 'Initializing Bot...' :
                        botStatus === 'deactivating' ? 'Stopping...' :
                            '🚀 Start Trading'}
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                    {botStatus === 'activating' ? 'Connecting to exchange...' :
                        'Tap to let the bot trade for you'}
                </Text>
            </View>

            {/* Footer hint */}
            {botStatus === 'idle' && (
                <View style={styles.footerHint}>
                    <MaterialCommunityIcons name="shield-check" size={14} color={colors.textLight} />
                    <Text style={[styles.footerHintText, { color: colors.textLight }]}>
                        Secure • Automated • 24/7
                    </Text>
                </View>
            )}
        </Surface>

        {/* Bot Selection Modal */}
        <BotSelectionModal
            visible={showBotModal}
            onClose={() => setShowBotModal(false)}
            onSelectBot={handleBotSelection}
            currentlySelected={selectedBot?.id}
        />
    </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    exchangeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exchangeName: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Power Button (Idle state)
    powerButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
        marginBottom: 16,
    },
    outerRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
    },
    progressRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
    },
    powerButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Active state container
    activeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 180,
        marginBottom: 16,
    },
    // Pulse rings
    pulseRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
    },
    // Signal waves
    signalWave: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        opacity: 0.3,
    },
    // Robot container
    robotContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    robotButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    robotInner: {
        alignItems: 'center',
    },
    activityDots: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.5,
    },
    dotActive: {
        opacity: 1,
        transform: [{ scale: 1.2 }],
    },
    // Floating icons
    floatingIcon: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingIcon1: {
        top: 10,
        right: 60,
    },
    floatingIcon2: {
        top: 40,
        left: 50,
    },
    floatingIcon3: {
        bottom: 40,
        right: 50,
    },
    floatingIcon4: {
        bottom: 10,
        left: 60,
    },
    // Status Text
    statusTextContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    statusSubtitle: {
        fontSize: 13,
        textAlign: 'center',
    },
    // No Exchange
    noExchangeContent: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    noExchangeIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    noExchangeTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    noExchangeText: {
        fontSize: 13,
        marginTop: 4,
    },
    // Active Actions
    activeActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    statText: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    // Footer
    footerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    footerHintText: {
        fontSize: 12,
    },
    // Bot Indicator
    botIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    botIndicatorText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    changeBotText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
