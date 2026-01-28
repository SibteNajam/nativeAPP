/**
 * Bot Selection Modal Component
 * Shows available trading bots with specifications
 * Allows user to select their preferred bot strategy
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface BotInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    strategy: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    avgReturn: string;
    features: string[];
    color: string;
}

const AVAILABLE_BOTS: BotInfo[] = [
    {
        id: 'conservative-trader',
        name: 'Conservative Trader',
        icon: 'shield-check',
        description: 'Steady and safe trading strategy for long-term gains',
        strategy: 'DCA + Trend Following',
        riskLevel: 'Low',
        avgReturn: '8-12% monthly',
        features: [
            'Low risk approach',
            'Dollar Cost Averaging',
            'Trend following signals',
            'Stop-loss protection',
            'Best for beginners',
        ],
        color: 'success', // Will be resolved from theme
    },
    {
        id: 'aggressive-scalper',
        name: 'Aggressive Scalper',
        icon: 'lightning-bolt',
        description: 'High-frequency trading for maximum profit potential',
        strategy: 'Scalping + Mean Reversion',
        riskLevel: 'High',
        avgReturn: '20-35% monthly',
        features: [
            'High-frequency trades',
            'Quick profit taking',
            'Advanced indicators',
            'Risk management AI',
            'For experienced traders',
        ],
        color: 'warning', // Will be resolved from theme
    },
];

interface BotSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectBot: (botId: string, botName: string) => void;
    currentlySelected?: string;
}

export default function BotSelectionModal({
    visible,
    onClose,
    onSelectBot,
    currentlySelected,
}: BotSelectionModalProps) {
    const { colors, isDark } = useTheme();
    const [expandedBot, setExpandedBot] = useState<string | null>(null);

    const toggleExpand = (botId: string) => {
        setExpandedBot(expandedBot === botId ? null : botId);
    };

    const handleSelectBot = (botId: string, botName: string) => {
        onSelectBot(botId, botName);
        onClose();
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return colors.success;
            case 'Medium': return colors.warning;
            case 'High': return colors.error;
            default: return colors.text;
        }
    };

    // Resolve color string to actual color
    const getActualColor = (colorKey: string) => {
        switch (colorKey) {
            case 'success': return colors.success;
            case 'warning': return colors.warning;
            case 'error': return colors.error;
            default: return colors.primary;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <BlurView
                    intensity={isDark ? 80 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFillObject}
                />

                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={onClose}
                />

                <Animated.View
                    entering={SlideInDown.duration(400).damping(25).stiffness(120)}
                    exiting={SlideOutDown.duration(300)}
                    style={[styles.modalContent, { backgroundColor: colors.surface }]}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Select Trading Bot
                            </Text>
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                Choose your preferred strategy
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeButton, { backgroundColor: colors.border }]}
                        >
                            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Bot Cards */}
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                    >
                        {AVAILABLE_BOTS.map((bot) => {
                            const isExpanded = expandedBot === bot.id;
                            const isSelected = currentlySelected === bot.id;
                            const botColor = getActualColor(bot.color);

                            return (
                                <Animated.View
                                    key={bot.id}
                                    entering={FadeIn.delay(100)}
                                    style={[
                                        styles.botCard,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: isSelected ? botColor : colors.border,
                                            borderWidth: isSelected ? 2 : 1,
                                        },
                                    ]}
                                >
                                    {/* Bot Header */}
                                    <View style={styles.botHeader}>
                                        <View style={styles.botHeaderLeft}>
                                            <View
                                                style={[
                                                    styles.botIcon,
                                                    { backgroundColor: `${botColor}20` },
                                                ]}
                                            >
                                                <MaterialCommunityIcons
                                                    name={bot.icon as any}
                                                    size={28}
                                                    color={botColor}
                                                />
                                            </View>
                                            <View style={styles.botInfo}>
                                                <View style={styles.botNameRow}>
                                                    <Text style={[styles.botName, { color: colors.text }]}>
                                                        {bot.name}
                                                    </Text>
                                                    {isSelected && (
                                                        <View
                                                            style={[
                                                                styles.selectedBadge,
                                                                { backgroundColor: botColor },
                                                            ]}
                                                        >
                                                            <MaterialCommunityIcons
                                                                name="check-circle"
                                                                size={12}
                                                                color={colors.white}
                                                            />
                                                            <Text style={styles.selectedText}>Active</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.botDescription,
                                                        { color: colors.textSecondary },
                                                    ]}
                                                    numberOfLines={isExpanded ? undefined : 1}
                                                >
                                                    {bot.description}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Expand Button */}
                                        <TouchableOpacity
                                            onPress={() => toggleExpand(bot.id)}
                                            style={[styles.expandButton, { backgroundColor: colors.border }]}
                                        >
                                            <MaterialCommunityIcons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color={colors.text}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Bot Stats Row */}
                                    <View style={styles.botStats}>
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                                Risk Level
                                            </Text>
                                            <View style={styles.riskBadge}>
                                                <View
                                                    style={[
                                                        styles.riskDot,
                                                        { backgroundColor: getRiskColor(bot.riskLevel) },
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

                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: colors.textLight }]}>
                                                Avg Return
                                            </Text>
                                            <Text style={[styles.statValue, { color: botColor }]}>
                                                {bot.avgReturn}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <Animated.View
                                            entering={FadeIn.duration(200)}
                                            style={styles.expandedContent}
                                        >
                                            <View style={styles.strategyRow}>
                                                <MaterialCommunityIcons
                                                    name="strategy"
                                                    size={16}
                                                    color={colors.textSecondary}
                                                />
                                                <Text
                                                    style={[
                                                        styles.strategyText,
                                                        { color: colors.textSecondary },
                                                    ]}
                                                >
                                                    Strategy: {bot.strategy}
                                                </Text>
                                            </View>

                                            <View style={styles.featuresContainer}>
                                                <Text style={[styles.featuresTitle, { color: colors.text }]}>
                                                    Key Features:
                                                </Text>
                                                {bot.features.map((feature, index) => (
                                                    <View key={index} style={styles.featureItem}>
                                                        <MaterialCommunityIcons
                                                            name="check-circle"
                                                            size={14}
                                                            color={botColor}
                                                        />
                                                        <Text
                                                            style={[
                                                                styles.featureText,
                                                                { color: colors.textSecondary },
                                                            ]}
                                                        >
                                                            {feature}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </Animated.View>
                                    )}

                                    {/* Select Button */}
                                    <TouchableOpacity
                                        onPress={() => handleSelectBot(bot.id, bot.name)}
                                        style={[
                                            styles.selectButton,
                                            {
                                                backgroundColor: isSelected
                                                    ? `${botColor}20`
                                                    : botColor,
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={isSelected ? 'check-circle' : 'robot'}
                                            size={20}
                                            color={isSelected ? botColor : colors.white}
                                        />
                                        <Text
                                            style={[
                                                styles.selectButtonText,
                                                { color: isSelected ? botColor : colors.white },
                                            ]}
                                        >
                                            {isSelected ? 'Currently Active' : 'Select This Bot'}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        paddingHorizontal: 20,
    },
    botCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    botHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    botHeaderLeft: {
        flexDirection: 'row',
        flex: 1,
        gap: 12,
    },
    botIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botInfo: {
        flex: 1,
    },
    botNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    botName: {
        fontSize: 18,
        fontWeight: '700',
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    selectedText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    botDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    expandButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botStats: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
    },
    statItem: {
        gap: 4,
    },
    statLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    statValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    expandedContent: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128, 128, 128, 0.1)',
    },
    strategyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    strategyText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    featuresContainer: {
        gap: 8,
    },
    featuresTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontSize: 13,
        flex: 1,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 12,
    },
    selectButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
