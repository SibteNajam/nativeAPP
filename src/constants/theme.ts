/**
 * Premium theme with soft, creamy colors
 * Designed to complement the authentication illustration
 */

import { Platform } from 'react-native';

// Soft, creamy color palette inspired by the illustration
export const Colors = {
  // Primary Blues (from illustration)
  primary: '#4A90D9',          // Soft blue
  primaryLight: '#7BB3E8',     // Light creamy blue
  primaryDark: '#3A7BC8',      // Deeper blue
  primaryMuted: '#A8C8E8',     // Muted soft blue

  // Accent (Soft purple-blue gradient)
  accent: '#6B7FD9',           // Soft purple-blue
  accentLight: '#8E9FE8',      // Light accent

  // Creamy backgrounds
  cream: '#FAF8F5',            // Warm cream
  creamLight: '#FFFDF9',       // Light cream
  creamDark: '#F5F0E8',        // Darker cream

  // Soft surfaces
  surfaceLight: '#F8F6F3',     // Soft surface
  surfaceMuted: 'rgba(74, 144, 217, 0.08)', // Blue tinted surface

  // Dark mode (soft, not harsh)
  bgDark: '#1A1B2E',           // Soft dark blue-gray
  surfaceDark: 'rgba(255, 255, 255, 0.06)', // Glass effect
  surfaceDarkHover: 'rgba(255, 255, 255, 0.10)',

  // Borders (soft, subtle)
  borderLight: 'rgba(74, 144, 217, 0.15)', // Soft blue border
  borderDark: 'rgba(255, 255, 255, 0.12)',
  borderFocus: '#4A90D9',

  // Text colors
  textPrimary: '#1E2A3B',      // Dark blue-gray for readability
  textSecondary: '#6B7A8C',    // Soft gray
  textMuted: '#9BA8B8',        // Muted text
  textLight: '#FFFFFF',        // White text
  textDark: '#0F1624',         // Almost black

  // Status colors (soft versions)
  success: '#4CAF7D',          // Soft green
  successLight: '#E8F5EE',
  danger: '#E57373',           // Soft red
  dangerLight: '#FFEBEE',
  warning: '#FFB74D',          // Soft orange
  warningLight: '#FFF8E1',

  // Gradients
  gradientPrimary: ['#4A90D9', '#6B7FD9'] as const,
  gradientAccent: ['#6B7FD9', '#8E9FE8'] as const,
  gradientCream: ['#FFFDF9', '#F8F6F3'] as const,
  gradientDark: ['#1A1B2E', '#252840'] as const,

  // Shadows
  shadowLight: 'rgba(74, 144, 217, 0.12)',
  shadowDark: 'rgba(0, 0, 0, 0.25)',

  // Legacy support
  light: {
    text: '#1E2A3B',
    background: '#FAF8F5',
    tint: '#4A90D9',
    icon: '#6B7A8C',
    tabIconDefault: '#6B7A8C',
    tabIconSelected: '#4A90D9',
  },
  dark: {
    text: '#F0F2F5',
    background: '#1A1B2E',
    tint: '#7BB3E8',
    icon: '#9BA8B8',
    tabIconDefault: '#9BA8B8',
    tabIconSelected: '#7BB3E8',
  },
};

// Typography
export const Typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,

  // Font weights
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,

  // Letter spacing
  letterSpacingTighter: -0.5,
  letterSpacingNormal: 0,
  letterSpacingWider: 0.5,
};

// Spacing (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
};

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: Colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadowLight,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Fonts
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Animation durations
export const Animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  entrance: 600,

  // Spring configs
  spring: {
    damping: 15,
    stiffness: 150,
  },
  springBouncy: {
    damping: 10,
    stiffness: 180,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Fonts,
  Animations,
};
