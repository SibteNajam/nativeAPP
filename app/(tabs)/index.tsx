/**
 * Dashboard Home Screen
 * Main screen with hamburger menu and exchange drawer
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
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

// Types
import { CredentialResponse, getExchangeInfo, ExchangeType } from '@/types/exchange.types';

export default function DashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { selectedExchange, connectedExchanges } = useExchange();

  // Drawer & Modal state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [editExchangeId, setEditExchangeId] = useState<ExchangeType | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // Scroll tracking for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh data here
    setTimeout(() => setRefreshing(false), 1000);
  };

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
            { backgroundColor: `${colors.primary}10` },
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
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.firstName || 'Trader'} 👋
          </Text>
        </MotiView>

        {/* No Exchange Connected Warning */}
        {connectedExchanges.length === 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
          >
            <Surface style={[styles.warningCard, { backgroundColor: `${colors.warning}15` }]} elevation={0}>
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

        {/* Trading Bot Card - Main CTA */}
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
              {connectedExchanges.map((credential) => {
                const info = getExchangeInfo(credential.exchange);
                const isActive = selectedExchange === credential.exchange;

                if (!info) return null;

                return (
                  <Pressable
                    key={credential.id}
                    style={[
                      styles.exchangePreviewCard,
                      {
                        backgroundColor: isActive ? `${info.color}15` : colors.surface,
                        borderColor: isActive ? info.color : colors.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                    onPress={() => setDrawerVisible(true)}
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
              })}
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
    paddingBottom: 12,
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
  welcomeText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 4,
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
