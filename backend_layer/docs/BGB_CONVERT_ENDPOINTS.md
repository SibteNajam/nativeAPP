# BGB Convert Endpoints Documentation

## Overview
Two new endpoints have been added to the Bitget Account Controller for BGB conversion functionality.

## Endpoints

### 1. Get BGB Convert Coins
**Endpoint:** `GET /bitget/account/bgb-convert-coin-list`

**Description:** Get a list of Convert Bgb Currencies

**Frequency Limit:** 10 times/1s (User ID)

**Request Headers (Optional):**
- `x-api-key`: Bitget API Key (falls back to environment variable)
- `x-secret-key`: Bitget Secret Key (falls back to environment variable)
- `x-passphrase`: Bitget Passphrase (falls back to environment variable)

**Request Parameters:** None

**Example Request:**
```bash
curl "http://localhost:3000/bitget/account/bgb-convert-coin-list" \
   -H "x-api-key: YOUR_API_KEY" \
   -H "x-secret-key: YOUR_SECRET_KEY" \
   -H "x-passphrase: YOUR_PASSPHRASE"
```

**Response Example:**
```json
{
    "code": "00000",
    "msg": "success",
    "requestTime": 1703831563264,
    "data": {
        "coinList": [
            {
                "coin": "SEAM",
                "available": "0.00303329",
                "bgbEstAmount": "0.03794680",
                "precision": "8",
                "feeDetail": [
                    {
                        "feeRate": "0.02",
                        "fee": "0.00075893"
                    }
                ],
                "cTime": "1703831563514"
            }
        ]
    }
}
```

**Response Parameters:**
- `coin` (String): Token name
- `available` (String): Currency accounts available
- `bgbEstAmount` (String): Expected number of BGB redeemable
- `precision` (String): BGB scale
- `feeDetail` (Array): Fee details
  - `feeRate` (String): Fee rate
  - `fee` (String): Fee amount
- `cTime` (String): Current time (timestamp in milliseconds)

---

### 2. Convert BGB
**Endpoint:** `POST /bitget/account/bgb-convert`

**Description:** Convert specified coins to BGB

**Frequency Limit:** 10 times/1s (User ID)

**Request Headers (Optional):**
- `x-api-key`: Bitget API Key (falls back to environment variable)
- `x-secret-key`: Bitget Secret Key (falls back to environment variable)
- `x-passphrase`: Bitget Passphrase (falls back to environment variable)

**Request Body:**
```json
{
    "coinList": ["EOS", "GROK"]
}
```

**Request Parameters:**
- `coinList` (Array of Strings, Required): List of coins to convert to BGB

**Example Request:**
```bash
curl -X POST "http://localhost:3000/bitget/account/bgb-convert" \
   -H "x-api-key: YOUR_API_KEY" \
   -H "x-secret-key: YOUR_SECRET_KEY" \
   -H "x-passphrase: YOUR_PASSPHRASE" \
   -H "Content-Type: application/json" \
   -d '{"coinList": ["EOS", "GROK"]}'
```

**Response Example:**
```json
{
    "code": "00000",
    "data": {
        "orderList": [
            {
                "coin": "EOS",
                "orderId": "1233431213"
            },
            {
                "coin": "GROK",
                "orderId": "1233431213"
            }
        ]
    },
    "msg": "success",
    "requestTime": 1627293612502
}
```

**Response Parameters:**
- `orderList` (Array): List of conversion orders
  - `coin` (String): Coin swapped
  - `orderId` (String): Swap order ID

---

## Implementation Details

### Service Layer (`account.service.ts`)
Two new methods were added:

1. **`getBgbConvertCoinList(apiKey?, apiSecret?, passphrase?)`**
   - Makes a GET request to `/api/v2/convert/bgb-convert-coin-list`
   - Returns list of convertible coins with BGB estimates

2. **`convertBgb(coinList: string[], apiKey?, apiSecret?, passphrase?)`**
   - Makes a POST request to `/api/v2/convert/bgb-convert`
   - Accepts array of coin symbols to convert
   - Returns order list with conversion details

### Controller Layer (`account.controller.ts`)
Two new endpoints were added:

1. **`GET /bgb-convert-coin-list`**
   - Public endpoint (uses `@Public()` decorator)
   - Accepts optional API credentials via headers
   - Falls back to environment variables if headers not provided

2. **`POST /bgb-convert`**
   - Public endpoint (uses `@Public()` decorator)
   - Validates that `coinList` is a non-empty array
   - Accepts optional API credentials via headers
   - Falls back to environment variables if headers not provided

### Authentication
Both endpoints support two authentication methods:
1. **Headers**: Pass credentials via `x-api-key`, `x-secret-key`, and `x-passphrase` headers
2. **Environment Variables**: Falls back to `BITGET_API_KEY`, `BITGET_SECRET_KEY`, and `BITGET_PASSPHRASE`

### Error Handling
- Returns `400 Bad Request` if `coinList` is missing or not an array
- Returns `500 Internal Server Error` if API credentials are not configured
- Inherits retry logic and error handling from the base `makeAuthRequest` method

---

## Testing

You can test these endpoints using the Swagger UI at:
`http://localhost:3000/api` (or your configured port)

Look for the "Bitget Account" section and find:
- "Get BGB Convert Coins - Get a list of Convert Bgb Currencies"
- "Convert BGB - Convert specified coins to BGB"

---

## Notes
- Both endpoints are marked as `@Public()` to allow access without JWT authentication
- The endpoints use the same authentication mechanism as other Bitget account endpoints
- Rate limits are enforced by Bitget API (10 requests per second per User ID)
- Make sure your Bitget API credentials have the necessary permissions for convert operations
