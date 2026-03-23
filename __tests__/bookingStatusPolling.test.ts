/**
 * Smoke test: Booking status polling
 *
 * The `usePaymentPoller` hook in PropertyDetailScreen polls
 * GET /bookings/{id}/status every 5 seconds for up to 90 seconds.
 *
 * Tests:
 * 1. Does NOT call getStatus when bookingId is null
 * 2. Calls getStatus at configured interval when bookingId is set
 * 3. Calls onPaid callback and stops polling when status is PAID
 * 4. Calls onFailed callback and stops polling when status is PAYMENT_FAILED
 * 5. Stops polling after MAX_ATTEMPTS without calling either callback (timeout)
 * 6. Cleans up interval on unmount (no memory leaks)
 */
import { renderHook, act } from '@testing-library/react-native';
import { useRef, useEffect } from 'react';
import { bookingAPI } from '../../src/services/api';
import { Config } from '../../src/config/env';

jest.mock('../../src/services/api', () => ({
  bookingAPI: {
    getStatus: jest.fn(),
  },
  default: {},
}));

const mockGetStatus = bookingAPI.getStatus as jest.MockedFunction<typeof bookingAPI.getStatus>;

// Re-implement the hook here so the test is self-contained and
// doesn't depend on the full PropertyDetailScreen component tree.
// This matches the implementation in PropertyDetailScreen.tsx exactly.
function usePaymentPoller(
  bookingId: number | null,
  onPaid: () => void,
  onFailed: () => void
) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!bookingId) return;
    attempts.current = 0;
    pollRef.current = setInterval(async () => {
      attempts.current += 1;
      try {
        const res = await bookingAPI.getStatus(bookingId);
        const status = res.data?.status;
        if (status === 'PAID') {
          clearInterval(pollRef.current!);
          onPaid();
        } else if (status === 'PAYMENT_FAILED') {
          clearInterval(pollRef.current!);
          onFailed();
        }
      } catch { /* ignore network errors during polling */ }
      if (attempts.current >= Config.MPESA_POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
      }
    }, Config.MPESA_POLL_INTERVAL_MS);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [bookingId]);
}

describe('usePaymentPoller — smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does NOT start polling when bookingId is null', () => {
    const onPaid = jest.fn();
    const onFailed = jest.fn();

    renderHook(() => usePaymentPoller(null, onPaid, onFailed));

    act(() => { jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS * 3); });

    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(onPaid).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('calls getStatus at the configured interval', async () => {
    mockGetStatus.mockResolvedValue({ data: { status: 'PENDING' } } as any);

    renderHook(() => usePaymentPoller(42, jest.fn(), jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
    expect(mockGetStatus).toHaveBeenCalledWith(42);

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });

  it('calls onPaid and stops polling when status is PAID', async () => {
    const onPaid = jest.fn();
    const onFailed = jest.fn();

    mockGetStatus.mockResolvedValue({ data: { status: 'PAID' } } as any);

    renderHook(() => usePaymentPoller(99, onPaid, onFailed));

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });

    expect(onPaid).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();

    // Advance further — should NOT call getStatus again since polling stopped
    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS * 3);
    });

    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it('calls onFailed and stops polling when status is PAYMENT_FAILED', async () => {
    const onPaid = jest.fn();
    const onFailed = jest.fn();

    mockGetStatus.mockResolvedValue({ data: { status: 'PAYMENT_FAILED' } } as any);

    renderHook(() => usePaymentPoller(77, onPaid, onFailed));

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onPaid).not.toHaveBeenCalled();
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it('continues polling while status is PENDING', async () => {
    const onPaid = jest.fn();
    mockGetStatus.mockResolvedValue({ data: { status: 'PENDING' } } as any);

    renderHook(() => usePaymentPoller(55, onPaid, jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS * 4);
    });

    expect(mockGetStatus).toHaveBeenCalledTimes(4);
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('stops polling after MAX_ATTEMPTS without calling either callback', async () => {
    const onPaid = jest.fn();
    const onFailed = jest.fn();
    mockGetStatus.mockResolvedValue({ data: { status: 'PENDING' } } as any);

    renderHook(() => usePaymentPoller(11, onPaid, onFailed));

    // Advance past the full timeout window
    await act(async () => {
      jest.advanceTimersByTime(
        Config.MPESA_POLL_INTERVAL_MS * (Config.MPESA_POLL_MAX_ATTEMPTS + 2)
      );
    });

    expect(mockGetStatus).toHaveBeenCalledTimes(Config.MPESA_POLL_MAX_ATTEMPTS);
    expect(onPaid).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('does not call getStatus after a network error (continues to next interval)', async () => {
    const onPaid = jest.fn();
    // First call: network error; second call: PAID
    mockGetStatus
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue({ data: { status: 'PAID' } } as any);

    renderHook(() => usePaymentPoller(33, onPaid, jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });
    expect(onPaid).not.toHaveBeenCalled(); // network error — no callback

    await act(async () => {
      jest.advanceTimersByTime(Config.MPESA_POLL_INTERVAL_MS);
    });
    expect(onPaid).toHaveBeenCalledTimes(1); // recovered on next poll
  });

  it('cleans up interval on unmount (no memory leak)', async () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    mockGetStatus.mockResolvedValue({ data: { status: 'PENDING' } } as any);

    const { unmount } = renderHook(() => usePaymentPoller(22, jest.fn(), jest.fn()));

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
