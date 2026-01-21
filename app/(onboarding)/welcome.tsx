import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Surface, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { useFonts, Poppins_700Bold, Poppins_800ExtraBold, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

// Import theme hook
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Rotating words for hero section
const ROTATING_WORDS = ['Smarter', 'Faster', 'Safer', 'Profitable'];

// Rotating Word Component
const RotatingWord = ({ fontsLoaded, primaryColor }: { fontsLoaded: boolean; primaryColor: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.rotatingContainer}>
            <AnimatePresence exitBeforeEnter>
                <MotiView
                    key={currentIndex}
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -30 }}
                    transition={{ type: 'timing', duration: 500 }}
                >
                    <Text style={[
                        styles.rotatingWord,
                        { color: primaryColor },
                        fontsLoaded && { fontFamily: 'Poppins_800ExtraBold' }
                    ]}>
                        {ROTATING_WORDS[currentIndex]}
                    </Text>
                </MotiView>
            </AnimatePresence>
        </View>
    );
};

// Floating Orb Component
const FloatingOrb = ({ size, color, x, y, delay }: {
    size: number; color: string; x: number; y: number; delay: number;
}) => (
    <MotiView
        from={{ translateY: 0 }}
        animate={{ translateY: -20 }}
        transition={{ type: 'timing', duration: 4000, loop: true, repeatReverse: true, delay }}
        style={[styles.floatingOrb, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: x, top: y }]}
    />
);

export default function WelcomeScreen() {
    // Use theme hook for dynamic colors
    const { colors, isDark, toggleTheme } = useTheme();

    const [fontsLoaded] = useFonts({
        Poppins_600SemiBold,
        Poppins_700Bold,
        Poppins_800ExtraBold,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
    });

    // Trading scenarios with dynamic colors
    const TRADING_SCENARIOS = [
        [
            { icon: 'magnify', iconColor: colors.primaryLight, text: 'Scanning BTC/USDT...' },
            { icon: 'chart-areaspline', iconColor: colors.accent, text: 'Bullish breakout detected' },
            { icon: 'arrow-up-bold-circle', iconColor: colors.primary, text: 'BUY @ $67,420' },
            { icon: 'cash-check', iconColor: colors.success, text: 'Profit +$847', profit: '+$847' },
        ],
        [
            { icon: 'radar', iconColor: colors.primaryLight, text: 'Analyzing ETH markets...' },
            { icon: 'trending-up', iconColor: colors.accent, text: 'RSI oversold signal' },
            { icon: 'arrow-up-bold-circle', iconColor: colors.primary, text: 'BUY ETH @ $3,245' },
            { icon: 'trophy', iconColor: colors.success, text: 'Sold +2.8%', profit: '+2.8%' },
        ],
        [
            { icon: 'atom', iconColor: colors.primaryLight, text: 'SOL opportunity found...' },
            { icon: 'chart-bell-curve', iconColor: colors.accent, text: 'Momentum building' },
            { icon: 'rocket-launch', iconColor: colors.primary, text: 'Entry @ $142.50' },
            { icon: 'star-shooting', iconColor: colors.success, text: '+$523 profit', profit: '+$523' },
        ],
    ];

    // Terminal state
    const [visibleLines, setVisibleLines] = useState<number[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [scenarioIndex, setScenarioIndex] = useState(() => Math.floor(Math.random() * TRADING_SCENARIOS.length));

    const currentScenario = TRADING_SCENARIOS[scenarioIndex];

    useEffect(() => {
        const interval = setInterval(() => {
            if (currentLineIndex < currentScenario.length) {
                setVisibleLines(prev => [...prev, currentLineIndex]);
                setCurrentLineIndex(prev => prev + 1);
            } else {
                setTimeout(() => {
                    setVisibleLines([]);
                    setCurrentLineIndex(0);
                    setScenarioIndex(Math.floor(Math.random() * TRADING_SCENARIOS.length));
                }, 2500);
            }
        }, 1600);
        return () => clearInterval(interval);
    }, [currentLineIndex, currentScenario.length]);

    const handleGetStarted = () => {
        router.push('/features');
    };

    const handleSignIn = () => {
        router.push('/login');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Floating Background Orbs */}
            <View style={styles.orbsContainer}>
                <FloatingOrb size={220} color={colors.accentLight} x={-80} y={80} delay={0} />
                <FloatingOrb size={180} color={colors.surfaceLight} x={SCREEN_WIDTH - 100} y={180} delay={1000} />
                <FloatingOrb size={120} color={colors.accentLight} x={SCREEN_WIDTH - 140} y={SCREEN_HEIGHT - 350} delay={2000} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600 }}
                    style={styles.header}
                >
                    <View style={styles.logoContainer}>
                        <Surface style={[styles.logoIcon, { backgroundColor: colors.surface }]} elevation={2}>
                            <MaterialCommunityIcons name="robot" size={22} color={colors.primary} />
                        </Surface>
                        <Text style={[styles.appName, { color: colors.text }, fontsLoaded && { fontFamily: 'Poppins_700Bold' }]}>
                            ByteBoom-AI
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        {/* Theme Toggle Button */}
                        <IconButton
                            icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
                            iconColor={colors.primary}
                            size={22}
                            onPress={toggleTheme}
                            style={[styles.themeToggle, { backgroundColor: colors.surface }]}
                        />
                        <Button
                            mode="outlined"
                            textColor={colors.primary}
                            onPress={handleSignIn}
                            style={[styles.signInButton, { borderColor: colors.primary }]}
                            labelStyle={[styles.signInLabel, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}
                        >
                            Sign In
                        </Button>
                    </View>
                </MotiView>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 800, delay: 300 }}
                    >
                        <Text style={[styles.heroLabel, { color: colors.primary }, fontsLoaded && { fontFamily: 'Inter_600SemiBold' }]}>
                            AI-POWERED TRADING
                        </Text>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800, delay: 500 }}
                    >
                        <Text style={[styles.heroTitle, { color: colors.text }, fontsLoaded && { fontFamily: 'Poppins_800ExtraBold' }]}>
                            Trade
                        </Text>
                    </MotiView>

                    <RotatingWord fontsLoaded={fontsLoaded} primaryColor={colors.primary} />

                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 800, delay: 800 }}
                    >
                        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
                            Let AI algorithms work 24/7 while you focus on what matters. Smart trading, automated profits.
                        </Text>
                    </MotiView>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {[
                            { icon: 'chart-line', value: '$2.4M', label: 'Volume' },
                            { icon: 'trophy', value: '94.7%', label: 'Win Rate' },
                            { icon: 'account-group', value: '52K+', label: 'Users' },
                        ].map((stat, index) => (
                            <MotiView
                                key={index}
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 600, delay: 1000 + index * 150 }}
                            >
                                <Surface style={[styles.statCard, { backgroundColor: colors.surface }]} elevation={2}>
                                    <View style={[styles.statIconWrap, { backgroundColor: colors.surfaceLight }]}>
                                        <MaterialCommunityIcons name={stat.icon as any} size={20} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.statValue, { color: colors.text }, fontsLoaded && { fontFamily: 'Poppins_700Bold' }]}>{stat.value}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>{stat.label}</Text>
                                </Surface>
                            </MotiView>
                        ))}
                    </View>
                </View>

                {/* macOS Terminal Card */}
                <MotiView
                    from={{ opacity: 0, translateY: 40 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 800, delay: 1500 }}
                    style={styles.terminalContainer}
                >
                    {/* Animated Flowing Border */}
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{ 
                            type: 'timing', 
                            duration: 6000, 
                            loop: true,
                            easing: Easing.linear,
                        }}
                        style={styles.borderAnimationContainer}
                    >
                        <View style={[
                            styles.flowingBorder,
                            {
                                borderTopColor: colors.primary,
                                borderRightColor: 'transparent',
                                borderBottomColor: 'transparent',
                                borderLeftColor: 'transparent',
                            }
                        ]} />
                    </MotiView>

                    <Surface 
                        style={[
                            styles.terminalCard, 
                            { 
                                backgroundColor: isDark ? colors.terminalBg : '#F8F9FA',
                            }
                        ]} 
                        elevation={isDark ? 4 : 2}
                    >
                        <View style={[
                            styles.titleBar, 
                            { backgroundColor: isDark ? colors.terminalHeader : '#E9ECEF' }
                        ]}>
                            <View style={styles.trafficLights}>
                                <View style={[styles.trafficLight, { backgroundColor: colors.trafficRed }]} />
                                <View style={[styles.trafficLight, { backgroundColor: colors.trafficYellow }]} />
                                <View style={[styles.trafficLight, { backgroundColor: colors.trafficGreen }]} />
                            </View>
                            <Text style={[styles.titleBarText, { color: isDark ? colors.textLight : '#495057' }]}>TradeBot Terminal</Text>
                            <View style={styles.liveIndicator}>
                                <MotiView
                                    from={{ scale: 1, opacity: 0.8 }}
                                    animate={{ scale: 2.5, opacity: 0 }}
                                    transition={{ type: 'timing', duration: 1500, loop: true }}
                                    style={[styles.livePulse, { backgroundColor: colors.primary }]}
                                />
                                <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.liveText, { color: colors.primary }]}>● LIVE</Text>
                            </View>
                        </View>

                        <View style={styles.terminalContent}>
                            <View style={[
                                styles.terminalHeader, 
                                { borderBottomColor: isDark ? colors.terminalBorder : '#DEE2E6' }
                            ]}>
                                <MaterialCommunityIcons name="connection" size={14} color={colors.primaryLight} />
                                <Text style={[
                                    styles.terminalHeaderText, 
                                    { color: isDark ? colors.textLight : '#6C757D' }
                                ]}>Connected to Binance API</Text>
                            </View>

                            <View style={styles.terminalLines}>
                                {visibleLines.map((lineIndex) => {
                                    const signal = currentScenario[lineIndex];
                                    return (
                                        <MotiView
                                            key={`${scenarioIndex}-${lineIndex}`}
                                            from={{ opacity: 0, translateX: -15 }}
                                            animate={{ opacity: 1, translateX: 0 }}
                                            transition={{ type: 'timing', duration: 500 }}
                                            style={styles.terminalLine}
                                        >
                                            <View style={[
                                                styles.lineIcon, 
                                                { backgroundColor: `${signal.iconColor}${isDark ? '20' : '15'}` }
                                            ]}>
                                                <MaterialCommunityIcons name={signal.icon as any} size={16} color={signal.iconColor} />
                                            </View>
                                            <Text style={[
                                                styles.lineText, 
                                                { color: isDark ? colors.text : '#343A40' }
                                            ]}>{signal.text}</Text>
                                            {signal.profit && (
                                                <View style={[styles.profitBadge, { backgroundColor: colors.success }]}>
                                                    <Text style={[styles.profitText, { color: colors.textOnPrimary }]}>{signal.profit}</Text>
                                                </View>
                                            )}
                                        </MotiView>
                                    );
                                })}
                            </View>

                            <View style={styles.inputLine}>
                                <Text style={[styles.promptText, { color: colors.primaryLight }]}>❯</Text>
                                <MotiView
                                    from={{ opacity: 0.3 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
                                    style={[styles.cursorBlock, { backgroundColor: colors.primaryLight }]}
                                />
                            </View>
                        </View>
                    </Surface>
                </MotiView>

                {/* Feature Chips */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 600, delay: 1800 }}
                    style={styles.chipsContainer}
                >
                    {[
                        { icon: 'brain', label: 'AI-Powered' },
                        { icon: 'shield-check', label: 'Secure' },
                        { icon: 'clock-fast', label: '24/7' },
                    ].map((chip, index) => (
                        <Chip
                            key={index}
                            icon={() => <MaterialCommunityIcons name={chip.icon as any} size={16} color={colors.primary} />}
                            style={[styles.chip, { backgroundColor: colors.surface }]}
                            textStyle={[styles.chipText, { color: colors.text }, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}
                        >
                            {chip.label}
                        </Chip>
                    ))}
                </MotiView>

                {/* CTA Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600, delay: 2000 }}
                    style={styles.ctaSection}
                >
                    <Button
                        mode="contained"
                        onPress={handleGetStarted}
                        style={styles.ctaButton}
                        contentStyle={styles.ctaButtonContent}
                        labelStyle={[styles.ctaButtonLabel, fontsLoaded && { fontFamily: 'Poppins_600SemiBold' }]}
                        buttonColor={colors.primary}
                    >
                        Get Started →
                    </Button>
                    <Text style={[styles.ctaSubtext, { color: colors.textLight }, fontsLoaded && { fontFamily: 'Inter_400Regular' }]}>
                        No credit card required • Cancel anytime
                    </Text>

                    {/* New User Growth Section */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: 2000 }}
                        style={[styles.usersChip, { backgroundColor: `${colors.primary}15` }]}
                    >
                        <View style={styles.userAvatars}>
                            {[1, 2, 3, 4].map((i) => (
                                <View key={i} style={[styles.avatarCircle, { backgroundColor: colors.surface, marginLeft: i === 1 ? 0 : -8 }]}>
                                    <MaterialCommunityIcons name="account" size={12} color={colors.textLight} />
                                </View>
                            ))}
                        </View>
                        <Text style={[styles.usersText, { color: colors.textSecondary }]}>
                            Join <Text style={{ color: colors.primary, fontWeight: '700' }}>50k+</Text> active traders
                        </Text>
                    </MotiView>
                </MotiView>

                {/* Trust Section */}
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 600, delay: 2200 }}
                    style={styles.trustSection}
                >
                    <View style={styles.trustBadge}>
                        <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                        <Text style={[styles.trustText, { color: colors.textSecondary }, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>4.9/5 Rating</Text>
                    </View>
                    <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.trustBadge}>
                        <MaterialCommunityIcons name="shield-lock" size={16} color={colors.success} />
                        <Text style={[styles.trustText, { color: colors.textSecondary }, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>Encrypted</Text>
                    </View>
                    <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.trustBadge}>
                        <MaterialCommunityIcons name="headset" size={16} color={colors.primary} />
                        <Text style={[styles.trustText, { color: colors.textSecondary }, fontsLoaded && { fontFamily: 'Inter_500Medium' }]}>24/7 Support</Text>
                    </View>
                </MotiView>

                {/* Exchanges Row */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 800, delay: 2400 }}
                    style={styles.exchangesContainer}
                >
                    <Text style={[styles.exchangesTitle, { color: colors.textLight }]}>SUPPORTED EXCHANGES</Text>
                    <View style={styles.exchangesRow}>
                        <MaterialCommunityIcons name="alpha-b-circle" size={28} color="#F0B90B" />
                        <MaterialCommunityIcons name="alpha-b-box" size={28} color="#00D4AA" />
                        <MaterialCommunityIcons name="alpha-g-circle" size={28} color="#17E6A1" />
                        <MaterialCommunityIcons name="alpha-m-circle" size={28} color="#1972F5" />
                        <Text style={[styles.moreExchanges, { color: colors.textLight }]}>+12 more</Text>
                    </View>
                </MotiView>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    orbsContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    floatingOrb: {
        position: 'absolute',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appName: {
        fontSize: 21,
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    themeToggle: {
        margin: 0,
        borderRadius: 12,
    },
    signInButton: {
        borderRadius: 22,
    },
    signInLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    heroSection: {
        marginTop: 16,
        marginBottom: 28,
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2.5,
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 56,
        fontWeight: '800',
        letterSpacing: -2,
    },
    rotatingContainer: {
        height: 70,
        justifyContent: 'center',
        marginBottom: 16,
    },
    rotatingWord: {
        fontSize: 52,
        fontWeight: '800',
        letterSpacing: -2,
        fontStyle: 'italic',
    },
    heroSubtitle: {
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 28,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 3,
    },
    terminalContainer: {
        position: 'relative',
        marginBottom: 24,
    },
    borderAnimationContainer: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        zIndex: 0,
    },
    flowingBorder: {
        flex: 1,
        borderRadius: 23,
        borderWidth: 3,
        borderStyle: 'solid',
    },
    terminalCard: {
        borderRadius: 20,
        overflow: 'hidden',
        zIndex: 1,
    },
    titleBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    trafficLights: {
        flexDirection: 'row',
        gap: 8,
    },
    trafficLight: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    titleBarText: {
        fontSize: 13,
        fontWeight: '500',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    livePulse: {
        position: 'absolute',
        left: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 2,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    terminalContent: {
        padding: 18,
    },
    terminalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    terminalHeaderText: {
        fontSize: 12,
    },
    terminalLines: {
        minHeight: 130,
        gap: 12,
    },
    terminalLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    lineIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lineText: {
        flex: 1,
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    profitBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    profitText: {
        fontSize: 12,
        fontWeight: '700',
    },
    inputLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    promptText: {
        fontSize: 14,
        fontWeight: '700',
    },
    cursorBlock: {
        width: 8,
        height: 18,
        borderRadius: 2,
    },
    chipsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 28,
    },
    chip: {
        borderRadius: 20,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    ctaSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    ctaButton: {
        borderRadius: 28,
        width: '100%',
        elevation: 4,
    },
    ctaButtonContent: {
        height: 58,
    },
    ctaButtonLabel: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    ctaSubtext: {
        fontSize: 13,
        marginTop: 14,
    },
    trustSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
    },
    trustText: {
        fontSize: 12,
        fontWeight: '500',
    },
    trustDivider: {
        width: 1,
        height: 16,
        marginHorizontal: 4,
    },
    // New Styles
    usersChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 24,
    },
    userAvatars: {
        flexDirection: 'row',
        marginRight: 10,
    },
    avatarCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    usersText: {
        fontSize: 13,
    },
    exchangesContainer: {
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 20,
    },
    exchangesTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 16,
    },
    exchangesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        opacity: 0.6,
    },
    moreExchanges: {
        fontSize: 12,
        fontWeight: '500',
    },
});
