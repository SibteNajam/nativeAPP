# 🧪 OTP Verification - Quick Test Guide

## ⚡ **Quick Start**

Your OTP system is **READY TO TEST!** 🎉

---

## 🚀 **1. Start Your App**

### **Backend** (Already Running ✅)
Your backend is running on `http://localhost:3000`

### **Frontend**
```bash
cd FRONTEND
npm start
```
Press `a` for Android or `i` for iOS

---

## 📝 **2. Test Signup Flow**

### **Step 1: Open Signup Screen**
1. Launch the app
2. Click "Sign Up" or "Create Account"

### **Step 2: Fill Registration Form**
```
First Name:      TestUser
Email:           your-real-email@gmail.com  ← USE YOUR REAL EMAIL!
Password:        Test1234!
Confirm:         Test1234!
```
Click **"Create Account"**

### **Step 3: Success Alert**
You'll see:
```
✅ Check Your Email! 📧
"We've sent a verification code to your email. Please verify to continue."

[Verify Now]
```
Click **"Verify Now"**

### **Step 4: OTP Screen Opens**
You'll see:
- Your email displayed
- Timer counting down (10:00)
- 6 empty boxes for OTP
- "Resend OTP" button

### **Step 5: Check Your Email**
1. Open your email inbox
2. Look for email from **"ByteBoom"**
3. Subject: "Your Verification Code - ByteBoom"
4. Copy the **6-digit code** (e.g., `543210`)

### **Step 6: Enter OTP**
1. Type the 6 digits in the boxes
2. Code auto-submits when complete
3. If correct: ✅ "Success! Your email has been verified"
4. If wrong: ❌ Shows error + shake animation

### **Step 7: Login**
1. Click "Login" from success alert
2. Enter your email + password
3. Should login successfully! 🎉

---

## 🎯 **What to Test**

### **✅ Happy Path (Everything Works)**
- [ ] Signup creates user
- [ ] Email arrives within 30 seconds
- [ ] OTP code works
- [ ] Verification succeeds
- [ ] Can login after verification

### **❌ Error Cases**
- [ ] **Wrong OTP**: Enter `999999` → Should show "Invalid OTP. X attempts remaining"
- [ ] **5 Wrong Attempts**: Try wrong code 5 times → Should block further attempts
- [ ] **Expired OTP**: Wait 10 minutes → Should say "OTP has expired"
- [ ] **Resend OTP**: Click "Resend OTP" → Should get new email
- [ ] **Already Verified**: Verify again → Should say "Already verified"

---

## 📧 **Email Not Arriving?**

### **Check Spam Folder**
Look in your spam/junk folder for "ByteBoom"

### **Check Backend Logs**
Look for these lines in your backend terminal:
```
✅ OTP sent to your@email.com
```

If you see errors like:
```
⚠️ Failed to send OTP email
```
Then check your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sibtenajam123@gmail.com
SMTP_PASS=pskqpnkshehybjaz
```

### **Test Gmail SMTP**
Run this in backend terminal:
```bash
cd backend_layer
node -e "const nodemailer = require('nodemailer'); const t = nodemailer.createTransport({host:'smtp.gmail.com',port:587,auth:{user:'sibtenajam123@gmail.com',pass:'pskqpnkshehybjaz'}});t.verify((e)=>console.log(e?'❌ SMTP Error:'+e:'✅ SMTP Working!'));"
```

---

## 🐛 **Common Issues**

### **Issue 1: "Invalid OTP" (But code is correct)**
**Solution**: Check database for OTP:
```sql
SELECT email, otp_code, otp_expires_at, is_verified 
FROM users 
WHERE email = 'your@email.com';
```

### **Issue 2: OTP Screen Doesn't Open**
**Solution**: Check console logs in terminal. The route is `/(auth)/otp-verification`

### **Issue 3: Timer Shows 00:00**
**Solution**: Refresh the screen or request a new OTP

### **Issue 4: "User already exists"**
**Solution**: Use a different email or delete the test user:
```sql
DELETE FROM users WHERE email = 'test@test.com';
```

---

## 🎨 **UI Features to Test**

1. **Auto-Focus**: Type first digit → cursor should jump to next box
2. **Backspace**: Press backspace → cursor should go back
3. **Shake Animation**: Wrong OTP → boxes should shake
4. **Timer Color**: When < 1 minute → timer turns red
5. **Resend Cooldown**: After resend → button shows "Resend (60s)"
6. **Loading States**: During verification → shows spinner

---

## 📊 **Expected Results**

### **Successful Signup**
```
✅ User created in database (is_verified: false)
✅ OTP saved to database (otp_code, otp_expires_at)
✅ Email sent successfully
✅ OTP screen opens with timer
✅ Verification succeeds
✅ is_verified updated to true
✅ Login works
```

### **Database Changes**
Before verification:
```sql
is_verified: false
otp_code: "543210"
otp_expires_at: 2026-01-21 13:10:00
otp_attempts: 0
```

After verification:
```sql
is_verified: true
otp_code: NULL
otp_expires_at: NULL
otp_attempts: 0
```

---

## 🎯 **Quick Checklist**

- [ ] Backend running on port 3000
- [ ] Frontend running on emulator/simulator
- [ ] Can access signup screen
- [ ] Can fill registration form
- [ ] Success alert shows after signup
- [ ] OTP screen opens with correct email
- [ ] Email arrives in inbox
- [ ] OTP code is 6 digits
- [ ] Can enter OTP in boxes
- [ ] Verification succeeds with correct OTP
- [ ] Shows error with wrong OTP
- [ ] Can resend OTP
- [ ] Can login after verification

---

## 📞 **Need Help?**

If something doesn't work:

1. **Check Backend Logs** → Look for errors in terminal
2. **Check Frontend Console** → Open React DevTools
3. **Check Network Tab** → See API requests/responses
4. **Check Database** → Verify OTP values

---

## ✨ **Success Criteria**

**Your OTP system works if:**
- ✅ Email arrives < 30 seconds
- ✅ OTP code validates correctly
- ✅ Timer counts down properly
- ✅ Resend button works
- ✅ Can login after verification

---

**Ready to test? Just follow the steps above!** 🚀

**Estimated Test Time:** 5 minutes

---

**Created:** January 21, 2026  
**Backend:** ✅ Running  
**Frontend:** 🆕 Ready  
**Status:** READY TO TEST
