/**
 * Connect Exchange Screen
 * Professional UI for connecting exchange API credentials
 * 
 * Uses useCredentials hook for clean data fetching separation
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Surface, TextInput, Button, IconButton, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

// Theme & Auth
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExchange } from '@/contexts/ExchangeContext';

// Zustand Store - Centralized credentials (no duplicate API calls)
import { useCredentialsStore } from '@/store/credentialsStore';

// Types only (no API imports in UI files)
import {
    ExchangeInfo,
    ExchangeType,
    SUPPORTED_EXCHANGES,
    CreateCredentialRequest,
    getExchangeInfo,
} from '@/types/exchange.types';

export default function ConnectExchangeScreen() {
    const { colors, isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const { isExchangeConnected, getCredentialForExchange } = useExchange();

    // Get route params (for edit mode from sidebar)
    const { editExchange } = useLocalSearchParams<{ editExchange?: string }>();

    // Use Zustand store for credentials (centralized - no duplicate API calls)
    const credentials = useCredentialsStore((state) => state.credentials);
    const isLoading = useCredentialsStore((state) => state.isLoading);
    const isSaving = useCredentialsStore((state) => state.isSaving);
    const error = useCredentialsStore((state) => state.error);
    const saveCredential = useCredentialsStore((state) => state.saveCredential);
    const deleteCredential = useCredentialsStore((state) => state.deleteCredential);

    // Local UI state only
    const [selectedExchange, setSelectedExchange] = useState<ExchangeInfo | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
    const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

    // Form state
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [label, setLabel] = useState('');
    const [activeTrading, setActiveTrading] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    // Handle editExchange param (from sidebar update button)
    useEffect(() => {
        if (editExchange && !isLoading && credentials.length > 0) {
            const exchangeInfo = getExchangeInfo(editExchange as ExchangeType);
            if (exchangeInfo) {
                // Small delay for smooth transition
                setTimeout(() => {
                    handleSelectExchange(exchangeInfo);
                }, 300);
            }
        }
    }, [editExchange, isLoading, credentials.length]);

    // Detect first-time users after credentials load (only if no editExchange param)
    useEffect(() => {
        if (!editExchange && !isLoading && credentials.length === 0) {
            setIsFirstTimeUser(true);
            // Auto-show Binance connection form for new users
            const binance = SUPPORTED_EXCHANGES.find(e => e.id === 'binance');
            if (binance && !showForm) {
                setTimeout(() => {
                    handleSelectExchange(binance);
                }, 500); // Small delay for smooth animation
            }
        }
    }, [isLoading, credentials.length, editExchange]);

    // Handle exchange selection
    const handleSelectExchange = (exchange: ExchangeInfo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedExchange(exchange);

        const existing = getCredentialForExchange(exchange.id);
        if (existing) {
            setIsEditing(true);
            setEditingCredentialId(existing.id);
            setLabel(existing.label || '');
            setActiveTrading(existing.activeTrading || false);
            // Don't populate keys for security
            setApiKey('');
            setSecretKey('');
            setPassphrase('');
        } else {
            setIsEditing(false);
            setEditingCredentialId(null);
            resetForm();
        }

        setShowForm(true);
    };

    // Reset form
    const resetForm = () => {
        setApiKey('');
        setSecretKey('');
        setPassphrase('');
        setLabel('');
        setActiveTrading(false);
    };

    // Close form
    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedExchange(null);
        resetForm();
    };

    // Save credentials using the hook
    const handleSave = async () => {
        if (!selectedExchange) return;

        // Validation
        if (!apiKey.trim()) {
            Alert.alert('Validation Error', 'API Key is required');
            return;
        }
        if (!secretKey.trim()) {
            Alert.alert('Validation Error', 'Secret Key is required');
            return;
        }
        if (selectedExchange.requiresPassphrase && !passphrase.trim()) {
            Alert.alert('Validation Error', `Passphrase is required for ${selectedExchange.name}`);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const data: CreateCredentialRequest = {
            exchange: selectedExchange.id,
            apiKey: apiKey.trim(),
            secretKey: secretKey.trim(),
            passphrase: passphrase.trim() || undefined,
            label: label.trim() || `${selectedExchange.name} Account`,
            activeTrading,
        };

        // Use the hook's saveCredential (handles API call + refresh)
        const success = await saveCredential(data);

        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Success! 🎉',
                `${selectedExchange.name} credentials saved successfully`,
                [{ text: 'OK', onPress: handleCloseForm }]
            );
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error || 'Failed to save credentials');
        }
    };

    // Delete credentials using the hook
    const handleDelete = () => {
        if (!editingCredentialId || !selectedExchange) return;

        Alert.alert(
            'Delete Credentials',
            `Are you sure you want to delete ${selectedExchange.name} credentials?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteCredential(editingCredentialId);
                        if (success) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            handleCloseForm();
                        } else {
                            Alert.alert('Error', 'Failed to delete credentials');
                        }
                    },
                },
            ]
        );
    };

    // Continue to dashboard
    const handleContinue = () => {
        router.replace('/(tabs)');
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading exchanges...
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <View style={styles.headerLeft}>
                    <MotiView
                        from={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}20` }]}>
                            <MaterialCommunityIcons name="link-variant" size={24} color={colors.primary} />
                        </View>
                    </MotiView>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            Connect Exchange
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Link your trading accounts
                        </Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <IconButton
                        icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
                        size={22}
                        iconColor={colors.primary}
                        onPress={toggleTheme}
                    />
                    {credentials.length > 0 && (
                        <Button
                            mode="text"
                            onPress={handleContinue}
                            textColor={colors.primary}
                        >
                            Skip
                        </Button>
                    )}
                </View>
            </View>


            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* First Time User Welcome */}
                {isFirstTimeUser && credentials.length === 0 && (
                    <MotiView
                        from={{ opacity: 0, translateY: -10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <Surface style={[styles.welcomeCard, { backgroundColor: `${colors.primary}10` }]} elevation={0}>
                            <View style={styles.welcomeIcon}>
                                <MaterialCommunityIcons name="hand-wave" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                                Welcome, {user?.firstName}! 🎉
                            </Text>
                            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
                                Let's get you started! Connect your exchange API keys to enable automated trading with your bot.
                            </Text>
                        </Surface>
                    </MotiView>
                )}

                {/* Exchange Grid */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                >
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Select Exchange
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                        {isFirstTimeUser
                            ? 'Tap an exchange below to enter your API credentials'
                            : 'Choose an exchange to connect your API keys'
                        }
                    </Text>

                    <View style={styles.exchangeGrid}>
                        {SUPPORTED_EXCHANGES.map((exchange, index) => {
                            const isConnected = isExchangeConnected(exchange.id);
                            const credential = getCredentialForExchange(exchange.id);

                            return (
                                <MotiView
                                    key={exchange.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{
                                        type: 'timing',
                                        duration: 400,
                                        delay: index * 100,
                                    }}
                                >
                                    <Pressable
                                        onPress={() => handleSelectExchange(exchange)}
                                        style={({ pressed }) => [
                                            styles.exchangeCard,
                                            {
                                                backgroundColor: colors.surface,
                                                borderColor: isConnected ? colors.success : colors.border,
                                                borderWidth: isConnected ? 2 : 1,
                                                opacity: pressed ? 0.8 : 1,
                                                transform: [{ scale: pressed ? 0.98 : 1 }],
                                            },
                                        ]}
                                    >
                                        {/* Status Badge */}
                                        {isConnected && (
                                            <View style={[styles.connectedBadge, { backgroundColor: colors.success }]}>
                                                <MaterialCommunityIcons name="check" size={12} color={colors.textOnPrimary} />
                                            </View>
                                        )}

                                        {/* Exchange Icon */}
                                        <View style={[styles.exchangeIconContainer, { backgroundColor: `${exchange.color}20` }]}>
                                            <MaterialCommunityIcons
                                                name={exchange.icon as any}
                                                size={32}
                                                color={exchange.color}
                                            />
                                        </View>

                                        {/* Exchange Info */}
                                        <Text style={[styles.exchangeName, { color: colors.text }]}>
                                            {exchange.name}
                                        </Text>

                                        <Text
                                            style={[
                                                styles.exchangeStatus,
                                                { color: isConnected ? colors.success : colors.textLight },
                                            ]}
                                        >
                                            {isConnected ? 'Connected' : 'Not Connected'}
                                        </Text>

                                        {/* Label if connected */}
                                        {credential?.label && (
                                            <Text style={[styles.exchangeLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {credential.label}
                                            </Text>
                                        )}
                                    </Pressable>
                                </MotiView>
                            );
                        })}
                    </View>
                </MotiView>

                {/* Connected Summary */}
                {credentials.length > 0 && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400, delay: 200 }}
                    >
                        <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={1}>
                            <View style={styles.summaryHeader}>
                                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                                    {credentials.length} Exchange{credentials.length > 1 ? 's' : ''} Connected
                                </Text>
                            </View>
                            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                                Your trading bot can now execute trades on connected exchanges.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={handleContinue}
                                style={styles.continueButton}
                                buttonColor={colors.primary}
                                icon="arrow-right"
                                contentStyle={{ flexDirection: 'row-reverse' }}
                            >
                                Continue to Dashboard
                            </Button>
                        </Surface>
                    </MotiView>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Connection Form Modal */}
            <AnimatePresence>
                {showForm && selectedExchange && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'timing', duration: 200 }}
                        style={[styles.formOverlay, { backgroundColor: colors.overlay }]}
                    >
                        <Pressable style={styles.formBackdrop} onPress={handleCloseForm} />

                        <MotiView
                            from={{ translateY: 400 }}
                            animate={{ translateY: 0 }}
                            exit={{ translateY: 400 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={[styles.formSheet, { backgroundColor: colors.background }]}
                        >
                            {/* Form Header */}
                            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
                                <View style={styles.formHeaderLeft}>
                                    <View style={[styles.formExchangeIcon, { backgroundColor: `${selectedExchange.color}20` }]}>
                                        <MaterialCommunityIcons
                                            name={selectedExchange.icon as any}
                                            size={28}
                                            color={selectedExchange.color}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.formTitle, { color: colors.text }]}>
                                            {isEditing ? 'Update' : 'Connect'} {selectedExchange.name}
                                        </Text>
                                        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                                            {selectedExchange.description}
                                        </Text>
                                    </View>
                                </View>
                                <IconButton
                                    icon="close"
                                    iconColor={colors.textLight}
                                    size={24}
                                    onPress={handleCloseForm}
                                />
                            </View>

                            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                                {/* Label */}
                                <TextInput
                                    label="Account Label"
                                    value={label}
                                    onChangeText={setLabel}
                                    mode="outlined"
                                    placeholder={`My ${selectedExchange.name} Account`}
                                    style={[styles.input, { backgroundColor: colors.surface }]}
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                    textColor={colors.text}
                                    left={<TextInput.Icon icon="tag" color={colors.textLight} />}
                                />

                                {/* API Key */}
                                <TextInput
                                    label="API Key"
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    mode="outlined"
                                    placeholder="Enter your API key"
                                    secureTextEntry={!showApiKey}
                                    style={[styles.input, { backgroundColor: colors.surface }]}
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                    textColor={colors.text}
                                    left={<TextInput.Icon icon="key" color={colors.textLight} />}
                                    right={
                                        <TextInput.Icon
                                            icon={showApiKey ? 'eye-off' : 'eye'}
                                            color={colors.textLight}
                                            onPress={() => setShowApiKey(!showApiKey)}
                                        />
                                    }
                                />

                                {/* Secret Key */}
                                <TextInput
                                    label="Secret Key"
                                    value={secretKey}
                                    onChangeText={setSecretKey}
                                    mode="outlined"
                                    placeholder="Enter your secret key"
                                    secureTextEntry={!showSecretKey}
                                    style={[styles.input, { backgroundColor: colors.surface }]}
                                    outlineColor={colors.border}
                                    activeOutlineColor={colors.primary}
                                    textColor={colors.text}
                                    left={<TextInput.Icon icon="lock" color={colors.textLight} />}
                                    right={
                                        <TextInput.Icon
                                            icon={showSecretKey ? 'eye-off' : 'eye'}
                                            color={colors.textLight}
                                            onPress={() => setShowSecretKey(!showSecretKey)}
                                        />
                                    }
                                />

                                {/* Passphrase (if required) */}
                                {selectedExchange.requiresPassphrase && (
                                    <TextInput
                                        label="Passphrase"
                                        value={passphrase}
                                        onChangeText={setPassphrase}
                                        mode="outlined"
                                        placeholder="Enter your passphrase"
                                        secureTextEntry
                                        style={[styles.input, { backgroundColor: colors.surface }]}
                                        outlineColor={colors.border}
                                        activeOutlineColor={colors.primary}
                                        textColor={colors.text}
                                        left={<TextInput.Icon icon="shield-key" color={colors.textLight} />}
                                    />
                                )}

                                {/* Active Trading Toggle */}
                                <Surface style={[styles.toggleCard, { backgroundColor: colors.surface }]} elevation={0}>
                                    <View style={styles.toggleContent}>
                                        <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
                                        <View style={styles.toggleText}>
                                            <Text style={[styles.toggleTitle, { color: colors.text }]}>
                                                Active Trading
                                            </Text>
                                            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                                                Enable automated trading with this account
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={activeTrading}
                                        onValueChange={setActiveTrading}
                                        color={colors.primary}
                                    />
                                </Surface>

                                {/* Security Note */}
                                <View style={[styles.securityNote, { backgroundColor: `${colors.warning}10` }]}>
                                    <MaterialCommunityIcons name="shield-lock" size={20} color={colors.warning} />
                                    <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                                        Your API keys are encrypted before storage. We recommend using API keys with trading permissions only.
                                    </Text>
                                </View>

                                {/* Buttons */}
                                <View style={styles.formButtons}>
                                    {isEditing && (
                                        <Button
                                            mode="outlined"
                                            onPress={handleDelete}
                                            style={styles.deleteButton}
                                            textColor={colors.error}
                                            icon="delete"
                                        >
                                            Delete
                                        </Button>
                                    )}
                                    <Button
                                        mode="contained"
                                        onPress={handleSave}
                                        loading={isSaving}
                                        disabled={isSaving}
                                        style={[styles.saveButton, isEditing && { flex: 1 }]}
                                        buttonColor={colors.primary}
                                        icon="content-save"
                                    >
                                        {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Connect'}
                                    </Button>
                                </View>

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </MotiView>
                    </MotiView>
                )}
            </AnimatePresence>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 48,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: -8,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 14,
    },
    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    // Welcome Card
    welcomeCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    welcomeIcon: {
        marginBottom: 12,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    // Section
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        marginBottom: 24,
    },
    // Exchange Grid
    exchangeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    exchangeCard: {
        width: '47%',
        minWidth: 150,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        position: 'relative',
    },
    connectedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exchangeIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    exchangeName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    exchangeStatus: {
        fontSize: 12,
        fontWeight: '500',
    },
    exchangeLabel: {
        fontSize: 11,
        marginTop: 4,
    },
    // Summary Card
    summaryCard: {
        marginTop: 32,
        padding: 20,
        borderRadius: 20,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    summaryText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    continueButton: {
        borderRadius: 14,
    },
    // Form Overlay
    formOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    formBackdrop: {
        flex: 1,
    },
    formSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingTop: 8,
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    formHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    formExchangeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    formSubtitle: {
        fontSize: 13,
    },
    formScroll: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    input: {
        marginBottom: 16,
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    toggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    toggleText: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    toggleSubtitle: {
        fontSize: 12,
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
    },
    securityText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteButton: {
        borderRadius: 14,
        borderColor: 'transparent',
    },
    saveButton: {
        flex: 2,
        borderRadius: 14,
    },
});
