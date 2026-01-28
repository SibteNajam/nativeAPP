# How to Add & Use Google Fonts in This Project

We have implemented a **Centralized Font Management System** to make adding and using fonts easy and consistent.

## 1. Generic Process to Add a New Font

### Step 1: Install the Font
Find your desired font on [Google Fonts](https://fonts.google.com) or use the Expo package search.
Install it using `npx expo install`:

```bash
# Example: Adding "Roboto"
npx expo install @expo-google-fonts/roboto
```

### Step 2: Register the Font
Open `src/constants/fonts.ts`:

1.  **Import** the font variants you want:
    ```typescript
    import { 
      Roboto_400Regular, 
      Roboto_700Bold 
    } from '@expo-google-fonts/roboto';
    ```

2.  **Add to `FONT_ASSETS`** (This maps the font file to a name):
    ```typescript
    export const FONT_ASSETS = {
      // ... existing fonts
      'Roboto-Regular': Roboto_400Regular,
      'Roboto-Bold': Roboto_700Bold,
    };
    ```

3.  **Add to `FONTS`** (This creates the usage alias):
    ```typescript
    export const FONTS = {
      // ... existing aliases
      
      // Add your new alias
      tech: 'Roboto-Regular',
      techBold: 'Roboto-Bold', 
    };
    ```

### Step 3: Use the Font in Code
You can now use the font anywhere in the app by importing `FONTS`:

```tsx
import { FONTS } from '@/constants/fonts';

// In your styles
const styles = StyleSheet.create({
  myText: {
    fontFamily: FONTS.tech, // Uses Roboto-Regular
    fontSize: 16,
  },
  myTitle: {
    fontFamily: FONTS.techBold, // Uses Roboto-Bold
    fontSize: 24,
  },
});
```

---

## 2. Current Font System

We currently use the following structure:

| Alias (`FONTS.x`) | Actual Font | Usage |
|:---|:---|:---|
| `heading` family | **Poppins** | Main titles, Headers, Buttons |
| `body` family | **Inter** | Paragraphs, Data, Labels |
| `display` | **Courgette** | **Bot Names**, Signatures, Branding |

### Files Managed
- **`src/constants/fonts.ts`**: The source of truth for all fonts.
- **`src/hooks/useAppFonts.ts`**: Custom hook that ensures all fonts in `fonts.ts` are loaded at startup.
- **`app/_layout.tsx`**: Uses the hook to prevent the app from rendering until fonts are ready.
