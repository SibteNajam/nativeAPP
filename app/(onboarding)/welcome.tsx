import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Beautiful Trading Bot Illustration Component
const TradingBotIllustration = () => (
    <Svg width={SCREEN_WIDTH * 0.85} height={320} viewBox="0 0 340 320">
        <Defs>
            <SvgGradient id="botGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#4DA6FF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
            </SvgGradient>
            <SvgGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
            </SvgGradient>
            <SvgGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#4DA6FF" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
            </SvgGradient>
        </Defs>

        {/* Background Glow Circles */}
        <Circle cx="170" cy="160" r="140" fill="url(#glowGradient)" />
        <Circle cx="170" cy="160" r="100" fill="rgba(77, 166, 255, 0.1)" />

        {/* Floating Coins */}
        <G>
            {/* Bitcoin-style coin */}
            <Circle cx="280" cy="80" r="28" fill="#F59E0B" />
            <Circle cx="280" cy="80" r="22" fill="#FBBF24" />
            <SvgText x="280" y="88" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#92400E">₿</SvgText>

            {/* Ethereum-style coin */}
            <Circle cx="60" cy="120" r="22" fill="#627EEA" />
            <Circle cx="60" cy="120" r="17" fill="#8198EE" />
            <Path d="M60 108 L68 120 L60 126 L52 120 Z" fill="#FFFFFF" opacity="0.9" />

            {/* Small floating coin */}
            <Circle cx="300" cy="200" r="16" fill="#10B981" />
            <Circle cx="300" cy="200" r="12" fill="#34D399" />
        </G>

        {/* Main Bot Body */}
        <G>
            {/* Bot Head - Rounded Rectangle */}
            <Rect x="120" y="100" width="100" height="80" rx="20" fill="url(#botGradient)" />

            {/* Bot Eyes */}
            <Circle cx="150" cy="135" r="12" fill="#FFFFFF" />
            <Circle cx="190" cy="135" r="12" fill="#FFFFFF" />
            <Circle cx="152" cy="137" r="5" fill="#1E3A5F" />
            <Circle cx="192" cy="137" r="5" fill="#1E3A5F" />

            {/* Bot Antenna */}
            <Rect x="165" y="80" width="10" height="25" rx="5" fill="#4DA6FF" />
            <Circle cx="170" cy="75" r="8" fill="#60A5FA" />
            <Circle cx="170" cy="75" r="4" fill="#FFFFFF" opacity="0.8" />

            {/* Bot Mouth - LED Display */}
            <Rect x="145" y="155" width="50" height="12" rx="4" fill="#0F172A" />
            <G>
                <Rect x="150" y="158" width="6" height="6" rx="1" fill="#10B981" />
                <Rect x="160" y="158" width="6" height="6" rx="1" fill="#10B981" />
                <Rect x="170" y="158" width="6" height="6" rx="1" fill="#10B981" />
                <Rect x="180" y="158" width="6" height="6" rx="1" fill="#10B981" />
            </G>
        </G>

        {/* Trading Chart */}
        <G>
            {/* Chart Background */}
            <Rect x="85" y="195" width="170" height="90" rx="12" fill="rgba(15, 23, 42, 0.8)" />

            {/* Chart Grid Lines */}
            <Path d="M95 220 L245 220" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <Path d="M95 245 L245 245" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <Path d="M95 270 L245 270" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Candlestick Chart Line */}
            <Path
                d="M100 260 L120 250 L135 265 L150 240 L165 255 L180 230 L195 245 L210 220 L225 235 L240 215"
                stroke="#10B981"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Glow under chart line */}
            <Path
                d="M100 260 L120 250 L135 265 L150 240 L165 255 L180 230 L195 245 L210 220 L225 235 L240 215 L240 280 L100 280 Z"
                fill="url(#chartGradient)"
                opacity="0.4"
            />

            {/* Data Points */}
            <Circle cx="180" cy="230" r="4" fill="#10B981" />
            <Circle cx="210" cy="220" r="4" fill="#10B981" />
            <Circle cx="240" cy="215" r="4" fill="#10B981" />
        </G>

        {/* Floating Elements */}
        <G opacity="0.6">
            <Circle cx="50" cy="220" r="6" fill="#8B5CF6" />
            <Circle cx="290" cy="140" r="8" fill="#EC4899" />
            <Circle cx="40" cy="180" r="4" fill="#F59E0B" />
        </G>

        {/* Connection Lines */}
        <Path d="M120 140 L80 140 L80 200" stroke="#4DA6FF" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
        <Path d="M220 140 L260 140 L260 180" stroke="#4DA6FF" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
    </Svg>
);

export default function WelcomeScreen() {
    const handleGetStarted = () => {
        router.push('/features');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#0A1628', '#0F2744', '#0A1628']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative Background Elements */}
                <View style={styles.bgPattern}>
                    <View style={[styles.bgCircle, styles.bgCircle1]} />
                    <View style={[styles.bgCircle, styles.bgCircle2]} />
                    <View style={[styles.bgCircle, styles.bgCircle3]} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Illustration Section */}
                    <View style={styles.illustrationSection}>
                        <TradingBotIllustration />
                    </View>

                    {/* Text Section */}
                    <View style={styles.textSection}>
                        <Text style={styles.headline}>
                            Maximize Your
                        </Text>
                        <Text style={styles.headlineAccent}>
                            Profit Potential
                        </Text>

                        <Text style={styles.description}>
                            Our AI-powered trading bot works 24/7 to analyze markets
                            and execute profitable trades automatically.
                        </Text>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>98%</Text>
                                <Text style={styles.statLabel}>Accuracy</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>24/7</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>50K+</Text>
                                <Text style={styles.statLabel}>Users</Text>
                            </View>
                        </View>
                    </View>

                    {/* Button Section */}
                    <View style={styles.buttonSection}>
                        <TouchableOpacity
                            style={styles.getStartedButton}
                            onPress={handleGetStarted}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4DA6FF', '#2563EB']}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.getStartedText}>Get Started</Text>
                                <Text style={styles.arrowIcon}>→</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={styles.bottomText}>
                            No credit card required • Start trading in seconds
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    bgPattern: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    bgCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    bgCircle1: {
        width: 300,
        height: 300,
        backgroundColor: 'rgba(77, 166, 255, 0.08)',
        top: -100,
        right: -100,
    },
    bgCircle2: {
        width: 200,
        height: 200,
        backgroundColor: 'rgba(139, 92, 246, 0.06)',
        bottom: 100,
        left: -80,
    },
    bgCircle3: {
        width: 150,
        height: 150,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        top: '40%',
        right: -50,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    illustrationSection: {
        flex: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textSection: {
        flex: 0.35,
        justifyContent: 'flex-start',
    },
    headline: {
        fontSize: 32,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    headlineAccent: {
        fontSize: 36,
        fontWeight: '800',
        color: '#4DA6FF',
        letterSpacing: -1,
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.75)',
        lineHeight: 22,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#4DA6FF',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    buttonSection: {
        flex: 0.15,
        justifyContent: 'flex-end',
    },
    getStartedButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#4DA6FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 8,
    },
    getStartedText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    arrowIcon: {
        fontSize: 20,
        color: '#FFFFFF',
    },
    bottomText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginTop: 16,
    },
});
