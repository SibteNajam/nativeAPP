# 🚀 Biometric Implementation Checklist

Use this checklist to implement biometric authentication in your app.

## Backend Setup

- [ ] **Run Database Migration**
  ```bash
  cd backend_layer
  psql -U your_user -d your_database -f migrations/20260203_add_biometric_devices.sql
  ```

- [ ] **Verify Migration Success**
  ```sql
  SELECT * FROM biometric_devices LIMIT 1;
  SELECT column_name FROM information_schema.columns WHERE table_name = 'biometric_devices';
  ```

- [ ] **Restart Backend Server**
  ```bash
  npm run start:dev
  # or
  pm2 restart ecosystem.config.js
  ```

- [ ] **Test API Endpoints**
  - Open Swagger: `http://localhost:3000/api` or `https://backend.coolify.cryptbot.site/api`
  - Look for `/auth/biometric/*` endpoints
  - Verify they appear in documentation

## Mobile App Setup

- [ ] **Dependencies Already Installed** ✅
  - expo-local-authentication
  - expo-secure-store
  - expo-crypto

- [ ] **Test Biometric Service**
  ```typescript
  import { biometricService } from '@/services/auth/biometric.service';
  
  const available = await biometricService.isBiometricAvailable();
  console.log('Biometric available:', available);
  ```

- [ ] **Add BiometricSettings to Profile/Settings Screen**
  ```tsx
  import BiometricSettings from '@/components/settings/BiometricSettings';
  
  <BiometricSettings />
  ```

- [ ] **(Optional) Add Biometric Prompt After Login**
  ```tsx
  import BiometricSetupPrompt from '@/components/modals/BiometricSetupPrompt';
  ```

## Testing

### iOS Simulator Testing
- [ ] Run: `npx expo run:ios`
- [ ] In simulator: `Features > Face ID > Enrolled`
- [ ] Login with email/password
- [ ] Enable Face ID in settings
- [ ] Close app and reopen
- [ ] Should see Face ID prompt
- [ ] Click "Matching Face" in simulator
- [ ] Should auto-login to dashboard

### Android Device Testing
- [ ] Ensure fingerprint enrolled on device
- [ ] Run: `npx expo run:android`
- [ ] Login with email/password
- [ ] Enable Fingerprint in settings
- [ ] Close app and reopen
- [ ] Should see fingerprint prompt
- [ ] Scan enrolled finger
- [ ] Should auto-login to dashboard

### Test Cases
- [ ] Enable biometric while logged in → Success
- [ ] Biometric prompt on app open → Shows correctly
- [ ] Biometric success → Logs in automatically
- [ ] Biometric cancel → Shows login screen
- [ ] Disable biometric → Removes device from backend
- [ ] Logout → Biometric still works on next login
- [ ] Multiple devices → Each gets unique token
- [ ] Revoke device → Cannot login from that device

## Security Verification

- [ ] **Device Token Storage**
  - Verify token stored in SecureStore (not AsyncStorage)
  - Check token is not logged in console

- [ ] **Backend Validation**
  - Test with invalid device token → Should fail
  - Test with revoked device → Should fail 401
  - Test without authentication → Register endpoint should fail

- [ ] **Token Rotation**
  - Verify access token expires
  - Verify device token persists across logins

## Production Deployment

- [ ] **Backend**
  - [ ] Run migration on production DB
  - [ ] Deploy updated backend code
  - [ ] Verify /auth/biometric/* endpoints working
  - [ ] Monitor logs for errors

- [ ] **Mobile App**
  - [ ] Update app version in app.json
  - [ ] Build production APK/IPA
  - [ ] Test on real devices before release
  - [ ] Submit to stores (if applicable)

- [ ] **Monitoring**
  - [ ] Set up error tracking (Sentry, etc.)
  - [ ] Monitor biometric login success/failure rates
  - [ ] Track adoption rate (% users enabling biometric)

## User Communication

- [ ] **In-App**
  - [ ] Settings screen shows biometric option
  - [ ] Clear explanation of what biometric does
  - [ ] "Maybe Later" option for setup prompt

- [ ] **Documentation** (if applicable)
  - [ ] Update user guide
  - [ ] Add FAQ about biometric login
  - [ ] Security explanation

## Rollback Plan

If issues arise:

- [ ] **Backend Rollback**
  ```sql
  -- Disable biometric login temporarily
  UPDATE biometric_devices SET is_active = false WHERE is_active = true;
  ```

- [ ] **Mobile Rollback**
  - Previous app version still works (biometric is additive)
  - Users can still login with email/password

## Verification

- [ ] Biometric works on iOS devices
- [ ] Biometric works on Android devices
- [ ] Settings toggle functional
- [ ] Device management functional
- [ ] No errors in production logs
- [ ] Users can disable biometric
- [ ] Revocation works correctly

## Performance Checks

- [ ] App startup time unchanged
- [ ] Biometric prompt appears quickly (< 500ms)
- [ ] Backend endpoints respond quickly (< 200ms)
- [ ] No memory leaks with biometric service

---

## Quick Start Commands

### Backend
```bash
# Run migration
cd backend_layer
psql -U postgres -d your_db -f migrations/20260203_add_biometric_devices.sql

# Restart server
npm run start:dev
```

### Mobile
```bash
cd FRONTEND

# iOS
npx expo run:ios

# Android
npx expo run:android

# Clear cache if needed
npx expo start --clear
```

---

## Support Links

- 📖 [Full Documentation](./BIOMETRIC_AUTHENTICATION_GUIDE.md)
- 🔧 [Backend Files](../backend_layer/src/auth/)
- 📱 [Mobile Files](../FRONTEND/src/services/auth/)
- 🎨 [UI Components](../FRONTEND/src/components/settings/)

---

**Last Updated**: February 3, 2026  
**Status**: Ready for Implementation ✅
