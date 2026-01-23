# 📱 Building APK for ByteBoom Trading App

## Prerequisites

1. **Install EAS CLI**
```bash
npm install -g eas-cli
```

2. **Expo Account**
- Create account at https://expo.dev
- Login via CLI:
```bash
eas login
```

---

## 🔐 Step 1: Environment Configuration

### Option A: Using .env file (Local Development)

1. Create `.env` file in FRONTEND directory:
```env
# Backend API URLs
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=ws://localhost:3000

# Production URLs (when deployed)
# EXPO_PUBLIC_API_URL=https://your-vps-domain.com/api
# EXPO_PUBLIC_WS_URL=wss://your-vps-domain.com
```

2. Create `.env.production` for production build:
```env
EXPO_PUBLIC_API_URL=https://your-vps-domain.com/api
EXPO_PUBLIC_WS_URL=wss://your-vps-domain.com
```

### Option B: Using EAS Secrets (Recommended for Production)

Store secrets securely in EAS:
```bash
# Add production API URL
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-vps-domain.com/api" --type string

# Add production WebSocket URL
eas secret:create --scope project --name EXPO_PUBLIC_WS_URL --value "wss://your-vps-domain.com" --type string
```

List all secrets:
```bash
eas secret:list
```

---

## 📝 Step 2: Configure EAS Build

1. **Initialize EAS in your project:**
```bash
cd FRONTEND
eas build:configure
```

2. **Update `eas.json`** (create if not exists):
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-vps-domain.com/api",
        "EXPO_PUBLIC_WS_URL": "wss://your-vps-domain.com"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-vps-domain.com/api",
        "EXPO_PUBLIC_WS_URL": "wss://your-vps-domain.com"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 🔧 Step 3: Configure app.json

Update your `app.json`:
```json
{
  "expo": {
    "name": "ByteBoom Trading",
    "slug": "byteboom-trading",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "byteboom",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#7c3aed"
    },
    "android": {
      "package": "com.byteboom.trading",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#7c3aed"
      },
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

---

## 🏗️ Step 4: Build the APK

### Build for Testing (Preview)
```bash
# Build APK for internal testing
eas build --platform android --profile preview
```

### Build for Production
```bash
# Build AAB for Google Play Store
eas build --platform android --profile production
```

### Build Locally (if you have Android Studio)
```bash
# Install local build tools
npm install -g @expo/ngrok

# Build locally
eas build --platform android --profile preview --local
```

---

## 📥 Step 5: Download and Install

After build completes:

1. **Download APK** from the URL provided by EAS
2. **Transfer to Android device**
3. **Enable "Install from Unknown Sources"** in device settings
4. **Install the APK**

Or use QR code provided by EAS to download directly on device.

---

## 🌐 Handling Different Environments

### In Your Code

Access environment variables:
```typescript
// src/config/api.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3000';

export const apiConfig = {
  baseURL: API_URL,
  wsURL: WS_URL,
  timeout: 30000,
};
```

### Create API Config File

Create `FRONTEND/src/config/api.ts`:
```typescript
/**
 * API Configuration
 * Handles different environments (local, staging, production)
 */

// Get environment variables
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

// Validate required variables
if (!API_URL) {
  console.error('EXPO_PUBLIC_API_URL is not defined');
}

export const apiConfig = {
  // REST API
  baseURL: API_URL || 'http://localhost:3000/api',
  
  // WebSocket
  wsURL: WS_URL || 'ws://localhost:3000',
  
  // Timeouts
  timeout: 30000,
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
  },
};

// Log current config (only in development)
if (__DEV__) {
  console.log('📡 API Config:', {
    baseURL: apiConfig.baseURL,
    wsURL: apiConfig.wsURL,
  });
}

export default apiConfig;
```

### Update Your API Calls

Update `FRONTEND/src/contexts/AuthContext.tsx` (or wherever you make API calls):
```typescript
import { apiConfig } from '@/config/api';

// In your API calls:
const response = await fetch(`${apiConfig.baseURL}/auth/register`, {
  method: 'POST',
  headers: apiConfig.headers,
  body: JSON.stringify(data),
});
```

---

## 🔄 Different Build Profiles

### Local Development
```bash
# Uses local backend
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api npm start
```

### Testing with VPS
```bash
# Point to VPS backend
EXPO_PUBLIC_API_URL=https://your-vps.com/api npm start
```

### Production Build
```bash
# Uses production environment variables
eas build --platform android --profile production
```

---

## 🚀 Backend Deployment Checklist

### On Your VPS:

1. **Install NestJS dependencies**
```bash
cd backend_layer
npm install
npm run build
```

2. **Setup PM2 for process management**
```bash
npm install -g pm2
pm2 start dist/main.js --name byteboom-api
pm2 save
pm2 startup
```

3. **Configure Nginx reverse proxy**
```nginx
server {
    listen 80;
    server_name your-vps-domain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

4. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-vps-domain.com
```

5. **Update backend .env**
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=your_database_url
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
# ... other backend variables
```

---

## 📦 Complete Build Commands

### Quick Commands:

```bash
# 1. Development build (for testing)
eas build --platform android --profile development

# 2. Preview build (APK for internal distribution)
eas build --platform android --profile preview

# 3. Production build (AAB for Play Store)
eas build --platform android --profile production

# 4. Build and submit to Play Store
eas build --platform android --profile production --auto-submit
```

---

## 🐛 Troubleshooting

### Issue: Build fails with "EXPO_PUBLIC_API_URL not defined"
**Solution:** Check your `eas.json` env variables or add to `.env.production`

### Issue: App can't connect to backend
**Solution:** 
- For local testing: Use `http://10.0.2.2:3000` (Android emulator) or your computer's IP
- For production: Ensure HTTPS and CORS are properly configured on backend

### Issue: Build takes too long
**Solution:** Use `--local` flag if you have Android Studio installed

### Issue: Certificate errors
**Solution:** 
```bash
# Generate new keystore
eas credentials
```

---

## 📊 Monitoring Build Status

```bash
# Check build status
eas build:list

# View build logs
eas build:view [build-id]
```

---

## ✅ Pre-Release Checklist

- [ ] Test app with production backend URL
- [ ] Verify all API endpoints work
- [ ] Test authentication flow
- [ ] Check WebSocket connections
- [ ] Test theme switching
- [ ] Verify OTP email delivery
- [ ] Test trading bot features
- [ ] Check all screens load correctly
- [ ] Test on different Android versions
- [ ] Verify app icons and splash screen
- [ ] Check app permissions

---

## 📱 Final Steps

1. **Test APK thoroughly** on real devices
2. **Collect user feedback**
3. **Fix any bugs**
4. **Prepare store listing** (if going to Play Store)
5. **Submit to Google Play Console**

---

## 🔗 Useful Links

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- Environment Variables: https://docs.expo.dev/guides/environment-variables/
- Android App Bundle: https://developer.android.com/guide/app-bundle
- Google Play Console: https://play.google.com/console

---

**Need Help?** 
- Expo Discord: https://chat.expo.dev/
- Expo Forums: https://forums.expo.dev/
