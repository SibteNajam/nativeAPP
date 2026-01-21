/**
 * Global Theme Configuration - Light & Dark Mode Support
 * 
 * Change PRIMARY_COLOR to update the accent color across both themes.
 * Toggle between light/dark mode using the ThemeContext.
 */

import { Platform } from 'react-native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// ===========================================
// PRIMARY COLOR - Change this to update the accent color
// ===========================================

// Choose your primary color:
// Purple: '#7C3AED'
// Teal: '#00D4AA'
// Blue: '#3B82F6'
// Orange: '#F97316'

export const PRIMARY_COLOR = '#7C3AED'; // Purple theme

// Derived primary shades (auto-generated based on PRIMARY_COLOR)
const PRIMARY_SHADES = {
  purple: {
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',
    neon: '#B794F6',
  },
  teal: {
    primary: '#00D4AA',
    primaryLight: '#4DE8C8',
    primaryDark: '#00A886',
    neon: '#00D4FF',
  },
  blue: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    neon: '#38BDF8',
  },
  orange: {
    primary: '#F97316',
    primaryLight: '#FB923C',
    primaryDark: '#EA580C',
    neon: '#FBBF24',
  },
};

// Get current primary shades
const getCurrentPrimary = () => {
  if (PRIMARY_COLOR === '#7C3AED') return PRIMARY_SHADES.purple;
  if (PRIMARY_COLOR === '#00D4AA') return PRIMARY_SHADES.teal;
  if (PRIMARY_COLOR === '#3B82F6') return PRIMARY_SHADES.blue;
  if (PRIMARY_COLOR === '#F97316') return PRIMARY_SHADES.orange;
  // Default - use the color as-is
  return {
    primary: PRIMARY_COLOR,
    primaryLight: PRIMARY_COLOR,
    primaryDark: PRIMARY_COLOR,
    neon: PRIMARY_COLOR,
  };
};

const CURRENT_PRIMARY = getCurrentPrimary();

// ===========================================
// LIGHT THEME COLORS
// ===========================================

export const LIGHT_COLORS = {
  // Primary Shades (from selected color)
  primary: CURRENT_PRIMARY.primary,
  primaryLight: CURRENT_PRIMARY.primaryLight,
  primaryDark: CURRENT_PRIMARY.primaryDark,

  // Accent Colors
  accent: '#C4B5FD',
  accentLight: '#EDE9FE',

  // Neon Colors (for animations)
  neonPurple: CURRENT_PRIMARY.neon,
  neonGreen: '#4ADE80',
  neonBlue: '#38BDF8',

  // Background Colors (Light)
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceLight: '#F5F3FF',
  surfaceHighlight: '#EDE9FE',

  // Terminal/Card Colors (Light mode uses subtle dark)
  terminalBg: '#1E1B2E',
  terminalHeader: '#2D2A3E',
  terminalBorder: '#3D3A4E',
  cardBg: '#FFFFFF',

  // Text Colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successMuted: '#059669',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorMuted: '#DC2626',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Trading Colors
  buy: '#10B981',
  sell: '#EF4444',

  // Utility Colors
  border: '#E5E7EB',
  divider: '#E5E7EB',
  disabled: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',

  // Traffic Light Colors
  trafficRed: '#FF5F57',
  trafficYellow: '#FFBD2E',
  trafficGreen: '#28CA42',

  // Status Bar
  statusBar: 'dark-content' as const,
};

// ===========================================
// DARK THEME COLORS
// ===========================================

export const DARK_COLORS = {
  // Primary Shades (from selected color)
  primary: CURRENT_PRIMARY.primary,
  primaryLight: CURRENT_PRIMARY.primaryLight,
  primaryDark: CURRENT_PRIMARY.primaryDark,

  // Accent Colors
  accent: '#1E3A5F',
  accentLight: '#2A4A70',

  // Neon Colors (for animations)
  neonPurple: CURRENT_PRIMARY.neon,
  neonGreen: '#00FF88',
  neonBlue: '#00D4FF',

  // Background Colors (Dark) - Professional Neutral Grays
  background: '#121212',
  surface: '#1E1E2D',
  surfaceLight: '#2C2C3E',
  surfaceHighlight: '#3A3A4E',

  // Terminal/Card Colors
  terminalBg: '#121212',
  terminalHeader: '#1E1E2D',
  terminalBorder: '#2C2C3E',
  cardBg: '#1E1E2D',

  // Text Colors
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textLight: '#707080',
  textOnPrimary: '#FFFFFF',

  // Status Colors
  success: '#00FF88',
  successLight: '#00FF8820',
  successMuted: '#238636',
  warning: '#F0B429',
  warningLight: '#F0B42920',
  error: '#FF4757',
  errorLight: '#FF475720',
  errorMuted: '#DA3633',
  info: '#38BDF8',
  infoLight: '#38BDF820',

  // Trading Colors
  buy: '#00FF88',
  sell: '#FF4757',

  // Utility Colors
  border: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.06)',
  disabled: '#484F58',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',

  // Traffic Light Colors
  trafficRed: '#FF5F57',
  trafficYellow: '#FFBD2E',
  trafficGreen: '#28CA42',

  // Status Bar
  statusBar: 'light-content' as const,
};

// Type for colors
export type ThemeColors = typeof LIGHT_COLORS;

// ===========================================
// SPACING - Consistent spacing scale
// ===========================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ===========================================
// TYPOGRAPHY - Font sizes and weights
// ===========================================

export const TYPOGRAPHY = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
  '7xl': 56,

  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

// ===========================================
// BORDER RADIUS
// ===========================================

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 999,
};

// ===========================================
// SHADOWS
// ===========================================

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryGlow: {
    shadowColor: CURRENT_PRIMARY.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

// ===========================================
// REACT NATIVE PAPER THEMES
// ===========================================

export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: LIGHT_COLORS.primary,
    primaryContainer: LIGHT_COLORS.accentLight,
    secondary: LIGHT_COLORS.primaryLight,
    secondaryContainer: LIGHT_COLORS.surfaceLight,
    surface: LIGHT_COLORS.surface,
    surfaceVariant: LIGHT_COLORS.surfaceLight,
    background: LIGHT_COLORS.background,
    error: LIGHT_COLORS.error,
    errorContainer: LIGHT_COLORS.errorLight,
    onPrimary: LIGHT_COLORS.textOnPrimary,
    onSecondary: LIGHT_COLORS.textOnPrimary,
    onBackground: LIGHT_COLORS.text,
    onSurface: LIGHT_COLORS.text,
    outline: LIGHT_COLORS.border,
  },
  roundness: RADIUS.md,
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DARK_COLORS.primary,
    primaryContainer: DARK_COLORS.accentLight,
    secondary: DARK_COLORS.primaryLight,
    secondaryContainer: DARK_COLORS.surfaceLight,
    surface: DARK_COLORS.surface,
    surfaceVariant: DARK_COLORS.surfaceLight,
    background: DARK_COLORS.background,
    error: DARK_COLORS.error,
    errorContainer: DARK_COLORS.errorLight,
    onPrimary: DARK_COLORS.textOnPrimary,
    onSecondary: DARK_COLORS.textOnPrimary,
    onBackground: DARK_COLORS.text,
    onSurface: DARK_COLORS.text,
    outline: DARK_COLORS.border,
  },
  roundness: RADIUS.md,
};

// ===========================================
// FONTS
// ===========================================

export const FONTS = {
  heading: 'Poppins_700Bold',
  headingBold: 'Poppins_800ExtraBold',
  headingSemibold: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

// ===========================================
// ANIMATION DURATIONS
// ===========================================

export const ANIMATION = {
  fast: 200,
  normal: 400,
  slow: 600,
  slower: 800,
  slowest: 1000,
};

// ===========================================
// BACKWARDS COMPATIBILITY - Default export
// ===========================================

// For backwards compatibility, export COLORS as alias to LIGHT_COLORS
// This will be overridden by ThemeContext in actual usage
export const COLORS = LIGHT_COLORS;
export const Colors = LIGHT_COLORS; // Legacy alias
export const Spacing = SPACING;       // Legacy alias
export const Typography = TYPOGRAPHY; // Legacy alias
export const BorderRadius = RADIUS;   // Legacy alias
export const Shadows = SHADOWS;       // Legacy alias
export const paperTheme = lightPaperTheme;

export default {
  LIGHT_COLORS,
  DARK_COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  FONTS,
  ANIMATION,
  lightPaperTheme,
  darkPaperTheme,
};
