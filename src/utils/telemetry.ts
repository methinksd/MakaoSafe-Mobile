/**
 * MakaoSafe Telemetry — structured logging for key user actions.
 *
 * Architecture:
 *  - In development: emits structured JSON to console so engineers can read events.
 *  - Production-ready: the `emit` function is the single integration point.
 *    Swap the console.log for Sentry, Amplitude, Mixpanel, Firebase Analytics,
 *    or any analytics SDK without touching call sites.
 *
 * Events are typed — adding a new event requires updating `TelemetryEvent`,
 * which catches missing fields at compile time.
 */

// ── Event catalogue ───────────────────────────────────────────

export type TelemetryEvent =
  // Auth
  | { name: 'auth.login.start'; email: string }
  | { name: 'auth.login.success'; userId: number; role: string }
  | { name: 'auth.login.failure'; email: string; statusCode?: number; reason: string }
  | { name: 'auth.register.start'; role: string }
  | { name: 'auth.register.success'; role: string }
  | { name: 'auth.register.failure'; role: string; statusCode?: number; reason: string }
  | { name: 'auth.logout'; userId: number }
  | { name: 'auth.account_deleted'; userId: number }

  // Booking
  | { name: 'booking.create.start'; propertyId: number; listingType: string }
  | { name: 'booking.create.success'; bookingId: number; propertyId: number; totalPrice: number }
  | { name: 'booking.create.failure'; propertyId: number; reason: string; statusCode?: number }
  | { name: 'booking.confirm_stay'; bookingId: number }
  | { name: 'booking.refund_requested'; bookingId: number }

  // Payment
  | { name: 'payment.start'; bookingId: number; amount: number; phonePrefix: string }
  | { name: 'payment.stk_sent'; bookingId: number }
  | { name: 'payment.stk_failed'; bookingId: number; reason: string; statusCode?: number }
  | { name: 'payment.poll.paid'; bookingId: number; attempts: number }
  | { name: 'payment.poll.failed'; bookingId: number; attempts: number }
  | { name: 'payment.poll.timeout'; bookingId: number; attempts: number }

  // Profile
  | { name: 'profile.update.start' }
  | { name: 'profile.update.success' }
  | { name: 'profile.update.failure'; reason: string }

  // Property
  | { name: 'property.create.start'; listingType: string; propertyType: string }
  | { name: 'property.create.success'; propertyId: number; listingType: string }
  | { name: 'property.create.failure'; reason: string; statusCode?: number }
  | { name: 'property.edit.start'; propertyId: number }
  | { name: 'property.edit.success'; propertyId: number }
  | { name: 'property.delete'; propertyId: number }

  // Navigation / engagement
  | { name: 'nearby.search'; lat: number; lng: number; results: number }
  | { name: 'property.view'; propertyId: number; listingType: string }
  | { name: 'property.contact'; propertyId: number };

// ── Core emit ─────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Emit a telemetry event. In development, logs to console.
 * In production, plug in your analytics SDK here.
 */
function emit(event: TelemetryEvent): void {
  const payload = {
    ...event,
    _t: new Date().toISOString(),
    _env: IS_DEV ? 'dev' : 'prod',
  };

  if (IS_DEV) {
    // Colour-code by event category for readability in Metro logs
    const category = event.name.split('.')[0];
    const colours: Record<string, string> = {
      auth: '\x1b[36m',    // cyan
      booking: '\x1b[33m', // yellow
      payment: '\x1b[35m', // magenta
      profile: '\x1b[34m', // blue
      property: '\x1b[32m', // green
      nearby: '\x1b[32m',
    };
    const col = colours[category] ?? '\x1b[37m';
    const reset = '\x1b[0m';
    console.log(`${col}[telemetry] ${event.name}${reset}`, JSON.stringify(payload, null, 2));
    return;
  }

  // ── Production integration point ──────────────────────────
  // Uncomment and configure your analytics SDK:
  //
  // Amplitude:
  // amplitude.track(event.name, payload);
  //
  // Sentry breadcrumb:
  // Sentry.addBreadcrumb({ category: event.name.split('.')[0], message: event.name, data: payload });
  //
  // Firebase:
  // analytics().logEvent(event.name.replace(/\./g, '_'), payload);
  //
  // Mixpanel:
  // mixpanel.track(event.name, payload);
}

// ── Convenience namespaced loggers ────────────────────────────
// Call sites import these instead of `emit` directly, keeping the API
// readable and preventing accidental misuse of the raw emit function.

export const Telemetry = {
  // Auth
  loginStart:  (email: string) =>
    emit({ name: 'auth.login.start', email }),
  loginSuccess: (userId: number, role: string) =>
    emit({ name: 'auth.login.success', userId, role }),
  loginFailure: (email: string, reason: string, statusCode?: number) =>
    emit({ name: 'auth.login.failure', email, reason, statusCode }),

  registerStart:   (role: string) => emit({ name: 'auth.register.start', role }),
  registerSuccess: (role: string) => emit({ name: 'auth.register.success', role }),
  registerFailure: (role: string, reason: string, statusCode?: number) =>
    emit({ name: 'auth.register.failure', role, reason, statusCode }),

  logout:        (userId: number) => emit({ name: 'auth.logout', userId }),
  accountDeleted:(userId: number) => emit({ name: 'auth.account_deleted', userId }),

  // Booking
  bookingCreateStart: (propertyId: number, listingType: string) =>
    emit({ name: 'booking.create.start', propertyId, listingType }),
  bookingCreateSuccess: (bookingId: number, propertyId: number, totalPrice: number) =>
    emit({ name: 'booking.create.success', bookingId, propertyId, totalPrice }),
  bookingCreateFailure: (propertyId: number, reason: string, statusCode?: number) =>
    emit({ name: 'booking.create.failure', propertyId, reason, statusCode }),
  bookingConfirmStay:    (bookingId: number) => emit({ name: 'booking.confirm_stay', bookingId }),
  bookingRefundRequested:(bookingId: number) => emit({ name: 'booking.refund_requested', bookingId }),

  // Payment
  paymentStart:   (bookingId: number, amount: number, phone: string) =>
    emit({ name: 'payment.start', bookingId, amount, phonePrefix: phone.slice(0, 6) + '****' }),
  paymentStkSent: (bookingId: number) => emit({ name: 'payment.stk_sent', bookingId }),
  paymentStkFailed:(bookingId: number, reason: string, statusCode?: number) =>
    emit({ name: 'payment.stk_failed', bookingId, reason, statusCode }),
  paymentPollPaid:    (bookingId: number, attempts: number) =>
    emit({ name: 'payment.poll.paid', bookingId, attempts }),
  paymentPollFailed:  (bookingId: number, attempts: number) =>
    emit({ name: 'payment.poll.failed', bookingId, attempts }),
  paymentPollTimeout: (bookingId: number, attempts: number) =>
    emit({ name: 'payment.poll.timeout', bookingId, attempts }),

  // Profile
  profileUpdateStart:   () => emit({ name: 'profile.update.start' }),
  profileUpdateSuccess: () => emit({ name: 'profile.update.success' }),
  profileUpdateFailure: (reason: string) => emit({ name: 'profile.update.failure', reason }),

  // Property
  propertyCreateStart:   (listingType: string, propertyType: string) =>
    emit({ name: 'property.create.start', listingType, propertyType }),
  propertyCreateSuccess: (propertyId: number, listingType: string) =>
    emit({ name: 'property.create.success', propertyId, listingType }),
  propertyCreateFailure: (reason: string, statusCode?: number) =>
    emit({ name: 'property.create.failure', reason, statusCode }),
  propertyEditStart:   (propertyId: number) => emit({ name: 'property.edit.start', propertyId }),
  propertyEditSuccess: (propertyId: number) => emit({ name: 'property.edit.success', propertyId }),
  propertyDelete:      (propertyId: number) => emit({ name: 'property.delete', propertyId }),

  // Engagement
  nearbySearch:    (lat: number, lng: number, results: number) =>
    emit({ name: 'nearby.search', lat: parseFloat(lat.toFixed(3)), lng: parseFloat(lng.toFixed(3)), results }),
  propertyView:   (propertyId: number, listingType: string) =>
    emit({ name: 'property.view', propertyId, listingType }),
  propertyContact:(propertyId: number) => emit({ name: 'property.contact', propertyId }),
} as const;
