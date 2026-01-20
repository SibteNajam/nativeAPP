/**
 * App Entry Point - Session Aware Router
 * ========================================
 * Checks authentication status on app start:
 * - If authenticated (token exists) → Redirect to main dashboard (tabs)
 * - If not authenticated → Redirect to onboarding/welcome
 * 
 * This ensures users stay logged in until they explicitly logout.
 */

import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();
    const { colors } = useTheme();

    // Show loading spinner while checking auth status
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // If authenticated, go to main dashboard
    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    }

    // Not authenticated, go to welcome/onboarding
    return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
