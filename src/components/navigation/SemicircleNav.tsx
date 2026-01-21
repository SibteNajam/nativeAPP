import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Configuration constants matching the design reference ---
const OUTER_RADIUS = 140; // The far edge
const INNER_RADIUS = 75;  // The inner edge closest to content
const TOGGLE_SIZE = 60;   // The central 'X' button size
const ICON_SIZE = 24;

// The radius where the center of the icons will align
const ICON_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;

// The total angular span of the menu.
// 180 is straight left. We want it centered around 180.
// A span of 120 means it goes from 120 degrees to 240 degrees.
const TOTAL_SPAN_DEGREES = 120;
const START_ANGLE = 180 - TOTAL_SPAN_DEGREES / 2; // e.g., 120

// SVG Canvas needs to be big enough to hold the radii
const SVG_DIM = OUTER_RADIUS * 2;
const CENTER_Y = SVG_DIM / 2;
// The actual center point of the circles is the right edge of the SVG canvas
const CENTER_X = SVG_DIM;

interface NavItem {
  name: string;
  icon: string;
  path: string;
}

// Order matches the image top-to-bottom
const NAV_ITEMS: NavItem[] = [
  { name: 'explore', icon: 'compass', path: '/explore' },
  { name: 'trades', icon: 'chart-line', path: '/trades-history' },
  { name: 'exchanges', icon: 'link-variant', path: '/connect-exchange' },
  { name: 'home', icon: 'home', path: '/' },
];

// --- Trigonometry Helpers for SVG ---

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  // Convert angle to radians
  // Subtracting from 180 because SVG angles usually go clockwise from 3 o'clock.
  // We want to work counter-clockwise from 9 o'clock.
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Generates the SVG path data 'd' for a single donut slice segment
function describeDonutSegment(
  x: number, y: number,
  rInner: number, rOuter: number,
  startAngle: number, endAngle: number
): string {
    // Calculate points
    const startOuter = polarToCartesian(x, y, rOuter, endAngle);
    const endOuter = polarToCartesian(x, y, rOuter, startAngle);
    const startInner = polarToCartesian(x, y, rInner, endAngle);
    const endInner = polarToCartesian(x, y, rInner, startAngle);

    // Assumes slices are < 180 degrees, so largeArcFlag is 0
    const largeArcFlag = 0;
    // Sweep flags determine which direction the arc bends
    const outerSweep = 0; 
    const innerSweep = 1; 

    const d = [
      `M ${startOuter.x} ${startOuter.y}`, // Move to start of outer arc
      `A ${rOuter} ${rOuter} 0 ${largeArcFlag} ${outerSweep} ${endOuter.x} ${endOuter.y}`, // Draw outer arc
      `L ${endInner.x} ${endInner.y}`, // Line to start of inner arc
      `A ${rInner} ${rInner} 0 ${largeArcFlag} ${innerSweep} ${startInner.x} ${startInner.y}`, // Draw inner arc (reverse direction)
      "Z" // Close path back to start
    ].join(" ");

    return d;
}


export default function SemicircleNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // --- Theme Colors ---
  const activeColor = '#8A4FFF'; // The purple from the design
  const inactiveColor = isDark ? 'rgba(40, 35, 60, 0.9)' : 'rgba(245, 245, 250, 0.9)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const activeIconColor = '#FFFFFF';
  const inactiveIconColor = colors.text;

  const toggleMenu = () => setIsOpen(!isOpen);

  const navigateTo = (path: string) => {
    router.push(path as any);
    setIsOpen(false);
  };

  // Calculate the angle size of each individual slice
  const anglePerSegment = TOTAL_SPAN_DEGREES / NAV_ITEMS.length;

  // Helper to determine if a route is active
  const isRouteActive = (itemPath: string) => {
    if (itemPath === '/' && pathname === '/') return true;
    if (itemPath !== '/' && pathname.startsWith(itemPath)) return true;
    return false;
  }

  return (
    // Main container centered vertically on the right edge
    <View style={[styles.container, { top: SCREEN_HEIGHT / 2 - SVG_DIM / 2 }]}>
      
      {/* Backdrop for click-away closing */}
      {isOpen && (
        <Pressable 
          style={styles.backdrop}
          onPress={() => setIsOpen(false)} 
        />
      )}

      <View style={styles.menuStructure}>
        {/* The SVG structure holding the segments */}
        <MotiView
          // Animate opening from right to left
          from={{ translateX: SVG_DIM, opacity: 0 }}
          animate={{ 
            translateX: isOpen ? 0 : SVG_DIM, 
            opacity: isOpen ? 1 : 0
          }}
          transition={{ type: 'spring', damping: 18, stiffness: 150 }}
          style={styles.svgContainer}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Svg width={SVG_DIM} height={SVG_DIM}>
             <G>
             {NAV_ITEMS.map((item, index) => {
                const isActive = isRouteActive(item.path);
                
                // Calculate angles for this specific segment
                const segmentStartAngle = START_ANGLE + (index * anglePerSegment);
                const segmentEndAngle = segmentStartAngle + anglePerSegment;
                
                // Generate the path shape
                const pathData = describeDonutSegment(
                  CENTER_X, CENTER_Y, 
                  INNER_RADIUS, OUTER_RADIUS, 
                  segmentStartAngle, segmentEndAngle
                );

                return (
                  <Path
                    key={`path-${index}`}
                    d={pathData}
                    // Active gets purple, inactive gets light bg
                    fill={isActive ? activeColor : inactiveColor}
                    // The curved border separator
                    stroke={borderColor}
                    strokeWidth={1.5}
                    // Press handler on the SVG path itself works surprisingly well
                    onPress={() => navigateTo(item.path)}
                  />
                );
             })}
             </G>
          </Svg>

          {/* Render Icons on top of the SVG segments */}
          {isOpen && NAV_ITEMS.map((item, index) => {
             const isActive = isRouteActive(item.path);
             // Calculate the middle angle of the segment to center the icon
             const segmentStartAngle = START_ANGLE + (index * anglePerSegment);
             const midAngle = segmentStartAngle + (anglePerSegment / 2);

             // Find exact cartesian coordinates for the icon center
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
                    pointerEvents="none" // Let clicks pass through to the SVG Path below
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

        {/* The Toggle Button (The 'X' or Menu icon) */}
        {/* It sits outside the SVG container so it's always visible */}
        <Pressable
          onPress={toggleMenu}
          style={[
            styles.toggleButton,
            {
              backgroundColor: activeColor,
              // Center it vertically relative to the SVG container
              top: CENTER_Y - TOGGLE_SIZE / 2,
            }
          ]}
        >
          <MotiView
            animate={{ rotate: isOpen ? '0deg' : '180deg' }}
            transition={{ type: 'spring' }}
          >
             {/* Using a simple X and bars icon, switch as needed */}
            <MaterialCommunityIcons 
              name={isOpen ? "close" : "menu"} 
              size={28} 
              color="#FFFFFF" 
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
    // Visual debugging - uncomment to see bounds
    // borderWidth: 2, 
    // borderColor: 'red',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // Ensure backdrop covers whole screen, not just the container area
    top: -SCREEN_HEIGHT, 
    bottom: -SCREEN_HEIGHT, 
    left: -SCREEN_WIDTH,
    zIndex: -1,
  },
  menuStructure: {
    width: SVG_DIM,
    height: SVG_DIM,
    position: 'relative',
  },
  svgContainer: {
    width: SVG_DIM,
    height: SVG_DIM,
    // Shadow for depth
    shadowColor: "#000",
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
    // Position button at screen edge: half hangs off, half visible
    right: -TOGGLE_SIZE / 2,
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: -1, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 30,
    borderWidth: 3,
    borderColor: '#F0F0F5' // Light border around the toggle as seen in image
  },
});