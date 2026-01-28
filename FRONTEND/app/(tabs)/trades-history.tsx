/**
 * Trading Bot History & Analytics Screen
 * Professional UI with Analytics Charts and Trade History
 * 
 * Features:
 * - Tab Switch: Analytics / Trades
 * - Time Period Filters: All, 7d, 30d, 90d
 * - Analytics Charts: PnL Growth, Win/Loss Pie, Daily Overview, Activity Heatmap
 * - Trade List with Expandable Details
 * 
 * OPTIMIZED: Uses Zustand store for centralized trades data (shared with Dashboard)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import { useExchange } from '@/contexts/ExchangeContext';

// Zustand Store - Centralized trades data
import { useTradesStore, useAllTrades, useTradesSummary, useTradesLoading } from '@/store/tradesStore';
import type { Trade, TradesSummary, ExitOrder } from '@/types/trades.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

type TabType = 'analytics' | 'trades';
type TimePeriod = 'all' | '7d' | '30d' | '90d';
type TradeFilter = 'all' | 'active' | 'completed';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradesHistoryScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { selectedExchange } = useExchange();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Use Zustand store for centralized trades data (shared with Dashboard & TradingBotCard)
  const fetchTrades = useTradesStore((state) => state.fetchTrades);
  const trades = useAllTrades();
  const summary = useTradesSummary();
  const loading = useTradesLoading();

  // Load trades on mount - uses exchange from context, or defaults to binance
  useEffect(() => {
    const exchange = selectedExchange || 'binance';
    fetchTrades(exchange);
    setLastUpdated(new Date());
  }, [selectedExchange, fetchTrades]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const exchange = selectedExchange || 'binance';
    const interval = setInterval(() => {
      if (!loading) {
        fetchTrades(exchange, true); // Force refresh
        setLastUpdated(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, selectedExchange, fetchTrades]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const exchange = selectedExchange || 'binance';
    fetchTrades(exchange, true).then(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    });
  }, [selectedExchange, fetchTrades]);

  // Filter trades by time period
  const filteredByPeriod = useMemo(() => {
    if (timePeriod === 'all') return trades;

    const now = new Date();
    const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return trades.filter(trade => new Date(trade.entryOrder.createdAt) >= cutoff);
  }, [trades, timePeriod]);

  // Calculate analytics from filtered trades
  const analytics = useMemo(() => {
    const completed = filteredByPeriod.filter(t => t.pnl.isComplete);
    const active = filteredByPeriod.filter(t => !t.pnl.isComplete);
    const wins = completed.filter(t => t.pnl.realized > 0);
    const losses = completed.filter(t => t.pnl.realized < 0);

    const totalRealized = completed.reduce((sum, t) => sum + t.pnl.realized, 0);
    const totalUnrealized = active.reduce((sum, t) => sum + t.pnl.unrealized, 0);
    const totalPnl = totalRealized + totalUnrealized;

    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl.realized, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl.realized, 0) / losses.length) : 0;
    const winRate = completed.length > 0 ? (wins.length / completed.length) * 100 : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    const bestTrade = completed.length > 0
      ? completed.reduce((best, t) => t.pnl.realized > best.pnl.realized ? t : best)
      : null;
    const worstTrade = completed.length > 0
      ? completed.reduce((worst, t) => t.pnl.realized < worst.pnl.realized ? t : worst)
      : null;

    // Daily PnL data for charts - need to sort chronologically!
    // Group trades by their completion date (exit fill date, or entry date if still active)
    const dailyPnL: { [key: string]: number } = {};
    const dailyWins: { [key: string]: number } = {};
    const dailyLosses: { [key: string]: number } = {};

    filteredByPeriod.forEach(trade => {
      // Use filledAt date from the LAST exit order if completed, otherwise entry date
      let tradeDate: Date;
      if (trade.pnl.isComplete && trade.exitOrders && trade.exitOrders.length > 0) {
        // Get the latest exit order fill date
        const exitDates = trade.exitOrders
          .map(exit => exit.filledAt ? new Date(exit.filledAt) : null)
          .filter(d => d !== null) as Date[];
        tradeDate = exitDates.length > 0
          ? new Date(Math.max(...exitDates.map(d => d.getTime())))
          : new Date(trade.entryOrder.createdAt);
      } else {
        tradeDate = new Date(trade.entryOrder.createdAt);
      }

      const dateKey = tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!dailyPnL[dateKey]) {
        dailyPnL[dateKey] = 0;
        dailyWins[dateKey] = 0;
        dailyLosses[dateKey] = 0;
      }

      // For completed trades, add realized PnL
      // For active trades, add unrealized PnL on entry date
      if (trade.pnl.isComplete) {
        dailyPnL[dateKey] += trade.pnl.realized;
        if (trade.pnl.realized > 0) dailyWins[dateKey]++;
        else if (trade.pnl.realized < 0) dailyLosses[dateKey]++;
      }
    });

    // Symbol distribution
    const symbolStats: { [key: string]: { count: number; pnl: number } } = {};
    filteredByPeriod.forEach(trade => {
      const symbol = trade.entryOrder.symbol.replace('USDT', '');
      if (!symbolStats[symbol]) symbolStats[symbol] = { count: 0, pnl: 0 };
      symbolStats[symbol].count++;
      symbolStats[symbol].pnl += trade.pnl.total;
    });

    // Activity by hour
    const hourlyActivity: { [hour: number]: { wins: number; losses: number } } = {};
    for (let i = 0; i < 24; i++) hourlyActivity[i] = { wins: 0, losses: 0 };
    completed.forEach(trade => {
      const hour = new Date(trade.entryOrder.createdAt).getHours();
      if (trade.pnl.realized > 0) hourlyActivity[hour].wins++;
      else hourlyActivity[hour].losses++;
    });

    return {
      totalTrades: filteredByPeriod.length,
      completed: completed.length,
      active: active.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalRealized,
      totalUnrealized,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
      dailyPnL,
      dailyWins,
      dailyLosses,
      symbolStats,
      hourlyActivity,
    };
  }, [filteredByPeriod]);

  // Filter trades for trade list
  const displayTrades = useMemo(() => {
    return filteredByPeriod.filter((trade) => {
      if (tradeFilter === 'active') return !trade.pnl.isComplete;
      if (tradeFilter === 'completed') return trade.pnl.isComplete;
      return true;
    });
  }, [filteredByPeriod, tradeFilter]);

  // Silent loading - no loading screen, just update data

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Tab Switch */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Clean Title - No blue gradient background */}
            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <Feather name="bar-chart-2" size={22} color={colors.text} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
              </View>
              <View style={[styles.liveIndicator, { backgroundColor: `${colors.success}15` }]}>
                <View style={[styles.livePulse, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
                {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Pressable onPress={toggleTheme} style={[styles.themeToggleBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons
                  name={isDark ? 'sunny' : 'moon'}
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
              <Pressable onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="refresh" size={18} color={colors.white} />
              </Pressable>
            </View>
          </View>

          {/* Tab Switch */}
          <View style={[styles.tabSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setActiveTab('analytics')}
              style={[
                styles.tabBtn,
                activeTab === 'analytics' && { backgroundColor: colors.primary }
              ]}
            >
              <Ionicons
                name="analytics"
                size={16}
                color={activeTab === 'analytics' ? colors.white : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'analytics' ? colors.white : colors.textSecondary }
              ]}>
                ANALYTICS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('trades')}
              style={[
                styles.tabBtn,
                activeTab === 'trades' && { backgroundColor: colors.primary }
              ]}
            >
              <MaterialCommunityIcons
                name="swap-vertical"
                size={16}
                color={activeTab === 'trades' ? colors.white : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'trades' ? colors.white : colors.textSecondary }
              ]}>
                TRADES
              </Text>
            </Pressable>
          </View>

          {/* Time Period Filter */}
          <View style={[styles.periodFilter, { backgroundColor: colors.surface }]}>
            {(['all', '7d', '30d', '90d'] as TimePeriod[]).map((period) => (
              <Pressable
                key={period}
                onPress={() => setTimePeriod(period)}
                style={[
                  styles.periodBtn,
                  timePeriod === period && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.periodText,
                  { color: timePeriod === period ? colors.white : colors.textSecondary }
                ]}>
                  {period === 'all' ? 'All' : period.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Summary Stats Cards */}
        <SummaryStatsRow analytics={analytics} colors={colors} isDark={isDark} />

        {/* Tab Content */}
        {activeTab === 'analytics' ? (
          <AnalyticsContent
            analytics={analytics}
            colors={colors}
            isDark={isDark}
            timePeriod={timePeriod}
          />
        ) : (
          <TradesContent
            trades={displayTrades}
            filter={tradeFilter}
            setFilter={setTradeFilter}
            analytics={analytics}
            expandedTradeId={expandedTradeId}
            setExpandedTradeId={setExpandedTradeId}
            colors={colors}
            isDark={isDark}
          />
        )}

        {/* Live Update Indicator */}
        <View style={styles.liveUpdateContainer}>
          <View style={[styles.liveUpdateDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.liveUpdateText, { color: colors.textSecondary }]}>
            LIVE UPDATES EVERY 30 SECONDS
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// SUMMARY STATS ROW
// ============================================================================

function SummaryStatsRow({ analytics, colors, isDark }: { analytics: any; colors: any; isDark: boolean }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statsScrollContent}
      style={styles.statsScroll}
    >
      <StatCard
        icon="chart-line-variant"
        label="TOTAL TRADES"
        value={analytics.totalTrades.toString()}
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="clock-outline"
        label="ACTIVE"
        value={analytics.active.toString()}
        valueColor={colors.warning}
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="check-circle-outline"
        label="COMPLETED"
        value={analytics.completed.toString()}
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="percent-outline"
        label="WIN RATE"
        value={`${analytics.winRate.toFixed(1)}%`}
        valueColor={analytics.winRate >= 50 ? colors.success : colors.error}
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="currency-usd"
        label="REALIZED PNL"
        value={`$${formatCurrency(analytics.totalRealized)}`}
        valueColor={analytics.totalRealized >= 0 ? colors.success : colors.error}
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="chart-areaspline"
        label="UNREALIZED PNL"
        value={`$${formatCurrency(analytics.totalUnrealized)}`}
        valueColor={analytics.totalUnrealized >= 0 ? colors.success : colors.error}
        subtitle="floating gains"
        colors={colors}
        isDark={isDark}
      />
      <StatCard
        icon="wallet-outline"
        label="TOTAL PNL"
        value={`$${formatCurrency(analytics.totalPnl)}`}
        valueColor={analytics.totalPnl >= 0 ? colors.success : colors.error}
        highlight
        colors={colors}
        isDark={isDark}
      />
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  subtitle,
  highlight,
  colors,
  isDark
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  subtitle?: string;
  highlight?: boolean;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={[
      styles.statCard,
      {
        backgroundColor: colors.surface,
        borderColor: highlight ? colors.primary : colors.border,
        borderWidth: highlight ? 1.5 : 1,
      }
    ]}>
      <View style={styles.statCardHeader}>
        <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>{label}</Text>
        <MaterialCommunityIcons name={icon as any} size={18} color={colors.textSecondary} />
      </View>
      <Text style={[styles.statCardValue, { color: valueColor || colors.text }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.statCardSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// ANALYTICS CONTENT
// ============================================================================

function AnalyticsContent({ analytics, colors, isDark, timePeriod }: {
  analytics: any;
  colors: any;
  isDark: boolean;
  timePeriod: TimePeriod;
}) {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 2,
    color: (opacity = 1) => isDark ? `rgba(124, 58, 237, ${opacity})` : `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
  };

  // Prepare chart data - SORT DATES CHRONOLOGICALLY (oldest to newest)
  const sortedDailyLabels = Object.keys(analytics.dailyPnL).sort((a, b) => {
    // Parse "Jan 1", "Jan 2" etc. and sort chronologically
    // We'll use a more reliable method: create Date objects with current year
    const currentYear = new Date().getFullYear();
    const parseMonthDay = (str: string) => {
      const parts = str.split(' ');
      const months: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      return new Date(currentYear, months[parts[0]] || 0, parseInt(parts[1]) || 1);
    };
    return parseMonthDay(a).getTime() - parseMonthDay(b).getTime();
  });

  // Take last 10 days for better visibility
  const dailyLabels = sortedDailyLabels.slice(-10);
  const dailyData = dailyLabels.map(d => analytics.dailyPnL[d] || 0);

  // Cumulative PnL for line chart - shows portfolio growth over time
  let cumulative = 0;
  const cumulativeData = dailyData.map(d => {
    cumulative += d;
    return cumulative;
  });

  // Get top 5 profit and loss symbols for the butterfly chart
  const symbolPnLArray = Object.entries(analytics.symbolStats)
    .map(([symbol, stats]: any) => ({ symbol, pnl: stats.pnl, count: stats.count }))
    .sort((a, b) => b.pnl - a.pnl);

  const topProfits = symbolPnLArray.filter(s => s.pnl > 0).slice(0, 5);
  const topLosses = symbolPnLArray.filter(s => s.pnl < 0).slice(-5).reverse();

  // Find max absolute value for scaling
  const maxPnL = Math.max(
    ...topProfits.map(s => Math.abs(s.pnl)),
    ...topLosses.map(s => Math.abs(s.pnl)),
    0.01
  );

  // Daily wins/losses bar chart
  const barData = {
    labels: dailyLabels.slice(-5),
    datasets: [
      {
        data: dailyLabels.slice(-5).map(d => analytics.dailyWins[d] || 0),
        color: () => colors.success,
      },
    ],
  };

  return (
    <View style={styles.analyticsContent}>
      {/* Portfolio Growth Chart */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250 }}
      >
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.primary }]}>PORTFOLIO GROWTH</Text>
            {/* Show realized PnL (completed trades) in badge - matches web app */}
            <View style={[styles.chartBadge, { backgroundColor: analytics.totalRealized >= 0 ? `${colors.success}20` : `${colors.error}20` }]}>
              <Text style={[styles.chartBadgeText, { color: analytics.totalRealized >= 0 ? colors.success : colors.error }]}>
                ${formatCurrency(analytics.totalRealized)}
              </Text>
            </View>
          </View>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
            {analytics.completed > 0 ? `Avg $${(analytics.totalRealized / analytics.completed).toFixed(2)}/trade` : 'No completed trades'}
          </Text>

          {dailyLabels.length > 1 ? (
            <LineChart
              data={{
                labels: dailyLabels.length > 5 ? dailyLabels.filter((_, i) => i % 2 === 0) : dailyLabels,
                datasets: [{ data: cumulativeData.length > 0 ? cumulativeData : [0] }],
              }}
              width={CHART_WIDTH}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => analytics.totalRealized >= 0
                  ? `rgba(16, 185, 129, ${opacity})`
                  : `rgba(239, 68, 68, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={false}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="analytics-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                Not enough data for chart
              </Text>
            </View>
          )}
        </View>
      </MotiView>

      {/* Win Rate & Trading Edge Row */}
      <View style={styles.chartRow}>
        {/* Modern Allocation Donut */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 80 }}
          style={{ flex: 1 }}
        >
          <View style={[styles.chartCardSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.primary, marginBottom: 12 }]}>WIN RATE</Text>

            {analytics.completed > 0 ? (
              <View style={styles.modernDonutContainer}>
                {/* Modern Donut Ring */}
                <View style={styles.donutRing}>
                  {/* Background Ring */}
                  <View style={[styles.donutBackground, { borderColor: `${colors.error}30` }]} />
                  {/* Win Progress Ring - using conic gradient approximation with borders */}
                  <View style={[
                    styles.donutProgress,
                    {
                      borderColor: colors.success,
                      borderRightColor: analytics.winRate >= 25 ? colors.success : 'transparent',
                      borderBottomColor: analytics.winRate >= 50 ? colors.success : 'transparent',
                      borderLeftColor: analytics.winRate >= 75 ? colors.success : 'transparent',
                      transform: [{ rotate: `${(analytics.winRate / 100) * 360 - 90}deg` }]
                    }
                  ]} />
                  {/* Center Content */}
                  <View style={[styles.donutCenter, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.donutValue, { color: analytics.winRate >= 50 ? colors.success : colors.error }]}>
                      {analytics.winRate.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                {/* Stats Below */}
                <View style={styles.donutStats}>
                  <View style={styles.donutStat}>
                    <View style={[styles.donutDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Wins</Text>
                    <Text style={[styles.donutStatValue, { color: colors.success }]}>{analytics.wins}</Text>
                  </View>
                  <View style={[styles.donutDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.donutStat}>
                    <View style={[styles.donutDot, { backgroundColor: colors.error }]} />
                    <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Losses</Text>
                    <Text style={[styles.donutStatValue, { color: colors.error }]}>{analytics.losses}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noDataSmall}>
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No data</Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Trading Edge - Enhanced */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 120 }}
          style={{ flex: 1 }}
        >
          <View style={[styles.chartCardSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.primary }]}>TRADING EDGE</Text>

            <View style={styles.edgeStatsModern}>
              {/* Avg Win */}
              <View style={styles.edgeStatModern}>
                <View style={styles.edgeStatHeader}>
                  <View style={[styles.edgeIconBg, { backgroundColor: `${colors.success}15` }]}>
                    <Ionicons name="trending-up" size={14} color={colors.success} />
                  </View>
                  <Text style={[styles.edgeLabelModern, { color: colors.textSecondary }]}>Avg Win</Text>
                </View>
                <Text style={[styles.edgeValueModern, { color: colors.success }]}>
                  +${analytics.avgWin.toFixed(2)}
                </Text>
              </View>

              {/* Avg Loss */}
              <View style={styles.edgeStatModern}>
                <View style={styles.edgeStatHeader}>
                  <View style={[styles.edgeIconBg, { backgroundColor: `${colors.error}15` }]}>
                    <Ionicons name="trending-down" size={14} color={colors.error} />
                  </View>
                  <Text style={[styles.edgeLabelModern, { color: colors.textSecondary }]}>Avg Loss</Text>
                </View>
                <Text style={[styles.edgeValueModern, { color: colors.error }]}>
                  -${analytics.avgLoss.toFixed(2)}
                </Text>
              </View>

              {/* Profit Factor */}
              <View style={[styles.edgeStatModern, styles.edgeStatHighlight, { backgroundColor: `${analytics.profitFactor >= 1 ? colors.success : colors.error}08`, borderColor: `${analytics.profitFactor >= 1 ? colors.success : colors.error}20` }]}>
                <View style={styles.edgeStatHeader}>
                  <View style={[styles.edgeIconBg, { backgroundColor: `${colors.primary}15` }]}>
                    <MaterialCommunityIcons name="chart-line" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.edgeLabelModern, { color: colors.textSecondary }]}>Factor</Text>
                </View>
                <Text style={[styles.edgeValueModern, { color: analytics.profitFactor >= 1 ? colors.success : colors.error }]}>
                  {analytics.profitFactor.toFixed(2)}x
                </Text>
              </View>
            </View>
          </View>
        </MotiView>
      </View>

      {/* Best & Worst Trade */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 160 }}
      >
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.primary }]}>TRADE EXTREMES</Text>

          <View style={styles.extremesRow}>
            <View style={[styles.extremeCard, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
              <View style={[styles.extremeIconBg, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="trophy" size={18} color={colors.success} />
              </View>
              <Text style={[styles.extremeLabel, { color: colors.textSecondary }]}>BEST TRADE</Text>
              <Text style={[styles.extremeValue, { color: colors.success }]}>
                {analytics.bestTrade ? `+$${analytics.bestTrade.pnl.realized.toFixed(2)}` : 'N/A'}
              </Text>
              <Text style={[styles.extremeSymbol, { color: colors.text }]}>
                {analytics.bestTrade?.entryOrder.symbol.replace('USDT', '') || '-'}
              </Text>
            </View>

            <View style={[styles.extremeCard, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}>
              <View style={[styles.extremeIconBg, { backgroundColor: `${colors.error}20` }]}>
                <Ionicons name="warning" size={18} color={colors.error} />
              </View>
              <Text style={[styles.extremeLabel, { color: colors.textSecondary }]}>WORST TRADE</Text>
              <Text style={[styles.extremeValue, { color: colors.error }]}>
                {analytics.worstTrade ? `$${analytics.worstTrade.pnl.realized.toFixed(2)}` : 'N/A'}
              </Text>
              <Text style={[styles.extremeSymbol, { color: colors.text }]}>
                {analytics.worstTrade?.entryOrder.symbol.replace('USDT', '') || '-'}
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Symbol Performance - Butterfly Chart */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 200 }}
      >
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.primary }]}>SYMBOL PERFORMANCE</Text>
            <View style={[styles.chartBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.chartBadgeText, { color: colors.primary, fontSize: 10 }]}>
                {Object.keys(analytics.symbolStats).length} coins
              </Text>
            </View>
          </View>


          {(topProfits.length > 0 || topLosses.length > 0) ? (
            <View style={styles.butterflyChartContainer}>
              {/* Y-Axis Labels (Symbol names) */}
              <View style={styles.butterflyYAxis}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const profit = topProfits[i];
                  const loss = topLosses[i];
                  const symbol = profit?.symbol || loss?.symbol || '';
                  return (
                    <View key={i} style={styles.butterflyRow}>
                      <Text style={[styles.butterflySymbol, { color: colors.text }]} numberOfLines={1}>
                        {symbol}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Chart Bars */}
              <View style={styles.butterflyBars}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const loss = topLosses[i];
                  const profit = topProfits[i];
                  const lossWidth = loss ? (Math.abs(loss.pnl) / maxPnL) * 45 : 0;
                  const profitWidth = profit ? (Math.abs(profit.pnl) / maxPnL) * 45 : 0;

                  return (
                    <View key={i} style={styles.butterflyBarRow}>
                      {/* Loss Bar (Left side - 2nd quadrant) */}
                      <View style={styles.butterflyLeftSide}>
                        {loss && (
                          <>
                            <Text style={[styles.butterflyValue, styles.butterflyValueLeft, { color: colors.error }]}>
                              ${formatCurrency(loss.pnl)}
                            </Text>
                            <View
                              style={[
                                styles.butterflyBar,
                                styles.butterflyBarLeft,
                                {
                                  width: `${lossWidth}%`,
                                  backgroundColor: colors.error,
                                }
                              ]}
                            />
                          </>
                        )}
                      </View>

                      {/* Center Axis */}
                      <View style={[styles.butterflyAxis, { backgroundColor: colors.border }]} />

                      {/* Profit Bar (Right side - 1st quadrant) */}
                      <View style={styles.butterflyRightSide}>
                        {profit && (
                          <>
                            <View
                              style={[
                                styles.butterflyBar,
                                styles.butterflyBarRight,
                                {
                                  width: `${profitWidth}%`,
                                  backgroundColor: colors.success,
                                }
                              ]}
                            />
                            <Text style={[styles.butterflyValue, styles.butterflyValueRight, { color: colors.success }]}>
                              +${formatCurrency(profit.pnl)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.noDataSmall}>
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No data</Text>
            </View>
          )}

          {/* Legend */}
          <View style={styles.butterflyLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Top Losses</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Top Profits</Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Trading Activity Hours - Enhanced Heat Map */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 240 }}
      >
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.primary }]}>TRADING HOURS</Text>
            <View style={[styles.chartBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.chartBadgeText, { color: colors.primary, fontSize: 10 }]}>24h UTC</Text>
            </View>
          </View>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
            Activity heatmap by hour
          </Text>

          {/* Hour Blocks Grid */}
          <View style={styles.hoursGrid}>
            {[0, 1, 2, 3].map(row => (
              <View key={row} style={styles.hoursRow}>
                {[0, 1, 2, 3, 4, 5].map(col => {
                  const hour = row * 6 + col;
                  const data = analytics.hourlyActivity[hour] || { wins: 0, losses: 0 };
                  const total = data.wins + data.losses;
                  const maxActivity = Math.max(...Object.values(analytics.hourlyActivity).map((d: any) => d.wins + d.losses), 1);
                  const intensity = total / maxActivity;
                  const isWinHeavy = data.wins > data.losses;

                  return (
                    <View
                      key={hour}
                      style={[
                        styles.hourBlock,
                        {
                          backgroundColor: total === 0
                            ? `${colors.border}40`
                            : isWinHeavy
                              ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
                              : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
                          borderColor: total > 0
                            ? (isWinHeavy ? colors.success : colors.error)
                            : 'transparent',
                        }
                      ]}
                    >
                      <Text style={[
                        styles.hourLabel,
                        {
                          color: total === 0
                            ? colors.textSecondary
                            : isWinHeavy ? colors.success : colors.error
                        }
                      ]}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                      {total > 0 && (
                        <Text style={[
                          styles.hourCount,
                          { color: isWinHeavy ? colors.success : colors.error }
                        ]}>
                          {total}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.hoursLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendGradient, { backgroundColor: `${colors.success}40` }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Win-heavy hour</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendGradient, { backgroundColor: `${colors.error}40` }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Loss-heavy hour</Text>
            </View>
          </View>
        </View>
      </MotiView>
    </View>
  );
}

// ============================================================================
// TRADES CONTENT
// ============================================================================

function TradesContent({
  trades,
  filter,
  setFilter,
  analytics,
  expandedTradeId,
  setExpandedTradeId,
  colors,
  isDark
}: {
  trades: Trade[];
  filter: TradeFilter;
  setFilter: (f: TradeFilter) => void;
  analytics: any;
  expandedTradeId: string | null;
  setExpandedTradeId: (id: string | null) => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.tradesContent}>
      {/* Filter Tabs */}
      <View style={[styles.tradeFilterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>FILTER:</Text>
        {(['all', 'active', 'completed'] as TradeFilter[]).map((f) => {
          const count = f === 'all' ? analytics.totalTrades : f === 'active' ? analytics.active : analytics.completed;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.tradeFilterBtn,
                filter === f && { backgroundColor: colors.surfaceHighlight }
              ]}
            >
              <Text style={[
                styles.tradeFilterText,
                { color: filter === f ? colors.text : colors.textSecondary }
              ]}>
                {f.toUpperCase()} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Trades Count */}
      <View style={styles.tradesCountRow}>
        <Text style={[styles.tradesCount, { color: colors.textSecondary }]}>
          {trades.length} trades
        </Text>
      </View>

      {/* Trades List */}
      {trades.length > 0 ? (
        trades.map((trade, index) => (
          <TradeCard
            key={trade.tradeId}
            trade={trade}
            index={index}
            expanded={expandedTradeId === trade.tradeId}
            onToggle={() => setExpandedTradeId(
              expandedTradeId === trade.tradeId ? null : trade.tradeId
            )}
            colors={colors}
            isDark={isDark}
          />
        ))
      ) : (
        <View style={styles.emptyTrades}>
          <MaterialCommunityIcons name="chart-box-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {filter !== 'all' ? filter : ''} trades found
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// TRADE CARD
// ============================================================================

function TradeCard({ trade, index, expanded, onToggle, colors, isDark }: {
  trade: Trade;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  colors: any;
  isDark: boolean;
}) {
  const isActive = !trade.pnl.isComplete;
  const isProfitable = trade.pnl.total >= 0;
  const hasDataIssue = trade.pnl.hasDataIntegrityIssue;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250, delay: Math.min(index * 40, 150) }}
    >
      <Pressable onPress={onToggle}>
        <View style={[
          styles.tradeCard,
          {
            backgroundColor: colors.surface,
            borderColor: hasDataIssue ? colors.warning : colors.border,
          }
        ]}>
          {/* Main Row */}
          <View style={styles.tradeMainRow}>
            {/* Left: Symbol & Status */}
            <View style={styles.tradeLeft}>
              <View style={[
                styles.tradeStatusDot,
                { backgroundColor: isActive ? colors.warning : colors.textSecondary }
              ]} />
              <View>
                <View style={styles.tradeSymbolRow}>
                  <Text style={[styles.tradeSymbol, { color: colors.text }]}>
                    {trade.entryOrder.symbol}
                  </Text>
                  {hasDataIssue && (
                    <View style={[styles.guardedBadge, { backgroundColor: `${colors.warning}20` }]}>
                      <MaterialCommunityIcons name="shield-alert" size={12} color={colors.warning} />
                      <Text style={[styles.guardedText, { color: colors.warning }]}>GUARDED</Text>
                    </View>
                  )}
                  {!hasDataIssue && (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? `${colors.warning}20` : isDark ? '#2A2A3E' : '#F0F0F0' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: isActive ? colors.warning : colors.textSecondary }
                      ]}>
                        {isActive ? 'ACTIVE' : 'CLOSED'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Trade Details Row */}
                <View style={styles.tradeDetailsRow}>
                  <Text style={[styles.tradeDetail, { color: colors.textSecondary }]}>
                    Entry: <Text style={{ color: colors.primary }}>${formatPrice(trade.entryOrder.price)}</Text>
                  </Text>
                  <Text style={[styles.tradeDetailDot, { color: colors.textSecondary }]}>•</Text>
                  <Text style={[styles.tradeDetail, { color: colors.textSecondary }]}>
                    Qty: <Text style={{ color: colors.primary }}>{formatQuantity(trade.entryOrder.quantity)}</Text>
                  </Text>
                  <Text style={[styles.tradeDetailDot, { color: colors.textSecondary }]}>•</Text>
                  <Text style={[styles.tradeDetail, { color: colors.textSecondary }]}>
                    Cost: <Text style={{ color: colors.text }}>${formatCurrency(trade.pnl.entryCost)}</Text>
                  </Text>
                  {isActive && (
                    <>
                      <Text style={[styles.tradeDetailDot, { color: colors.textSecondary }]}>•</Text>
                      <Text style={[styles.tradeDetail, { color: colors.textSecondary }]}>
                        Market: <Text style={{ color: colors.success }}>${formatPrice(trade.pnl.currentMarketPrice)}</Text>
                      </Text>
                    </>
                  )}
                </View>

                {/* Exits Row */}
                <View style={styles.exitsRow}>
                  <Text style={[styles.exitsLabel, { color: colors.textSecondary }]}>Exits:</Text>
                  {trade.exitOrders.length > 0 ? (
                    trade.exitOrders.slice(0, 3).map((exit, i) => (
                      <View key={i} style={[styles.exitBadge, { backgroundColor: `${colors.success}20` }]}>
                        <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                        <Text style={[styles.exitBadgeText, { color: colors.success }]}>
                          {exit.role === 'TP1' || exit.role === 'TP2' ? exit.role : exit.role === 'SL' ? 'SL' : '1'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noExits, { color: colors.textSecondary }]}>None</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Right: PnL */}
            <View style={styles.tradeRight}>
              <Text style={[styles.pnlTypeLabel, { color: colors.textSecondary }]}>
                {isActive ? 'UNREALIZED' : 'REALIZED'}
              </Text>
              <Text style={[
                styles.tradePnlSmall,
                { color: isProfitable ? colors.success : colors.error }
              ]}>
                {isProfitable ? '+' : ''}${formatCurrency(isActive ? trade.pnl.unrealized : trade.pnl.realized)}
                <Text style={styles.tradePnlPercent}> {isProfitable ? '+' : ''}{(isActive ? trade.pnl.unrealizedPercent : trade.pnl.realizedPercent).toFixed(2)}%</Text>
              </Text>

              <View style={[
                styles.totalPnlBadge,
                { backgroundColor: isProfitable ? `${colors.success}15` : `${colors.error}15` }
              ]}>
                <Text style={[styles.totalPnlBadgeLabel, { color: colors.textSecondary }]}>TOTAL PNL</Text>
                <Text style={[styles.totalPnlBadgeValue, { color: isProfitable ? colors.success : colors.error }]}>
                  {isProfitable ? '+' : ''}${formatCurrency(trade.pnl.total)}
                  <Text style={styles.totalPnlBadgePercent}> {isProfitable ? '+' : ''}{trade.pnl.totalPercent.toFixed(2)}%</Text>
                </Text>
              </View>

              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </View>

          {/* Expanded Content */}
          {expanded && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
            >
              <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                {/* Entry Order */}
                <View style={styles.orderBlock}>
                  <Text style={[styles.orderBlockTitle, { color: colors.primary }]}>Entry Order</Text>
                  <View style={styles.orderGrid}>
                    <OrderGridItem label="Order ID" value={trade.entryOrder.orderId} colors={colors} />
                    <OrderGridItem label="Type" value={trade.entryOrder.type} colors={colors} />
                    <OrderGridItem label="Status" value={trade.entryOrder.status} valueColor={colors.success} colors={colors} />
                    <OrderGridItem label="Filled At" value={formatDateTime(trade.entryOrder.filledAt)} colors={colors} />
                  </View>
                </View>

                {/* Exit Orders */}
                {trade.exitOrders.length > 0 && (
                  <View style={styles.orderBlock}>
                    <Text style={[styles.orderBlockTitle, { color: colors.primary }]}>Exit Orders ({trade.exitOrders.length})</Text>
                    {trade.exitOrders.map((exit, i) => (
                      <View key={i} style={[styles.exitOrderRow, { backgroundColor: colors.surfaceLight }]}>
                        <View style={[styles.exitRoleBadge, { backgroundColor: getExitRoleColor(exit.role, colors) }]}>
                          <Text style={styles.exitRoleText}>{exit.role}</Text>
                        </View>
                        <View style={styles.exitOrderDetails}>
                          <Text style={[styles.exitOrderPrice, { color: colors.text }]}>${formatPrice(exit.price)}</Text>
                          <Text style={[styles.exitOrderQty, { color: colors.textSecondary }]}>Qty: {formatQuantity(exit.quantity)}</Text>
                        </View>
                        <View style={[
                          styles.exitStatusBadge,
                          { backgroundColor: exit.status === 'FILLED' ? `${colors.success}20` : `${colors.warning}20` }
                        ]}>
                          <Text style={[
                            styles.exitStatusText,
                            { color: exit.status === 'FILLED' ? colors.success : colors.warning }
                          ]}>
                            {exit.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* PnL Breakdown */}
                <View style={styles.orderBlock}>
                  <Text style={[styles.orderBlockTitle, { color: colors.primary }]}>P&L Breakdown</Text>
                  <View style={styles.pnlBreakdownGrid}>
                    <View style={[styles.pnlBreakdownItem, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.pnlBreakdownLabel, { color: colors.textSecondary }]}>Realized</Text>
                      <Text style={[styles.pnlBreakdownValue, { color: trade.pnl.realized >= 0 ? colors.success : colors.error }]}>
                        ${formatCurrency(trade.pnl.realized)}
                      </Text>
                      <Text style={[styles.pnlBreakdownQty, { color: colors.textSecondary }]}>Qty: {formatQuantity(trade.pnl.realizedQty)}</Text>
                    </View>
                    <View style={[styles.pnlBreakdownItem, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.pnlBreakdownLabel, { color: colors.textSecondary }]}>Unrealized</Text>
                      <Text style={[styles.pnlBreakdownValue, { color: trade.pnl.unrealized >= 0 ? colors.success : colors.error }]}>
                        ${formatCurrency(trade.pnl.unrealized)}
                      </Text>
                      <Text style={[styles.pnlBreakdownQty, { color: colors.textSecondary }]}>Qty: {formatQuantity(trade.pnl.unrealizedQty)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </MotiView>
          )}
        </View>
      </Pressable>
    </MotiView>
  );
}

function OrderGridItem({ label, value, valueColor, colors }: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View style={styles.orderGridItem}>
      <Text style={[styles.orderGridLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.orderGridValue, { color: valueColor || colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function getExitRoleColor(role: string, colors: any): string {
  switch (role) {
    case 'TP1':
    case 'TP2':
      return colors.success;
    case 'SL':
      return colors.error;
    case 'TIME_EXIT':
      return colors.warning;
    default:
      return colors.primary;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toFixed(2);
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatQuantity(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(4);
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Pending';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '500',
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab Switch
  tabSwitch: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Period Filter
  periodFilter: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats Scroll
  statsScroll: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    width: 130,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statCardSubtitle: {
    fontSize: 10,
    marginTop: 4,
  },

  // Analytics Content
  analyticsContent: {
    gap: 16,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  chartCardSmall: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  chartRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  chartBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chartBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 11,
    marginBottom: 12,
  },
  chart: {
    marginLeft: -16,
    borderRadius: 12,
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noDataSmall: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 12,
  },

  // Pie Chart
  pieContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  pieCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -20 }],
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  pieCenterLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  pieLegend: {
    marginTop: 8,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Edge Stats
  edgeStats: {
    marginTop: 12,
    gap: 10,
  },
  edgeStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  edgeLabel: {
    fontSize: 11,
  },
  edgeValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Extremes
  extremesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  extremeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  extremeLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  extremeValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  extremeSymbol: {
    fontSize: 11,
    marginTop: 4,
  },

  // Performers
  performersList: {
    marginTop: 12,
    gap: 10,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  performerInfo: {
    width: 70,
  },
  performerSymbol: {
    fontSize: 12,
    fontWeight: '700',
  },
  performerCount: {
    fontSize: 10,
  },
  performerBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  performerBar: {
    height: '100%',
    borderRadius: 4,
  },
  performerPnl: {
    width: 60,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Activity Grid
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 4,
  },
  activityCell: {
    alignItems: 'center',
    width: (CHART_WIDTH - 60) / 18,
  },
  activityHour: {
    fontSize: 8,
    marginBottom: 4,
  },
  activityBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 1,
  },
  activityBar: {
    width: 6,
    borderRadius: 2,
  },
  activityBarEmpty: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  activityLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },

  // Trades Content
  tradesContent: {
    gap: 12,
  },
  tradeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tradeFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tradeFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tradesCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tradesCount: {
    fontSize: 12,
  },

  // Trade Card
  tradeCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  tradeMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tradeLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  tradeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  tradeSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  guardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guardedText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tradeDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  tradeDetail: {
    fontSize: 11,
  },
  tradeDetailDot: {
    fontSize: 11,
  },
  exitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exitsLabel: {
    fontSize: 10,
  },
  exitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exitBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  noExits: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  tradeRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pnlTypeLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  tradePnlSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  tradePnlPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  totalPnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
    marginTop: 4,
  },
  totalPnlBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  totalPnlBadgeValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalPnlBadgePercent: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Expanded Section
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 14,
  },
  orderBlock: {
    gap: 8,
  },
  orderBlockTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  orderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderGridItem: {
    width: '48%',
  },
  orderGridLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  orderGridValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  exitOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  exitRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exitRoleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  exitOrderDetails: {
    flex: 1,
  },
  exitOrderPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  exitOrderQty: {
    fontSize: 10,
  },
  exitStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exitStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  pnlBreakdownGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  pnlBreakdownItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pnlBreakdownLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  pnlBreakdownValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  pnlBreakdownQty: {
    fontSize: 10,
    marginTop: 4,
  },

  // Empty State
  emptyTrades: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },

  // Live Update
  liveUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  liveUpdateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveUpdateText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Modern Donut Chart
  modernDonutContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  donutRing: {
    width: 90,
    height: 90,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutBackground: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
  },
  donutProgress: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
    borderTopColor: 'transparent',
  },
  donutCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  donutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  donutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutLabel: {
    fontSize: 11,
  },
  donutStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  donutDivider: {
    width: 1,
    height: 20,
  },

  // Enhanced Edge Stats
  edgeStatsModern: {
    marginTop: 12,
    gap: 8,
  },
  edgeStatModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  edgeStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  edgeIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeLabelModern: {
    fontSize: 11,
    fontWeight: '500',
  },
  edgeValueModern: {
    fontSize: 14,
    fontWeight: '700',
  },
  edgeStatHighlight: {
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginTop: 4,
  },

  // Extreme Icons
  extremeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Butterfly Chart (Symbol Performance)
  butterflyChartContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  butterflyYAxis: {
    width: 55,
    justifyContent: 'space-between',
  },
  butterflyRow: {
    height: 28,
    justifyContent: 'center',
  },
  butterflySymbol: {
    fontSize: 10,
    fontWeight: '600',
  },
  butterflyBars: {
    flex: 1,
  },
  butterflyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  butterflyLeftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  butterflyRightSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  butterflyAxis: {
    width: 2,
    height: 28,
    marginHorizontal: 4,
  },
  butterflyBar: {
    height: 18,
    borderRadius: 4,
    minWidth: 4,
  },
  butterflyBarLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  butterflyBarRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  butterflyValue: {
    fontSize: 9,
    fontWeight: '600',
    minWidth: 45,
  },
  butterflyValueLeft: {
    textAlign: 'right',
    marginRight: 4,
  },
  butterflyValueRight: {
    textAlign: 'left',
    marginLeft: 4,
  },
  butterflyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },

  // Hours Heatmap Grid
  hoursGrid: {
    marginTop: 16,
    gap: 6,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  hourBlock: {
    width: (CHART_WIDTH - 60) / 6,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hourLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  hourCount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  hoursLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
  },
  legendGradient: {
    width: 16,
    height: 8,
    borderRadius: 3,
  },
});
