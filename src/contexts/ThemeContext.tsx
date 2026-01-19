/**
 * Theme Context - Provides Light/Dark mode switching
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    LIGHT_COLORS,
    DARK_COLORS,
    lightPaperTheme,
    darkPaperTheme,
} from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';
type StatusBarStyle = 'light-content' | 'dark-content';

// Base color type without statusBar
type BaseColors = Omit<typeof LIGHT_COLORS, 'statusBar'>;

interface ThemeColors extends BaseColors {
    statusBar: StatusBarStyle;
}

interface ThemeContextType {
    colors: ThemeColors;
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    paperTheme: typeof lightPaperTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved theme preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.log('Error loading theme:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    // Save theme preference
    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    // Determine if dark mode is active
    const isDark = useMemo(() => {
        if (themeMode === 'system') {
            return systemColorScheme === 'dark';
        }
        return themeMode === 'dark';
    }, [themeMode, systemColorScheme]);

    // Toggle between light and dark
    const toggleTheme = () => {
        const newMode = isDark ? 'light' : 'dark';
        setThemeMode(newMode);
    };

    // Get current colors and paper theme
    const value = useMemo((): ThemeContextType => {
        const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
        return {
            colors: colors as ThemeColors,
            isDark,
            themeMode,
            setThemeMode,
            toggleTheme,
            paperTheme: isDark ? darkPaperTheme : lightPaperTheme,
        };
    }, [isDark, themeMode]);

    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export { ThemeContext };
