import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from 'react';
import { PaperProvider } from 'react-native-paper';
import { Animated, View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

// Import contexts
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ExchangeProvider } from '@/contexts/ExchangeContext';

// Import centralized font loading
import { useAppFonts } from '@/hooks/useAppFonts';

// Prevent the splash screen from auto-hiding until we explicitly call hideAsync
SplashScreen.preventAutoHideAsync();

// Inner component that uses theme
function AppContent() {
    const { paperTheme, isDark, colors, themeTransition } = useTheme();
    const { fontsLoaded, fontError } = useAppFonts();

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded || fontError) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    useEffect(() => {
        onLayoutRootView();
    }, [onLayoutRootView]);

    // Show loading while fonts are loading
    if (!fontsLoaded && !fontError) {
        return (
            <View style={[loadingStyles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Interpolate background color
    const backgroundColor = themeTransition.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.background, colors.background],
    });

    return (
        <Animated.View style={{ flex: 1, backgroundColor }}>
            <PaperProvider theme={paperTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style={isDark ? 'light' : 'dark'} animated />
            </PaperProvider>
        </Animated.View>
    );
}

const loadingStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ExchangeProvider>
                    <AppContent />
                </ExchangeProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
