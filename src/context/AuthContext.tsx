import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { authAPI, userAPI } from '../services/api';
import { Telemetry } from '../utils/telemetry';
import type {
  User,
  UserRole,
  RegisterRequest,
  UserProfile,
} from '../types';

// Re-export User so consumers can import from one place
export type { User };

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

function normaliseRole(role: unknown): UserRole | string {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role !== null && 'name' in role) {
    return String((role as { name: unknown }).name);
  }
  return String(role);
}

function profileToUser(profile: UserProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    role: normaliseRole(profile.role),
    fullName: profile.fullName ?? '',
    phoneNumber: profile.phoneNumber ?? '',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback(async (u: User) => {
    await SecureStore.setItemAsync('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const loadProfile = useCallback(async (fallback: User) => {
    try {
      const res = await userAPI.getProfile();
      const merged = profileToUser(res.data);
      // Preserve role from login response if profile returns empty role
      if (!merged.role && fallback.role) merged.role = fallback.role;
      await persistUser(merged);
    } catch {
      // Network unavailable — use cached user, do not clear state
      setUser(fallback);
    }
  }, [persistUser]);

  // Bootstrap on app start
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync('token'),
          SecureStore.getItemAsync('user'),
        ]);

        if (storedToken && !isTokenExpired(storedToken)) {
          setToken(storedToken);
          const parsed: User = storedUser
            ? (JSON.parse(storedUser) as User)
            : { id: 0, email: '', role: '', fullName: '' };
          setUser(parsed);
          // Refresh from API in background — don't block splash screen
          void loadProfile(parsed);
        } else {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
        }
      } catch (err) {
        // SecureStore read failure is non-fatal — start unauthenticated
        console.warn('[AuthContext] bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, userId, role } = res.data;

    await SecureStore.setItemAsync('token', newToken);
    setToken(newToken);

    const partial: User = {
      id: userId ?? 0,
      email,
      role: normaliseRole(role),
      fullName: '',
    };
    setUser(partial);
    await loadProfile(partial);
  }, [loadProfile]);

  const register = useCallback(async (data: RegisterRequest) => {
    await authAPI.register(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('token'),
        SecureStore.deleteItemAsync('user'),
      ]);
    } catch (err) {
      console.warn('[AuthContext] logout SecureStore error:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const deleteAccount = useCallback(async () => {
    await userAPI.deleteAccount();
    // Clear local state exactly like logout
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('token'),
        SecureStore.deleteItemAsync('user'),
      ]);
    } catch (err) {
      console.warn('[AuthContext] deleteAccount SecureStore error:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isLandlord(user: User | null): boolean {
  const role = user?.role ?? '';
  return role === 'ROLE_LANDLORD' || role === 'LANDLORD';
}
