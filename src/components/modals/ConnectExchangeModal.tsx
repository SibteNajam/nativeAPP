/**
 * Connect Exchange Modal
 * A modal form for connecting or updating exchange API credentials
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
    Modal,
} from 'react-native';
import { Surface, TextInput, Button, IconButton, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';

// Theme
import { useTheme } from '@/contexts/ThemeContext';

// Custom Hooks
import { useCredentials } from '@/hooks/useCredentials';
import { useExchange } from '@/contexts/ExchangeContext';

// Types
import {
    ExchangeInfo,
    ExchangeType,
    SUPPORTED_EXCHANGES,
    CreateCredentialRequest,
    getExchangeInfo,
    CredentialResponse,
} from '@/types/exchange.types';

interface ConnectExchangeModalProps {
    visible: boolean;
    onClose: () => void;
    editExchangeId?: ExchangeType; // If provided, enters edit mode for this exchange
}

export default function ConnectExchangeModal({
    visible,
    onClose,
    editExchangeId,
}: ConnectExchangeModalProps) {
    const { colors } = useTheme();
    const { refreshExchanges, getCredentialForExchange } = useExchange();
    const { saveCredential, deleteCredential, isSaving, error: apiError } = useCredentials();

    // Local state
    const [selectedExchange, setSelectedExchange] = useState<ExchangeInfo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);

    // Form state
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [label, setLabel] = useState('');
    const [activeTrading, setActiveTrading] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    // Pre-fill if editing
    useEffect(() => {
        if (visible) {
            if (editExchangeId) {
                const info = getExchangeInfo(editExchangeId);
                const existing = getCredentialForExchange(editExchangeId);

                if (info) {
                    setSelectedExchange(info);
                    if (existing) {
                        setIsEditing(true);
                        setEditingCredentialId(existing.id);
                        setLabel(existing.label || '');
                        // CRITICAL: Ensure we use the value from backend
                        setActiveTrading(existing.activeTrading === true);
                    } else {
                        setIsEditing(false);
                        resetForm();
                    }
                }
            } else {
                // Default to Binance for new connections if nothing selected
                setSelectedExchange(SUPPORTED_EXCHANGES[0]);
                setIsEditing(false);
                resetForm();
            }
        }
    }, [visible, editExchangeId]);

    const resetForm = () => {
        setApiKey('');
        setSecretKey('');
        setPassphrase('');
        setLabel('');
        setActiveTrading(false);
        setEditingCredentialId(null);
    };

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

        const success = await saveCredential(data);

        if (success) {
            await refreshExchanges();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Success! 🎉',
                `${selectedExchange.name} credentials ${isEditing ? 'updated' : 'saved'} successfully`,
                [{ text: 'OK', onPress: onClose }]
            );
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', apiError || 'Failed to save credentials');
        }
    };

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
                            await refreshExchanges();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onClose();
                        } else {
                            Alert.alert('Error', 'Failed to delete credentials');
                        }
                    },
                },
            ]
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Pressable style={styles.backdrop} onPress={onClose} />

                    <MotiView
                        from={{ translateY: 400, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={[styles.formSheet, { backgroundColor: colors.background }]}
                    >
                        {/* Header */}
                        <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
                            {selectedExchange && (
                                <View style={styles.headerLeft}>
                                    <View style={[styles.exchangeIcon, { backgroundColor: `${selectedExchange.color}20` }]}>
                                        <MaterialCommunityIcons
                                            name={selectedExchange.icon as any}
                                            size={24}
                                            color={selectedExchange.color}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                                            {isEditing ? 'Update' : 'Connect'} {selectedExchange.name}
                                        </Text>
                                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                            {isEditing ? 'Modify your API settings' : 'Link your API keys'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            <IconButton icon="close" size={24} onPress={onClose} iconColor={colors.textLight} />
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Account Label */}
                            <TextInput
                                label="Account Label"
                                value={label}
                                onChangeText={setLabel}
                                mode="outlined"
                                placeholder={`My ${selectedExchange?.name || 'Exchange'} Account`}
                                style={[styles.input, { backgroundColor: colors.surface }]}
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
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
                                left={<TextInput.Icon icon="key" color={colors.textLight} />}
                                right={
                                    <TextInput.Icon
                                        icon={showApiKey ? 'eye-off' : 'eye'}
                                        onPress={() => setShowApiKey(!showApiKey)}
                                        color={colors.textLight}
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
                                left={<TextInput.Icon icon="lock" color={colors.textLight} />}
                                right={
                                    <TextInput.Icon
                                        icon={showSecretKey ? 'eye-off' : 'eye'}
                                        onPress={() => setShowSecretKey(!showSecretKey)}
                                        color={colors.textLight}
                                    />
                                }
                            />

                            {/* Passphrase */}
                            {selectedExchange?.requiresPassphrase && (
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
                                    left={<TextInput.Icon icon="shield-key" color={colors.textLight} />}
                                />
                            )}

                            {/* Active Trading Toggle */}
                            <Surface style={[styles.toggleCard, { backgroundColor: colors.surface }]} elevation={0}>
                                <View style={styles.toggleTextContainer}>
                                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Active Trading</Text>
                                    <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                                        Allow bot to execute trades
                                    </Text>
                                </View>
                                <Switch
                                    value={activeTrading}
                                    onValueChange={setActiveTrading}
                                    color={colors.primary}
                                />
                            </Surface>

                            <View style={styles.buttonContainer}>
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
                                    style={[styles.saveButton, isEditing && { flex: 1.5 }]}
                                    buttonColor={colors.primary}
                                    contentStyle={styles.buttonContent}
                                >
                                    {isEditing ? 'Update Connection' : 'Connect Exchange'}
                                </Button>
                            </View>

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </MotiView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    formSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        minHeight: '60%',
        maxHeight: '90%',
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    exchangeIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 13,
    },
    scroll: {
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 40,
    },
    input: {
        marginBottom: 16,
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    toggleSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteButton: {
        flex: 1,
        borderRadius: 12,
    },
    saveButton: {
        flex: 1,
        borderRadius: 12,
    },
    buttonContent: {
        height: 48,
    },
});
