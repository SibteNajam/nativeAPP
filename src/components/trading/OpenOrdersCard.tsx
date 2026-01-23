/**
 * Open Orders Card Component
 * ============================
 * Displays user's active/open orders from the selected exchange
 * Automatically fetches data based on selected exchange (Binance/Bitget)
 * Shows detailed order information with cancel functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTheme } from '@/contexts/ThemeContext';
import { useExchange } from '@/contexts/ExchangeContext';
import { binanceApi, BinanceOrder } from '@/services/api/binance.api';
import { bitgetApi, BitgetOrder, BitgetPlanOrder } from '@/services/api/bitget.api';

interface UnifiedOrder {
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL' | 'buy' | 'sell';
    type: string;
    price: string;
    quantity: string;
    filled: string;
    status: string;
    time: number;
    isPlan?: boolean;
}

export default function OpenOrdersCard() {
    const { colors } = useTheme();
    const { selectedExchange } = useExchange();

    const [orders, setOrders] = useState<UnifiedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    // Fetch orders on mount and when exchange changes
    useEffect(() => {
        fetchOrders();
    }, [selectedExchange]);

    const fetchOrders = async () => {
        if (!selectedExchange) {
            setOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let fetchedOrders: UnifiedOrder[] = [];

            if (selectedExchange === 'binance') {
                const binanceOrders: BinanceOrder[] = await binanceApi.getOpenOrders();
                fetchedOrders = binanceOrders.map((o) => ({
                    orderId: o.orderId.toString(),
                    symbol: o.symbol,
                    side: o.side,
                    type: o.type,
                    price: o.price,
                    quantity: o.origQty,
                    filled: o.executedQty,
                    status: o.status,
                    time: o.time,
                }));
            } else if (selectedExchange === 'bitget') {
                const { unfilledOrders, planOrders } = await bitgetApi.getAllOpenOrders();

                // Map unfilled orders
                const mappedUnfilled: UnifiedOrder[] = unfilledOrders.map((o) => ({
                    orderId: o.orderId,
                    symbol: o.symbol,
                    side: o.side === 'buy' ? 'BUY' : 'SELL',
                    type: o.orderType,
                    price: o.price,
                    quantity: o.size,
                    filled: o.baseVolume,
                    status: o.status,
                    time: parseInt(o.cTime),
                    isPlan: false,
                }));

                // Map plan orders
                const mappedPlan: UnifiedOrder[] = planOrders.map((o) => ({
                    orderId: o.orderId,
                    symbol: o.symbol,
                    side: o.side === 'buy' ? 'BUY' : 'SELL',
                    type: `${o.orderType} (Plan)`,
                    price: o.executePrice,
                    quantity: o.size,
                    filled: '0',
                    status: o.status,
                    time: parseInt(o.cTime),
                    isPlan: true,
                }));

                fetchedOrders = [...mappedUnfilled, ...mappedPlan];
            }

            // Sort by time (newest first)
            fetchedOrders.sort((a, b) => b.time - a.time);
            setOrders(fetchedOrders);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
    };

    const handleCancelOrder = (order: UnifiedOrder) => {
        Alert.alert(
            'Cancel Order',
            `Are you sure you want to cancel this ${order.side} order for ${order.symbol}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: () => cancelOrder(order),
                },
            ]
        );
    };

    const cancelOrder = async (order: UnifiedOrder) => {
        try {
            if (selectedExchange === 'binance') {
                await binanceApi.cancelOrder(order.symbol, order.orderId);
            } else if (selectedExchange === 'bitget') {
                await bitgetApi.cancelSpotOrder(order.symbol, order.orderId);
            }
            Alert.alert('Success', 'Order cancelled successfully');
            fetchOrders(); // Refresh list
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel order');
        }
    };

    const getSideColor = (side: string) => {
        return side.toUpperCase() === 'BUY' ? colors.success : colors.error;
    };

    const getStatusBadge = (status: string) => {
        const normalizedStatus = status.toUpperCase();
        let bgColor = colors.primaryLight;
        let textColor = colors.text;

        if (normalizedStatus.includes('NEW') || normalizedStatus.includes('LIVE')) {
            bgColor = `${colors.neonBlue}20`;
            textColor = colors.neonBlue;
        } else if (normalizedStatus.includes('PARTIAL')) {
            bgColor = `${colors.warning}20`;
            textColor = colors.warning;
        }

        return { bgColor, textColor };
    };

    if (loading && orders.length === 0) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="order-bool-ascending-variant" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Open Orders</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={32} color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading orders...
                    </Text>
                </View>
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="order-bool-ascending-variant" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Open Orders</Text>
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={32} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <Pressable
                        onPress={fetchOrders}
                        style={({ pressed }) => [
                            styles.retryButton,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>Retry</Text>
                    </Pressable>
                </View>
            </Surface>
        );
    }

    if (orders.length === 0) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="order-bool-ascending-variant" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Open Orders</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="inbox-outline" size={48} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No open orders
                    </Text>
                </View>
            </Surface>
        );
    }

    const displayOrders = expanded ? orders : orders.slice(0, 3);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <MaterialCommunityIcons name="order-bool-ascending-variant" size={24} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.text }]}>Open Orders</Text>
                        <View style={[styles.badge, { backgroundColor: colors.surfaceLight }]}>
                            <Text style={[styles.badgeText, { color: colors.primary }]}>{orders.length}</Text>
                        </View>
                    </View>
                    <Pressable onPress={onRefresh} disabled={refreshing}>
                        <MaterialCommunityIcons
                            name={refreshing ? 'loading' : 'refresh'}
                            size={20}
                            color={colors.textLight}
                        />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.ordersList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {displayOrders.map((order, index) => {
                        const statusBadge = getStatusBadge(order.status);
                        const filledPercent = (parseFloat(order.filled) / parseFloat(order.quantity)) * 100;

                        return (
                            <MotiView
                                key={order.orderId}
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                transition={{ type: 'timing', duration: 300, delay: index * 50 }}
                            >
                                <View style={[styles.orderCard, { backgroundColor: colors.surfaceLight }]}>
                                    {/* Order Header */}
                                    <View style={styles.orderHeader}>
                                        <View style={styles.orderHeaderLeft}>
                                            <Text style={[styles.symbol, { color: colors.text }]}>{order.symbol}</Text>
                                            <View style={[styles.sideBadge, { backgroundColor: `${getSideColor(order.side)}20` }]}>
                                                <Text style={[styles.sideText, { color: getSideColor(order.side) }]}>
                                                    {order.side.toUpperCase()}
                                                </Text>
                                            </View>
                                            {order.isPlan && (
                                                <MaterialCommunityIcons name="clock-outline" size={14} color={colors.warning} />
                                            )}
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
                                            <Text style={[styles.statusText, { color: statusBadge.textColor }]}>
                                                {order.status}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Order Details */}
                                    <View style={styles.orderDetails}>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                                            <Text style={[styles.detailValue, { color: colors.text }]}>{order.type}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
                                            <Text style={[styles.detailValue, { color: colors.text }]}>{parseFloat(order.price).toFixed(8)}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                                            <Text style={[styles.detailValue, { color: colors.text }]}>{parseFloat(order.quantity).toFixed(8)}</Text>
                                        </View>
                                        {parseFloat(order.filled) > 0 && (
                                            <View style={styles.detailRow}>
                                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Filled</Text>
                                                <Text style={[styles.detailValue, { color: colors.success }]}>
                                                    {filledPercent.toFixed(2)}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Cancel Button */}
                                    <Pressable
                                        onPress={() => handleCancelOrder(order)}
                                        style={({ pressed }) => [
                                            styles.cancelButton,
                                            { backgroundColor: `${colors.error}10`, opacity: pressed ? 0.7 : 1 }
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="close-circle" size={16} color={colors.error} />
                                        <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </MotiView>
                        );
                    })}
                </ScrollView>

                {orders.length > 3 && (
                    <Pressable
                        onPress={() => setExpanded(!expanded)}
                        style={({ pressed }) => [
                            styles.expandButton,
                            { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                            {expanded ? 'Show Less' : `Show All (${orders.length})`}
                        </Text>
                        <MaterialCommunityIcons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.primary}
                        />
                    </Pressable>
                )}
            </Surface>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    ordersList: {
        maxHeight: 400,
    },
    orderCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    symbol: {
        fontSize: 15,
        fontWeight: '700',
    },
    sideBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sideText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    orderDetails: {
        gap: 4,
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        fontSize: 12,
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 4,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
    },
    expandButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // States
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    errorText: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
    },
});
