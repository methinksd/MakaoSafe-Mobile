# MakaoSafe Mobile App

React Native + Expo mobile app for the MakaoSafe rental platform.  
Connects directly to the live backend at `https://makaosafe-backend.onrender.com/api`.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- [Expo Go](https://expo.dev/client) app on your phone (for quick testing)
- OR Android Studio / Xcode for emulators

---

## Quick Start

### 1. Install dependencies

```bash
cd MakaoSafeApp
npm install
```

### 2. Start the dev server

```bash
npx expo start
```

This opens the Expo Dev Tools in your browser. Then:
- **On your phone**: Scan the QR code with the **Expo Go** app
- **Android emulator**: Press `a`
- **iOS simulator**: Press `i`

---

## Project Structure

```
MakaoSafeApp/
├── app/                        # Expo Router pages (thin wrappers)
│   ├── _layout.tsx             # Root layout + auth gating
│   ├── index.tsx               # Entry redirect
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── terms.tsx
│   │   └── privacy.tsx
│   ├── tenant/                 # Tab navigator (Home, Browse, Bookings, Profile)
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── browse.tsx
│   │   ├── bookings.tsx
│   │   ├── profile.tsx
│   │   └── property/[id].tsx
│   └── landlord/               # Tab navigator (Dashboard, Listings, Add, Bookings, Profile)
│       ├── _layout.tsx
│       ├── dashboard.tsx
│       ├── listings.tsx
│       ├── add-property.tsx
│       ├── bookings.tsx
│       ├── profile.tsx
│       └── edit-property/[id].tsx
│
├── src/
│   ├── context/
│   │   └── AuthContext.tsx     # JWT auth state + SecureStore
│   ├── services/
│   │   └── api.ts              # Axios instance + all API calls
│   ├── screens/
│   │   ├── auth/               # LoginScreen, RegisterScreen
│   │   ├── tenant/             # HomeScreen, BrowseScreen, PropertyDetailScreen,
│   │   │                       # BookingsScreen, ProfileScreen
│   │   └── landlord/           # DashboardScreen, MyListingsScreen,
│   │                           # AddPropertyScreen, LandlordBookingsScreen,
│   │                           # LandlordProfileScreen
│   ├── components/
│   │   ├── UI.tsx              # Button, Input, Card, Badge, EmptyState, etc.
│   │   └── PropertyCard.tsx    # Reusable property card (vertical + horizontal)
│   └── utils/
│       └── theme.ts            # Colors, Typography, Spacing, Radius, Shadow
│
└── assets/                     # Icons, splash screen, placeholder image
```

---

## Key Features

### Tenant Side
| Screen | Features |
|--------|----------|
| Home | Featured properties, type filters, pull-to-refresh |
| Browse | Full-text search, filter by RENTAL/BNB/SALE |
| Property Detail | Image gallery, amenities, book + M-Pesa STK push |
| My Bookings | View bookings, confirm stay (releases escrow), request refund |
| Profile | Account info, role badge, navigation |

### Landlord Side
| Screen | Features |
|--------|----------|
| Dashboard | Stats (listings, revenue, pending), quick actions |
| My Listings | View/edit/delete properties with images |
| Add/Edit Property | Full form with image picker, amenity multi-select, location |
| Bookings | Filter by status, release/manage bookings |
| Profile | Account info |

---

## Authentication Flow

1. JWT stored in **Expo SecureStore** (encrypted, not AsyncStorage)
2. Token decoded on startup — expired tokens are cleared automatically
3. Role extracted from JWT → routes to `/tenant` or `/landlord` tabs
4. All API calls automatically attach `Authorization: Bearer <token>`

---

## M-Pesa Payment Flow

1. Tenant selects dates → hits **Book Now**
2. App calls `POST /api/bookings` → gets `bookingId`
3. Tenant enters Safaricom/Airtel number → hits **Pay Now**
4. App calls `POST /api/payment/pay/{bookingId}` → STK push sent
5. User enters PIN on their phone
6. Funds held in **escrow** (98% landlord, 2% MakaoSafe fee)
7. Tenant later hits **Confirm Stay** → `POST /api/bookings/{id}/confirm` → funds released

---

## Building for Production

### Android APK (for direct install)
```bash
npx eas build --platform android --profile preview
```

### Android AAB (for Play Store)
```bash
npx eas build --platform android --profile production
```

### iOS (requires Apple Developer account)
```bash
npx eas build --platform ios --profile production
```

### First-time EAS setup
```bash
npm install -g eas-cli
eas login
eas build:configure
```

---

## Environment

The API URL is set in `src/services/api.ts`:
```typescript
const BASE_URL = 'https://makaosafe-backend.onrender.com/api';
```

To point to a local backend during development, change this to:
```typescript
const BASE_URL = 'http://YOUR_LOCAL_IP:8080/api';
```
(Use your machine's local network IP, not `localhost`, since the phone/emulator is a separate device.)

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based navigation |
| `expo-secure-store` | Encrypted JWT storage |
| `expo-image-picker` | Photo uploads for property listings |
| `axios` | HTTP client |
| `jwt-decode` | Decode JWT for role/user info |
| `@expo/vector-icons` | Ionicons throughout the UI |
| `react-native-toast-message` | Success/error notifications |
| `react-native-reanimated` | Smooth animations |

---

## Notes

- The backend is hosted on Render's free tier — **first request after inactivity may take 30–60 seconds** to wake up. Subsequent requests are fast.
- Images are hosted on **Cloudinary** via the backend.
- Phone numbers are auto-formatted to `254XXXXXXXXX` (M-Pesa standard).
