import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/layout/themed-text';
import { ThemedView } from '@/components/layout/themed-view';
import { IconSymbol } from '@/components/common/icon-symbol';
import { LIGHT_COLORS, DARK_COLORS } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  // Shared value for smooth 60fps rotation animation
  const rotation = useSharedValue(0);

  const handlePress = () => {
    // Animate rotation on UI thread for smooth 60fps performance
    rotation.value = withTiming(isOpen ? 0 : 90, {
      duration: 200,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
    setIsOpen((value) => !value);
  };

  // Animated style for the icon rotation - runs on UI thread
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={handlePress}
        activeOpacity={0.8}>
        <Animated.View style={iconAnimatedStyle}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={theme === 'light' ? LIGHT_COLORS.text : DARK_COLORS.text}
          />
        </Animated.View>

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
