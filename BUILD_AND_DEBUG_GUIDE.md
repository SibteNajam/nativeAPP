# 🚀 Complete Build & Debug Guide for ByteBoom AI

## ✅ What We've Done So Far

1. ✅ Removed old project ID from `app.json`
2. ✅ Created new Expo project: `66fd467b-a03d-4cb8-aec2-abe01230dc45`
3. ✅ Your `.env` is configured with: `http://146.59.93.94:3000`
4. ✅ Backend connectivity test passed ✅
5. 🔄 Build is waiting for your input...

---

## 📱 Step 1: Complete the Current Build

The terminal is asking: **"Generate a new Android Keystore?"**

**Just press `Y` and `Enter` in your PowerShell terminal.**

Then the build will:
- Upload your code to EAS servers
- Generate Android keystore
- Build the APK
- Provide download link

---

## 📱 Step 2: Build iOS (Optional)

After Android finishes, run:

```powershell
cd E:\NATIVE\mobileapp\FRONTEND
npx eas-cli@latest build --platform ios --profile preview
```

**Note:** iOS builds require Apple Developer account.

---

## 🔍 HOW TO TRACK API CALLS IN YOUR APP (Like Browser Network Tab)

### Method 1: Metro Terminal (EASIEST & BEST) ✅

Your app **ALREADY HAS AUTOMATIC LOGGING** built-in!

#### How to use:

1. **Start Metro bundler:**
   ```powershell
   cd E:\NATIVE\mobileapp\FRONTEND
   npm start
   ```

2. **Run your app:**
   - Press `a` for Android emulator
   - Or scan QR code with Expo Go
   - Or install the APK on your phone

3. **Watch the Metro terminal:**
   When you try to signup/login, you'll see detailed logs like:

   ```
   ════════════════════════════════════════════════════════
   📤 [API REQUEST] 10:30:15
      POST http://146.59.93.94:3000/auth/register
      Body: {
        "email": "user@example.com",
        "password": "***",
        "firstName": "John"
      }
   ────────────────────────────────────────────────────────
   
   📥 [API RESPONSE] 10:30:16
      POST http://146.59.93.94:3000/auth/register
      Status: 201
      Data: {
        "success": true,
        "user": { "id": 123, "email": "..." }
      }
   ════════════════════════════════════════════════════════
   ```

   **OR if it fails:**

   ```
   ════════════════════════════════════════════════════════
   ❌ [API ERROR] 10:30:16
      POST http://146.59.93.94:3000/auth/register
      Status: 400
      Message: Email already exists
      Response: { "error": "User already registered" }
   ════════════════════════════════════════════════════════
   ```

#### This shows you EXACTLY:
- ✅ Which endpoint was called (`/auth/register`, `/auth/login`, etc.)
- ✅ What data was sent
- ✅ Response status code (200, 400, 401, 500, etc.)
- ✅ Response body
- ✅ Error messages
- ✅ Request duration

---

### Method 2: Debug Screen (Visual in App)

I created a **Debug Screen** for you. To use it:

1. **Navigate to the debug screen** by manually typing this URL in Expo Go:
   ```
   exp://192.168.x.x:8081/--/debug
   ```
   (Replace with your Metro URL)

2. **Or add a button temporarily to your login screen:**

   Open `FRONTEND/app/(auth)/login.tsx` and add:
   ```tsx
   import { router } from 'expo-router';
   
   // Add this button somewhere in your screen:
   <TouchableOpacity 
     onPress={() => router.push('/debug')}
     style={{ padding: 10, backgroundColor: '#2196F3', margin: 10 }}
   >
     <Text style={{ color: 'white' }}>🔧 Debug Panel</Text>
   </TouchableOpacity>
   ```

3. **The Debug Screen shows:**
   - Current API URL configuration
   - Network status
   - Backend health check button
   - Test API requests with detailed results
   - All errors and responses

---

### Method 3: React Native Debugger (Advanced)

Download: https://github.com/jhen0409/react-native-debugger/releases

1. Install React Native Debugger
2. Start it on port 8081
3. In your app, shake device → "Debug Remote JS"
4. See all console logs in the debugger

---

### Method 4: Android Logcat (For APK Testing)

When testing the **actual APK** on a device:

```powershell
# Connect device via USB
adb devices

# View React Native logs
adb logcat | findstr "ReactNativeJS"
```

You'll see the same detailed API logs!

---

## 🎯 Quick Test Commands

### Test Backend from Your Computer:
```powershell
cd E:\NATIVE\mobileapp\FRONTEND
npm run test:backend
```

### Start Development with Logs:
```powershell
cd E:\NATIVE\mobileapp\FRONTEND
npm start
```
Then press `a` for Android, and **keep this terminal visible** to see all API calls!

### Check Build Status:
```powershell
cd E:\NATIVE\mobileapp\FRONTEND
npx eas-cli build:list
```

### Download Latest APK:
Check the URL in the build list output, or go to:
https://expo.dev/accounts/sibtenajam/projects/byteboom-ai/builds

---

## 🔧 Common Scenarios

### Scenario 1: "Signup fails but I don't know why"

**Solution:**
1. Start Metro: `npm start`
2. Try signup in app
3. Look at Metro terminal
4. You'll see:
   - ✅ Request URL (is it going to the right endpoint?)
   - ✅ Status code (400? 500? Network error?)
   - ✅ Error message from backend

### Scenario 2: "Login works in dev but not in APK"

**Solution:**
1. After installing APK, connect phone via USB
2. Run: `adb logcat | findstr "ReactNativeJS"`
3. Try login on phone
4. See the same logs as Metro!

### Scenario 3: "Backend seems unreachable"

**Solution:**
1. Test backend: `npm run test:backend`
2. If passes → App config issue
3. If fails → Backend/firewall issue
4. Check Metro logs to see exact error

---

## 📊 What Each Status Code Means

| Status | Meaning | What to Check |
|--------|---------|---------------|
| **200** | Success | Everything worked! |
| **400** | Bad Request | Check request body format |
| **401** | Unauthorized | Wrong credentials or expired token |
| **404** | Not Found | Wrong endpoint URL |
| **500** | Server Error | Check backend logs on server |
| **Network Error** | Can't connect | Backend down or firewall blocking |
| **Timeout** | Too slow | Backend overloaded or network slow |

---

## 🚀 Final Checklist

Before building APK:
- [ ] `.env` has correct backend URL: `http://146.59.93.94:3000`
- [ ] Backend test passes: `npm run test:backend`
- [ ] Can see API logs in Metro terminal during dev: `npm start`
- [ ] Tested signup/login in development mode
- [ ] Know how to view logs: Metro terminal or adb logcat

After building APK:
- [ ] Download APK from EAS dashboard
- [ ] Install on phone
- [ ] Connect phone via USB
- [ ] Run `adb logcat | findstr "ReactNativeJS"` to see logs
- [ ] Try signup/login and watch logs

---

## 💡 Pro Tips

1. **Always keep Metro terminal visible** when developing - it's your best debugging tool!

2. **Your app logs automatically** - no setup needed! Just look at the terminal.

3. **For APK testing**, use `adb logcat` - it shows the same logs.

4. **Backend URL is baked into APK at build time** - if you change `.env`, rebuild the APK.

5. **Test backend first** with `npm run test:backend` before blaming the app.

---

## 🆘 Need Help?

If signup/login still doesn't work after building:

1. **Share Metro terminal logs** (the API request/response output)
2. **Share backend test results** (`npm run test:backend` output)
3. **Tell me the exact error** you see in the logs

With these logs, I can tell you EXACTLY what's wrong! 🔍

---

## 📱 Your New Project Info

- **Project ID:** `66fd467b-a03d-4cb8-aec2-abe01230dc45`
- **Project Name:** `byteboom-ai`
- **Dashboard:** https://expo.dev/accounts/sibtenajam/projects/byteboom-ai
- **Backend URL:** `http://146.59.93.94:3000`
- **Backend Status:** ✅ Accessible (tested)

---

## ⚡ Quick Commands Reference

```powershell
# Test backend
npm run test:backend

# Start dev with logs
npm start

# Build Android
npx eas-cli build --platform android --profile preview

# Build iOS
npx eas-cli build --platform ios --profile preview

# Check builds
npx eas-cli build:list

# View Android logs (APK)
adb logcat | findstr "ReactNativeJS"
```

---

**You're all set!** Just answer `Y` in the terminal to continue the build, then use Metro terminal logs to track all your API calls! 🚀
