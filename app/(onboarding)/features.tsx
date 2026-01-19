import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

// Custom Icon Components
const RobotIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="8" width="16" height="12" rx="3" stroke="#4DA6FF" strokeWidth="2" />
        <Circle cx="9" cy="14" r="1.5" fill="#4DA6FF" />
        <Circle cx="15" cy="14" r="1.5" fill="#4DA6FF" />
        <Path d="M12 4V8" stroke="#4DA6FF" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="3" r="1.5" fill="#4DA6FF" />
        <Path d="M2 12H4" stroke="#4DA6FF" strokeWidth="2" strokeLinecap="round" />
        <Path d="M20 12H22" stroke="#4DA6FF" strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const ChartIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Path d="M3 3V21H21" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 14L11 10L15 14L21 8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="21" cy="8" r="2" fill="#10B981" />
    </Svg>
);

const AutoTradeIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke="#8B5CF6" strokeWidth="2" />
        <Path d="M12 6V12L16 14" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
        <Path d="M17 3L19 5L17 7" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 17L5 19L7 21" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ExchangeIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2" />
        <Path d="M8 12H16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 8V16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <Path d="M9 9L12 6L15 9" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 15L12 18L9 15" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ShieldIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Path d="M12 3L4 7V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V7L12 3Z" stroke="#EC4899" strokeWidth="2" strokeLinejoin="round" />
        <Path d="M9 12L11 14L15 10" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const LightningIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <Path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(245, 158, 11, 0.2)" />
    </Svg>
);

// Exchange Logo Components
const BinanceLogo = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
        <Path d="M12 2L14.5 4.5L10 9L7.5 6.5L12 2Z" fill="#F3BA2F" />
        <Path d="M17 7L19.5 9.5L12 17L4.5 9.5L7 7L12 12L17 7Z" fill="#F3BA2F" />
        <Path d="M22 12L19.5 14.5L17 12L19.5 9.5L22 12Z" fill="#F3BA2F" />
        <Path d="M2 12L4.5 9.5L7 12L4.5 14.5L2 12Z" fill="#F3BA2F" />
        <Path d="M12 22L9.5 19.5L12 17L14.5 19.5L12 22Z" fill="#F3BA2F" />
    </Svg>
);

const BitgetLogo = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#00F0FF" opacity="0.2" />
        <Path d="M7 8H17L12 16L7 8Z" fill="#00F0FF" />
        <Path d="M9 10H15L12 14L9 10Z" fill="#FFFFFF" />
    </Svg>
);

const MexcLogo = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#2EBD85" opacity="0.2" />
        <Path d="M6 12L10 6L12 10L14 6L18 12L14 18L12 14L10 18L6 12Z" fill="#2EBD85" />
    </Svg>
);

const GateioLogo = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" stroke="#2354E6" strokeWidth="2" fill="none" />
        <Path d="M12 7V12H17" stroke="#2354E6" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="12" r="3" fill="#2354E6" />
    </Svg>
);

// Feature data with icon components
const FEATURES = [
    {
        Icon: RobotIcon,
        title: 'AI-Powered Trading',
        description: 'Advanced algorithms analyze markets 24/7 for optimal trade execution.',
        color: '#4DA6FF',
    },
    {
        Icon: ChartIcon,
        title: 'Smart Analytics',
        description: 'Real-time insights and performance tracking at your fingertips.',
        color: '#10B981',
    },
    {
        Icon: AutoTradeIcon,
        title: 'Auto-Trading',
        description: 'Set your strategy and let our bot execute trades automatically.',
        color: '#8B5CF6',
    },
    {
        Icon: ExchangeIcon,
        title: 'Multi-Exchange',
        description: 'Connect to Binance, Bitget, MEXC, Gate.io and more.',
        color: '#F59E0B',
    },
    {
        Icon: ShieldIcon,
        title: 'Bank-Grade Security',
        description: 'Your funds and API keys are protected with enterprise encryption.',
        color: '#EC4899',
    },
    {
        Icon: LightningIcon,
        title: 'Lightning Fast',
        description: 'Execute trades in milliseconds to capture every opportunity.',
        color: '#F59E0B',
    },
];

// Exchange data
const EXCHANGES = [
    { name: 'Binance', Logo: BinanceLogo, color: '#F3BA2F' },
    { name: 'Bitget', Logo: BitgetLogo, color: '#00F0FF' },
    { name: 'MEXC', Logo: MexcLogo, color: '#2EBD85' },
    { name: 'Gate.io', Logo: GateioLogo, color: '#2354E6' },
];

export default function FeaturesScreen() {
    const handleContinue = () => {
        router.replace('/login');
    };

    const handleBack = () => {
        router.back();
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.dotInactive]} />
                        <View style={[styles.dot, styles.dotActive]} />
                    </View>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Powerful</Text>
                        <Text style={styles.titleAccent}>Features</Text>
                        <Text style={styles.subtitle}>
                            Everything you need to trade smarter and grow your portfolio.
                        </Text>
                    </View>

                    {/* Supported Exchanges */}
                    <View style={styles.exchangesSection}>
                        <Text style={styles.exchangesLabel}>SUPPORTED EXCHANGES</Text>
                        <View style={styles.exchangesList}>
                            {EXCHANGES.map((exchange, index) => (
                                <View key={index} style={[styles.exchangeBadge, { borderColor: `${exchange.color}40` }]}>
                                    <exchange.Logo />
                                    <Text style={styles.exchangeText}>{exchange.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Features List */}
                    <View style={styles.featuresSection}>
                        {FEATURES.map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                                    <feature.Icon />
                                </View>
                                <View style={styles.featureContent}>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDescription}>{feature.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Spacer for button */}
                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Bottom CTA */}
                <View style={styles.bottomSection}>
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={handleContinue}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#4DA6FF', '#2563EB']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.continueText}>Start Trading Now</Text>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </LinearGradient>
                    </TouchableOpacity>
                    <Text style={styles.joinText}>Join 50,000+ traders worldwide</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        backgroundColor: '#4DA6FF',
    },
    dotInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    placeholder: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    titleSection: {
        marginTop: 20,
        marginBottom: 28,
    },
    title: {
        fontSize: 34,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    titleAccent: {
        fontSize: 38,
        fontWeight: '800',
        color: '#4DA6FF',
        letterSpacing: -1,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 22,
    },
    exchangesSection: {
        marginBottom: 28,
    },
    exchangesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    exchangesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    exchangeBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    exchangeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    featuresSection: {
        gap: 12,
    },
    featureCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    featureIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 18,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    continueButton: {
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
    continueText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    joinText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginTop: 14,
    },
});
