# 📱 How to Track API Requests from APK on Real Devices

## 🎯 The Problem
When your friend downloads the APK and uses it, how do you see what API requests are being made?

---

## ✅ Solution 1: Backend Server Logs (EASIEST & BEST)

Since you control the backend at `146.59.93.94`, you can see ALL requests from ALL users!

### **Step 1: SSH to Your Server**
```bash
ssh user@146.59.93.94
```

### **Step 2: View Backend Logs**

If using **PM2**:
```bash
pm2 logs backend
```

If using **Docker**:
```bash
docker logs -f backend_container_name
```

If using **direct Node.js**:
```bash
# View NestJS logs
tail -f /path/to/backend/logs/app.log

# Or see console output
journalctl -u backend -f
```

### **What You'll See:**
```
[2026-01-22 10:30:15] POST /auth/register - 201 - 45ms
Body: { email: "friend@example.com", firstName: "John" }

[2026-01-22 10:30:20] POST /auth/login - 200 - 30ms
Body: { email: "friend@example.com" }

[2026-01-22 10:30:25] GET /user/profile - 200 - 15ms
```

✅ **This works for EVERYONE using the APK** - your friend, you, anyone!

---

## ✅ Solution 2: Enhanced Backend Logging (RECOMMENDED)

I created a client logs endpoint for you. Install it:

### **Step 1: Add the Logs Controller to Backend**

File already created: `backend_layer/src/logs/logs.controller.ts`

### **Step 2: Create Logs Module**

Create: `backend_layer/src/logs/logs.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';

@Module({
  controllers: [LogsController],
})
export class LogsModule {}
```

### **Step 3: Add to app.module.ts**
```typescript
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    // ... other imports
    LogsModule,  // ← Add this
  ],
})
export class AppModule {}
```

### **Step 4: View Client Logs**
```bash
# SSH to server
ssh user@146.59.93.94

# Watch real-time logs from mobile apps
tail -f /path/to/backend/logs/client-logs.log
```

### **What You'll See:**
```
[2026-01-22T10:30:15.000Z] [INFO] [POST] /auth/register - 201 {"response": {"success": true, "user": {...}}}
[2026-01-22T10:30:20.000Z] [INFO] [POST] /auth/login - 200 {"response": {"success": true, "token": "..."}}
[2026-01-22T10:30:25.000Z] [ERROR] [POST] /auth/register - 400 {"response": {"error": "Email already exists"}}
```

✅ **This captures logs from the mobile app itself** and sends them to your server!

---

## ✅ Solution 3: Your Phone (USB Connected)

If testing on YOUR own phone:

### **Step 1: Connect Phone via USB**
- Enable USB debugging on Android
- Connect to computer

### **Step 2: Check ADB Connection**
```powershell
adb devices
```

Should show:
```
List of devices attached
ABC123DEF456    device
```

### **Step 3: View Live Logs**
```powershell
adb logcat | findstr "ReactNativeJS"
```

### **What You'll See:**
```
01-22 10:30:15.123  1234  1234 I ReactNativeJS: 📤 [POST] http://146.59.93.94:3000/auth/register
01-22 10:30:15.456  1234  1234 I ReactNativeJS:    Body: { "email": "...", "password": "***" }
01-22 10:30:15.789  1234  1234 I ReactNativeJS: 📥 [201] Success
```

❌ **Limitation:** Only works when YOUR phone is physically connected to YOUR computer.

---

## ✅ Solution 4: Third-Party Services (Production Scale)

For serious production monitoring:

### **Option A: Sentry**
```bash
npm install @sentry/react-native
```
- Tracks errors automatically
- Shows user sessions
- Free tier available
- https://sentry.io

### **Option B: LogRocket**
```bash
npm install logrocket logrocket-react-native
```
- Records user sessions (like video replay)
- Shows network requests
- Paid service
- https://logrocket.com

### **Option C: Datadog**
- Enterprise-level monitoring
- Tracks everything
- Expensive
- https://www.datadoghq.com

---

## 📊 Comparison Table

| Method | Works for Friend? | Setup Difficulty | Cost | Real-time? |
|--------|------------------|------------------|------|------------|
| **Backend Logs** | ✅ Yes | Easy | Free | ✅ Yes |
| **Enhanced Logging** | ✅ Yes | Medium | Free | ✅ Yes |
| **ADB Logcat** | ❌ No | Easy | Free | ✅ Yes |
| **Sentry** | ✅ Yes | Medium | Free tier | ✅ Yes |
| **LogRocket** | ✅ Yes | Medium | Paid | ✅ Yes |

---

## 🎯 Recommended Setup

### **For Development:**
Use **ADB Logcat** when testing on your phone:
```powershell
adb logcat | findstr "ReactNativeJS"
```

### **For Production (Friend's Phone):**
Use **Backend Logs** - it's free and works for everyone:
```bash
ssh user@146.59.93.94
pm2 logs backend
# or
tail -f /path/to/backend/logs/app.log
```

### **For Production Monitoring:**
Add the **Enhanced Logging** system I created - sends app logs to your server automatically!

---

## 🚀 Quick Test

### **Test Backend Logging Now:**

1. **SSH to your server:**
   ```bash
   ssh user@146.59.93.94
   ```

2. **Watch logs:**
   ```bash
   pm2 logs backend --lines 100
   ```

3. **Keep terminal open**

4. **Install APK on your phone and try to signup**

5. **You'll see the request in the terminal!**

---

## 💡 Example Scenario

**Your friend downloads the APK:**

1. Friend installs APK on their phone
2. Friend tries to signup with: `friend@email.com`
3. Request goes to `146.59.93.94:3000/auth/register`
4. You see in backend logs:
   ```
   [POST] /auth/register - 201
   Body: { email: "friend@email.com", firstName: "John" }
   Response: { success: true, user: {...} }
   ```

**If signup fails:**
```
[POST] /auth/register - 400
Body: { email: "friend@email.com" }
Response: { error: "Email already exists" }
```

You can see EXACTLY what went wrong!

---

## 🔧 Backend Logging Tips

### **Make NestJS Log More Details:**

In your backend's `main.ts`, add:
```typescript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Body:', req.body);
  next();
});
```

### **Or use NestJS Logger:**

In your controllers:
```typescript
import { Logger } from '@nestjs/common';

export class AuthController {
  private logger = new Logger('AuthController');

  @Post('register')
  async register(@Body() body: any) {
    this.logger.log(`Register attempt: ${body.email}`);
    // ... rest of code
  }
}
```

### **Save Logs to File:**

In `main.ts`:
```typescript
import { createWriteStream } from 'fs';

const logStream = createWriteStream('/path/to/logs/app.log', { flags: 'a' });

app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  logStream.write(log);
  next();
});
```

---

## ✅ You're All Set!

**Most practical approach:**
1. Keep backend logs running: `pm2 logs backend -f`
2. Give APK to your friend
3. Watch backend terminal
4. See all their requests in real-time!

No special setup needed on their phone! 🚀
