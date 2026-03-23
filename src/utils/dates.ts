/**
 * Date utilities for MakaoSafe mobile.
 *
 * Critical: Spring Boot serialises java.time.LocalDate as a [year, month, day]
 * integer array by default when jackson-datatype-jsr310 is present but
 * `spring.jackson.serialization.write-dates-as-timestamps=false` is NOT set.
 *
 * Until that property is added to application.properties on the backend, every
 * date field in BookingResponse (startDate, endDate) must be parsed through
 * `parseBookingDate` before display or comparison.
 *
 * Safe: also handles ISO-8601 strings ("2024-03-15") for forward-compatibility.
 */

/** Raw date value as returned by the backend — either ISO string or [y,m,d] array */
export type RawDate = string | number[] | null | undefined;

/**
 * Converts a raw backend date to an ISO-8601 string "YYYY-MM-DD".
 * Returns "—" if the value is missing or unparseable.
 */
export function parseBookingDate(raw: RawDate): string {
  if (!raw) return '—';

  // Array format: [2024, 3, 15]
  if (Array.isArray(raw)) {
    const [year, month, day] = raw as number[];
    if (!year || !month || !day) return '—';
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Already an ISO string
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10); // trim any time component
  }

  return '—';
}

/**
 * Formats a raw backend date for display: "15 Mar 2024"
 */
export function formatDisplayDate(raw: RawDate): string {
  const iso = parseBookingDate(raw);
  if (iso === '—') return '—';

  const [year, month, day] = iso.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Returns today's date as ISO string "YYYY-MM-DD".
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Adds `days` to an ISO date string, returns new ISO string.
 */
export function addDaysToISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Validates a user-typed date string.
 * Returns an error message or null if valid.
 */
export function validateDateInput(value: string, fieldName = 'Date'): string | null {
  if (!value.trim()) return `${fieldName} is required`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${fieldName} must be YYYY-MM-DD`;
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return `${fieldName} is not a valid date`;
  return null;
}

/**
 * Checks whether an ISO date string is in the past.
 */
export function isInPast(iso: string): boolean {
  return iso < todayISO();
}
