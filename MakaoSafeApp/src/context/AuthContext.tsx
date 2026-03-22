import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { authAPI, userAPI } from '../services/api';

export interface User {
  id: number;
  email: string;
  role: string;
  fullName: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// The JWT only contains `sub` (email) and expiry — no role or userId.
// Role and userId come from the AuthResponse body. FullName from /api/users/profile.
function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full profile from API and merge with stored partial user
  const loadProfile = useCallback(async (partialUser: User, storedToken: string) => {
    try {
      const res = await userAPI.getProfile();
      const profile = res.data; // { id, fullName, email, phoneNumber, role }
      const merged: User = {
        id: profile.id || partialUser.id,
        email: profile.email || partialUser.email,
        role: normaliseRole(profile.role) || partialUser.role,
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
      };
      setUser(merged);
      // Persist updated user data
      await SecureStore.setItemAsync('user', JSON.stringify(merged));
    } catch {
      // If profile fetch fails (e.g. network), use what we have
      setUser(partialUser);
    }
  }, []);

  // Bootstrap auth state on app start
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync('token'),
          SecureStore.getItemAsync('user'),
        ]);

        if (storedToken && !isTokenExpired(storedToken)) {
          setToken(storedToken);
          if (storedUser) {
            const parsed: User = JSON.parse(storedUser);
            setUser(parsed);
            // Refresh profile in background
            loadProfile(parsed, storedToken);
          }
        } else {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('user');
        }
      } catch {
        // ignore storage errors
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

    // Build partial user from response body (JWT only has email/expiry)
    const partial: User = {
      id: userId || 0,
      email,
      role: normaliseRole(role),
      fullName: '',
    };

    setUser(partial);
    // Fetch full profile (has fullName, phoneNumber)
    await loadProfile(partial, newToken);
  }, [loadProfile]);

  const register = useCallback(async (data: any) => {
    await authAPI.register(data);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (user && token) await loadProfile(user, token);
  }, [user, token, loadProfile]);

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

export function isLandlord(user: User | null) {
  const role = user?.role || '';
  return role === 'ROLE_LANDLORD' || role === 'LANDLORD';
}

function normaliseRole(role: any): string {
  if (!role) return '';
  if (typeof role === 'string') return role;
  // Spring Boot enum may come as object
  if (typeof role === 'object' && role.name) return role.name;
  return String(role);
}
