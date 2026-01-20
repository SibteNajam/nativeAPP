# 📁 Mobile App Directory Structure Guide

## 🎯 Overview
This document explains the complete directory structure for the **Native Trading Mobile App** project, including both **Frontend** (React Native/Expo) and **Backend** (NestJS) layers.

---

## 🏗️ Project Root Structure

```
mobileapp/
├── FRONTEND/           # React Native mobile app (Expo)
├── backend_layer/      # NestJS API server
└── DIRECTORY_STRUCTURE.md  # This file
```

---

## 📱 FRONTEND Structure (React Native/Expo)

### Root Level
```
FRONTEND/
├── app/                # Expo Router pages (file-based routing)
├── src/                # Source code
├── assets/             # Images, fonts, icons
├── .env                # Environment variables
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

### 📄 `/app/` - Expo Router Pages
File-based routing system. Each file becomes a route.

```
app/
├── (tabs)/             # Bottom tab navigation
│   ├── index.tsx      #  Home/Dashboard screen
│   ├── explore.tsx    #  Explore/Features screen
│   └── connect-exchange.tsx  #  Exchange connections
│
├── (auth)/             # Authentication screens
│   ├── login.tsx
│   ├── register.tsx
│   └── verify-otp.tsx
│
├── onboarding/         # Onboarding flow
│   └── [step].tsx     # Dynamic onboarding steps
│
├── _layout.tsx        # Root layout
└── +not-found.tsx     # 404 screen
```

### 📦 `/src/` - Source Code
Main application logic organized by feature.

```
src/
├── components/         # Reusable UI components
│   ├── auth/          # Auth-related components
│   ├── drawers/       # Side drawers (ExchangeDrawer)
│   ├── trading/       # Trading components (TradingBotCard)
│   └── ui/            # Generic UI components
│
├── contexts/          # React Context providers
│   ├── AuthContext.tsx       # User authentication state
│   ├── ExchangeContext.tsx   # Exchange selection state
│   └── ThemeContext.tsx      # Theme (Light/Dark mode)
│
├── services/          # API and business logic
│   ├── api/           # API service layer
│   │   ├── client.ts           # Axios HTTP client
│   │   ├── auth.api.ts         # Auth API calls
│   │   ├── credentials.api.ts  # Exchange credentials API
│   │   ├── binance.api.ts      # Binance exchange API (NEW)
│   │   └── bitget.api.ts       # Bitget exchange API (NEW)
│   │
│   ├── auth/          # Authentication logic
│   │   └── auth.storage.ts    # Token storage (SecureStore)
│   │
│   └── analytics/     # Analytics services
│
├── hooks/             # Custom React hooks
│   ├── useAuth.ts
│   ├── useTheme.ts
│   └── useExchange.ts
│
├── types/             # TypeScript type definitions
│   ├── auth.types.ts
│   ├── exchange.types.ts
│   └── api.types.ts
│
├── constants/         # App constants
│   ├── config.ts      # API base URLs, endpoints
│   └── theme.ts       # Color palette, spacing, typography
│
├── utils/             # Utility functions
│   ├── formatting.ts  # Number/currency formatting
│   └── validation.ts  # Input validation
│
└── stores/            # State management (if using Zustand/Redux)
```

---

## 🔧 BACKEND Structure (NestJS)

### Root Level
```
backend_layer/
├── src/               # Source code
├── dist/              # Compiled output
├── package.json       # Dependencies
└── tsconfig.json      # TypeScript config
```

### 📦 `/src/` - Backend Source Code
Organized by modules (NestJS architecture).

```
src/
├── main.ts            # Application entry point
│
├── auth/              # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── guards/
│       └── jwt.guard.ts
│
├── user/              # User management
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
│
├── apicredentials/    # Exchange API credentials storage
│   ├── apicredentials.controller.ts
│   ├── apicredentials.service.ts
│   └── apicredentials.module.ts
│
├── binance/           # Binance integration
│   ├── binance.controller.ts      # API endpoints
│   ├── binance.service.ts         # Public market data
│   ├── binance.signed.service.ts  # Private/signed endpoints
│   └── binance.module.ts
│
├── bitget/            # Bitget integration
│   ├── controllers/
│   │   ├── account.controller.ts  # Account endpoints
│   │   ├── orders.controller.ts   # Orders endpoints
│   │   ├── market.controller.ts   # Market data
│   │   └── websocket.controller.ts
│   │
│   ├── services/
│   │   ├── account.service.ts
│   │   ├── orders.service.ts
│   │   └── market.service.ts
│   │
│   └── bitget.module.ts
│
├── guards/            # Global guards
│   └── jwt.guard.ts   # JWT authentication guard
│
└── decorators/        # Custom decorators
    └── isPublic.ts    # Public route decorator
```

---

## 🔌 API Integration Flow

### Backend API Endpoints

#### 🔐 **Authentication** (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user

#### 💼 **Exchange Credentials** (`/credentials`)
- `POST /credentials` - Save exchange API keys
- `GET /credentials` - Get user's exchange credentials
- `PUT /credentials/:id` - Update credentials
- `DELETE /credentials/:id` - Delete credentials

#### 📊 **Binance APIs** (`/binance`)

**Authentication Required: Uses JWT token**

##### Account & Assets
- `GET /binance/account-info` - Account information
- `GET /binance/user-assets` - User assets (balances)
- `GET /binance/account-balances` - Spot account balances
- `GET /binance/account-snapshot` - Historical balances (30 days)
  
##### Orders
- `GET /binance/open-orders?symbol=BTCUSDT` - Open orders (optional symbol filter)
- `GET /binance/open-positions` - Open positions
- `GET /binance/order-history` - Order history
- `GET /binance/my-trades?symbol=BTCUSDT&limit=10` - Trade history
- `POST /binance/place-order` - Place new order
- `DELETE /binance/cancel-order?symbol=&orderId=` - Cancel order

##### Market Data (Public)
- `GET /binance/symbols` - All trading symbols
- `GET /binance/symbol-price?symbol=BTCUSDT` - Current price
- `GET /binance/prices?limit=20` - Top coins by volume
- `GET /binance/klines?symbol=&interval=&limit=` - Candlestick data

#### 📊 **Bitget APIs** (`/bitget`)

**Authentication Required: Uses JWT token**

##### Account & Assets
- `GET /bitget/account/spot/assets` - Spot account assets
- `GET /bitget/account/spot/asset?coin=BTC` - Specific coin balance
- `GET /bitget/account/spot/bills` - Transaction history
- `GET /bitget/account/deposit-history` - Deposit history
- `GET /bitget/account/withdrawal-history` - Withdrawal history

##### Orders
- `GET /bitget/order/unfilled-spot-orders?symbol=BTCUSDT` - Open orders
- `GET /bitget/order/all-open-orders?symbol=BTCUSDT` - All open orders (includes plan orders)
- `GET /bitget/order/trade-fills?symbol=BTCUSDT&limit=100` - Filled orders
- `GET /bitget/order/plan-orders?symbol=` - Plan/conditional orders
- `POST /bitget/order/spot` - Place spot order
- `POST /bitget/order/cancel-spot-order` - Cancel order

---

## 🎨 Frontend Integration Architecture

### 1. **API Client Layer** (`src/services/api/`)

All API calls use centralized HTTP client with:
- JWT token injection
- Auto retry on 401 (refresh token flow)
- Error handling
- Request/Response interceptors

### 2. **Context Layer** (`src/contexts/`)

Global state management:
- **AuthContext**: User session, login/logout
- **ExchangeContext**: Selected exchange, connected exchanges
- **ThemeContext**: Light/Dark mode

### 3. **Component Layer** (`src/components/`)

Reusable UI components that consume contexts and API services.

### 4. **Screen Layer** (`app/`)

Page-level components using Expo Router for navigation.

---

## 🔑 Key Integration Points

### JWT Token Flow
```typescript
// 1. User logs in
const response = await authApi.login({ email, password });

// 2. Token stored securely
await authStorage.setTokens(accessToken, refreshToken);

// 3. All API calls include token in header
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 4. Backend verifies token via JWTGuard
@UseGuards(JWTGuard)
@Get('binance/account-balances')
async getAccountBalances(@Req() req) {
  const userId = req.user?.id; // Extracted from JWT
  // Fetch user's exchange credentials from DB
  const credentials = await apiCredentialsService.getUserCredential(userId, 'binance');
  // Call Binance API with user's API keys
  return binanceService.getBalances(credentials.apiKey, credentials.secretKey);
}
```

### Exchange Integration Flow
```
1. User connects exchange via connect-exchange.tsx
   ↓
2. Frontend calls POST /credentials with API keys
   ↓
3. Backend stores encrypted credentials in DB
   ↓
4. User selects exchange from ExchangeDrawer
   ↓
5. ExchangeContext updates selectedExchange
   ↓
6. Dashboard calls exchange APIs with JWT
   ↓
7. Backend fetches user's credentials from DB
   ↓
8. Backend calls exchange API (Binance/Bitget)
   ↓
9. Response returned to frontend
   ↓
10. UI displays live data
```

---

## 📱 Main Pages Integration

### 🏠 **Dashboard** (`app/(tabs)/index.tsx`)
**Current State**: Dummy data (0 balance, 0 trades, 0% PnL)

**To Integrate**:
1. **Balance Section** - Call Binance/Bitget assets API
2. **Open Trades** - Call open orders API
3. **Today's PnL** - Calculate from trade fills
4. **Bot Status** - Real-time bot status

### 🔗 **Exchange Connection** (`app/(tabs)/connect-exchange.tsx`)
- Add/Edit exchange credentials
- Test connection
- Enable/Disable exchanges

### 📈 **Explore** (`app/(tabs)/explore.tsx`)
- Portfolio tracking
- Trade history
- Settings

---

## 🚀 Next Steps for API Integration

### Phase 1: Assets & Open Orders (Current Focus)
1. ✅ Create `binance.api.ts` service
2. ✅ Create `bitget.api.ts` service
3. Create Dashboard components:
   - `AssetsCard.tsx` - Display wallet balances
   - `OpenOrdersCard.tsx` - Display active orders
4. Replace dummy data in `index.tsx` with real API calls

### Phase 2: Trade History
1. Create `TradesCard.tsx` component
2. Integrate trade fills API
3. Add PnL calculation logic

### Phase 3: Real-time Updates
1. WebSocket integration for live prices
2. Auto-refresh balances
3. Order status updates

---

## 📦 Environment Variables

### Frontend (`.env`)
```bash
API_BASE_URL=http://your-backend-url:3000/api
```

### Backend (`.env`)
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
ACCESS_TOKEN_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=14d
```

---

## 🎯 Key Files to Modify

To integrate APIs into the dashboard:

1. **Create API Services**:
   - `FRONTEND/src/services/api/binance.api.ts`
   - `FRONTEND/src/services/api/bitget.api.ts`

2. **Create Types**:
   - `FRONTEND/src/types/exchange.types.ts` (add balance, order types)

3. **Update Dashboard**:
   - `FRONTEND/app/(tabs)/index.tsx` (replace dummy data)

4. **Create Components**:
   - `FRONTEND/src/components/trading/AssetsCard.tsx`
   - `FRONTEND/src/components/trading/OpenOrdersCard.tsx`
   - `FRONTEND/src/components/trading/TradesCard.tsx`

---

## 🏁 Summary

This directory structure follows **best practices** for:
- ✅ **Separation of concerns** (API layer, Context, Components, Screens)
- ✅ **Type safety** with TypeScript
- ✅ **Scalability** (easy to add more exchanges)
- ✅ **Maintainability** (clear folder structure)
- ✅ **Security** (JWT tokens, encrypted credentials)

Now you have a **complete map** of where everything lives and how to integrate your backend APIs! 🚀
