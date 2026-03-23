/**
 * MakaoSafe — centralized API response and error utility layer.
 *
 * Replaces the scattered try/catch + Toast.show + console.warn pattern
 * that exists in every screen with:
 *
 *   1. `ApiResult<T>` — a discriminated union (ok | err) so TypeScript
 *      forces callers to handle both paths.
 *
 *   2. `callApi<T>()` — wraps any API call, returns ApiResult, logs
 *      the error structurally, and never throws.
 *
 *   3. `useApiCall<T>()` — React hook that manages loading/data/error
 *      state for a single API endpoint. Replaces the useState + useEffect
 *      boilerplate repeated in every list screen.
 *
 *   4. `handleApiError()` — single function to extract a message and
 *      show a Toast, replacing the inline try/catch + extractErrorMessage
 *      + Toast.show triple that appears in every mutation handler.
 *
 *   5. `getHttpStatus()` / `isNetworkError()` — low-level helpers for
 *      conditional logic based on HTTP status or network failure.
 */

import { useState, useEffect, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import type { AxiosResponse } from 'axios';

// ── 1. ApiResult discriminated union ──────────────────────────

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; statusCode?: number; raw?: unknown };

// ── 2. callApi — wraps any promise returning AxiosResponse<T> ─

/**
 * Executes an API call and returns a typed ApiResult.
 * Never throws. All errors are caught and normalised.
 *
 * @example
 * const result = await callApi(() => propertyAPI.getAll());
 * if (result.ok) { setProperties(result.data); }
 * else { handleApiError(result); }
 */
export async function callApi<T>(
  fn: () => Promise<AxiosResponse<T>>,
  context?: string
): Promise<ApiResult<T>> {
  try {
    const res = await fn();
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    const statusCode = getHttpStatus(err);
    const error = extractMessage(err, 'An unexpected error occurred');
    const tag = context ? `[${context}]` : '[api]';
    console.warn(`${tag} ${error}`, { statusCode, raw: err });
    return { ok: false, error, statusCode, raw: err };
  }
}

// ── 3. useApiCall — hook for list/detail screens ──────────────

interface UseApiCallOptions {
  /** Run on mount (default: true) */
  immediate?: boolean;
  /** Context tag for console warnings */
  context?: string;
}

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-trigger the fetch manually */
  refresh: () => void;
}

/**
 * Manages loading/data/error state for a single API endpoint.
 *
 * @example
 * const { data: bookings, loading, error, refresh } =
 *   useApiCall(() => bookingAPI.getMyBookings(), { context: 'BookingsScreen' });
 */
export function useApiCall<T>(
  fn: () => Promise<AxiosResponse<T>>,
  options: UseApiCallOptions = {}
): UseApiCallResult<T> {
  const { immediate = true, context } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!immediate && tick === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    callApi(fn, context).then(result => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, error, refresh };
}

// ── 4. handleApiError — unified Toast + log for mutations ─────

interface ApiErrorOptions {
  /** Toast title. Defaults to 'Error'. */
  title?: string;
  /** Fallback message if API returned nothing useful. */
  fallback?: string;
}

/**
 * Shows a Toast for a failed ApiResult or unknown error.
 * Use this inside mutation catch blocks instead of inlining Toast.show.
 *
 * @example
 * const result = await callApi(() => bookingAPI.confirmStay(id), 'confirmStay');
 * if (!result.ok) { handleApiError(result, { title: 'Could not confirm stay' }); return; }
 */
export function handleApiError(
  err: ApiResult<unknown> | unknown,
  options: ApiErrorOptions = {}
): void {
  const { title = 'Error', fallback = 'Something went wrong. Please try again.' } = options;

  let message: string;
  if (err && typeof err === 'object' && 'ok' in err && !(err as ApiResult<unknown>).ok) {
    message = (err as { ok: false; error: string }).error || fallback;
  } else {
    message = extractMessage(err, fallback);
  }

  Toast.show({ type: 'error', text1: title, text2: message });
}

// ── 5. Low-level helpers ──────────────────────────────────────

/** Extracts the HTTP status code from an unknown axios error. */
export function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { response?: { status?: number } };
  return e.response?.status;
}

/** Returns true if the error is a network failure (no response received). */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { response?: unknown; request?: unknown; code?: string };
  return !e.response && Boolean(e.request || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED');
}

// ── Internal ──────────────────────────────────────────────────

/** Extracts a human-readable message from any error shape. */
function extractMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as {
    response?: { data?: { message?: string; error?: string } | string; status?: number };
    message?: string;
  };
  if (e.response?.data && typeof e.response.data === 'object') {
    return e.response.data.message || e.response.data.error || fallback;
  }
  if (e.response?.data && typeof e.response.data === 'string') {
    return e.response.data || fallback;
  }
  return fallback;
}
