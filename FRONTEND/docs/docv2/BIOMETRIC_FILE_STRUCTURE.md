# 🎨 Biometric Authentication - File Structure

## Complete File Organization

```
mobileapp/
│
├── backend_layer/                           # Backend (NestJS)
│   ├── migrations/
│   │   └── 20260203_add_biometric_devices.sql      ✨ NEW - DB migration
│   │
│   └── src/
│       └── auth/
│           ├── entities/
│           │   ├── refreshToken.entity.ts           ✅ Existing
│           │   └── biometric-device.entity.ts       ✨ NEW - Device entity
│           │
│           ├── dto/
│           │   ├── refresh-token.dto.ts             ✅ Existing
│           │   └── biometric.dto.ts                 ✨ NEW - Biometric DTOs
│           │
│           ├── auth.controller.ts                   🔧 MODIFIED - Added 4 endpoints
│           ├── auth.service.ts                      ✅ Existing
│           ├── auth.module.ts                       🔧 MODIFIED - Added BiometricService
│           ├── biometric.service.ts                 ✨ NEW - Biometric logic
│           └── refreshToken.service.ts              ✅ Existing
│
├── FRONTEND/                                # Mobile App (Expo)
│   ├── src/
│   │   ├── components/
│   │   │   ├── settings/
│   │   │   │   └── BiometricSettings.tsx           ✨ NEW - Settings toggle
│   │   │   │
│   │   │   └── modals/
│   │   │       └── BiometricSetupPrompt.tsx        ✨ NEW - Setup prompt
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx                     🔧 MODIFIED - Added biometric methods
│   │   │
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts                 ✅ Existing (unused legacy)
│   │   │   │   ├── auth.storage.ts                 🔧 MODIFIED - Device token storage
│   │   │   │   └── biometric.service.ts            🔧 MODIFIED - Enhanced service
│   │   │   │
│   │   │   └── api/
│   │   │       └── auth.api.ts                     🔧 MODIFIED - Added biometric APIs
│   │   │
│   │   └── types/
│   │       └── auth.types.ts                       🔧 MODIFIED - Added biometric types
│   │
│   └── app/
│       └── (auth)/
│           └── login.tsx                            ✅ Existing (can add prompt)
│
└── docs/                                    # Documentation
    ├── BIOMETRIC_AUTHENTICATION_GUIDE.md            ✨ NEW - Full guide
    ├── BIOMETRIC_CHECKLIST.md                       ✨ NEW - Implementation steps
    ├── BIOMETRIC_IMPLEMENTATION_SUMMARY.md          ✨ NEW - Summary
    └── BIOMETRIC_FILE_STRUCTURE.md                  ✨ NEW - This file

Legend:
✨ NEW       - New file created
🔧 MODIFIED  - Existing file modified
✅ EXISTING  - Referenced but unchanged
```

---

## 📦 Component Dependencies

### Backend Dependencies

```
auth.module.ts
├── TypeOrmModule.forFeature([BiometricDevice])    ← NEW
├── BiometricService                               ← NEW
├── AuthService                                    ✅ Existing
└── RefreshTokenService                            ✅ Existing

BiometricService
├── @InjectRepository(BiometricDevice)             ← NEW
└── AuthService                                    ✅ Existing

auth.controller.ts
├── BiometricService                               ← NEW
├── AuthService                                    ✅ Existing
├── ApicredentialsService                          ✅ Existing
└── EmailService                                   ✅ Existing
```

### Frontend Dependencies

```
AuthContext.tsx
├── authApi                                        🔧 Modified
├── authStorage                                    🔧 Modified
├── biometricService                               ← NEW
└── useCredentialsStore                            ✅ Existing

BiometricSettings.tsx
├── useAuth()                                      🔧 Modified
├── biometricService                               🔧 Modified
├── authStorage                                    🔧 Modified
└── useTheme()                                     ✅ Existing

BiometricSetupPrompt.tsx
├── useAuth()                                      🔧 Modified
├── biometricService                               🔧 Modified
└── useTheme()                                     ✅ Existing

auth.api.ts
├── api (axios client)                             ✅ Existing
├── authStorage                                    🔧 Modified
└── config.ENDPOINTS                               ✅ Existing

biometric.service.ts
├── expo-local-authentication                      ✅ Existing package
├── expo-secure-store                              ✅ Existing package
├── expo-crypto                                    ✅ Existing package
└── authStorage                                    🔧 Modified
```

---

## 🔄 Data Flow

### Registration Flow

```
User (Logged In)
    │
    ├──> BiometricSettings Component
    │       │
    │       ├──> enableBiometric() [AuthContext]
    │              │
    │              ├──> biometricService.isBiometricAvailable()
    │              ├──> biometricService.getOrCreateDeviceId()
    │              │       │
    │              │       └──> authStorage.getDeviceId()
    │              │       └──> Crypto.randomUUID() (if new)
    │              │       └──> authStorage.setDeviceId()
    │              │
    │              ├──> authApi.registerBiometricDevice()
    │              │       │
    │              │       └──> POST /auth/biometric/register
    │              │              │
    │              │              └──> BiometricService.registerDevice()
    │              │                     │
    │              │                     ├──> AuthService.generateRefreshToken()
    │              │                     └──> Save to biometric_devices table
    │              │
    │              └──> authStorage.setDeviceToken(deviceToken)
    │              └──> authStorage.setBiometricEnabled(true)
    │
    └──> ✅ Biometric Enabled
```

### Login Flow

```
App Opens
    │
    ├──> AuthContext.initializeAuth()
    │       │
    │       ├──> authStorage.getIsBiometricEnabled() → true
    │       ├──> biometricService.isBiometricConfigured() → true
    │       │
    │       └──> loginWithBiometric() [AuthContext]
    │              │
    │              ├──> biometricService.authenticate()
    │              │       │
    │              │       └──> LocalAuthentication.authenticateAsync()
    │              │              │
    │              │              └──> Native OS Prompt (Face ID/Fingerprint)
    │              │                     │
    │              │                     └──> ✅ Success
    │              │
    │              ├──> authStorage.getDeviceId()
    │              ├──> authStorage.getDeviceToken()
    │              │
    │              ├──> authApi.loginWithBiometric(deviceId, deviceToken)
    │              │       │
    │              │       └──> POST /auth/biometric/login
    │              │              │
    │              │              └──> BiometricService.authenticateWithDevice()
    │              │                     │
    │              │                     ├──> Validate deviceToken (JWT)
    │              │                     ├──> Check device not revoked
    │              │                     ├──> AuthService.generateAccessToken()
    │              │                     ├──> Update last_used_at
    │              │                     └──> Return access token + user
    │              │
    │              └──> authStorage.setTokens(accessToken, refreshToken)
    │              └──> setUser(user)
    │              └──> router.replace('/(tabs)')
    │
    └──> ✅ User Logged In
```

---

## 🗄️ Database Schema

### New Table: `biometric_devices`

```sql
CREATE TABLE biometric_devices (
    id                  UUID PRIMARY KEY,
    user_id             UUID NOT NULL → FOREIGN KEY users(id),
    device_id           VARCHAR(255) UNIQUE,
    device_name         VARCHAR(255),
    device_type         VARCHAR(50),        -- 'ios', 'android', 'web'
    biometric_type      VARCHAR(50),        -- 'face_id', 'fingerprint'
    refresh_token_id    UUID,
    last_used_at        TIMESTAMP,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    is_active           BOOLEAN DEFAULT true,
    is_revoked          BOOLEAN DEFAULT false,
    revoked_at          TIMESTAMP,
    revoked_reason      TEXT,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_biometric_devices_user_id ON biometric_devices(user_id);
CREATE INDEX idx_biometric_devices_device_id ON biometric_devices(device_id);
CREATE INDEX idx_biometric_devices_active ON biometric_devices(is_active);
```

### Existing Table: `users`

```sql
-- New optional column (not required, preference stored client-side)
ALTER TABLE users ADD COLUMN biometric_enabled BOOLEAN DEFAULT false;
```

---

## 🔌 API Endpoints

### 1. Register Device
```
POST /auth/biometric/register
Headers: Authorization: Bearer {access_token}
Body: {
  deviceId: string,
  deviceName: string,
  deviceType: 'ios' | 'android' | 'web',
  biometricType?: string
}
Response: {
  status: "Success",
  data: {
    deviceToken: string,     ← Store in SecureStore
    device: { ... }
  }
}
```

### 2. Login with Biometric
```
POST /auth/biometric/login
Public endpoint
Body: {
  deviceId: string,
  deviceToken: string
}
Response: {
  status: "Success",
  data: {
    user: { ... },
    payload: {
      token: string,          ← Access token
      refresh_token: string
    }
  }
}
```

### 3. List Devices
```
GET /auth/biometric/devices
Headers: Authorization: Bearer {access_token}
Response: {
  status: "Success",
  data: {
    devices: [
      {
        id, deviceId, deviceName, deviceType,
        biometricType, lastUsedAt, createdAt, isActive
      }
    ]
  }
}
```

### 4. Revoke Device
```
POST /auth/biometric/revoke
Headers: Authorization: Bearer {access_token}
Body: {
  deviceId: string,
  reason?: string
}
Response: {
  status: "Success",
  message: "Device revoked"
}
```

---

## 🎨 UI Components

### BiometricSettings.tsx
**Location**: `src/components/settings/BiometricSettings.tsx`

**Usage**:
```tsx
import BiometricSettings from '@/components/settings/BiometricSettings';

function ProfileScreen() {
  return (
    <ScrollView>
      <Text>Security Settings</Text>
      <BiometricSettings />
    </ScrollView>
  );
}
```

**Features**:
- Shows biometric availability
- Toggle to enable/disable
- Visual feedback (icons change)
- Loading states
- Error handling

---

### BiometricSetupPrompt.tsx
**Location**: `src/components/modals/BiometricSetupPrompt.tsx`

**Usage**:
```tsx
import BiometricSetupPrompt from '@/components/modals/BiometricSetupPrompt';

function LoginScreen() {
  const [showPrompt, setShowPrompt] = useState(false);

  // After successful login
  const handleLoginSuccess = async () => {
    const isAvailable = await biometricService.isBiometricAvailable();
    const isConfigured = await biometricService.isBiometricConfigured();
    
    if (isAvailable && !isConfigured) {
      setShowPrompt(true);
    }
  };

  return (
    <>
      {/* Login form */}
      <BiometricSetupPrompt
        visible={showPrompt}
        onDismiss={() => setShowPrompt(false)}
      />
    </>
  );
}
```

**Features**:
- Beautiful modal design
- "Enable" vs "Maybe Later" options
- Animated appearance
- Haptic feedback
- Auto-dismiss on success

---

## 🔧 Configuration

### Backend Configuration

**Environment Variables** (if needed):
```env
# No new env vars required - uses existing JWT config
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
```

### Frontend Configuration

**No changes needed** - Uses existing API_URL from `.env`:
```env
EXPO_PUBLIC_API_URL=https://backend.coolify.cryptbot.site
```

---

## 📱 Platform Support

| Platform | Biometric Type | Support | Notes |
|----------|----------------|---------|-------|
| **iOS** | Face ID | ✅ Full | Requires iOS 11+ |
| **iOS** | Touch ID | ✅ Full | Requires Touch ID hardware |
| **Android** | Fingerprint | ✅ Full | API 23+ (Android 6.0+) |
| **Android** | Face Unlock | ✅ Full | Device dependent |
| **Android** | Iris | ✅ Full | Samsung devices |
| **Web** | N/A | ❌ Limited | Falls back to localStorage |

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend_layer
psql -U postgres -d your_db -f migrations/20260203_add_biometric_devices.sql
npm run start:dev
```

### 2. Frontend Setup
```bash
cd FRONTEND
npx expo start --clear
```

### 3. Test Flow
1. Login with email/password
2. Go to Settings (add BiometricSettings component)
3. Enable Face ID / Fingerprint
4. Close app
5. Reopen app → Biometric prompt appears
6. Authenticate → Auto-login! ✨

---

## 📚 Documentation Files

1. **BIOMETRIC_AUTHENTICATION_GUIDE.md** - Complete technical guide
2. **BIOMETRIC_CHECKLIST.md** - Step-by-step implementation
3. **BIOMETRIC_IMPLEMENTATION_SUMMARY.md** - High-level overview
4. **BIOMETRIC_FILE_STRUCTURE.md** - This file

---

**Last Updated**: February 3, 2026  
**Status**: Complete ✅
