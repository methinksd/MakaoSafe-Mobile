import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../config/env';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Property,
  CreatePropertyRequest,
  PropertyImage,
  ContactLinkResponse,
  BookingResponse,
  CreateBookingRequest,
  BookingStatusResponse,
  StkPushResponse,
  UserProfile,
  UpdateProfileRequest,
} from '../types';

// ── Axios instance ─────────────────────────────────────────────
const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear token so app re-routes to login
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ───────────────────────────────────────────────────────
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post<AuthResponse>('/auth/register', data),
};

// ── Properties ────────────────────────────────────────────────
export const propertyAPI = {
  getAll: (): Promise<AxiosResponse<Property[]>> =>
    api.get<Property[]>('/properties'),

  getById: (id: number): Promise<AxiosResponse<Property>> =>
    api.get<Property>(`/properties/${id}`),

  search: (keyword: string): Promise<AxiosResponse<Property[]>> =>
    api.get<Property[]>('/properties/search', { params: { keyword } }),

  nearby: (lat: number, lng: number, radius = 5): Promise<AxiosResponse<Property[]>> =>
    api.get<Property[]>('/properties/nearby', { params: { lat, lng, radius } }),

  getContactLink: (id: number): Promise<AxiosResponse<ContactLinkResponse>> =>
    api.get<ContactLinkResponse>(`/properties/${id}/contact`),

  getMyListings: (): Promise<AxiosResponse<Property[]>> =>
    api.get<Property[]>('/properties/my-listings'),

  create: (data: CreatePropertyRequest, images: PropertyImage[]): Promise<AxiosResponse<Property>> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data) as unknown as Blob);
    images.forEach((img) => formData.append('images', img as unknown as Blob));
    return api.post<Property>('/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (id: number, data: CreatePropertyRequest, images: PropertyImage[] = []): Promise<AxiosResponse<Property>> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data) as unknown as Blob);
    images.forEach((img) => formData.append('images', img as unknown as Blob));
    return api.put<Property>(`/properties/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete<void>(`/properties/${id}`),
};

// ── Bookings ───────────────────────────────────────────────────
export const bookingAPI = {
  create: (data: CreateBookingRequest): Promise<AxiosResponse<BookingResponse>> =>
    api.post<BookingResponse>('/bookings', data),

  getMyBookings: (): Promise<AxiosResponse<BookingResponse[]>> =>
    api.get<BookingResponse[]>('/bookings/my-bookings'),

  getLandlordBookings: (): Promise<AxiosResponse<BookingResponse[]>> =>
    api.get<BookingResponse[]>('/bookings/landlord'),

  confirmStay: (id: number): Promise<AxiosResponse<BookingResponse>> =>
    api.post<BookingResponse>(`/bookings/${id}/confirm`, {}),

  requestRefund: (id: number): Promise<AxiosResponse<BookingResponse>> =>
    api.post<BookingResponse>(`/bookings/${id}/refund`, {}),

  getStatus: (id: number): Promise<AxiosResponse<BookingStatusResponse>> =>
    api.get<BookingStatusResponse>(`/bookings/${id}/status`),
};

// ── Payment ────────────────────────────────────────────────────
export const paymentAPI = {
  stkPush: (bookingId: number, phoneNumber: string): Promise<AxiosResponse<StkPushResponse>> =>
    api.post<StkPushResponse>(`/payment/pay/${bookingId}`, { phoneNumber }),
};

// ── User ───────────────────────────────────────────────────────
export const userAPI = {
  getProfile: (): Promise<AxiosResponse<UserProfile>> =>
    api.get<UserProfile>('/users/profile'),

  updateProfile: (data: UpdateProfileRequest): Promise<AxiosResponse<UserProfile>> =>
    api.put<UserProfile>('/users/profile', data),

  deleteAccount: (): Promise<AxiosResponse<string>> =>
    api.delete<string>('/users/profile'),
};
