/**
 * Tab Layout
 * Custom navigation with semicircle floating menu
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SemicircleNav from '@/components/navigation/SemicircleNav';

import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: {
            display: 'none', // Hide the default tab bar
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" size={size || 24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="connect-exchange"
          options={{
            title: 'Exchanges',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="link-variant" size={size || 24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trades-history"
          options={{
            title: 'Trades',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size || 24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="compass" size={size || 24} color={color} />
            ),
          }}
        />
      </Tabs>
      
      {/* Custom Semicircle Navigation */}
      <SemicircleNav />
    </>
  );
}
