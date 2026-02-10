/**
 * Pricing Plans Component
 * Beautiful pricing cards for onboarding
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface PricingPlan {
    name: string;
    price: string;
    period: string;
    popular?: boolean;
    features: string[];
    icon: string;
    color: string;
}

export default function PricingPlans() {
    const { colors, isDark } = useTheme();

    const plans: PricingPlan[] = [
        {
            name: 'Starter',
            price: 'Free',
            period: 'Forever',
            icon: 'rocket-launch-outline',
            color: colors.success,
            features: [
                'Up to $1,000 trading volume',
                'Basic AI strategies',
                '2 exchange connections',
                'Email support',
                'Community access',
            ],
        },
        {
            name: 'Pro',
            price: '$49',
            period: '/month',
            popular: true,
            icon: 'lightning-bolt',
            color: colors.primary,
            features: [
                'Unlimited trading volume',
                'Advanced AI strategies',
                'Unlimited exchanges',
                'Priority support 24/7',
                'Custom indicators',
                'Risk management tools',
            ],
        },
        {
            name: 'Enterprise',
            price: '$199',
            period: '/month',
            icon: 'crown',
            color: colors.warning,
            features: [
                'Everything in Pro',
                'Dedicated account manager',
                'Custom bot development',
                'API access',
                'White-label options',
                'SLA guarantee',
            ],
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
                    Choose Your Plan
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Start free, upgrade when you&apos;re ready
                </Text>
            </MotiView>

            <View style={styles.plansContainer}>
                {plans.map((plan, index) => (
                    <MotiView
                        key={plan.name}
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: index * 150, damping: 15 }}
                    >
                        <Surface
                            style={[
                                styles.planCard,
                                {
                                    backgroundColor: colors.surface,
                                    borderColor: plan.popular ? plan.color : colors.border,
                                    borderWidth: plan.popular ? 2 : 1,
                                },
                            ]}
                            elevation={plan.popular ? 4 : 1}
                        >
                            {plan.popular && (
                                <View
                                    style={[
                                        styles.popularBadge,
                                        { backgroundColor: plan.color },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="star"
                                        size={12}
                                        color="#fff"
                                    />
                                    <Text style={styles.popularText}>Most Popular</Text>
                                </View>
                            )}

                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: `${plan.color}${isDark ? '30' : '15'}` },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={plan.icon as any}
                                    size={32}
                                    color={plan.color}
                                />
                            </View>

                            <Text style={[styles.planName, { color: colors.text }]}>
                                {plan.name}
                            </Text>

                            <View style={styles.priceContainer}>
                                <Text style={[styles.price, { color: colors.text }]}>
                                    {plan.price}
                                </Text>
                                <Text
                                    style={[styles.period, { color: colors.textSecondary }]}
                                >
                                    {plan.period}
                                </Text>
                            </View>

                            <View style={styles.featuresContainer}>
                                {plan.features.map((feature, i) => (
                                    <View key={i} style={styles.featureRow}>
                                        <MaterialCommunityIcons
                                            name="check-circle"
                                            size={16}
                                            color={plan.color}
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

                            <Pressable
                                style={({ pressed }) => [
                                    styles.selectButton,
                                    {
                                        backgroundColor: plan.popular
                                            ? plan.color
                                            : colors.border,
                                        opacity: pressed ? 0.8 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.selectButtonText,
                                        {
                                            color: plan.popular
                                                ? '#fff'
                                                : colors.text,
                                        },
                                    ]}
                                >
                                    Get Started
                                </Text>
                            </Pressable>
                        </Surface>
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
    plansContainer: {
        gap: 16,
    },
    planCard: {
        borderRadius: 20,
        padding: 20,
        position: 'relative',
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    popularText: {
        color: '#fff',
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
    planName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    price: {
        fontSize: 36,
        fontWeight: '800',
    },
    period: {
        fontSize: 16,
        marginLeft: 4,
        marginBottom: 4,
    },
    featuresContainer: {
        gap: 12,
        marginBottom: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        flex: 1,
    },
    selectButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    selectButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
