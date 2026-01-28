/**
 * Dashboard Home Screen
 * Main screen with hamburger menu and exchange drawer
 * 
 * Performance Optimizations:
 * - AppState listener to pause polling when app is in background
 * - Memoized ExchangePreviewCard to prevent unnecessary re-renders
 * - Skip API calls when no exchange is connected
 * - ZUSTAND STORE: Centralized trades data (no duplicate API calls)
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Surface, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

// Contexts
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExchange } from '@/contexts/ExchangeContext';

// Components
import ExchangeDrawer from '@/components/drawers/ExchangeDrawer';
import TradingBotCard from '@/components/trading/TradingBotCard';
import AssetsCard from '@/components/trading/AssetsCard';
import OpenOrdersCard from '@/components/trading/OpenOrdersCard';
import ConnectExchangeModal from '@/components/modals/ConnectExchangeModal';

// Zustand Store - Centralized trades data management
import { useTradesStore } from '@/store/tradesStore';

// Fonts
import { FONTS } from '@/constants/fonts';

// Types
import { CredentialResponse, getExchangeInfo, ExchangeType } from '@/types/exchange.types';

/**
 * Memoized Exchange Preview Card
 * Prevents re-renders when parent state changes (like todayPnL counter)
 */
interface ExchangePreviewCardProps {
  credential: CredentialResponse;
  isActive: boolean;
  colors: any;
  onPress: () => void;
}

const ExchangePreviewCard = memo(function ExchangePreviewCard({
  credential,
  isActive,
  colors,
  onPress,
}: ExchangePreviewCardProps) {
  const info = getExchangeInfo(credential.exchange);
  if (!info) return null;

  return (
    <Pressable
      style={[
        styles.exchangePreviewCard,
        {
          backgroundColor: isActive ? `${info.color}15` : colors.surface,
          borderColor: isActive ? info.color : colors.border,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={info.icon as any}
        size={28}
        color={info.color}
      />
      <Text style={[styles.exchangePreviewName, { color: colors.text }]}>
        {info.name}
      </Text>
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
      )}
    </Pressable>
  );
});

export default function DashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { selectedExchange, connectedExchanges } = useExchange();

  // Drawer & Modal state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [editExchangeId, setEditExchangeId] = useState<ExchangeType | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // Use Zustand store for trades data (centralized - shared with TradingBotCard)
  // Dashboard only triggers fetch/clear, TradingBotCard displays the stats
  const fetchTrades = useTradesStore((state) => state.fetchTrades);
  const clearTrades = useTradesStore((state) => state.clearTrades);

  // AppState tracking for background/foreground
  const appState = useRef(AppState.currentState);

  // Scroll tracking for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Handle refresh - now uses Zustand store
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedExchange) {
      await fetchTrades(selectedExchange, true); // Force refresh
    }
    setTimeout(() => setRefreshing(false), 500);
  }, [selectedExchange, fetchTrades]);

  // Load stats on mount and when exchange changes
  useEffect(() => {
    if (selectedExchange) {
      // Fetch trades via store (handles caching automatically)
      fetchTrades(selectedExchange);
    } else {
      // Clear trades when no exchange
      clearTrades();
    }
  }, [selectedExchange, fetchTrades, clearTrades]);

  // Auto-refresh every 30 seconds - pauses when app is in background
  useEffect(() => {
    // Don't set up polling if no exchange is connected
    if (!selectedExchange) return;

    let interval: NodeJS.Timeout | null = null;

    // Start polling only when app is active
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        // Only poll if app is in foreground and exchange is selected
        if (appState.current === 'active' && selectedExchange) {
          fetchTrades(selectedExchange, true); // Force refresh for polling
        }
      }, 30000);
    };

    // Handle app state changes (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh data and restart polling
        if (selectedExchange) {
          fetchTrades(selectedExchange, true);
          startPolling();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling to save battery/data
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial start
    startPolling();

    return () => {
      if (interval) clearInterval(interval);
      subscription.remove();
    };
  }, [selectedExchange, fetchTrades]);

  // Handle update credentials from drawer (receives full credential object)
  const handleUpdateCredentials = (credential: CredentialResponse) => {
    setEditExchangeId(credential.exchange);
    setConnectModalVisible(true);
  };

  // Handle add new exchange
  const handleAddExchange = () => {
    setEditExchangeId(undefined);
    setConnectModalVisible(true);
  };

  // Get current exchange info
  const currentExchangeInfo = selectedExchange ? getExchangeInfo(selectedExchange) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Hamburger Menu */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {/* Hamburger Menu Button */}
        <Pressable
          onPress={() => setDrawerVisible(true)}
          style={({ pressed }) => [
            styles.menuButton,
            { backgroundColor: colors.surfaceLight },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
        </Pressable>

        {/* Current Exchange Indicator */}
        {currentExchangeInfo && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <Pressable
              onPress={() => setDrawerVisible(true)}
              style={[styles.exchangeIndicator, { backgroundColor: `${currentExchangeInfo.color}15` }]}
            >
              <MaterialCommunityIcons
                name={currentExchangeInfo.icon as any}
                size={18}
                color={currentExchangeInfo.color}
              />
              <Text style={[styles.exchangeIndicatorText, { color: colors.text }]}>
                {currentExchangeInfo.name}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textLight} />
            </Pressable>
          </MotiView>
        )}

        {/* Right Icons */}
        <View style={styles.headerRight}>
          <IconButton
            icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
            size={22}
            iconColor={colors.primary}
            onPress={toggleTheme}
            style={{ marginRight: -4 }}
          />
          <IconButton
            icon="bell-outline"
            size={22}
            iconColor={colors.textLight}
            onPress={() => { }}
          />
        </View>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Welcome Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          <View style={styles.welcomeContainer}>
            <View>
              <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
                Welcome back,
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.firstName || 'Trader'} 👋
              </Text>
            </View>
            <View style={[styles.dateContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </MotiView>

        {/* No Exchange Connected Warning */}
        {connectedExchanges.length === 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
          >
            <Surface style={[styles.warningCard, { backgroundColor: colors.surface, borderColor: colors.warning, borderWidth: 1 }]} elevation={0}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: colors.text }]}>
                  No Exchange Connected
                </Text>
                <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                  Connect your exchange to start trading
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={handleAddExchange}
                buttonColor={colors.warning}
                compact
              >
                Connect
              </Button>
            </Surface>
          </MotiView>
        )}

        {/* Trading Bot Card - Main CTA (includes Today's PnL and Trades when active) */}
        {connectedExchanges.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 150 }}
          >
            <TradingBotCard />
          </MotiView>
        )}

        {/* Assets & Open Orders - Real Data */}
        {selectedExchange && (
          <>
            <AssetsCard />
            <OpenOrdersCard />
          </>
        )}

        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 300 }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleAddExchange}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <MaterialCommunityIcons name="link-variant" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Manage Exchanges</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                {connectedExchanges.length} connected
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => { }}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.success}15` }]}>
                <MaterialCommunityIcons name="robot" size={24} color={colors.success} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Start Bot</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                Begin trading
              </Text>
            </Pressable>
          </View>
        </MotiView>

        {/* Connected Exchanges Preview */}
        {connectedExchanges.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 400 }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Exchanges</Text>
              <IconButton
                icon="chevron-right"
                size={20}
                iconColor={colors.textLight}
                onPress={() => setDrawerVisible(true)}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exchangesScroll}>
              {connectedExchanges.map((credential) => (
                <ExchangePreviewCard
                  key={credential.id}
                  credential={credential}
                  isActive={selectedExchange === credential.exchange}
                  colors={colors}
                  onPress={() => setDrawerVisible(true)}
                />
              ))}
            </ScrollView>
          </MotiView>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <ExchangeDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onUpdateCredentials={handleUpdateCredentials}
        onAddExchange={handleAddExchange}
      />

      {/* Connect/Update Form Modal */}
      <ConnectExchangeModal
        visible={connectModalVisible}
        onClose={() => setConnectModalVisible(false)}
        editExchangeId={editExchangeId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exchangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exchangeIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Welcome
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontFamily: FONTS.username,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    gap: 14,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // Exchanges Scroll
  exchangesScroll: {
    marginLeft: -20,
    paddingLeft: 20,
    marginBottom: 20,
  },
  exchangePreviewCard: {
    width: 100,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  exchangePreviewName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
