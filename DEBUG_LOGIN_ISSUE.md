# 🚀 QUICK START: Debug Your Login Issue

Your app is configured to connect to `http://146.59.93.94:3000` ✅  
But it's not working after you built the APK. Let's fix it!

---

## 🎯 Step-by-Step Debugging

### **STEP 1: Test Backend from Your Computer**

Run this command right now:

```powershell
cd e:\NATIVE\mobileapp\FRONTEND
npm run test:backend
```

**What it does:**
- Tests if `146.59.93.94:3000` is reachable
- Tests the `/health` endpoint
- Tests the `/auth/login` endpoint
- Shows detailed error messages

**Expected Results:**

✅ **If All Tests Pass:**
```
✅ All tests passed! Backend is accessible.
```
→ Backend is fine, issue is in your app config (go to Step 3)

❌ **If Tests Fail:**
```
❌ Failed! Connection refused
```
→ Backend issue (go to Step 2)

---

### **STEP 2: Check Your Backend Server**

If tests failed, your backend might be down or blocked:

#### Option A: Check if backend is running
```bash
# SSH to your server (146.59.93.94)
ssh user@146.59.93.94

# Check if backend is running on port 3000
netstat -tlnp | grep 3000
# or
sudo lsof -i :3000
```

**Should see:**
```
tcp   0   0.0.0.0:3000   LISTEN   1234/node
```

If not running, start it:
```bash
cd /path/to/backend
npm start
```

#### Option B: Check firewall
```bash
# Check UFW (Ubuntu firewall)
sudo ufw status

# Port 3000 should be ALLOW
# If not:
sudo ufw allow 3000
```

#### Option C: Test from outside
```bash
# From your phone's browser, try:
http://146.59.93.94:3000/health
```

If you can't reach it, backend is not publicly accessible.

---

### **STEP 3: Check App Logs (Metro Terminal)**

Your app has **automatic logging** built-in!

1. **Start Metro:**
   ```powershell
   cd e:\NATIVE\mobileapp\FRONTEND
   npm start
   ```

2. **Run app** (press `a` for Android)

3. **Try to login**

4. **Watch the Metro terminal** for logs like:

   ✅ **Success:**
   ```
   📤 [POST] http://146.59.93.94:3000/auth/login
   📥 [200] { "success": true, "user": {...} }
   ```

   ❌ **Network Error:**
   ```
   📤 [POST] http://146.59.93.94:3000/auth/login
   ❌ Network Error - Cannot reach backend
   ```

   ❌ **401 Unauthorized:**
   ```
   📤 [POST] http://146.59.93.94:3000/auth/login
   ❌ [401] Invalid credentials
   ```

---

### **STEP 4: Use Built-in Debug Screen**

I added a debug screen to your app!

1. **Navigate to debug screen:**
   - Add this to your navigation or
   - Manually navigate: `expo-router://debug`

2. **Or temporarily add a button to your login screen:**
   ```tsx
   import { router } from 'expo-router';
   
   <Button onPress={() => router.push('/debug')}>
     🔧 Debug
   </Button>
   ```

3. **The debug screen shows:**
   - ✅ Current API URL
   - ✅ Network status
   - ✅ Health check button
   - ✅ Test request buttons
   - ✅ Detailed error messages

---

### **STEP 5: Check Android Cleartext Config**

Android 9+ blocks HTTP by default. You need to allow it:

#### Check your app.json:
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true  // ← Must be true for HTTP
    }
  }
}
```

#### If missing, add it:
1. Open [app.json](app.json)
2. Add to `android` section:
   ```json
   "usesCleartextTraffic": true
   ```
3. Rebuild APK

---

## 🔍 Common Issues & Solutions

### Issue 1: "Network Error" in APK
**Cause:** Backend not accessible from phone's network  
**Fix:**
1. Test from phone's browser: `http://146.59.93.94:3000/health`
2. If fails → Backend not publicly accessible (check firewall)
3. If works → App config issue (check cleartext traffic)

### Issue 2: Works in Dev, Fails in APK
**Cause:** Environment variable not baked into APK  
**Fix:**
1. Verify [.env](.env) has correct URL
2. Rebuild: `eas build --platform android`
3. Env vars are baked in at BUILD time, not runtime

### Issue 3: "Timeout" Error
**Cause:** Backend too slow or unreachable  
**Fix:**
1. Check backend health: `curl http://146.59.93.94:3000/health`
2. Increase timeout in [src/config/api.ts](src/config/api.ts)
3. Check network latency

### Issue 4: CORS Error (rare in mobile)
**Cause:** Backend rejecting requests  
**Fix:** CORS doesn't apply to React Native, only web

---

## 📋 Debug Checklist

Run through this checklist:

- [ ] **Backend Test:** `npm run test:backend` passes ✅
- [ ] **Browser Test:** Can access `http://146.59.93.94:3000/health` from phone ✅
- [ ] **.env Correct:** `EXPO_PUBLIC_API_URL=http://146.59.93.94:3000` ✅
- [ ] **Cleartext Allowed:** `usesCleartextTraffic: true` in app.json ✅
- [ ] **Metro Logs:** Can see API requests in Metro terminal ✅
- [ ] **Rebuilt APK:** Built after changing .env ✅

---

## 🆘 Still Not Working?

### Send me these logs:

1. **Metro terminal output** when you try to login
2. **Backend test results:** Output of `npm run test:backend`
3. **Phone browser test:** Can you open `http://146.59.93.94:3000/health` in Chrome on your phone?
4. **APK build log:** Any errors during `eas build`?

With these logs, I can pinpoint the exact issue!

---

## 💡 Pro Tips

**For Development:**
- Use Metro terminal logs (always running, auto-updates)
- Add Debug Screen for visual feedback

**For Production APK Testing:**
- Use `eas build --profile development` for debuggable APK
- Logs will still show in Metro terminal if you run it
- Check phone's logcat: `adb logcat | grep -i "ReactNativeJS"`

**Best Practice:**
- Use HTTPS in production (get SSL cert)
- Use different .env files for dev/prod
- Test backend connectivity before building APK

---

## 🎯 TL;DR - Quick Fix

```powershell
# 1. Test backend
npm run test:backend

# 2. If passes, check .env
# Make sure it has: EXPO_PUBLIC_API_URL=http://146.59.93.94:3000

# 3. Rebuild APK
eas build --platform android

# 4. Watch Metro logs while testing
npm start
# Press 'a' for Android, then try login
```

The logs will tell you EXACTLY what's wrong! 🚀
