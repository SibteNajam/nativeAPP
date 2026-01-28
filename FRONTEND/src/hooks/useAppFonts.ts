/**
 * Custom hook for loading all app fonts
 * 
 * Usage:
 * ```tsx
 * import { useAppFonts } from '@/hooks/useAppFonts';
 * 
 * function App() {
 *   const { fontsLoaded, fontError } = useAppFonts();
 *   
 *   if (!fontsLoaded && !fontError) {
 *     return <SplashScreen />;
 *   }
 *   
 *   return <MainApp />;
 * }
 * ```
 */

import { useFonts } from 'expo-font';
import { FONT_ASSETS } from '@/constants/fonts';

export function useAppFonts() {
    const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

    return {
        fontsLoaded,
        fontError,
        isReady: fontsLoaded || !!fontError,
    };
}

export default useAppFonts;
