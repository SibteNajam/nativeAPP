# 🔍 How to Debug API Requests in Your React Native App

## Your App is Already Configured with Network Logging! ✅

Your app has a comprehensive network logger at `src/utils/network-logger.ts` that logs:
- Every API request (URL, method, body)
- Every response (status, data)
- Every error (status code, message)

---

## 📱 Method 1: Metro Bundler Console (EASIEST)

**Where:** The terminal where you run `npm start` or `expo start`

**How to use:**
1. Start your app: `npm start`
2. Keep the Metro terminal visible
3. Perform actions in the app (like login)
4. Watch the terminal for detailed logs:

```
📤 [API REQUEST] 10:30:15
   POST http://146.59.93.94:3000/auth/login
   Body: { "email": "user@email.com", "password": "***" }
─────────────────────────────────────

📥 [API RESPONSE] 10:30:16
   POST http://146.59.93.94:3000/auth/login
   Status: 200
   Data: { "success": true, "user": {...} }
═════════════════════════════════════
```

---

## 📱 Method 2: Expo Dev Menu (Quick Toggle)

**Access Dev Menu:**
- **Android:** Shake device or press `Ctrl+M` (emulator)
- **iOS:** Shake device or press `Cmd+D` (simulator)
- **Expo Go:** Shake or press `Ctrl+M` / `Cmd+D`

**Then:**
1. Tap "Debug Remote JS" → Opens Chrome DevTools
2. Open Console tab → See all logs
3. Open Network tab → Won't work (not a browser)

---

## 🌐 Method 3: React Native Debugger (BEST FOR DEVELOPMENT)

**Download:** https://github.com/jhen0409/react-native-debugger/releases

**Features:**
- Redux DevTools
- React DevTools
- Network Inspector (with redux-logger)
- Better console

**Setup:**
1. Download and install
2. Start on port 19000: `open "rndebugger://set-debugger-loc?host=localhost&port=19000"`
3. Enable Remote Debugging in Expo Dev Menu
4. All logs appear in React Native Debugger

---

## 🔧 Method 4: Enhanced Console Logging (What I'll Add)

I'll add additional logging specifically for your login issue:

```typescript
// Log the exact URL being called
// Log the request payload
// Log the full response
// Log any network errors
```

---

## 📱 Method 5: Expo Development Build (Production-Like Debugging)

For debugging APK issues:

1. **Install Expo Dev Client:**
   ```bash
   npx expo install expo-dev-client
   ```

2. **Build Development APK:**
   ```bash
   eas build --profile development --platform android
   ```

3. **This APK includes:**
   - React Native DevTools
   - Console logging
   - Remote debugging
   - But uses production-like environment

---

## ⚡ Method 6: Reactotron (Advanced)

**Install:**
```bash
npm install --save-dev reactotron-react-native
```

**Features:**
- Network request/response viewer
- Redux state inspector
- Custom logging
- Timeline view

---

## 🐛 Debugging Your Current Login Issue

Based on your setup, here's how to debug:

### Step 1: Check Metro Terminal
```bash
cd FRONTEND
npm start
```

### Step 2: Trigger Login
- Try logging in
- Watch Metro terminal

### Step 3: Look for These Patterns

**✅ SUCCESS:**
```
📤 [POST] http://146.59.93.94:3000/auth/login
📥 [200] Success
```

**❌ Network Error:**
```
❌ [POST] http://146.59.93.94:3000/auth/login → Network Error
```
**Fix:** Backend not accessible (firewall, server down, wrong IP)

**❌ 404 Not Found:**
```
❌ [POST] http://146.59.93.94:3000/auth/login → 404
```
**Fix:** Endpoint path wrong

**❌ 401 Unauthorized:**
```
❌ [POST] http://146.59.93.94:3000/auth/login → 401
```
**Fix:** Credentials invalid

**❌ 500 Server Error:**
```
❌ [POST] http://146.59.93.94:3000/auth/login → 500
```
**Fix:** Backend error (check backend logs)

---

## 🔍 Common Issues with Built APK

### Issue 1: HTTPS Required
Some networks block HTTP on mobile data. Check if:
```
EXPO_PUBLIC_API_URL=http://146.59.93.94:3000  ❌ Blocked on mobile data
```

**Solution:** Use HTTPS with SSL certificate

### Issue 2: Network Security Config (Android 9+)
Android blocks cleartext (HTTP) traffic by default.

**Check:** `android/app/src/main/AndroidManifest.xml`
```xml
<application
  android:usesCleartextTraffic="true">  <!-- Must be true for HTTP -->
</application>
```

### Issue 3: Backend Not Accessible
```bash
# Test from your phone's browser
http://146.59.93.94:3000/health
```

If this doesn't load, backend is not accessible from phone's network.

---

## 🚀 Quick Checklist for Your Issue

- [ ] Metro terminal shows request being made?
- [ ] Response status code?
- [ ] Error message?
- [ ] Backend URL accessible from phone browser?
- [ ] Using HTTP on Android 9+? (needs cleartext config)
- [ ] Firewall blocking port 3000?
- [ ] Backend actually running on 146.59.93.94:3000?

---

## 💡 Additional Debugging I'll Add

I'll enhance your app with:
1. ✅ Toast notifications for API errors
2. ✅ Connection status indicator
3. ✅ Detailed error messages shown to user
4. ✅ Request/response logging to file (for APK debugging)

Let me know which debugging method you prefer, and I can help further!
