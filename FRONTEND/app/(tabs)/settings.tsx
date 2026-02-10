/**
 * Settings Screen
 * Professional settings page with biometric authentication
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

// Contexts & Services
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { biometricService } from '@/services/auth/biometric.service';

export default function SettingsScreen() {
    const { colors } = useTheme();
    const { user, logout, enableBiometric, disableBiometric } = useAuth();

    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricName, setBiometricName] = useState('Biometric');
    const [isLoading, setIsLoading] = useState(true);
    const [isEnabling, setIsEnabling] = useState(false);

    useEffect(() => {
        checkBiometricStatus();
    }, []);

    const checkBiometricStatus = async () => {
        try {
            setIsLoading(true);
            
            // Check hardware availability
            const available = await biometricService.isBiometricAvailable();
            setBiometricAvailable(available);

            if (available) {
                const name = await biometricService.getBiometricName();
                setBiometricName(name);

                const configured = await biometricService.isBiometricConfigured();
                setBiometricEnabled(configured);
            }
        } catch (error) {
            console.error('Error checking biometric status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableBiometric = async () => {
        if (isEnabling) return;

        setIsEnabling(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const result = await enableBiometric?.();

            if (result?.success) {
                setBiometricEnabled(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                Alert.alert(
                    '✅ Biometric Enabled',
                    `${biometricName} authentication has been enabled successfully. You can now use ${biometricName.toLowerCase()} to unlock the app.`,
                    [{ text: 'OK' }]
                );
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                    'Failed',
                    result?.message || 'Failed to enable biometric authentication',
                    [{ text: 'OK' }]
                );
            }
        } catch (error: any) {
            console.error('Enable biometric error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'An error occurred', [{ text: 'OK' }]);
        } finally {
            setIsEnabling(false);
        }
    };

    const handleDisableBiometric = async () => {
        Alert.alert(
            'Disable Biometric?',
            `Are you sure you want to disable ${biometricName} authentication? You'll need to log in with your password next time.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: async () => {
                        setIsEnabling(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                        const result = await disableBiometric?.();

                        if (result?.success) {
                            setBiometricEnabled(false);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }

                        setIsEnabling(false);
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        await logout();
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <IconButton
                    icon="arrow-left"
                    iconColor={colors.text}
                    size={24}
                    onPress={() => router.back()}
                />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* User Info Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.userInfo}>
                            <View
                                style={[
                                    styles.avatar,
                                    { backgroundColor: `${colors.primary}20` },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="account"
                                    size={32}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={[styles.userName, { color: colors.text }]}>
                                    {user?.firstName || 'User'}
                                </Text>
                                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                                    {user?.email}
                                </Text>
                            </View>
                        </View>
                    </View>
                </MotiView>

                {/* Security Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 100 }}
                >
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Security
                    </Text>

                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        {/* Biometric Authentication */}
                        {isLoading ? (
                            <View style={styles.settingItem}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text
                                    style={[
                                        styles.settingTitle,
                                        { color: colors.text, marginLeft: 12 },
                                    ]}
                                >
                                    Loading biometric status...
                                </Text>
                            </View>
                        ) : biometricAvailable ? (
                            <Pressable
                                style={styles.settingItem}
                                onPress={
                                    biometricEnabled
                                        ? handleDisableBiometric
                                        : handleEnableBiometric
                                }
                                disabled={isEnabling}
                            >
                                <View
                                    style={[
                                        styles.settingIcon,
                                        {
                                            backgroundColor: biometricEnabled
                                                ? `${colors.success}20`
                                                : `${colors.warning}20`,
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={
                                            biometricName.includes('Face')
                                                ? 'face-recognition'
                                                : 'fingerprint'
                                        }
                                        size={24}
                                        color={
                                            biometricEnabled ? colors.success : colors.warning
                                        }
                                    />
                                </View>
                                <View style={styles.settingContent}>
                                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                                        {biometricName} Login
                                    </Text>
                                    <Text
                                        style={[
                                            styles.settingDescription,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        {biometricEnabled
                                            ? `✅ Verified - ${biometricName} is enabled`
                                            : `Tap to enable ${biometricName.toLowerCase()} authentication`}
                                    </Text>
                                </View>
                                {isEnabling ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={24}
                                        color={colors.textLight}
                                    />
                                )}
                            </Pressable>
                        ) : (
                            <View style={styles.settingItem}>
                                <View
                                    style={[
                                        styles.settingIcon,
                                        { backgroundColor: `${colors.textSecondary}20` },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="fingerprint-off"
                                        size={24}
                                        color={colors.textSecondary}
                                    />
                                </View>
                                <View style={styles.settingContent}>
                                    <Text
                                        style={[
                                            styles.settingTitle,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Biometric Login
                                    </Text>
                                    <Text
                                        style={[
                                            styles.settingDescription,
                                            { color: colors.textLight },
                                        ]}
                                    >
                                        Not available on this device
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </MotiView>

                {/* General Section */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 200 }}
                >
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        General
                    </Text>

                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <Pressable style={styles.settingItem}>
                            <View
                                style={[
                                    styles.settingIcon,
                                    { backgroundColor: `${colors.primary}20` },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="bell-outline"
                                    size={24}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingTitle, { color: colors.text }]}>
                                    Notifications
                                </Text>
                                <Text
                                    style={[
                                        styles.settingDescription,
                                        { color: colors.textSecondary },
                                    ]}
                                >
                                    Manage notification preferences
                                </Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color={colors.textLight}
                            />
                        </Pressable>
                    </View>
                </MotiView>

                {/* Logout Button */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: 300 }}
                    style={styles.logoutContainer}
                >
                    <Pressable
                        style={[styles.logoutButton, { backgroundColor: `${colors.error}15` }]}
                        onPress={handleLogout}
                    >
                        <MaterialCommunityIcons
                            name="logout"
                            size={20}
                            color={colors.error}
                        />
                        <Text style={[styles.logoutText, { color: colors.error }]}>
                            Logout
                        </Text>
                    </Pressable>
                </MotiView>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    logoutContainer: {
        marginTop: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
