import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Configuration constants - reduced for cleaner look ---
const OUTER_RADIUS = 110; 
const INNER_RADIUS = 65; 
const TOGGLE_SIZE = 50; 
const ICON_SIZE = 22;

// The radius where the center of the icons will align
const ICON_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;

// The total angular span of the menu.
const TOTAL_SPAN_DEGREES = 120;
const START_ANGLE = 180 - TOTAL_SPAN_DEGREES / 2; // e.g., 120

// SVG Canvas dimensions
const SVG_DIM = OUTER_RADIUS * 2;
const CENTER_Y = SVG_DIM / 2;
const CENTER_X = SVG_DIM;

interface NavItem {
  name: string;
  icon: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'explore', icon: 'compass', path: '/explore' },
  { name: 'trades', icon: 'chart-line', path: '/trades-history' },
  { name: 'exchanges', icon: 'link-variant', path: '/connect-exchange' },
  { name: 'home', icon: 'home', path: '/' },
];

// --- Trigonometry Helpers ---
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(
  x: number, y: number,
  rInner: number, rOuter: number,
  startAngle: number, endAngle: number
): string {
    const startOuter = polarToCartesian(x, y, rOuter, endAngle);
    const endOuter = polarToCartesian(x, y, rOuter, startAngle);
    const startInner = polarToCartesian(x, y, rInner, endAngle);
    const endInner = polarToCartesian(x, y, rInner, startAngle);

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 0 0 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${rInner} ${rInner} 0 0 1 ${startInner.x} ${startInner.y}`,
      "Z"
    ].join(" ");
}

export default function SemicircleNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Theme Colors
  const activeColor = colors.primary; 
  const inactiveColor = isDark ? 'rgba(40, 35, 60, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const activeIconColor = colors.white;
  const inactiveIconColor = colors.text;

  const toggleMenu = () => setIsOpen(!isOpen);

  const navigateTo = (path: string) => {
    router.push(path as any);
    setIsOpen(false);
  };

  const anglePerSegment = TOTAL_SPAN_DEGREES / NAV_ITEMS.length;

  const isRouteActive = (itemPath: string) => {
    if (itemPath === '/' && pathname === '/') return true;
    if (itemPath !== '/' && pathname.startsWith(itemPath)) return true;
    return false;
  }

  return (
    <View style={[styles.container, { top: SCREEN_HEIGHT / 2 - SVG_DIM / 2 }]}>
      
      {/* Backdrop for click-away closing - Only active when open */}
      {isOpen && (
        <Pressable 
          style={styles.backdrop}
          onPress={() => setIsOpen(false)} 
        />
      )}

      {/* pointerEvents="box-none" is CRITICAL here. 
         It allows clicks to pass through the empty transparent areas of this View 
         so you can still click the Toggle Button.
      */}
      <View style={styles.menuStructure} pointerEvents="box-none">
        
        {/* The SVG structure holding the segments */}
        <MotiView
          from={{ translateX: SVG_DIM * 0.6, opacity: 0 }}
          animate={{ 
            translateX: isOpen ? 0 : SVG_DIM * 0.6, 
            opacity: isOpen ? 1 : 0
          }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.svgContainer}
          // Disable touches on the ring when it is closed/hidden
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Svg width={SVG_DIM} height={SVG_DIM}>
             <G>
             {NAV_ITEMS.map((item, index) => {
                const isActive = isRouteActive(item.path);
                
                const segmentStartAngle = START_ANGLE + (index * anglePerSegment);
                const segmentEndAngle = segmentStartAngle + anglePerSegment;
                
                const pathData = describeDonutSegment(
                  CENTER_X, CENTER_Y, 
                  INNER_RADIUS, OUTER_RADIUS, 
                  segmentStartAngle, segmentEndAngle
                );

                return (
                  <Path
                    key={`path-${index}`}
                    d={pathData}
                    fill={isActive ? activeColor : inactiveColor}
                    stroke={borderColor}
                    strokeWidth={1.5}
                    onPress={() => navigateTo(item.path)}
                  />
                );
             })}
             </G>
          </Svg>

          {/* Render Icons on top of the SVG segments */}
          {isOpen && NAV_ITEMS.map((item, index) => {
             const isActive = isRouteActive(item.path);
             const segmentStartAngle = START_ANGLE + (index * anglePerSegment);
             const midAngle = segmentStartAngle + (anglePerSegment / 2);
             const pos = polarToCartesian(CENTER_X, CENTER_Y, ICON_RADIUS, midAngle);

             return (
                <View
                    key={`icon-${index}`}
                    style={[
                        styles.iconContainer,
                        {
                            left: pos.x - ICON_SIZE / 2,
                            top: pos.y - ICON_SIZE / 2,
                        }
                    ]}
                    pointerEvents="none" 
                >
                    <MaterialCommunityIcons
                        name={item.icon as any}
                        size={ICON_SIZE}
                        color={isActive ? activeIconColor : inactiveIconColor}
                    />
                </View>
             )
          })}
        </MotiView>

        {/* The Toggle Button */}
        <Pressable
          onPress={toggleMenu}
          // Increase hitSlop to make it easier to press
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({pressed}) => [
            styles.toggleButton,
            {
              backgroundColor: activeColor,
              top: CENTER_Y - TOGGLE_SIZE / 2,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }]
            }
          ]}
        >
          <MotiView
            animate={{ rotate: isOpen ? '0deg' : '180deg' }}
            transition={{ type: 'spring' }}
          >
            <MaterialCommunityIcons 
              name={isOpen ? "close" : "menu"} 
              size={28} 
              color={colors.white} 
            />
          </MotiView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    zIndex: 999,
    width: SVG_DIM,
    height: SVG_DIM,
    // CRITICAL: Allows touches to pass through the container to the app below
    pointerEvents: 'box-none', 
  },
  backdrop: {
    position: 'absolute',
    top: -SCREEN_HEIGHT, 
    bottom: -SCREEN_HEIGHT, 
    left: -SCREEN_WIDTH,
    right: 0,
    zIndex: -1,
    // Optional: add a slight dim color if you want visual feedback
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuStructure: {
    width: SVG_DIM,
    height: SVG_DIM,
    position: 'relative',
  },
  svgContainer: {
    width: SVG_DIM,
    height: SVG_DIM,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
      position: 'absolute',
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
  },
  toggleButton: {
    position: 'absolute',
    // FIXED: Changed from negative to positive.
    // 'right: 10' ensures the button is physically on screen and clickable.
    right: -20,
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)'
  },
});