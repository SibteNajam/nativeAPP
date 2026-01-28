/**
 * Font Configuration - Centralized Font Management
 * 
 * This file contains all font configurations for the app.
 * To add a new Google Font:
 * 1. Install: npx expo install @expo-google-fonts/[font-name]
 * 2. Import the font variants here
 * 3. Add to FONT_ASSETS object
 * 4. Add to FONTS object for easy usage
 * 5. Use in components: { fontFamily: FONTS.display }
 */

// ================================
// GOOGLE FONTS IMPORTS
// ================================

// Poppins - Modern geometric, great for headings
import {
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

// Inter - Clean sans-serif, excellent for body text
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';

// Courgette - Elegant cursive/handwriting style
import {
    Courgette_400Regular,
} from '@expo-google-fonts/courgette';

// Space Grotesk - Modern techy font, perfect for numbers/stats
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

// ================================
// FONT ASSETS MAP
// Use this object with useFonts() hook
// ================================

export const FONT_ASSETS = {
    // Poppins Family
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,

    // Inter Family
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,

    // Courgette - Display/Special Font
    'Courgette-Regular': Courgette_400Regular,

    // Space Grotesk - Modern techy font for numbers/stats
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,

    // Gloria Hallelujah - Fun handwritten style (local file)
    'GloriaHallelujah-Regular': require('../../assets/fonts/Gloria_Hallelujah/GloriaHallelujah-Regular.ttf'),
};

// ================================
// FONT FAMILY NAMES
// Use these constants when applying fonts to styles
// ================================

export const FONTS = {
    // =====================================================
    // 🎨 4-FONT SYSTEM FOR TRADING APP
    // =====================================================
    // 1. POPPINS    → Headings, Titles (modern, premium)
    // 2. INTER      → Body text, UI labels (clean, readable)
    // 3. SPACE GROTESK → Numbers, Stats, PnL (techy, bold)
    // 4. GLORIA HALLELUJAH → Username, Fun text (playful)
    // =====================================================

    // === 1. POPPINS - Headings & Titles ===
    heading: 'Poppins-Bold',
    headingLight: 'Poppins-Regular',
    headingMedium: 'Poppins-Medium',
    headingSemibold: 'Poppins-SemiBold',
    headingBold: 'Poppins-Bold',
    headingExtraBold: 'Poppins-ExtraBold',

    // === 2. INTER - Body & UI Text ===
    body: 'Inter-Regular',
    bodyMedium: 'Inter-Medium',
    bodySemibold: 'Inter-SemiBold',
    bodyBold: 'Inter-Bold',

    // === 3. SPACE GROTESK - Numbers & Stats ===
    // Perfect for: PnL values, percentages, prices, trade amounts
    number: 'SpaceGrotesk-Bold',
    numberLight: 'SpaceGrotesk-Regular',
    numberMedium: 'SpaceGrotesk-Medium',
    numberSemibold: 'SpaceGrotesk-SemiBold',
    numberBold: 'SpaceGrotesk-Bold',
    stats: 'SpaceGrotesk-Bold',
    pnl: 'SpaceGrotesk-Bold',
    price: 'SpaceGrotesk-SemiBold',
    percentage: 'SpaceGrotesk-SemiBold',

    // === 4. GLORIA HALLELUJAH - Fun & Playful ===
    // Perfect for: Username greeting, fun messages
    username: 'GloriaHallelujah-Regular',
    handwritten: 'GloriaHallelujah-Regular',
    playful: 'GloriaHallelujah-Regular',

    // === Legacy Display Font (Courgette) ===
    display: 'Courgette-Regular',
    cursive: 'Courgette-Regular',
    signature: 'Courgette-Regular',
    brand: 'Courgette-Regular',

    // === Fallback Fonts (System) ===
    system: 'System',
    monospace: 'monospace',
};

// ================================
// TYPOGRAPHY PRESETS
// Ready-to-use text style objects
// ================================

export const TEXT_STYLES = {
    // Display/Brand styles (Courgette)
    brandLarge: {
        fontFamily: FONTS.display,
        fontSize: 32,
        lineHeight: 40,
    },
    brandMedium: {
        fontFamily: FONTS.display,
        fontSize: 24,
        lineHeight: 32,
    },
    brandSmall: {
        fontFamily: FONTS.display,
        fontSize: 18,
        lineHeight: 24,
    },

    // Heading styles (Poppins)
    h1: {
        fontFamily: FONTS.headingExtraBold,
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.5,
    },
    h2: {
        fontFamily: FONTS.headingBold,
        fontSize: 28,
        lineHeight: 36,
        letterSpacing: -0.3,
    },
    h3: {
        fontFamily: FONTS.headingBold,
        fontSize: 24,
        lineHeight: 32,
    },
    h4: {
        fontFamily: FONTS.headingSemibold,
        fontSize: 20,
        lineHeight: 28,
    },
    h5: {
        fontFamily: FONTS.headingSemibold,
        fontSize: 18,
        lineHeight: 24,
    },
    h6: {
        fontFamily: FONTS.headingMedium,
        fontSize: 16,
        lineHeight: 22,
    },

    // Body styles (Inter)
    bodyLarge: {
        fontFamily: FONTS.body,
        fontSize: 18,
        lineHeight: 28,
    },
    bodyMedium: {
        fontFamily: FONTS.body,
        fontSize: 16,
        lineHeight: 24,
    },
    bodySmall: {
        fontFamily: FONTS.body,
        fontSize: 14,
        lineHeight: 20,
    },
    bodyXSmall: {
        fontFamily: FONTS.body,
        fontSize: 12,
        lineHeight: 16,
    },

    // Label styles
    labelLarge: {
        fontFamily: FONTS.bodySemibold,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.1,
    },
    labelMedium: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    labelSmall: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 10,
        lineHeight: 14,
        letterSpacing: 0.5,
    },

    // Caption styles
    caption: {
        fontFamily: FONTS.body,
        fontSize: 12,
        lineHeight: 16,
    },
    captionBold: {
        fontFamily: FONTS.bodySemibold,
        fontSize: 12,
        lineHeight: 16,
    },

    // Button text
    button: {
        fontFamily: FONTS.bodySemibold,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.25,
    },
    buttonLarge: {
        fontFamily: FONTS.headingSemibold,
        fontSize: 16,
        lineHeight: 24,
    },
};

// ================================
// HELPER TYPE
// ================================

export type FontFamily = keyof typeof FONTS;
export type TextStyleKey = keyof typeof TEXT_STYLES;

export default {
    FONT_ASSETS,
    FONTS,
    TEXT_STYLES,
};
