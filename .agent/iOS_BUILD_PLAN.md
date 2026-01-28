# 🍎 iOS Build Plan - Complete Implementation Guide

## 📊 Block Diagram Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     iOS BUILD PROCESS FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  PREREQUISITES   │
│  ✓ Mac Computer  │
│  ✓ Xcode         │
│  ✓ Apple Dev ID  │
│  ✓ EAS Account   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: ENVIRONMENT SETUP                        │
├──────────────────────────────────────────────────────────────────────┤
│  1.1 Install Xcode (from Mac App Store)                             │
│  1.2 Install Xcode Command Line Tools                               │
│  1.3 Install CocoaPods (iOS dependency manager)                     │
│  1.4 Setup Apple Developer Account ($99/year)                       │
│  1.5 Create App Identifier (Bundle ID)                              │
│  1.6 Setup Expo Application Services (EAS)                          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  PHASE 2: PROJECT CONFIGURATION                      │
├──────────────────────────────────────────────────────────────────────┤
│  2.1 Configure app.json                                             │
│      ├─ Bundle Identifier (e.g., com.yourcompany.tradebot)         │
│      ├─ App Name & Version                                          │
│      ├─ iOS Specific Settings                                       │
│      └─ Permissions & Capabilities                                  │
│                                                                      │
│  2.2 Configure eas.json                                             │
│      ├─ Build Profiles (development, preview, production)           │
│      ├─ iOS Build Settings                                          │
│      ├─ Distribution Type (internal/store)                          │
│      └─ Credentials Management                                      │
│                                                                      │
│  2.3 Environment Variables (.env)                                   │
│      ├─ API URLs (Production)                                       │
│      ├─ WebSocket URLs                                              │
│      └─ App Secrets                                                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│              PHASE 3: APPLE DEVELOPER PORTAL SETUP                   │
├──────────────────────────────────────────────────────────────────────┤
│  3.1 Create App ID                                                  │
│      └─ Register Bundle Identifier                                  │
│                                                                      │
│  3.2 Create Certificates                                            │
│      ├─ Development Certificate (for testing)                       │
│      └─ Distribution Certificate (for App Store)                    │
│                                                                      │
│  3.3 Create Provisioning Profiles                                   │
│      ├─ Development Profile (testing on devices)                    │
│      ├─ Ad Hoc Profile (internal distribution)                      │
│      └─ App Store Profile (App Store submission)                    │
│                                                                      │
│  3.4 Register Test Devices (for development builds)                 │
│      └─ Add UDIDs of test iPhones/iPads                            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: BUILD CONFIGURATION                       │
├──────────────────────────────────────────────────────────────────────┤
│  4.1 Choose Build Type                                              │
│      ├─ Development Build (for testing)                             │
│      ├─ Preview Build (internal testing)                            │
│      └─ Production Build (App Store submission)                     │
│                                                                      │
│  4.2 Configure Build Settings                                       │
│      ├─ Build Number & Version                                      │
│      ├─ App Icons & Splash Screens                                  │
│      ├─ Orientation Settings                                        │
│      └─ Permissions (Camera, Location, etc.)                        │
│                                                                      │
│  4.3 Code Signing                                                   │
│      ├─ Automatic (EAS handles it)                                  │
│      └─ Manual (provide certificates)                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: BUILD EXECUTION                          │
├──────────────────────────────────────────────────────────────────────┤
│  5.1 Pre-Build Checks                                               │
│      ├─ Run npm install                                             │
│      ├─ Verify environment variables                                │
│      ├─ Check TypeScript compilation                                │
│      └─ Test app locally (Expo Go)                                  │
│                                                                      │
│  5.2 Trigger EAS Build                                              │
│      └─ Command: eas build --platform ios --profile production      │
│                                                                      │
│  5.3 Build Process (Cloud)                                          │
│      ├─ Install dependencies                                        │
│      ├─ Run prebuild (generate native iOS project)                  │
│      ├─ Install CocoaPods dependencies                              │
│      ├─ Compile native code                                         │
│      ├─ Bundle JavaScript                                           │
│      ├─ Sign with certificates                                      │
│      └─ Create IPA file                                             │
│                                                                      │
│  5.4 Download Build Artifact                                        │
│      └─ .ipa file ready for distribution                            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   PHASE 6: TESTING & DISTRIBUTION                    │
├──────────────────────────────────────────────────────────────────────┤
│  6.1 Internal Testing                                               │
│      ├─ TestFlight (Apple's beta testing platform)                  │
│      ├─ Add internal testers (up to 100)                            │
│      └─ Collect feedback                                            │
│                                                                      │
│  6.2 External Testing (Optional)                                    │
│      ├─ Add external testers (up to 10,000)                         │
│      ├─ Requires App Review (beta review)                           │
│      └─ Public link distribution                                    │
│                                                                      │
│  6.3 App Store Submission                                           │
│      ├─ Create App Store Connect listing                            │
│      ├─ Upload screenshots & metadata                               │
│      ├─ Submit for App Review                                       │
│      ├─ Wait for approval (1-3 days typically)                      │
│      └─ Release to App Store                                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PHASE 7: POST-RELEASE                           │
├──────────────────────────────────────────────────────────────────────┤
│  7.1 Monitor App Performance                                        │
│      ├─ Crash Reports (Xcode Organizer)                             │
│      ├─ User Reviews                                                │
│      └─ Analytics                                                   │
│                                                                      │
│  7.2 Updates & Maintenance                                          │
│      ├─ Bug Fixes (increment build number)                          │
│      ├─ New Features (increment version)                            │
│      └─ Re-submit to App Store                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Detailed Step-by-Step Implementation

### **PHASE 1: Prerequisites & Environment Setup**

#### **1.1 Hardware Requirements**
```
✓ Mac Computer (MacBook, iMac, Mac Mini, or Mac Studio)
  - macOS 13.0 (Ventura) or later recommended
  - Minimum 8GB RAM (16GB recommended)
  - 50GB free disk space
```

#### **1.2 Software Installation**
```bash
# Install Xcode (from Mac App Store)
# Size: ~12GB, Time: 30-60 minutes

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install CocoaPods
sudo gem install cocoapods

# Install Node.js (if not already)
brew install node

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

#### **1.3 Apple Developer Account**
```
Cost: $99/year (required for App Store distribution)

Steps:
1. Go to https://developer.apple.com
2. Enroll in Apple Developer Program
3. Complete payment
4. Wait for approval (usually 24-48 hours)
```

---

### **PHASE 2: Project Configuration**

#### **2.1 Configure `app.json`**
```json
{
  "expo": {
    "name": "TradeBot",
    "slug": "tradebot",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.tradebot",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera for QR code scanning",
        "NSPhotoLibraryUsageDescription": "This app accesses your photos to upload profile pictures"
      },
      "icon": "./assets/icon-ios.png",
      "backgroundColor": "#1a1a2e"
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ]
    ]
  }
}
```

#### **2.2 Configure `eas.json`**
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

#### **2.3 Environment Variables**
```bash
# Create .env.production
EXPO_PUBLIC_API_URL=https://backend-production-6851.up.railway.app
EXPO_PUBLIC_WS_URL=wss://backend-production-6851.up.railway.app
EXPO_PUBLIC_APP_NAME=TradeBot
EXPO_PUBLIC_APP_VERSION=1.0.0
```

---

### **PHASE 3: Apple Developer Portal Setup**

#### **3.1 Create App Identifier**
```
1. Go to https://developer.apple.com/account
2. Navigate to: Certificates, Identifiers & Profiles
3. Click: Identifiers → "+" button
4. Select: App IDs → Continue
5. Enter:
   - Description: TradeBot
   - Bundle ID: com.yourcompany.tradebot (must match app.json)
6. Select Capabilities:
   - Push Notifications (if needed)
   - Sign in with Apple (if needed)
7. Click: Continue → Register
```

#### **3.2 Create Certificates** (EAS can auto-generate)
```
Option A: Let EAS Handle It (Recommended)
- EAS will automatically create and manage certificates

Option B: Manual Certificate Creation
1. Go to Certificates section
2. Click "+" to create new certificate
3. Select: iOS Distribution (App Store and Ad Hoc)
4. Follow CSR upload instructions
5. Download certificate
6. Double-click to install in Keychain
```

#### **3.3 Create Provisioning Profiles** (EAS can auto-generate)
```
Option A: Let EAS Handle It (Recommended)
- EAS will automatically create profiles

Option B: Manual Profile Creation
1. Go to Profiles section
2. Click "+" to create new profile
3. Select: App Store
4. Choose your App ID
5. Select certificate
6. Download and install
```

---

### **PHASE 4: Build Configuration**

#### **4.1 Prepare Assets**
```
Required Assets:
├── App Icon (1024x1024 PNG, no transparency)
├── Splash Screen (1242x2688 PNG for iPhone)
└── Screenshots (for App Store listing)
    ├── 6.7" Display (1290x2796) - iPhone 15 Pro Max
    ├── 6.5" Display (1242x2688) - iPhone 11 Pro Max
    └── 5.5" Display (1242x2208) - iPhone 8 Plus
```

#### **4.2 Update Version Numbers**
```json
// In app.json
{
  "expo": {
    "version": "1.0.0",        // User-facing version
    "ios": {
      "buildNumber": "1"        // Increment for each build
    }
  }
}
```

#### **4.3 Configure Permissions**
```json
// In app.json → ios.infoPlist
{
  "NSCameraUsageDescription": "We need camera access for QR scanning",
  "NSPhotoLibraryUsageDescription": "We need photo access for profile pictures",
  "NSLocationWhenInUseUsageDescription": "We need location for...",
  "NSFaceIDUsageDescription": "We use Face ID for secure login"
}
```

---

### **PHASE 5: Build Execution**

#### **5.1 Pre-Build Checklist**
```bash
# Navigate to FRONTEND directory
cd e:\NATIVE\mobileapp\FRONTEND

# Install dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit

# Test locally
npx expo start

# Clear cache if needed
npx expo start --clear
```

#### **5.2 Configure EAS Credentials**
```bash
# Login to EAS
eas login

# Configure project
eas build:configure

# This creates eas.json if it doesn't exist
```

#### **5.3 Trigger Build**
```bash
# Development Build (for testing on simulator)
eas build --platform ios --profile development

# Preview Build (for TestFlight internal testing)
eas build --platform ios --profile preview

# Production Build (for App Store submission)
eas build --platform ios --profile production

# Build with specific credentials
eas build --platform ios --profile production --auto-submit
```

#### **5.4 Monitor Build Progress**
```
1. Build starts on EAS cloud servers
2. Monitor progress at: https://expo.dev/accounts/[your-account]/projects/[project-name]/builds
3. Build time: 10-30 minutes typically
4. Download .ipa file when complete
```

---

### **PHASE 6: Testing & Distribution**

#### **6.1 TestFlight Internal Testing**
```bash
# Submit to TestFlight automatically
eas submit --platform ios --latest

# Or manual upload:
# 1. Download .ipa from EAS
# 2. Open Xcode → Window → Organizer
# 3. Drag .ipa to Archives
# 4. Click "Distribute App"
# 5. Select "TestFlight & App Store"
# 6. Upload
```

#### **6.2 Add Testers to TestFlight**
```
1. Go to App Store Connect
2. Navigate to: My Apps → [Your App] → TestFlight
3. Click: Internal Testing → "+" to add testers
4. Enter email addresses
5. Testers receive invitation email
6. They install TestFlight app and your app
```

#### **6.3 App Store Submission**
```
Steps in App Store Connect:
1. Create new app listing
2. Fill in metadata:
   - App Name
   - Subtitle
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
3. Upload screenshots (all required sizes)
4. Select build from TestFlight
5. Set pricing (Free or Paid)
6. Submit for Review
7. Wait for approval (1-3 days)
8. Release manually or auto-release
```

---

### **PHASE 7: Post-Release Monitoring**

#### **7.1 Monitor Crashes**
```
Tools:
- Xcode Organizer (Crashes & Energy)
- App Store Connect (Analytics)
- Third-party: Sentry, Crashlytics
```

#### **7.2 Handle Updates**
```bash
# For bug fixes (increment build number)
# In app.json: "buildNumber": "2"
eas build --platform ios --profile production

# For new features (increment version)
# In app.json: "version": "1.1.0", "buildNumber": "1"
eas build --platform ios --profile production

# Submit update
eas submit --platform ios --latest
```

---

## 📋 Quick Command Reference

```bash
# Setup
eas login
eas build:configure

# Build Commands
eas build --platform ios --profile development    # Dev build
eas build --platform ios --profile preview        # TestFlight
eas build --platform ios --profile production     # App Store

# Submit to App Store
eas submit --platform ios --latest

# Check build status
eas build:list

# View credentials
eas credentials

# Update app metadata
eas metadata:push
```

---

## ⏱️ Estimated Timeline

```
┌─────────────────────────────────────────────────────────┐
│ Task                                    │ Time          │
├─────────────────────────────────────────┼───────────────┤
│ Apple Developer Account Setup           │ 1-2 days      │
│ Environment Setup (Mac + Xcode)         │ 2-4 hours     │
│ Project Configuration                   │ 1-2 hours     │
│ First Build (learning curve)            │ 2-3 hours     │
│ TestFlight Setup & Testing              │ 1-2 days      │
│ App Store Listing Creation              │ 2-4 hours     │
│ App Review Wait Time                    │ 1-3 days      │
├─────────────────────────────────────────┼───────────────┤
│ TOTAL (First Time)                      │ 5-10 days     │
│ Subsequent Builds                       │ 30-60 min     │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Breakdown

```
┌─────────────────────────────────────────────────────────┐
│ Item                                    │ Cost          │
├─────────────────────────────────────────┼───────────────┤
│ Apple Developer Program (yearly)        │ $99/year      │
│ Mac Computer (if needed)                │ $999+         │
│ EAS Build Service                       │ Free tier OK  │
│   - Free: 30 builds/month               │ $0            │
│   - Production: Unlimited builds        │ $29/month     │
├─────────────────────────────────────────┼───────────────┤
│ MINIMUM ANNUAL COST                     │ $99           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "No valid code signing certificates found"
```bash
Solution: Let EAS manage credentials
eas credentials
# Select: "Set up new credentials"
```

### Issue 2: "Bundle identifier mismatch"
```bash
Solution: Ensure app.json matches Apple Developer Portal
# app.json: "bundleIdentifier": "com.yourcompany.tradebot"
# Must match exactly in developer.apple.com
```

### Issue 3: "Build failed - CocoaPods error"
```bash
Solution: Clear cache and rebuild
cd ios
pod deintegrate
pod install
cd ..
eas build --platform ios --clear-cache
```

### Issue 4: "App rejected - missing privacy policy"
```bash
Solution: Add privacy policy URL in App Store Connect
# Create privacy policy page
# Add URL in app metadata
```

---

## ✅ Pre-Launch Checklist

```
Before submitting to App Store:

□ Tested on real iOS device
□ All features working correctly
□ No console errors or warnings
□ App icons in all required sizes
□ Screenshots prepared (all sizes)
□ Privacy policy URL ready
□ Support URL ready
□ App description written
□ Keywords researched
□ Pricing decided
□ Age rating determined
□ Export compliance answered
□ Content rights verified
```

---

## 📚 Resources

- **Expo EAS Build**: https://docs.expo.dev/build/introduction/
- **Apple Developer**: https://developer.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight**: https://developer.apple.com/testflight/
- **Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/

---

## 🎯 Next Steps

1. **Get Mac Access** (if you don't have one)
2. **Enroll in Apple Developer Program** ($99/year)
3. **Install Xcode** (from Mac App Store)
4. **Configure `app.json` and `eas.json`**
5. **Run first build**: `eas build --platform ios --profile development`
6. **Test on TestFlight**
7. **Submit to App Store**

---

**Note**: iOS builds require a Mac computer. If you don't have one, you can:
- Use EAS Build (cloud-based, no Mac needed for building)
- Rent a Mac in the cloud (MacStadium, AWS Mac instances)
- Borrow a friend's Mac
- Use a Mac at a co-working space

**Remember**: APK is for Android. For iOS, you build an **IPA** file! 🍎
