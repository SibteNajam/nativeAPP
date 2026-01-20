/**
 * Animated Background Component
 * ===============================
 * Creates floating geometric shapes with subtle animations
 * Premium animated background for modern app feel
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

// Types
type VariantType = 'home' | 'explore' | 'welcome';

interface ShapeConfig {
    top: string;
    left: string;
    size: number;
    color: string;
    borderRadius: number;
    rotation: string;
    opacity: number;
    animationDelay: number;
    parallaxSpeed: number;
}

interface AnimatedBackgroundProps {
    scrollY?: any; // Animated.Value
    variant?: 'home' | 'explore' | 'welcome';
}

export default function AnimatedBackground({ scrollY, variant = 'home' }: AnimatedBackgroundProps) {
    const { colors } = useTheme();

    // Different shape configurations for different pages
    const shapes = getShapesForVariant(variant as VariantType, colors);

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Floating shapes */}
            {shapes.map((shape: ShapeConfig, index: number) => {
                // Calculate parallax transform if scrollY is provided
                const parallaxStyle = scrollY ? {
                    transform: [{
                        translateY: scrollY.interpolate({
                            inputRange: [0, 500],
                            outputRange: [0, shape.parallaxSpeed * 100],
                            extrapolate: 'clamp',
                        }),
                    }],
                } : {};

                return (
                    // Use Animated.View for the scroll parallax effect
                    <React.Fragment key={`shape-${index}`}>
                        {scrollY ? (
                            <Animated.View
                                style={[
                                    styles.shapeContainer,
                                    {
                                        top: shape.top as any,
                                        left: shape.left as any,
                                    },
                                    parallaxStyle,
                                ]}
                            >
                                {/* Use MotiView for the internal floating/pulse animation */}
                                <MotiView
                                    from={{
                                        opacity: 0,
                                        scale: 0.8,
                                    }}
                                    animate={{
                                        opacity: shape.opacity,
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                        type: 'timing',
                                        duration: 3000,
                                        delay: shape.animationDelay,
                                        loop: true,
                                    }}
                                    style={{
                                        width: shape.size,
                                        height: shape.size,
                                        backgroundColor: shape.color,
                                        borderRadius: shape.borderRadius,
                                        transform: [{ rotate: shape.rotation }],
                                    }}
                                />
                            </Animated.View>
                        ) : (
                            // Fallback if no scrollY provided (just static position with floating animation)
                            <MotiView
                                from={{
                                    opacity: 0,
                                    scale: 0.8,
                                }}
                                animate={{
                                    opacity: shape.opacity,
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    type: 'timing',
                                    duration: 3000,
                                    delay: shape.animationDelay,
                                    loop: true,
                                }}
                                style={[
                                    styles.shape,
                                    {
                                        top: shape.top as any,
                                        left: shape.left as any,
                                        width: shape.size,
                                        height: shape.size,
                                        backgroundColor: shape.color,
                                        borderRadius: shape.borderRadius,
                                        transform: [{ rotate: shape.rotation }],
                                    },
                                ]}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Floating orbs with pulse animation (no parallax) */}
            {[0, 1, 2].map((index: number) => (
                <MotiView
                    key={`orb-${index}`}
                    from={{
                        opacity: 0.05,
                        scale: 1,
                    }}
                    animate={{
                        opacity: [0.08, 0.15, 0.08],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        type: 'timing',
                        duration: 4000 + index * 800,
                        delay: index * 600,
                        loop: true,
                    }}
                    style={[
                        styles.orb,
                        {
                            top: `${20 + index * 25}%` as any,
                            right: `${10 + index * 15}%` as any,
                            width: 80 + index * 40,
                            height: 80 + index * 40,
                            backgroundColor: colors.primary,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

// Generate shapes based on page variant
function getShapesForVariant(variant: VariantType, colors: any): ShapeConfig[] {
    const baseShapes: Record<VariantType, ShapeConfig[]> = {
        home: [
            {
                top: '10%',
                left: '5%',
                size: 100,
                color: `${colors.primary}15`,
                borderRadius: 20,
                rotation: '15deg',
                opacity: 0.4,
                animationDelay: 0,
                parallaxSpeed: -0.5,
            },
            {
                top: '25%',
                left: '75%',
                size: 80,
                color: `${colors.neonBlue}10`,
                borderRadius: 40,
                rotation: '-20deg',
                opacity: 0.3,
                animationDelay: 200,
                parallaxSpeed: 0.8,
            },
            {
                top: '50%',
                left: '10%',
                size: 120,
                color: `${colors.success}08`,
                borderRadius: 60,
                rotation: '45deg',
                opacity: 0.2,
                animationDelay: 400,
                parallaxSpeed: -0.3,
            },
            {
                top: '65%',
                left: '70%',
                size: 90,
                color: `${colors.primaryLight}12`,
                borderRadius: 15,
                rotation: '-30deg',
                opacity: 0.35,
                animationDelay: 600,
                parallaxSpeed: 0.6,
            },
        ],
        explore: [
            {
                top: '5%',
                left: '15%',
                size: 110,
                color: `${colors.neonPurple}15`,
                borderRadius: 55,
                rotation: '0deg',
                opacity: 0.3,
                animationDelay: 0,
                parallaxSpeed: -0.4,
            },
            {
                top: '20%',
                left: '80%',
                size: 70,
                color: `${colors.warning}12`,
                borderRadius: 12,
                rotation: '25deg',
                opacity: 0.25,
                animationDelay: 300,
                parallaxSpeed: 0.7,
            },
            {
                top: '45%',
                left: '5%',
                size: 95,
                color: `${colors.success}10`,
                borderRadius: 48,
                rotation: '-15deg',
                opacity: 0.28,
                animationDelay: 500,
                parallaxSpeed: -0.6,
            },
            {
                top: '70%',
                left: '75%',
                size: 130,
                color: `${colors.primary}10`,
                borderRadius: 25,
                rotation: '40deg',
                opacity: 0.2,
                animationDelay: 700,
                parallaxSpeed: 0.5,
            },
        ],
        welcome: [
            {
                top: '8%',
                left: '10%',
                size: 140,
                color: `${colors.primary}20`,
                borderRadius: 70,
                rotation: '0deg',
                opacity: 0.4,
                animationDelay: 0,
                parallaxSpeed: -0.3,
            },
            {
                top: '30%',
                left: '70%',
                size: 100,
                color: `${colors.neonBlue}15`,
                borderRadius: 20,
                rotation: '45deg',
                opacity: 0.35,
                animationDelay: 250,
                parallaxSpeed: 0.5,
            },
            {
                top: '55%',
                left: '15%',
                size: 85,
                color: `${colors.success}12`,
                borderRadius: 18,
                rotation: '-25deg',
                opacity: 0.3,
                animationDelay: 450,
                parallaxSpeed: -0.7,
            },
            {
                top: '75%',
                left: '65%',
                size: 115,
                color: `${colors.primaryLight}18`,
                borderRadius: 58,
                rotation: '20deg',
                opacity: 0.25,
                animationDelay: 650,
                parallaxSpeed: 0.4,
            },
        ],
    };

    return baseShapes[variant] || baseShapes.home;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
    },
    shape: {
        position: 'absolute',
    },
    shapeContainer: {
        position: 'absolute',
    },
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
});
