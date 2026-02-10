/**
 * Explore Screen
 * Discover features and settings
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { router } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: string;
  onPress?: () => void;
}

export default function ExploreScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();

  // Scroll tracking for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;

  const features: FeatureItem[] = [
    {
      icon: 'link-variant',
      title: 'Exchange Connections',
      description: 'Manage your API keys and exchange settings',
      color: colors.primary,
      onPress: () => router.push('/(tabs)/connect-exchange'),
    },
    {
      icon: 'robot',
      title: 'Trading Bot',
      description: 'Configure automated trading strategies',
      color: colors.success,
    },
    {
      icon: 'chart-timeline-variant',
      title: 'Trade History',
      description: 'View your past trades and performance',
      color: colors.neonBlue,
    },
    {
      icon: 'wallet',
      title: 'Portfolio',
      description: 'Track your assets across exchanges',
      color: colors.warning,
    },
    {
      icon: 'bell-outline',
      title: 'Notifications',
      description: 'Configure alerts and notifications',
      color: colors.primaryLight,
    },
    {
      icon: 'cog',
      title: 'Settings',
      description: 'App preferences and security',
      color: colors.textSecondary,
      onPress: () => router.push('/(tabs)/settings'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Parallax Background */}
      <AnimatedBackground scrollY={scrollY} variant="explore" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Discover features
          </Text>
        </View>
        <IconButton
          icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
          size={22}
          iconColor={colors.primary}
          onPress={toggleTheme}
        />
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
      >
        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <MotiView
              key={feature.title}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: index * 80 }}
            >
              <Pressable
                onPress={feature.onPress}
                style={({ pressed }) => [
                  styles.featureCard,
                  {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                  <MaterialCommunityIcons
                    name={feature.icon as any}
                    size={28}
                    color={feature.color}
                  />
                </View>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </Pressable>
            </MotiView>
          ))}
        </View>

        {/* Logout Button */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 600 }}
        >
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: `${colors.error}10`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>
              Logout
            </Text>
          </Pressable>
        </MotiView>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    minWidth: 150,
    padding: 16,
    borderRadius: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 16,
    borderRadius: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
