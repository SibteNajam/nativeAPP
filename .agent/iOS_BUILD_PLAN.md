
┌─────────────────────────────────────────────────────────────────────────┐
│                          iOS BUILD WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  PREREQUISITES  │
                              │  ✓ Mac Computer │
                              │  ✓ Xcode 15+    │
                              │  ✓ Apple Dev ID │
                              │  ✓ EAS Account  │
                              └────────┬────────┘
                                       │
                                       ▼
                         ┌─────────────────────────┐
                         │   ENVIRONMENT SETUP     │
                         │ ─────────────────────── │
                         │ • xcode-select install  │
                         │ • gem install cocoapods │
                         │ • npm install -g eas-cli│
                         │ • eas login             │
                         └───────────┬─────────────┘
                                     │
                                     ▼
               ┌─────────────────────────────────────────────┐
               │         PROJECT CONFIGURATION               │
               │ ─────────────────────────────────────────── │
               │                                             │
               │  ┌──────────────┐  ┌──────────────┐       │
               │  │  app.json    │  │  eas.json    │       │
               │  │ ──────────── │  │ ──────────── │       │
               │  │ • Bundle ID  │  │ • Profiles   │       │
               │  │ • Version    │  │ • Build opts │       │
               │  │ • iOS config │  │ • Submit cfg │       │
               │  └──────────────┘  └──────────────┘       │
               │                                             │
               │  ┌──────────────────────────────────────┐  │
               │  │     .env.production                  │  │
               │  │  • API URLs • Secrets • WS URLs      │  │
               │  └──────────────────────────────────────┘  │
               └────────────────────┬────────────────────────┘
                                    │
                                    ▼
          ┌──────────────────────────────────────────────────────┐
          │         APPLE DEVELOPER PORTAL SETUP                 │
          │ ──────────────────────────────────────────────────── │
          │                                                      │
          │   ┌──────────────┐   ┌──────────────┐              │
          │   │   CREATE     │   │  GENERATE    │              │
          │   │   APP ID     │──▶│ CERTIFICATES │              │
          │   │              │   │              │              │
          │   │ Bundle ID:   │   │ • Dev Cert   │              │
          │   │ com.x.app    │   │ • Dist Cert  │              │
          │   └──────────────┘   └──────┬───────┘              │
          │                              │                       │
          │                              ▼                       │
          │                    ┌──────────────────┐             │
          │                    │   PROVISIONING   │             │
          │                    │     PROFILES     │             │
          │                    │                  │             │
          │                    │ • Development    │             │
          │                    │ • Distribution   │             │
          │                    │ • App Store      │             │
          │                    └──────────────────┘             │
          └─────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      BUILD EXECUTION          │
                    │ ───────────────────────────── │
                    │                               │
                    │  eas build --platform ios     │
                    │         --profile production  │
                    │                               │
                    └───────────┬───────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
    ┌───────────────────┐           ┌──────────────────┐
    │   CLOUD BUILD     │           │  BUILD PROCESS   │
    │ ───────────────── │           │ ──────────────── │
    │ • EAS Servers     │           │ 1. Dependencies  │
    │ • 10-30 minutes   │           │ 2. Prebuild      │
    │ • Automated       │           │ 3. CocoaPods     │
    └─────────┬─────────┘           │ 4. Compile       │
              │                     │ 5. Bundle JS     │
              │                     │ 6. Code Sign     │
              │                     │ 7. Create .ipa   │
              │                     └────────┬─────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │   BUILD OUTPUT    │
                   │ ───────────────── │
                   │   📦 .ipa file    │
                   │   (iOS Package)   │
                   └─────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐          ┌─────────────────┐
    │   TESTFLIGHT     │          │   APP STORE     │
    │ ──────────────── │          │ ─────────────── │
    │ Internal Testing │          │ Public Release  │
    │                  │          │                 │
    │ • 100 internal   │          │ • Metadata      │
    │ • 10k external   │          │ • Screenshots   │
    │ • Quick feedback │          │ • Review (1-3d) │
    └──────────────────┘          └─────────────────┘
              │                             │
              │                             ▼
              │                   ┌──────────────────┐
              │                   │   LIVE ON APP    │
              │                   │      STORE       │
              │                   │   🎉 Success!    │
              │                   └────────┬─────────┘
              │                            │
              └────────────┬───────────────┘
                           │
                           ▼
                 ┌──────────────────────┐
                 │   POST-RELEASE       │
                 │ ──────────────────── │
                 │ • Monitor crashes    │
                 │ • User reviews       │
                 │ • Analytics          │
                 │ • Push updates       │
                 └──────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                         DECISION TREE                           │
└─────────────────────────────────────────────────────────────────┘

                    Need iOS Build?
                          │
                          ▼
                   Have a Mac? ──NO──▶ Use EAS Cloud Build
                          │                    │
                         YES                   │
                          │◀───────────────────┘
                          ▼
              Install Xcode & Tools
                          │
                          ▼
              Apple Developer Account? ──NO──▶ Enroll ($99/year)
                          │                            │
                         YES                           │
                          │◀───────────────────────────┘
                          ▼
               Configure app.json + eas.json
                          │
                          ▼
              Create App ID in Portal
                          │
                          ▼
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    Development Build          Production Build
    (For Testing)              (For App Store)
            │                           │
            ▼                           ▼
    TestFlight Internal        Submit to App Store
            │                           │
            ▼                           ▼
    Gather Feedback            App Review (1-3 days)
            │                           │
            └─────────────┬─────────────┘
                          ▼
                    Release Update


# 🍎 iOS Build Guide - Condensed

## 🎯 Build Process Flow

```
PREREQUISITES → ENVIRONMENT → CONFIGURATION → APPLE SETUP → BUILD → DISTRIBUTE
```

---

## 📋 Prerequisites

**Hardware:** Mac (macOS 13+, 8GB RAM, 50GB space)  
**Accounts:** Apple Developer ($99/year), Expo/EAS  
**Software:** Xcode, Node.js, EAS CLI

---

## ⚡ Quick Setup

```bash
# Install tools
xcode-select --install
sudo gem install cocoapods
npm install -g eas-cli
eas login

# In your project
cd e:\NATIVE\mobileapp\FRONTEND
npm install
eas build:configure
```

---

## 🔧 Configuration Files

### **app.json**
```json
{
  "expo": {
    "name": "TradeBot",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.tradebot",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Camera access for QR scanning"
      }
    }
  }
}
```

### **eas.json**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "distribution": "store",
      "ios": { "simulator": false }
    }
  }
}
```

### **.env.production**
```bash
EXPO_PUBLIC_API_URL=https://backend-production-6851.up.railway.app
EXPO_PUBLIC_WS_URL=wss://backend-production-6851.up.railway.app
```

---

## 🍏 Apple Developer Portal

**At https://developer.apple.com/account:**

1. **Create App ID**
   - Certificates, Identifiers & Profiles → Identifiers → "+"
   - Bundle ID: `com.yourcompany.tradebot` (match app.json)
   - Select needed capabilities

2. **Certificates & Profiles** *(EAS can auto-generate - recommended)*
   - Development Certificate
   - Distribution Certificate  
   - Provisioning Profiles

---

## 🚀 Build Commands

```bash
# Development (simulator)
eas build --platform ios --profile development

# Production (App Store)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

**Build Time:** 10-30 minutes  
**Output:** .ipa file (not APK - that's Android!)

---

## 📱 Distribution Options

### **TestFlight (Beta Testing)**
```bash
eas submit --platform ios --latest
```
- Internal testers: 100 max
- External testers: 10,000 max (needs beta review)
- Testers install via TestFlight app

### **App Store (Production)**
1. Create listing in App Store Connect
2. Upload screenshots (1290x2796, 1242x2688, 1242x2208)
3. Add metadata (name, description, keywords)
4. Submit for review (1-3 days)
5. Release

---

## 📦 Required Assets

```
✓ App Icon: 1024x1024 PNG (no transparency)
✓ Splash Screen: 1242x2688 PNG
✓ Screenshots: All required iPhone sizes
✓ Privacy Policy URL
✓ Support URL
```

---

## 🔄 Updates

**Bug fix:** Increment `buildNumber` only  
**New features:** Increment `version` + reset `buildNumber` to "1"

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| No valid certificates | Run `eas credentials` → "Set up new credentials" |
| Bundle ID mismatch | Ensure app.json matches Apple Developer Portal exactly |
| CocoaPods error | `eas build --platform ios --clear-cache` |
| Rejection | Add privacy policy + support URL in App Store Connect |

---

## ⏱️ Timeline

| Phase | Time |
|-------|------|
| Apple Developer setup | 1-2 days |
| Environment + config | 3-6 hours |
| First build | 2-3 hours |
| TestFlight testing | 1-2 days |
| App Store review | 1-3 days |
| **TOTAL (First time)** | **5-10 days** |
| **Subsequent builds** | **30-60 min** |

---

## 💰 Costs

- **Apple Developer Program:** $99/year (required)
- **EAS Build:** Free (30 builds/month) or $29/month (unlimited)
- **Mac:** $999+ (if needed)

**Minimum:** $99/year

---

## ✅ Pre-Launch Checklist

```
□ Tested on real iOS device
□ All features working
□ App icons (all sizes)
□ Screenshots (all sizes)
□ Privacy policy URL
□ Support URL
□ App description + keywords
□ Pricing decided
□ Age rating set
□ Export compliance answered
```

---

## 🎯 Step-by-Step Quickstart

1. **Enroll in Apple Developer Program** ($99/year)
2. **Install Xcode** (Mac App Store)
3. **Configure files** (app.json, eas.json)
4. **Create App ID** (developer.apple.com)
5. **Build:** `eas build --platform ios --profile production`
6. **Test:** Submit to TestFlight
7. **Release:** Submit to App Store

---

## 📚 Essential Links

- Expo EAS: https://docs.expo.dev/build/introduction/
- Apple Developer: https://developer.apple.com
- App Store Connect: https://appstoreconnect.apple.com
- TestFlight: https://developer.apple.com/testflight/

---

## 🔑 Key Points

- ✅ iOS builds require a **Mac** (or use EAS cloud builds)
- ✅ Output is **.ipa** file (not .apk)
- ✅ EAS can auto-manage certificates (recommended)
- ✅ TestFlight before App Store submission
- ✅ Bundle ID must match everywhere
- ✅ First build takes longest; subsequent builds ~30min

---

**No Mac?** Use EAS cloud builds (included), rent Mac cloud instances, or borrow one.