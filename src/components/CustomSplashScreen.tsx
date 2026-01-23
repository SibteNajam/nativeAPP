/**
 * Custom Splash Screen with Blurred Background & Logo
 * 
 * This creates a beautiful splash screen with:
 * - Logo.png as background (blurred)
 * - Reduced opacity for smooth effect
 * - Smooth fade-out animation
 */

import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Prevent automatic splash screen hiding
SplashScreen.preventAutoHideAsync();

export const CustomSplashScreen = () => {
    const fadeAnim = new Animated.Value(1);

    useEffect(() => {
        // Keep splash visible for 2 seconds, then fade out
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                SplashScreen.hideAsync();
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [fadeAnim]);

    return (
        <Animated.View 
            style={[
                styles.container,
                { opacity: fadeAnim }
            ]}
        >
            {/* Blurred Background */}
            <Image
                source={require('../../assets/images/logo.png')}
                style={[styles.backgroundImage, styles.blur]}
                blurRadius={15}
            />

            {/* Logo on top */}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/logo.png')}
                    style={styles.logo}
                />
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#7c3aed',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3, // Reduced opacity for smooth effect
    },
    blur: {
        // Blur is applied via blurRadius prop
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },
});

export default CustomSplashScreen;
