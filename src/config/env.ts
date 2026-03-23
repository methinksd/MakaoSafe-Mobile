/**
 * MakaoSafe — Environment Configuration
 *
 * To point at a local backend during development:
 *   1. Create a file called `.env` in the project root
 *   2. Add:  EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8080/api
 *   3. Restart `npx expo start`
 *
 * In production (EAS Build), set EXPO_PUBLIC_API_URL in your
 * EAS environment variables dashboard (eas.json → env block).
 *
 * Expo exposes EXPO_PUBLIC_* variables to the JS bundle automatically.
 * Non-EXPO_PUBLIC_ variables are build-time only (not available at runtime).
 */

const DEFAULT_API_URL = 'https://makaosafe-backend.onrender.com/api';

export const Config = {
  /**
   * Base URL for all API calls.
   * Reads from EXPO_PUBLIC_API_URL env var, falls back to production URL.
   */
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,

  /**
   * M-Pesa STK push timeout — how long the user has to enter their PIN.
   * Daraja's default window is 90 seconds.
   */
  MPESA_POLL_INTERVAL_MS: 5_000,
  MPESA_POLL_MAX_ATTEMPTS: 18, // 18 × 5s = 90 seconds

  /**
   * Axios request timeout in milliseconds.
   * Render free tier can take ~30s to cold-start.
   */
  REQUEST_TIMEOUT_MS: 35_000,
} as const;
