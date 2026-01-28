/**
 * Global Theme Configuration - Professional Fintech Edition
 * * DESIGN SYSTEM: "Modern Trust"
 * Primary: Indigo Blue (Trust & Innovation)
 * Dark Mode: Midnight Slate (Premium & Eye-friendly)
 * Light Mode: Cool White (Clean & Professional)
 */

import { Platform } from 'react-native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// ===========================================
// PRIMARY COLOR STRATEGY
// ===========================================

// We use an "Indigo" primary. It sits between Blue (Trust) and Violet (Tech).
export const PRIMARY_COLOR = '#4F46E5';

const PRIMARY_SHADES = {
  // The 'Fintech Indigo' - Professional & Sharp
  indigo: {
    primary: '#4F46E5',      // Main Brand Color
    primaryLight: '#818CF8', // Hover/Active States
    primaryDark: '#3730A3',  // Deep accents
    neon: '#6366F1',         // For glowing effects (Charts/Active tabs)
  },
};

const CURRENT_PRIMARY = PRIMARY_SHADES.indigo;

// ===========================================
// LIGHT THEME COLORS (Clean, Airy, Wall Street)
// ===========================================

export const LIGHT_COLORS = {
  // Primary Brand Colors
  primary: CURRENT_PRIMARY.primary,
  primaryLight: CURRENT_PRIMARY.primaryLight,
  primaryDark: CURRENT_PRIMARY.primaryDark,

  // Accent Colors (Subtle background washes)
  accent: '#E0E7FF',       // Very faint indigo for selection backgrounds
  accentLight: '#EEF2FF',  // Almost white indigo

  // Neon Colors (for charts/animations in light mode)
  neonPurple: '#8B5CF6',
  neonGreen: '#10B981',    // Sharp Emerald
  neonBlue: '#0EA5E9',     // Sky Blue

  // Background Colors - "Cool Gray" Palette
  background: '#F8FAFC',   // Not pure white, very subtle cool gray
  surface: '#FFFFFF',      // Pure white cards
  surfaceLight: '#F1F5F9', // Secondary background
  surfaceHighlight: '#E2E8F0', // Borders/Dividers

  // Terminal/Card Colors (Specific to your UI)
  terminalBg: '#1E293B',     // Keep terminal dark even in light mode for contrast
  terminalHeader: '#0F172A', // Dark header
  terminalBorder: '#334155',
  cardBg: '#FFFFFF',

  // Text Colors (High Contrast Slate)
  text: '#0F172A',         // Almost black, deep slate
  textSecondary: '#64748B', // Muted slate
  textLight: '#94A3B8',    // Disabled/Hint
  textOnPrimary: '#FFFFFF',

  // Financial Status Colors
  success: '#10B981',      // "TradingView" Green
  successLight: '#D1FAE5',
  successMuted: '#047857',

  warning: '#F59E0B',      // Standard Amber
  warningLight: '#FEF3C7',

  error: '#EF4444',        // "TradingView" Red
  errorLight: '#FEE2E2',
  errorMuted: '#B91C1C',

  info: '#3B82F6',         // Standard Blue
  infoLight: '#DBEAFE',

  // Dedicated Trading Actions
  buy: '#10B981',          // Green Candle
  sell: '#EF4444',         // Red Candle

  // Utility
  border: '#E2E8F0',
  divider: '#E2E8F0',
  disabled: '#CBD5E1',
  overlay: 'rgba(15, 23, 42, 0.6)',
  white: '#FFFFFF',
  black: '#000000',

  // macOS Window Controls
  trafficRed: '#FF5F57',
  trafficYellow: '#FFBD2E',
  trafficGreen: '#28CA42',

  statusBar: 'dark-content' as const,
};

// ===========================================
// DARK THEME COLORS (Premium, Midnight, Crypto)
// ===========================================

export const DARK_COLORS = {
  // Primary Brand Colors
  primary: '#6366F1',      // Slightly lighter Indigo for better visibility on dark
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',

  // Accent Colors
  accent: '#1E293B',       // Slate-800
  accentLight: '#334155',  // Slate-700

  // Neon Colors (Glow effects)
  neonPurple: '#A78BFA',
  neonGreen: '#34D399',    // Glowing Emerald
  neonBlue: '#38BDF8',     // Glowing Cyan

  // Background Colors - "Midnight Slate" Palette (Not basic black)
  background: '#0B1121',   // Very deep blue-black (Rich feel)
  surface: '#151F32',      // Slightly lighter blue-black for cards
  surfaceLight: '#1E293B', // Secondary surface
  surfaceHighlight: '#334155', // Borders

  // Terminal/Card Colors
  terminalBg: '#0F172A',     // Slate-900
  terminalHeader: '#020617', // Slate-950
  terminalBorder: '#1E293B',
  cardBg: '#151F32',

  // Text Colors
  text: '#F8FAFC',         // Slate-50 (White-ish)
  textSecondary: '#94A3B8', // Slate-400 (Readable Gray)
  textLight: '#64748B',    // Slate-500 (Subtle)
  textOnPrimary: '#FFFFFF',

  // Financial Status Colors (Desaturated for Dark Mode)
  success: '#34D399',      // Lighter Green for readability
  successLight: 'rgba(16, 185, 129, 0.15)',
  successMuted: '#065F46',

  warning: '#FBBF24',      // Lighter Amber
  warningLight: 'rgba(245, 158, 11, 0.15)',

  error: '#F87171',        // Lighter Red
  errorLight: 'rgba(239, 68, 68, 0.15)',
  errorMuted: '#7F1D1D',

  info: '#60A5FA',
  infoLight: 'rgba(59, 130, 246, 0.15)',

  // Dedicated Trading Actions
  buy: '#34D399',
  sell: '#F87171',

  // Utility
  border: 'rgba(148, 163, 184, 0.1)', // Very subtle borders
  divider: 'rgba(148, 163, 184, 0.05)',
  disabled: '#334155',
  overlay: 'rgba(0, 0, 0, 0.8)',
  white: '#FFFFFF',
  black: '#000000',

  // macOS Window Controls
  trafficRed: '#FF5F57',
  trafficYellow: '#FFBD2E',
  trafficGreen: '#28CA42',

  statusBar: 'light-content' as const,
};

export type ThemeColors = typeof LIGHT_COLORS;

// ===========================================
// SPACING & TYPOGRAPHY (Unchanged)
// ===========================================

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48,
};

export const TYPOGRAPHY = {
  xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 40, '6xl': 48, '7xl': 56,
  light: '300' as const, regular: '400' as const, medium: '500' as const, semibold: '600' as const, bold: '700' as const, extrabold: '800' as const,
  tight: 1.2, normal: 1.5, relaxed: 1.75,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 28, full: 999,
};

// ===========================================
// SHADOWS (Refined for depth)
// ===========================================

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Lighter
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Deeper drop
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  primaryGlow: {
    shadowColor: CURRENT_PRIMARY.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ===========================================
// REACT NATIVE PAPER THEMES (Mapped)
// ===========================================

export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: LIGHT_COLORS.primary,
    primaryContainer: LIGHT_COLORS.accent,
    secondary: LIGHT_COLORS.primaryLight,
    surface: LIGHT_COLORS.surface,
    surfaceVariant: LIGHT_COLORS.surfaceLight,
    background: LIGHT_COLORS.background,
    error: LIGHT_COLORS.error,
    onPrimary: LIGHT_COLORS.textOnPrimary,
    onSurface: LIGHT_COLORS.text,
    outline: LIGHT_COLORS.border,
    elevation: {
      level0: 'transparent',
      level1: LIGHT_COLORS.surface,
      level2: LIGHT_COLORS.surface,
      level3: LIGHT_COLORS.surface,
      level4: LIGHT_COLORS.surface,
      level5: LIGHT_COLORS.surface,
    }
  },
  roundness: RADIUS.md,
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DARK_COLORS.primary,
    primaryContainer: DARK_COLORS.accent,
    secondary: DARK_COLORS.primaryLight,
    surface: DARK_COLORS.surface,
    surfaceVariant: DARK_COLORS.surfaceLight,
    background: DARK_COLORS.background,
    error: DARK_COLORS.error,
    onPrimary: DARK_COLORS.textOnPrimary,
    onSurface: DARK_COLORS.text,
    outline: DARK_COLORS.border,
    elevation: {
      level0: 'transparent',
      level1: DARK_COLORS.surface,
      level2: DARK_COLORS.surface,
      level3: DARK_COLORS.surface,
      level4: DARK_COLORS.surface,
      level5: DARK_COLORS.surface,
    }
  },
  roundness: RADIUS.md,
};

// ===========================================
// FONTS - Imported from centralized fonts.ts
// ===========================================

// Re-export from fonts.ts for backward compatibility
import { FONTS, FONT_ASSETS, TEXT_STYLES } from './fonts';
export { FONTS, FONT_ASSETS, TEXT_STYLES };

export const ANIMATION = {
  fast: 200, normal: 400, slow: 600, slower: 800, slowest: 1000,
};

// Backward Compatibility Aliases
export const COLORS = LIGHT_COLORS;
export const Colors = LIGHT_COLORS;
export const Spacing = SPACING;
export const Typography = TYPOGRAPHY;
export const BorderRadius = RADIUS;
export const Shadows = SHADOWS;
export const paperTheme = lightPaperTheme;

export default {
  LIGHT_COLORS,
  DARK_COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  FONTS,
  FONT_ASSETS,
  TEXT_STYLES,
  ANIMATION,
  lightPaperTheme,
  darkPaperTheme,
};