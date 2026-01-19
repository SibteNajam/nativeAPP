import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    Platform,
    Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Path, Circle, Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

// Import theme hook
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Exchanges with logos
const EXCHANGES = [
    { name: 'Binance', color: '#F3BA2F' },
    { name: 'Bitget', color: '#00F0FF' },
    { name: 'MEXC', color: '#2EBD85' },
    { name: 'Gate.io', color: '#2354E6' },
];

// Animated Candlestick Chart Component
const AnimatedCandleChart = ({ colors }: { colors: any }) => {
    const candles = [
        { o: 60, c: 80, h: 90, l: 50, bullish: true },
        { o: 80, c: 70, h: 85, l: 65, bullish: false },
        { o: 70, c: 90, h: 95, l: 68, bullish: true },
        { o: 90, c: 75, h: 92, l: 70, bullish: false },
        { o: 75, c: 85, h: 88, l: 72, bullish: true },
        { o: 85, c: 100, h: 105, l: 82, bullish: true },
        { o: 100, c: 95, h: 108, l: 90, bullish: false },
        { o: 95, c: 110, h: 115, l: 92, bullish: true },
    ];

    const chartWidth = SCREEN_WIDTH - 80;
    const chartHeight = 120;
    const candleWidth = 16;
    const spacing = (chartWidth - candles.length * candleWidth) / (candles.length + 1);

    // Generate line path through candle closes
    const linePath = candles.map((candle, i) => {
        const x = spacing + i * (candleWidth + spacing) + candleWidth / 2;
        const y = chartHeight - (candle.c / 120) * chartHeight;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800 }}
        >
            <Surface style={[styles.chartCard, { backgroundColor: colors.surface }]} elevation={2}>
                <View style={styles.chartHeader}>
                    <View style={styles.chartTitleRow}>
                        <MaterialCommunityIcons name="chart-line" size={18} color={colors.primary} />
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Live Performance</Text>
                    </View>
                    <View style={[styles.chartBadge, { backgroundColor: `${colors.success}20` }]}>
                        <MaterialCommunityIcons name="trending-up" size={14} color={colors.success} />
                        <Text style={[styles.chartBadgeText, { color: colors.success }]}>+24.5%</Text>
                    </View>
                </View>

                <Svg width={chartWidth} height={chartHeight} style={styles.chartSvg}>
                    <Defs>
                        <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.5" />
                            <Stop offset="1" stopColor={colors.success} stopOpacity="1" />
                        </LinearGradient>
                    </Defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((ratio, i) => (
                        <Line
                            key={i}
                            x1="0"
                            y1={chartHeight * ratio}
                            x2={chartWidth}
                            y2={chartHeight * ratio}
                            stroke={colors.border}
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            opacity={0.5}
                        />
                    ))}

                    {/* Candlesticks */}
                    {candles.map((candle, i) => {
                        const x = spacing + i * (candleWidth + spacing);
                        const bodyTop = chartHeight - (Math.max(candle.o, candle.c) / 120) * chartHeight;
                        const bodyBottom = chartHeight - (Math.min(candle.o, candle.c) / 120) * chartHeight;
                        const bodyHeight = bodyBottom - bodyTop;
                        const wickTop = chartHeight - (candle.h / 120) * chartHeight;
                        const wickBottom = chartHeight - (candle.l / 120) * chartHeight;
                        const fillColor = candle.bullish ? colors.success : colors.error;

                        return (
                            <MotiView
                                key={i}
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 400, delay: i * 80 }}
                            >
                                {/* Wick */}
                                <Line
                                    x1={x + candleWidth / 2}
                                    y1={wickTop}
                                    x2={x + candleWidth / 2}
                                    y2={wickBottom}
                                    stroke={fillColor}
                                    strokeWidth="2"
                                />
                                {/* Body */}
                                <Rect
                                    x={x}
                                    y={bodyTop}
                                    width={candleWidth}
                                    height={Math.max(bodyHeight, 3)}
                                    fill={fillColor}
                                    rx={2}
                                />
                            </MotiView>
                        );
                    })}

                    {/* Trend line */}
                    <Path
                        d={linePath}
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Current price dot */}
                    <Circle
                        cx={spacing + (candles.length - 1) * (candleWidth + spacing) + candleWidth / 2}
                        cy={chartHeight - (candles[candles.length - 1].c / 120) * chartHeight}
                        r="6"
                        fill={colors.success}
                    />
                </Svg>

                <View style={styles.chartFooter}>
                    <View style={styles.chartStat}>
                        <Text style={[styles.chartStatLabel, { color: colors.textLight }]}>Win Rate</Text>
                        <Text style={[styles.chartStatValue, { color: colors.text }]}>94.7%</Text>
                    </View>
                    <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartStat}>
                        <Text style={[styles.chartStatLabel, { color: colors.textLight }]}>Profit</Text>
                        <Text style={[styles.chartStatValue, { color: colors.success }]}>+$12,450</Text>
                    </View>
                    <View style={[styles.chartDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartStat}>
                        <Text style={[styles.chartStatLabel, { color: colors.textLight }]}>Trades</Text>
                        <Text style={[styles.chartStatValue, { color: colors.text }]}>847</Text>
                    </View>
                </View>
            </Surface>
        </MotiView>
    );
};

// All-In-One Circular Visualization Component
const AllInOneOrbit = ({ colors }: { colors: any }) => {
    const containerSize = SCREEN_WIDTH - 60;
    const centerSize = 80;
    const radius = (containerSize / 2) - 50;

    // Features around the center
    const orbitItems = [
        { icon: 'newspaper-variant-outline', label: 'News', color: '#3B82F6' },
        { icon: 'chart-bell-curve-cumulative', label: 'VLM', color: '#8B5CF6' },
        { icon: 'calculator-variant', label: 'Quant', color: '#EC4899' },
        { icon: 'function-variant', label: 'Math', color: '#F59E0B' },
        { icon: 'flask-outline', label: 'Secret', color: '#10B981' },
        { icon: 'robot-outline', label: 'AI', color: '#06B6D4' },
    ];

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 600 }}
        >
            <Surface style={[styles.orbitCard, { backgroundColor: colors.surface }]} elevation={2}>
                <View style={styles.orbitHeader}>
                    <Text style={[styles.orbitTitle, { color: colors.text }]}>All-In-One Trading Intelligence</Text>
                    <Text style={[styles.orbitSubtitle, { color: colors.textSecondary }]}>
                        6 powerful engines working together
                    </Text>
                </View>

                <View style={[styles.orbitContainer, { width: containerSize, height: containerSize }]}>
                    {/* Outer dashed circle */}
                    <View style={[styles.orbitRing, {
                        width: radius * 2 + 80,
                        height: radius * 2 + 80,
                        borderColor: colors.border,
                    }]} />

                    {/* Inner dotted circle */}
                    <View style={[styles.innerRing, {
                        width: radius * 1.2,
                        height: radius * 1.2,
                        borderColor: colors.border,
                    }]} />

                    {/* Orbiting Feature Cards */}
                    {orbitItems.map((item, index) => {
                        const angle = (index * 60) - 90; // 60 degrees apart, start from top
                        const radian = (angle * Math.PI) / 180;
                        const x = containerSize / 2 + Math.cos(radian) * radius - 35; // 35 = half of bubble width
                        const y = containerSize / 2 + Math.sin(radian) * radius - 28; // 28 = half of bubble height

                        return (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 400, delay: 300 + index * 100 }}
                                style={[styles.orbitItemAbsolute, { left: x, top: y }]}
                            >
                                <MotiView
                                    from={{ scale: 1 }}
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{
                                        type: 'timing',
                                        duration: 2000,
                                        loop: true,
                                        delay: index * 200
                                    }}
                                    style={[styles.orbitBubble, {
                                        backgroundColor: `${item.color}15`,
                                        borderColor: item.color,
                                    }]}
                                >
                                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                                    <Text style={[styles.orbitLabel, { color: item.color }]}>{item.label}</Text>
                                </MotiView>
                            </MotiView>
                        );
                    })}

                    {/* Connection Lines */}
                    <Svg
                        width={containerSize}
                        height={containerSize}
                        style={styles.connectionSvg}
                    >
                        {orbitItems.map((item, index) => {
                            const angle = (index * 60) - 90;
                            const radian = (angle * Math.PI) / 180;
                            const centerX = containerSize / 2;
                            const centerY = containerSize / 2;
                            const endX = centerX + Math.cos(radian) * (radius - 20);
                            const endY = centerY + Math.sin(radian) * (radius - 20);

                            return (
                                <Line
                                    key={index}
                                    x1={centerX}
                                    y1={centerY}
                                    x2={endX}
                                    y2={endY}
                                    stroke={`${item.color}40`}
                                    strokeWidth="2"
                                    strokeDasharray="4,4"
                                />
                            );
                        })}
                    </Svg>

                    {/* Center - AI Bot */}
                    <View style={styles.centerContainer}>
                        {/* Bot with pulse rings wrapper - this is the centered element */}
                        <View style={styles.botWrapper}>
                            {/* Pulse ring 1 */}
                            <MotiView
                                from={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                transition={{ type: 'timing', duration: 1500, loop: true }}
                                style={[styles.pulseRing, { backgroundColor: colors.primary }]}
                            />
                            {/* Pulse ring 2 */}
                            <MotiView
                                from={{ scale: 1, opacity: 0.3 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{ type: 'timing', duration: 1500, loop: true, delay: 400 }}
                                style={[styles.pulseRing, { backgroundColor: colors.primary }]}
                            />

                            {/* Center Bot */}
                            <View style={[styles.centerBot, { backgroundColor: colors.primary, paddingTop: 4 }]}>
                                <MaterialCommunityIcons name="robot" size={36} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bottom text */}
                <View style={[styles.orbitFooter, { borderTopColor: colors.border }]}>
                    <MaterialCommunityIcons name="information-outline" size={16} color={colors.textLight} />
                    <Text style={[styles.orbitFooterText, { color: colors.textSecondary }]}>
                        AI combines all data sources for smarter decisions
                    </Text>
                </View>
            </Surface>
        </MotiView>
    );
};

// Expandable Feature Card
const FeatureCard = ({
    feature,
    index,
    isExpanded,
    onToggle,
    colors
}: {
    feature: any;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    colors: any;
}) => (
    <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
    >
        <Pressable onPress={onToggle}>
            <Surface style={[styles.featureCard, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.featureMainRow}>
                    <View style={[styles.featureIconContainer, { backgroundColor: feature.bgColor }]}>
                        <MaterialCommunityIcons name={feature.icon as any} size={26} color={feature.color} />
                    </View>
                    <View style={styles.featureContent}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{feature.description}</Text>
                    </View>
                    <MotiView
                        animate={{ rotate: isExpanded ? '90deg' : '0deg' }}
                        transition={{ type: 'timing', duration: 200 }}
                    >
                        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                    </MotiView>
                </View>

                <AnimatePresence>
                    {isExpanded && (
                        <MotiView
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={[styles.featureDetails, { borderTopColor: colors.border }]}
                        >
                            <Text style={[styles.featureDetailsText, { color: colors.textSecondary }]}>
                                {feature.details}
                            </Text>
                            <View style={styles.featureStats}>
                                {feature.stats.map((stat: any, i: number) => (
                                    <View key={i} style={[styles.featureStatItem, { backgroundColor: colors.surfaceLight }]}>
                                        <MaterialCommunityIcons name={stat.icon} size={16} color={colors.primary} />
                                        <Text style={[styles.featureStatText, { color: colors.text }]}>{stat.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </MotiView>
                    )}
                </AnimatePresence>
            </Surface>
        </Pressable>
    </MotiView>
);

export default function FeaturesScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    // Features with dynamic colors and details
    const FEATURES = [
        {
            icon: 'brain',
            title: 'AI-Powered Engine',
            description: 'Machine learning for smart trading',
            color: colors.primary,
            bgColor: `${colors.primary}20`,
            details: 'Our AI analyzes millions of data points in real-time, learning from market patterns to predict optimal entry and exit points. Trained on 5+ years of historical data.',
            stats: [
                { icon: 'database', value: '10M+ trades' },
                { icon: 'clock-fast', value: '< 10ms' },
                { icon: 'chart-line', value: '94.7% accuracy' },
            ],
        },
        {
            icon: 'chart-timeline-variant',
            title: 'Technical Analysis',
            description: 'Auto pattern detection',
            color: '#3B82F6',
            bgColor: '#3B82F620',
            details: 'Automatically detects 50+ chart patterns including head & shoulders, double tops, triangles, and more. Real-time RSI, MACD, and Bollinger Band analysis.',
            stats: [
                { icon: 'shape', value: '50+ patterns' },
                { icon: 'gauge', value: '15 indicators' },
                { icon: 'bell', value: 'Smart alerts' },
            ],
        },
        {
            icon: 'shield-lock',
            title: 'Bank-Grade Security',
            description: 'API keys encrypted with AES-256',
            color: colors.success,
            bgColor: `${colors.success}20`,
            details: 'Your API keys are encrypted with military-grade AES-256 encryption. We never withdraw or transfer funds—only trade execution permissions required.',
            stats: [
                { icon: 'lock', value: 'AES-256' },
                { icon: 'shield-check', value: 'SOC 2' },
                { icon: 'key', value: 'Read-only keys' },
            ],
        },
        {
            icon: 'lightning-bolt',
            title: 'Ultra-Low Latency',
            description: 'Execute trades in <50ms',
            color: colors.warning,
            bgColor: `${colors.warning}20`,
            details: 'Co-located servers near major exchanges ensure lightning-fast order execution. Average latency of just 12ms means you never miss a trade opportunity.',
            stats: [
                { icon: 'server', value: '5 regions' },
                { icon: 'speedometer', value: '12ms avg' },
                { icon: 'wifi', value: '99.99% uptime' },
            ],
        },
    ];

    const handleContinue = () => {
        router.push('/login');
    };

    const handleBack = () => {
        router.back();
    };

    const toggleFeature = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor={colors.text}
                    size={24}
                    onPress={handleBack}
                    style={[styles.backButton, { backgroundColor: colors.surface }]}
                />
                <View style={styles.dotsContainer}>
                    <View style={[styles.dot, { backgroundColor: colors.border }]} />
                    <View style={[styles.dot, styles.dotActive, { backgroundColor: colors.primary }]} />
                </View>
                <IconButton
                    icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
                    iconColor={colors.primary}
                    size={22}
                    onPress={toggleTheme}
                    style={[styles.themeToggle, { backgroundColor: colors.surface }]}
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500 }}
                >
                    <Text style={[styles.titleSmall, { color: colors.primary }]}>DISCOVER</Text>
                    <Text style={[styles.title, { color: colors.text }]}>Powerful Features</Text>
                </MotiView>

                {/* Animated Chart */}
                <AnimatedCandleChart colors={colors} />

                {/* Exchanges */}
                <View style={styles.exchangesSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textLight }]}>MULTI-EXCHANGE SUPPORT</Text>
                    <View style={styles.exchangeRow}>
                        {EXCHANGES.map((exchange, index) => (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'timing', duration: 400, delay: index * 100 }}
                            >
                                <Surface style={[styles.exchangeCard, { backgroundColor: colors.surface }]} elevation={1}>
                                    <View style={[styles.exchangeDot, { backgroundColor: exchange.color }]} />
                                    <Text style={[styles.exchangeName, { color: colors.text }]}>{exchange.name}</Text>
                                </Surface>
                            </MotiView>
                        ))}
                    </View>
                </View>

                {/* All-In-One Orbital Visualization */}
                <AllInOneOrbit colors={colors} />

                {/* Features List */}
                <View style={styles.featuresSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textLight }]}>KEY FEATURES</Text>
                    <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Tap to see details</Text>
                    <View style={styles.featuresList}>
                        {FEATURES.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                feature={feature}
                                index={index}
                                isExpanded={expandedIndex === index}
                                onToggle={() => toggleFeature(index)}
                                colors={colors}
                            />
                        ))}
                    </View>
                </View>

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={[styles.bottomSection, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <Button
                    mode="contained"
                    onPress={handleContinue}
                    style={styles.ctaButton}
                    contentStyle={styles.ctaButtonContent}
                    labelStyle={styles.ctaButtonLabel}
                    buttonColor={colors.primary}
                >
                    Let's Make Money
                </Button>
                <View style={styles.ctaInfo}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={[styles.ctaInfoText, { color: colors.textSecondary }]}>Free 14-day trial • No card required</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 44,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    backButton: {
        margin: 0,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
    },
    themeToggle: {
        margin: 0,
        borderRadius: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    titleSmall: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 2,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 20,
    },
    // Chart Card
    chartCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    chartBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    chartBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chartSvg: {
        marginVertical: 8,
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    chartStat: {
        flex: 1,
        alignItems: 'center',
    },
    chartStatLabel: {
        fontSize: 11,
        marginBottom: 4,
    },
    chartStatValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    chartDivider: {
        width: 1,
        height: 30,
    },
    // Exchanges
    exchangesSection: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    sectionHint: {
        fontSize: 12,
        marginBottom: 12,
        marginTop: -8,
    },
    exchangeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    exchangeCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 10,
        gap: 8,
    },
    exchangeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    exchangeName: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Features
    featuresSection: {
        marginBottom: 24,
    },
    featuresList: {
        gap: 12,
    },
    featureCard: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    featureMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 12,
    },
    featureDetails: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    featureDetailsText: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 12,
    },
    featureStats: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    featureStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    featureStatText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Bottom Section
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 36,
        borderTopWidth: 1,
    },
    ctaButton: {
        borderRadius: 28,
    },
    ctaButtonContent: {
        height: 56,
        flexDirection: 'row-reverse',
    },
    ctaButtonLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    ctaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    ctaInfoText: {
        fontSize: 12,
    },
    // Orbital Visualization
    orbitCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    orbitHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    orbitTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    orbitSubtitle: {
        fontSize: 13,
    },
    orbitContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    orbitRing: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    innerRing: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: 'dotted',
        opacity: 0.5,
    },
    orbitItem: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitItemAbsolute: {
        position: 'absolute',
        zIndex: 10,
    },
    connectionSvg: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    connectionLine: {
        position: 'absolute',
        height: 2,
        borderRadius: 1,
    },
    orbitBubble: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1.5,
        minWidth: 60,
    },
    orbitLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    centerBotOuter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerBot: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        height: 70,
    },
    processingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },
    processingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    processingText: {
        fontSize: 12,
        fontWeight: '500',
    },
    orbitFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 16,
        marginTop: 8,
        borderTopWidth: 1,
    },
    orbitFooterText: {
        fontSize: 12,
    },
});
