/**
 * Exchange Drawer
 * Sidebar drawer for managing connected exchanges
 * 
 * Shows:
 * - All exchanges from DB for the user
 * - isActive status (from DB - whether credentials are active)
 * - Selected status (for API calls - one at a time)
 * - Update credentials option
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Dimensions,
    Modal,
} from 'react-native';
import { Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInLeft,
    SlideOutLeft,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { useExchange } from '@/contexts/ExchangeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    ExchangeType,
    CredentialResponse,
    getExchangeInfo,
} from '@/types/exchange.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);

interface ExchangeDrawerProps {
    visible: boolean;
    onClose: () => void;
    onUpdateCredentials: (credential: CredentialResponse) => void;
    onAddExchange: () => void;
}

export default function ExchangeDrawer({
    visible,
    onClose,
    onUpdateCredentials,
    onAddExchange,
}: ExchangeDrawerProps) {
    const { colors } = useTheme();
    const { user, logout } = useAuth();
    const {
        selectedExchange,
        connectedExchanges,
        selectExchange,
    } = useExchange();

    const [expandedExchange, setExpandedExchange] = useState<string | null>(null);

    const toggleExpand = (credentialId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedExchange(expandedExchange === credentialId ? null : credentialId);
    };

    const handleSelect = async (exchangeId: ExchangeType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await selectExchange(exchangeId);
    };

    const handleUpdate = (credential: CredentialResponse) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onUpdateCredentials(credential);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.modalContainer}>
                {/* Backdrop */}
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.backdrop}
                >
                    <Pressable style={styles.backdropPressable} onPress={onClose} />
                </Animated.View>

                {/* Drawer */}
                <Animated.View
                    entering={SlideInLeft.duration(250)}
                    exiting={SlideOutLeft.duration(200)}
                    style={[
                        styles.drawer,
                        {
                            width: DRAWER_WIDTH,
                            backgroundColor: colors.background,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: colors.primary }]}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.userInitial}>
                                {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Exchanges Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.textSecondary} />
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                                    MY EXCHANGES ({connectedExchanges.length})
                                </Text>
                            </View>

                            {connectedExchanges.length > 0 ? (
                                connectedExchanges.map((credential) => {
                                    const info = getExchangeInfo(credential.exchange);
                                    const isSelected = selectedExchange === credential.exchange;
                                    const isExpanded = expandedExchange === credential.id;

                                    if (!info) return null;

                                    return (
                                        <Surface
                                            key={credential.id}
                                            style={[
                                                styles.exchangeCard,
                                                {
                                                    backgroundColor: colors.surface,
                                                    borderColor: isSelected ? colors.primary : colors.border,
                                                    borderWidth: isSelected ? 2 : 1,
                                                },
                                            ]}
                                            elevation={0}
                                        >
                                            {/* Main Row */}
                                            <Pressable
                                                onPress={() => toggleExpand(credential.id)}
                                                style={styles.exchangeMainRow}
                                            >
                                                <View style={styles.exchangeInfo}>
                                                    <View style={[styles.exchangeIcon, { backgroundColor: `${info.color}15` }]}>
                                                        <MaterialCommunityIcons
                                                            name={info.icon as any}
                                                            size={20}
                                                            color={info.color}
                                                        />
                                                    </View>
                                                    <View style={styles.exchangeTexts}>
                                                        <View style={styles.exchangeNameRow}>
                                                            <Text style={[styles.exchangeName, { color: colors.text }]}>
                                                                {info.name}
                                                            </Text>
                                                            {isSelected && (
                                                                <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                                                                    <Text style={styles.selectedBadgeText}>✓</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={[styles.exchangeLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                                                            {credential.label || 'No label'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <MaterialCommunityIcons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={20}
                                                    color={colors.textLight}
                                                />
                                            </Pressable>

                                            {/* Expanded */}
                                            {isExpanded && (
                                                <View style={styles.expandedContent}>
                                                    <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

                                                    {/* Status - Only show isActive since that's what API returns */}
                                                    <View style={styles.statusRow}>
                                                        <View style={[
                                                            styles.statusBadge,
                                                            { backgroundColor: credential.isActive ? `${colors.success}15` : `${colors.error}15` }
                                                        ]}>
                                                            <MaterialCommunityIcons
                                                                name={credential.isActive ? 'check-circle' : 'close-circle'}
                                                                size={14}
                                                                color={credential.isActive ? colors.success : colors.error}
                                                            />
                                                            <Text style={[
                                                                styles.statusBadgeText,
                                                                { color: credential.isActive ? colors.success : colors.error }
                                                            ]}>
                                                                {credential.isActive ? 'Active' : 'Inactive'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Buttons */}
                                                    <View style={styles.actionButtons}>
                                                        {isSelected ? (
                                                            <View style={[styles.selectedIndicator, { backgroundColor: `${colors.primary}10` }]}>
                                                                <MaterialCommunityIcons name="check" size={14} color={colors.primary} />
                                                                <Text style={[styles.selectedIndicatorText, { color: colors.primary }]}>
                                                                    Selected
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <Pressable
                                                                onPress={() => handleSelect(credential.exchange)}
                                                                style={[styles.selectButton, { backgroundColor: colors.primary }]}
                                                            >
                                                                <Text style={styles.selectButtonText}>Select</Text>
                                                            </Pressable>
                                                        )}

                                                        <Pressable
                                                            onPress={() => handleUpdate(credential)}
                                                            style={[styles.updateButton, { borderColor: colors.border }]}
                                                        >
                                                            <MaterialCommunityIcons name="pencil" size={14} color={colors.text} />
                                                            <Text style={[styles.updateButtonText, { color: colors.text }]}>Update</Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            )}
                                        </Surface>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="link-variant-off" size={36} color={colors.textLight} />
                                    <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                                        No Exchanges
                                    </Text>
                                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                        Connect an exchange to start
                                    </Text>
                                </View>
                            )}

                            {/* Add Button */}
                            <Pressable
                                onPress={() => {
                                    onClose();
                                    onAddExchange();
                                }}
                                style={[styles.addButton, { borderColor: colors.primary }]}
                            >
                                <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                    Connect Exchange
                                </Text>
                            </Pressable>
                        </View>

                        <Divider style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

                        {/* Bottom */}
                        <View style={styles.bottomActions}>

                            <Pressable
                                style={({ pressed }) => [styles.bottomActionItem, pressed && { opacity: 0.7 }]}
                                onPress={() => { onClose(); logout(); }}
                            >
                                <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
                                <Text style={[styles.bottomActionText, { color: colors.error }]}>Logout</Text>
                            </Pressable>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropPressable: {
        flex: 1,
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        overflow: 'hidden',
        elevation: 5,
    },
    header: {
        paddingTop: 48,
        paddingBottom: 18,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    userAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    userInitial: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    userEmail: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 10,
    },
    section: {
        paddingVertical: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    exchangeCard: {
        borderRadius: 10,
        marginBottom: 6,
        overflow: 'hidden',
    },
    exchangeMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
    },
    exchangeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    exchangeIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exchangeTexts: {
        flex: 1,
    },
    exchangeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    exchangeName: {
        fontSize: 13,
        fontWeight: '600',
    },
    selectedBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
    },
    selectedBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFF',
    },
    exchangeLabel: {
        fontSize: 10,
        marginTop: 1,
    },
    expandedContent: {
        paddingBottom: 10,
    },
    divider: {
        marginHorizontal: 10,
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
    },
    selectButton: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 6,
        alignItems: 'center',
    },
    selectButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFF',
    },
    selectedIndicator: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 7,
        borderRadius: 6,
    },
    selectedIndicatorText: {
        fontSize: 11,
        fontWeight: '600',
    },
    updateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
    },
    updateButtonText: {
        fontSize: 11,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyStateTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 10,
    },
    emptyStateText: {
        fontSize: 11,
        marginTop: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 4,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sectionDivider: {
        marginVertical: 6,
    },
    bottomActions: {
        paddingVertical: 6,
    },
    bottomActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 6,
    },
    bottomActionText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
