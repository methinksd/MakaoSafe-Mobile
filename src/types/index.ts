// ─────────────────────────────────────────────────────────────
// MakaoSafe — shared domain types
// All `any` types in auth, booking, property, and profile flows
// are replaced with these strict interfaces.
// ─────────────────────────────────────────────────────────────

// RawDate: Spring Boot LocalDate may arrive as [y,m,d] array or ISO string.
// Always parse via parseBookingDate() from src/utils/dates before display.
export type { RawDate } from '../utils/dates';

// ── Auth / User ───────────────────────────────────────────────

export type UserRole =
  | 'ROLE_TENANT'
  | 'ROLE_LANDLORD'
  | 'TENANT'
  | 'LANDLORD';

export interface User {
  id: number;
  email: string;
  role: UserRole | string; // string fallback for unexpected formats
  fullName: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'ROLE_TENANT' | 'ROLE_LANDLORD';
}

/** Shape returned by POST /api/auth/login and /api/auth/register */
export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
}

/** Shape returned by GET /api/users/profile and PUT /api/users/profile */
export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
}

// ── Properties ────────────────────────────────────────────────

export type ListingType = 'RENTAL' | 'BNB' | 'SALE';

export type PropertyType =
  | 'APARTMENT'
  | 'HOUSE'
  | 'STUDIO'
  | 'BEDSITTER'
  | 'SINGLE_ROOM'
  | 'VILLA'
  | 'COMMERCIAL';

export interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  deposit?: number;
  bookingFee?: number;
  locationName: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  listingType: ListingType;
  propertyType: PropertyType;
  amenities: string[];
  isVerified: boolean;
  landlordId?: number;
  landlordName?: string;
  landlordPhone?: string;
}

export interface CreatePropertyRequest {
  title: string;
  description: string;
  /** Must be positive integer (KES) */
  price: number;
  deposit?: number | null;
  bookingFee?: number | null;
  locationName: string;
  /** Valid range: -90 to 90 */
  latitude: number;
  /** Valid range: -180 to 180 */
  longitude: number;
  /** Optional video hosted on Cloudinary */
  videoUrl?: string;
  /** Must match backend ListingType enum string */
  listingType: ListingType;
  /** Backend accepts string (not enum) for propertyType */
  propertyType: string;
  amenities: string[];
  /** Existing Cloudinary image URLs (used in edit mode) */
  imageUrls?: string[];
}

export interface PropertyImage {
  uri: string;
  name: string;
  type: string;
}

export interface ContactLinkResponse {
  url?: string;
  chatLink?: string;
}

// ── Bookings ──────────────────────────────────────────────────

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'COMPLETED'
  | 'REFUND_REQUESTED';

export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED';

export interface BookingResponse {
  id: number;
  propertyTitle: string;
  locationName: string;
  /** Base property price (not what tenant paid) */
  price: number;
  /** Total charged to tenant = base + service fee */
  totalPrice: number;
  /** MakaoSafe 2% commission */
  serviceFee: number;
  /** Amount held/released to landlord */
  escrowAmount: number;
  escrowStatus: EscrowStatus;
  /**
   * Spring Boot LocalDate — may arrive as [year, month, day] array or ISO string.
   * Always parse via parseBookingDate() from src/utils/dates.ts before display.
   */
  startDate: RawDate;
  endDate: RawDate;
  status: BookingStatus;
  tenantId: number;
}

export interface CreateBookingRequest {
  propertyId: number;
  startDate: string;
  endDate: string;
}

export interface BookingStatusResponse {
  status: BookingStatus;
}

// ── Payment ───────────────────────────────────────────────────

export interface StkPushRequest {
  phoneNumber: string;
}

export interface StkPushResponse {
  checkoutRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  merchantRequestId?: string;
}

// ── API error shape ────────────────────────────────────────────

export interface ApiError {
  message?: string;
  error?: string;
  status?: number;
}

/** Extracts a human-readable message from an axios error */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as { response?: { data?: ApiError; status?: number } };
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
  );
}
