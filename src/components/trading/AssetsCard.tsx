/**
 * Assets Card Component
 * =======================
 * Displays user's wallet balances from the selected exchange
 * Automatically fetches data based on selected exchange (Binance/Bitget)
 * Shows loading, error, and empty states
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTheme } from '@/contexts/ThemeContext';
import { useExchange } from '@/contexts/ExchangeContext';
import { binanceApi, BinanceBalance } from '@/services/api/binance.api';
import { bitgetApi, BitgetAsset } from '@/services/api/bitget.api';

interface Asset {
    coin: string;
    available: string;
    locked: string;
    total: string;
    usdValue?: string;
}

export default function AssetsCard() {
    const { colors } = useTheme();
    const { selectedExchange } = useExchange();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    // Fetch assets on mount and when exchange changes
    useEffect(() => {
        fetchAssets();
    }, [selectedExchange]);

    const fetchAssets = async () => {
        if (!selectedExchange) {
            setAssets([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let fetchedAssets: Asset[] = [];

            if (selectedExchange === 'binance') {
                const balances: BinanceBalance[] = await binanceApi.getAccountBalances();
                // Filter out zero balances and map to common format
                fetchedAssets = balances
                    .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                    .map((b) => ({
                        coin: b.asset,
                        available: b.free,
                        locked: b.locked,
                        total: (parseFloat(b.free) + parseFloat(b.locked)).toFixed(8),
                    }));
            } else if (selectedExchange === 'bitget') {
                const balances: BitgetAsset[] = await bitgetApi.getSpotAssets();
                // Filter out zero balances and map to common format
                fetchedAssets = balances
                    .filter((b) => parseFloat(b.available) > 0 || parseFloat(b.frozen) > 0)
                    .map((b) => ({
                        coin: b.coin,
                        available: b.available,
                        locked: b.frozen,
                        total: (parseFloat(b.available) + parseFloat(b.frozen)).toFixed(8),
                    }));
            }

            setAssets(fetchedAssets);
        } catch (err: any) {
            console.error('Error fetching assets:', err);
            setError(err.message || 'Failed to fetch assets');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAssets();
    };

    const calculateTotalValue = () => {
        // TODO: Implement USD value calculation using price API
        return assets.length + ' assets';
    };

    if (loading && assets.length === 0) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Assets</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={32} color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading balances...
                    </Text>
                </View>
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Assets</Text>
                </View>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={32} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <Pressable
                        onPress={fetchAssets}
                        style={({ pressed }) => [
                            styles.retryButton,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>
                            Retry
                        </Text>
                    </Pressable>
                </View>
            </Surface>
        );
    }

    if (assets.length === 0) {
        return (
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Assets</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="wallet-outline" size={48} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No assets found
                    </Text>
                </View>
            </Surface>
        );
    }

    const displayAssets = expanded ? assets : assets.slice(0, 3);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
        >
            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
                        <Text style={[styles.title, { color: colors.text }]}>Assets</Text>
                    </View>
                    <Pressable onPress={onRefresh} disabled={refreshing}>
                        <MaterialCommunityIcons
                            name={refreshing ? 'loading' : 'refresh'}
                            size={20}
                            color={colors.textLight}
                        />
                    </Pressable>
                </View>

                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                        Total Value
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                        {calculateTotalValue()}
                    </Text>
                </View>

                <ScrollView
                    style={styles.assetsList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {displayAssets.map((asset, index) => (
                        <MotiView
                            key={asset.coin}
                            from={{ opacity: 0, translateX: -20 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            transition={{ type: 'timing', duration: 300, delay: index * 50 }}
                        >
                            <View
                                style={[
                                    styles.assetRow,
                                    { borderBottomColor: colors.border }
                                ]}
                            >
                                <View style={styles.assetLeft}>
                                    <View style={[styles.coinIcon, { backgroundColor: `${colors.primary}15` }]}>
                                        <Text style={[styles.coinSymbol, { color: colors.primary }]}>
                                            {asset.coin.slice(0, 1)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.coinName, { color: colors.text }]}>
                                            {asset.coin}
                                        </Text>
                                        <Text style={[styles.availableText, { color: colors.textSecondary }]}>
                                            Available: {parseFloat(asset.available).toFixed(8)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.assetRight}>
                                    <Text style={[styles.totalAmount, { color: colors.text }]}>
                                        {parseFloat(asset.total).toFixed(8)}
                                    </Text>
                                    {parseFloat(asset.locked) > 0 && (
                                        <Text style={[styles.lockedText, { color: colors.warning }]}>
                                            Locked: {parseFloat(asset.locked).toFixed(8)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </MotiView>
                    ))}
                </ScrollView>

                {assets.length > 3 && (
                    <Pressable
                        onPress={() => setExpanded(!expanded)}
                        style={({ pressed }) => [
                            styles.expandButton,
                            { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                            {expanded ? 'Show Less' : `Show All (${assets.length})`}
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    assetsList: {
        maxHeight: 300,
    },
    assetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    assetLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    coinIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coinSymbol: {
        fontSize: 16,
        fontWeight: '700',
    },
    coinName: {
        fontSize: 15,
        fontWeight: '600',
    },
    availableText: {
        fontSize: 11,
        marginTop: 2,
    },
    assetRight: {
        alignItems: 'flex-end',
    },
    totalAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    lockedText: {
        fontSize: 11,
        marginTop: 2,
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
