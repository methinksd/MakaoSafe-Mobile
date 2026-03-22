import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://makaosafe-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: any) =>
    api.post('/auth/register', data),
};

// ── Properties ────────────────────────────────────────
export const propertyAPI = {
  getAll: () => api.get('/properties'),
  getById: (id: number) => api.get(`/properties/${id}`),
  search: (keyword: string) =>
    api.get('/properties/search', { params: { keyword } }),
  nearby: (lat: number, lng: number, radius = 5) =>
    api.get('/properties/nearby', { params: { lat, lng, radius } }),
  getContactLink: (id: number) => api.get(`/properties/${id}/contact`),
  getMyListings: () => api.get('/properties/my-listings'),

  create: async (data: any, images: { uri: string; name: string; type: string }[]) => {
    const formData = new FormData();
    // React Native FormData requires this exact shape for JSON parts
    formData.append('data', JSON.stringify(data) as any);
    images.forEach((img) => formData.append('images', img as any));
    return api.post('/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: async (id: number, data: any, images: { uri: string; name: string; type: string }[] = []) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data) as any);
    images.forEach((img) => formData.append('images', img as any));
    return api.put(`/properties/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) => api.delete(`/properties/${id}`),
};

// ── Bookings ──────────────────────────────────────────
export const bookingAPI = {
  create: (data: { propertyId: number; startDate: string; endDate: string }) =>
    api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getLandlordBookings: () => api.get('/bookings/landlord'),
  confirmStay: (id: number) => api.post(`/bookings/${id}/confirm`, {}),
  requestRefund: (id: number) => api.post(`/bookings/${id}/refund`, {}),
  getStatus: (id: number) => api.get(`/bookings/${id}/status`),
};

// ── Payment ───────────────────────────────────────────
export const paymentAPI = {
  stkPush: (bookingId: number, phoneNumber: string) =>
    api.post(`/payment/pay/${bookingId}`, { phoneNumber }),
};

// ── User ──────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  deleteAccount: () => api.delete('/users/profile'),
};
