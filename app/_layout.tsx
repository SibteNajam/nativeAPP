import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

// Import contexts
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ExchangeProvider } from '@/contexts/ExchangeContext';

// Prevent the splash screen from auto-hiding until we explicitly call hideAsync
SplashScreen.preventAutoHideAsync();

// Inner component that uses theme
function AppContent() {
    const { paperTheme, isDark } = useTheme();

    useEffect(() => {
        // Hide splash screen after theme is loaded
        const hideSplash = async () => {
            await SplashScreen.hideAsync();
        };
        hideSplash();
    }, []);

    return (
        <PaperProvider theme={paperTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style={isDark ? 'light' : 'dark'} />
        </PaperProvider>
    );
}

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

