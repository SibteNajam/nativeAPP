/**
 * useThemeColor Hook
 * Get theme colors based on current color scheme
 */

import { LIGHT_COLORS, DARK_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const Colors = {
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof LIGHT_COLORS
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
