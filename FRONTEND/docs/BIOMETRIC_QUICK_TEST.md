# 🚀 Quick Test Guide - Biometric Authentication

## ⚡ 60-Second Test

### 1️⃣ Start Backend (Terminal 1)
```bash
cd e:\NATIVE\mobileapp\backend_layer
npm run start:dev
```
✅ Wait for: "Application is running on: http://[::1]:3000"

### 2️⃣ Start Frontend (Terminal 2)
```bash
cd e:\NATIVE\mobileapp\FRONTEND
npx expo start --clear
```
✅ Press **'a'** for Android or **'i'** for iOS

### 3️⃣ Test in App
1. **Log in** with your account
2. **Tap** "Explore" tab (bottom navigation)
3. **Scroll** down and tap **"Settings"** (⚙️ icon)
4. **Find** "Face ID/Touch ID Login" in Security section
5. **Tap** it → Scan face/fingerprint
6. **See** ✅ "Biometric Enabled" success message

### 4️⃣ Test Auto-Login
1. **Logout** from app
2. **Close** app completely (swipe from recent apps)
3. **Reopen** app
4. **Biometric prompt** appears automatically!
5. **Scan** → You're in! 🎉

---

## 📋 Pre-Test Checklist

### Database
```bash
# Run migration first (one time only)
psql -U postgres -d your_database -f e:\NATIVE\mobileapp\backend_layer\migrations\20260203_add_biometric_devices.sql
```

### Dependencies
```bash
# Frontend (if needed)
cd e:\NATIVE\mobileapp\FRONTEND
npm install

# Backend (if needed)
cd e:\NATIVE\mobileapp\backend_layer
npm install
```

### Device Requirements
- ✅ **iOS**: Face ID or Touch ID enrolled in Settings
- ✅ **Android**: Fingerprint or Face Unlock enrolled in Settings
- ✅ **Simulator**: iOS simulator supports Face ID simulation (Hardware → Face ID → Enrolled)

---

## 🎯 What to Look For

### Settings Screen
```
SECURITY Section:
┌──────────────────────────────────┐
│ 👤 Face ID Login               │
│ ✅ Verified - Face ID is enabled │ ← Should show this after enabling
│                                > │
└──────────────────────────────────┘
```

### Status Messages
- **Before Enable**: "Tap to enable face recognition authentication"
- **After Enable**: "✅ Verified - Face ID is enabled"
- **Not Available**: "Not available on this device"

### Success Alert
```
✅ Biometric Enabled

Face ID authentication has been 
enabled successfully. You can now 
use face id to unlock the app.

                    [ OK ]
```

---

## 🔍 Debugging Commands

### Check Backend Logs
```bash
# Terminal 1 (where backend is running)
# Look for these log messages:
[BiometricService] Registering device for user: <user_id>
[BiometricService] Device registered successfully
[BiometricService] Biometric login successful for user: <user_id>
```

### Check Database
```sql
-- See registered devices
SELECT 
  id, 
  device_name, 
  biometric_type, 
  is_active, 
  created_at 
FROM biometric_devices 
ORDER BY created_at DESC;

-- Check user's biometric status
SELECT 
  email, 
  biometric_enabled 
FROM users 
WHERE biometric_enabled = true;
```

### Check Frontend Logs
```javascript
// In Expo terminal, look for:
Biometric available: true
Biometric enabled: false
Biometric name: Face ID
[BiometricService] Device registered successfully
[AuthContext] Biometric login successful
```

### Test API Manually
```bash
# 1. Register device
curl -X POST http://localhost:3000/auth/biometric/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "deviceName": "Test iPhone",
    "deviceType": "ios",
    "biometricType": "face_id"
  }'

# Expected response:
{
  "message": "Biometric device registered successfully",
  "deviceToken": "eyJhbGc...",
  "device": { ... }
}

# 2. Login with biometric
curl -X POST http://localhost:3000/auth/biometric/login \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "deviceToken": "eyJhbGc..."
  }'

# Expected response:
{
  "success": true,
  "message": "Biometric login successful",
  "data": {
    "access_token": "eyJhbGc...",
    "user": { ... }
  }
}
```

---

## ❌ Common Issues & Fixes

### Issue: "Cannot find module '@/contexts/AuthContext'"
**Fix**: 
```bash
cd e:\NATIVE\mobileapp\FRONTEND
npx expo start --clear
```

### Issue: "Biometric not available"
**Fix**: Enroll biometric on device
- **iOS Simulator**: Hardware → Face ID → Enrolled
- **iOS Device**: Settings → Face ID & Passcode
- **Android**: Settings → Security → Biometrics

### Issue: Settings screen not showing
**Fix**: Clear metro cache
```bash
cd e:\NATIVE\mobileapp\FRONTEND
npx expo start --clear --reset-cache
```

### Issue: TypeScript errors in IDE
**Fix**: These are IDE configuration issues, not runtime errors. Code will run fine.
To fix in VS Code:
1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Or reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

### Issue: "Table biometric_devices already exists"
**Fix**: Table already migrated, skip migration step ✅

### Issue: Biometric prompt doesn't appear on launch
**Fix**: 
1. Ensure you enabled biometric in Settings
2. Check storage:
```typescript
import { authStorage } from '@/services/auth/auth.storage';
console.log(await authStorage.getIsBiometricEnabled()); // Should be true
console.log(await authStorage.getDeviceToken()); // Should have token
```

---

## 📱 Testing Scenarios

### ✅ Scenario 1: First Time User
1. User logs in with email/password
2. Goes to Settings
3. Sees "Tap to enable face recognition"
4. Taps it
5. Scans face
6. Sees success message
7. Status changes to "Verified"

### ✅ Scenario 2: Returning User
1. User opens app (already enabled biometric)
2. Biometric prompt appears automatically
3. User scans face
4. Logged in without password

### ✅ Scenario 3: Disable Biometric
1. User goes to Settings
2. Taps enabled biometric option
3. Confirms "Disable"
4. Status changes to "Tap to enable..."
5. Next login requires password

### ✅ Scenario 4: Device Without Biometric
1. User on device without biometrics
2. Goes to Settings
3. Sees "Not available on this device"
4. Option is grayed out

---

## 🎨 Visual Indicators

### Colors
- 🟢 **Green** = Enabled & working
- 🟡 **Yellow** = Available but not enabled
- ⚫ **Gray** = Not available

### Icons
- 👤 **Face** = Face ID / Face Recognition
- 👆 **Fingerprint** = Touch ID / Fingerprint
- ✅ **Checkmark** = Verified status
- ⚠️ **Warning** = Not verified

---

## 📊 Success Metrics

After testing, you should have:
- ✅ Settings screen accessible from Explore
- ✅ Biometric option visible with correct status
- ✅ Enable flow works (scan → success)
- ✅ Auto-login on app reopen works
- ✅ Status shows "Verified" after enabling
- ✅ Haptic feedback on interactions
- ✅ Smooth animations
- ✅ No errors in console

---

## 🎉 Expected Results

### Console Output (Backend)
```
[Nest] 12345  - 02/03/2026, 10:30:00 AM     LOG [BiometricService] Registering device for user: abc-123
[Nest] 12345  - 02/03/2026, 10:30:01 AM     LOG [BiometricService] Device registered successfully
[Nest] 12345  - 02/03/2026, 10:35:00 AM     LOG [BiometricService] Biometric login successful for user: abc-123
```

### Console Output (Frontend)
```
LOG  Biometric available: true
LOG  Biometric enabled: false
LOG  Biometric name: Face ID
LOG  [BiometricService] Starting device registration
LOG  [BiometricService] Device registered successfully
LOG  [AuthContext] Biometric enabled successfully
LOG  [AuthContext] Attempting biometric login
LOG  [AuthContext] Biometric login successful
```

### Database State
```sql
SELECT * FROM biometric_devices;
-- Should show your device with:
--   is_active = true
--   biometric_type = 'face_id' or 'fingerprint'
--   last_used_at = recent timestamp
```

---

**Ready to test? Follow the 60-second guide at the top! 🚀**
