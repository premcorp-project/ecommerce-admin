# Environment Variables Guide

This document explains all environment variables used in the ChemTech ecommerce frontend and how to configure them for different environments.

---

## Overview

Environment variables are stored in `.env.local` (development) and configured in deployment platforms for production. The `NEXT_PUBLIC_` prefix indicates variables that are exposed to the browser (client-side accessible).

---

## Required Variables

### 1. NEXT_PUBLIC_API_URL

**Type:** `string`  
**Required:** Yes  
**Exposed to Browser:** Yes (`NEXT_PUBLIC_` prefix)

**Purpose:** Base URL for all API requests to the backend server.

**Values by Environment:**

| Environment       | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| Local Development | `http://localhost:3001/api/v1`                                      |
| Production        | `https://chemibuild-ecommerce-api-production.up.railway.app/api/v1` |
| Staging           | `https://staging-api.chemibuild.com/api/v1`                         |

**Fallback:** If not set, defaults to `http://localhost:5000/api/v1`

**Usage Locations:**

| File                                          | Purpose                          |
| --------------------------------------------- | -------------------------------- |
| `lib/api/admin-api.ts`                        | Admin dashboard API requests     |
| `lib/api/public-api.ts`                       | Customer storefront API requests |
| `lib/stores/admin-auth-store.ts`              | Permission fetching from API     |
| `hooks/use-admin-sse.ts`                      | Real-time notifications stream   |
| `app/(auth)/login/page.tsx`                   | Google OAuth redirect            |
| `app/(public)/products/[slug]/page.tsx`       | Server-side product fetching     |
| `app/(public)/contact/ContactPageContent.tsx` | Contact form submission          |
| Legal pages (about, privacy, terms, returns)  | Fetching legal content           |

**Example Configuration:**

```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Production
NEXT_PUBLIC_API_URL=https://chemibuild-ecommerce-api-production.up.railway.app/api/v1
```

**How It Works:**

```typescript
// In lib/api/admin-api.ts
const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const adminApi = axios.create({
  baseURL,
  withCredentials: true,
});

// API calls automatically use this base URL
// GET /products → http://localhost:3001/api/v1/products
```

---

### 2. NEXT_PUBLIC_AUTH_SECRET_KEY

**Type:** `string` (32+ characters)  
**Required:** Yes  
**Exposed to Browser:** Yes (`NEXT_PUBLIC_` prefix)

**Purpose:** AES encryption key for securing authentication tokens and user data stored in the browser.

**Value:** `A3xIeWRt1nRYDGv7A0aSMHZQWlQ2rnBW`

**Security Notes:**

- Used for client-side encryption only — not a backend secret
- Must be 32+ characters for strong AES encryption
- Changing this key will log out all users (old encrypted data becomes unreadable)
- If compromised, rotate immediately and all users will be logged out automatically
- Keep the same across all environments for consistent encryption/decryption

**Usage Locations:**

| File                                | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `lib/user.ts`                       | Encrypts/decrypts admin user data and role permissions |
| `lib/stores/customer-auth-store.ts` | Encrypts/decrypts customer JWT tokens                  |

**How It Works:**

```typescript
// Storing encrypted user data
const encryptedUser = CryptoJS.AES.encrypt(
  JSON.stringify(user),
  SECRET_KEY, // ← NEXT_PUBLIC_AUTH_SECRET_KEY
).toString();
localStorage.setItem('user', encryptedUser);

// Retrieving and decrypting
const encryptedUser = localStorage.getItem('user');
const bytes = CryptoJS.AES.decrypt(encryptedUser, SECRET_KEY);
const decrypted = bytes.toString(CryptoJS.enc.Utf8);
const user = JSON.parse(decrypted);
```

**When to Change:**

- Suspected key compromise
- Routine security rotation (every 90 days recommended)
- After a security audit

**Impact of Change:**

- All users logged out (expected behavior)
- No app crash — graceful redirect to login
- Users can log back in immediately with new encryption

---

### 3. NEXT_PUBLIC_BASE_PATH

**Type:** `string`  
**Required:** No (defaults to `/`)  
**Exposed to Browser:** Yes (`NEXT_PUBLIC_` prefix)

**Purpose:** Prefix for all static assets and routes when the app is deployed to a subdirectory.

**Values by Environment:**

| Environment  | Value         | Use Case                        |
| ------------ | ------------- | ------------------------------- |
| Root Domain  | `/`           | App at `chemibuild.com`         |
| Subdirectory | `/app`        | App at `chemibuild.com/app`     |
| Subpath      | `/storefront` | App at `example.com/storefront` |

**Default Value:** `/`

**Usage Location:** `lib/helpers.ts` → `toAbsoluteUrl()` function

**How It Works:**

```typescript
// In lib/helpers.ts
export function toAbsoluteUrl(pathname: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH;

  if (baseUrl && baseUrl !== '/') {
    return process.env.NEXT_PUBLIC_BASE_PATH + pathname;
  } else {
    return pathname;
  }
}

// Usage Examples:
// If NEXT_PUBLIC_BASE_PATH = '/'
toAbsoluteUrl('/logo.png') → '/logo.png'
toAbsoluteUrl('/images/hero.jpg') → '/images/hero.jpg'

// If NEXT_PUBLIC_BASE_PATH = '/app'
toAbsoluteUrl('/logo.png') → '/app/logo.png'
toAbsoluteUrl('/images/hero.jpg') → '/app/images/hero.jpg'
```

**When to Change:**

- Default (`/`) — app deployed at domain root
- Subdirectory (`/app`) — app deployed at subdomain path
- Subpath (`/storefront`) — app deployed at custom path

**Current Usage:** Rarely used since the app is deployed at root (`/`)

---

### 4. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

**Type:** `string`  
**Required:** Yes (for payment features)  
**Exposed to Browser:** Yes (`NEXT_PUBLIC_` prefix)

**Purpose:** Stripe public key for client-side payment processing.

**Value:** `pk_test_51TXGmkAxtbThfNdgCniv9ErJ2UDocDRaXT1aafMqQd2kw41lIbmGNP9QQXEfuvdQymeiPFZwIRxAKGJcQPB5HNFT004XPiMEAm`

**Security Notes:**

- This is a public key — safe to expose in browser
- Never expose the secret key (`sk_test_...`) in frontend code
- Use test keys for development, live keys for production

**Usage Locations:**

- Stripe payment form initialization
- Payment element setup

**Example Configuration:**

```env
# Development (Test Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51TXGmkAxtbThfNdgCniv9ErJ2UDocDRaXT1aafMqQd2kw41lIbmGNP9QQXEfuvdQymeiPFZwIRxAKGJcQPB5HNFT004XPiMEAm

# Production (Live Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
```

---

### 5. NEXT_PUBLIC_ORS_API_KEY

**Type:** `string`  
**Required:** No (optional for location services)  
**Exposed to Browser:** Yes (`NEXT_PUBLIC_` prefix)

**Purpose:** OpenRouteService API key for geocoding and location-based services.

**Value:** `eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjExZjkyNGQxZjE4YTQzMjY4OWRmMzJjZDI3MTUwZmJjIiwiaCI6Im11cm11cjY0In0=`

**Rate Limit:** 2,000 requests/day (free tier)

**Usage:** Location services, address geocoding, delivery fee calculation

**Get Your Key:**

1. Sign up at [openrouteservice.org](https://openrouteservice.org/dev/#/signup)
2. Create an API key
3. Add to `.env.local`

**Example Configuration:**

```env
NEXT_PUBLIC_ORS_API_KEY=your_api_key_here
```

---

## Environment-Specific Configuration

### Development (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_BASE_PATH=/

# Authentication
NEXT_PUBLIC_AUTH_SECRET_KEY=A3xIeWRt1nRYDGv7A0aSMHZQWlQ2rnBW

# Payment (Test Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51TXGmkAxtbThfNdgCniv9ErJ2UDocDRaXT1aafMqQd2kw41lIbmGNP9QQXEfuvdQymeiPFZwIRxAKGJcQPB5HNFT004XPiMEAm

# Location Services
NEXT_PUBLIC_ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjExZjkyNGQxZjE4YTQzMjY4OWRmMzJjZDI3MTUwZmJjIiwiaCI6Im11cm11cjY0In0=
```

### Production (Railway/Deployment Platform)

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://chemibuild-ecommerce-api-production.up.railway.app/api/v1
NEXT_PUBLIC_BASE_PATH=/

# Authentication (Same key as development for consistency)
NEXT_PUBLIC_AUTH_SECRET_KEY=A3xIeWRt1nRYDGv7A0aSMHZQWlQ2rnBW

# Payment (Live Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here

# Location Services
NEXT_PUBLIC_ORS_API_KEY=your_production_api_key
```

---

## How Variables Are Used Together

### API Request Flow

```
Browser Request
    ↓
axios.create({ baseURL: NEXT_PUBLIC_API_URL })
    ↓
GET http://localhost:3001/api/v1/products
    ↓
Backend Response
```

### Asset/Route Flow

```
<img src={toAbsoluteUrl('/images/logo.png')} />
    ↓
Check NEXT_PUBLIC_BASE_PATH
    ↓
If '/' → /images/logo.png
If '/app' → /app/images/logo.png
    ↓
Browser loads asset
```

### Authentication Flow

```
User logs in
    ↓
API call to NEXT_PUBLIC_API_URL/auth/login
    ↓
Receive JWT token
    ↓
Encrypt with NEXT_PUBLIC_AUTH_SECRET_KEY
    ↓
Store in localStorage/sessionStorage
    ↓
Decrypt on app load using same key
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Update `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Verify API URL is accessible from production domain
- [ ] Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to live keys
- [ ] Keep `NEXT_PUBLIC_BASE_PATH` as `/` (unless deploying to subdirectory)
- [ ] Keep `NEXT_PUBLIC_AUTH_SECRET_KEY` consistent across environments
- [ ] Test API calls work from production environment
- [ ] Check CORS headers allow production frontend domain
- [ ] Verify all environment variables are set in deployment platform
- [ ] Test payment processing with live Stripe keys
- [ ] Test location services with production API key

---

## Troubleshooting

### API Calls Failing

**Problem:** API requests return 404 or connection errors

**Solution:**

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check backend server is running
3. Verify CORS headers on backend allow frontend domain
4. Check network tab in browser DevTools for actual URL being called

### Users Getting Logged Out After Deployment

**Problem:** All users logged out after deploying new version

**Possible Causes:**

1. `NEXT_PUBLIC_AUTH_SECRET_KEY` changed
2. Old encrypted tokens can't be decrypted with new key
3. This is expected behavior for security

**Solution:**

- This is normal — users will log back in automatically
- If unintended, revert the key change

### Assets Not Loading

**Problem:** Images and static files return 404

**Solution:**

1. Verify `NEXT_PUBLIC_BASE_PATH` is correct
2. Check if app is deployed to subdirectory
3. Update `NEXT_PUBLIC_BASE_PATH` if needed

### Payment Not Working

**Problem:** Stripe payment form not initializing

**Solution:**

1. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
2. Check if using test keys in development
3. Check if using live keys in production
4. Verify Stripe account is active

---

## Security Best Practices

1. **Never commit `.env.local`** — it's in `.gitignore`
2. **Use different keys for each environment** — except `NEXT_PUBLIC_AUTH_SECRET_KEY`
3. **Rotate `NEXT_PUBLIC_AUTH_SECRET_KEY`** — every 90 days recommended
4. **Never expose secret keys** — only public keys in frontend
5. **Use environment variables for all sensitive data** — never hardcode
6. **Validate environment variables on startup** — fail fast if missing
7. **Use HTTPS in production** — all API calls should be encrypted

---

## Related Documentation

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Stripe Documentation](https://stripe.com/docs)
- [OpenRouteService API](https://openrouteservice.org/dev/#/api-docs)
- [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) — API integration details
- [CUSTOMER_SITE_GUIDE.md](./CUSTOMER_SITE_GUIDE.md) — Public site API endpoints
