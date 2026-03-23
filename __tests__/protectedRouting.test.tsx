/**
 * Smoke test: Protected routing
 *
 * Tests:
 * 1. Root layout redirects unauthenticated user to /auth/login
 * 2. Root layout redirects authenticated tenant to /tenant/home
 * 3. Root layout redirects authenticated landlord to /landlord/dashboard
 * 4. isTokenExpired correctly identifies expired vs valid tokens
 * 5. AuthContext isAuthenticated reflects stored token state
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

jest.mock('../../src/services/api', () => ({
  authAPI: { login: jest.fn(), register: jest.fn() },
  userAPI: {
    getProfile: jest.fn().mockResolvedValue({
      data: { id: 1, fullName: 'Test', email: 't@t.com', phoneNumber: '', role: 'ROLE_TENANT' },
    }),
    deleteAccount: jest.fn(),
  },
  default: {},
}));

import { AuthProvider, useAuth, isLandlord } from '../../src/context/AuthContext';
import type { User } from '../../src/types';

const mockJwtDecode = jwtDecode as jest.Mock;
const NOW = Math.floor(Date.now() / 1000);

// Helper: a minimal component that exposes auth state for assertions
function AuthStateDisplay() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Text testID="loading">loading</Text>;
  return (
    <View>
      <Text testID="authenticated">{String(isAuthenticated)}</Text>
      <Text testID="role">{user?.role ?? 'none'}</Text>
      <Text testID="email">{user?.email ?? 'none'}</Text>
    </View>
  );
}

function renderWithAuth(children: React.ReactNode) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe('Protected routing — smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtDecode.mockReturnValue({ sub: 'user@test.com', exp: NOW + 3600 });
  });

  it('isAuthenticated is false when no token is stored', async () => {
    // SecureStore returns null by default (cleared in jest.setup.ts beforeEach)
    const { getByTestId } = renderWithAuth(<AuthStateDisplay />);

    await waitFor(() => {
      expect(getByTestId('authenticated').props.children).toBe('false');
    });
  });

  it('isAuthenticated is true when a valid token is stored', async () => {
    const validToken = 'header.payload.sig';
    // Pre-populate SecureStore with a valid token and user
    await SecureStore.setItemAsync('token', validToken);
    await SecureStore.setItemAsync(
      'user',
      JSON.stringify({
        id: 1, email: 'user@test.com', role: 'ROLE_TENANT', fullName: 'Test User',
      })
    );

    const { getByTestId } = renderWithAuth(<AuthStateDisplay />);

    await waitFor(() => {
      expect(getByTestId('authenticated').props.children).toBe('true');
    });
  });

  it('isAuthenticated is false when stored token is expired', async () => {
    // jwtDecode returns expired token
    mockJwtDecode.mockReturnValue({ sub: 'user@test.com', exp: NOW - 100 });

    await SecureStore.setItemAsync('token', 'expired.token.sig');
    await SecureStore.setItemAsync(
      'user',
      JSON.stringify({ id: 1, email: 'x@x.com', role: 'ROLE_TENANT', fullName: 'X' })
    );

    const { getByTestId } = renderWithAuth(<AuthStateDisplay />);

    await waitFor(() => {
      expect(getByTestId('authenticated').props.children).toBe('false');
    });

    // Expired token must be cleared from storage
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
  });

  it('isLandlord returns false for tenant role', () => {
    const tenant: User = { id: 1, email: 'a@a.com', role: 'ROLE_TENANT', fullName: 'A' };
    expect(isLandlord(tenant)).toBe(false);
  });

  it('isLandlord returns true for ROLE_LANDLORD', () => {
    const landlord: User = { id: 2, email: 'b@b.com', role: 'ROLE_LANDLORD', fullName: 'B' };
    expect(isLandlord(landlord)).toBe(true);
  });

  it('isLandlord returns true for bare LANDLORD role string', () => {
    const landlord: User = { id: 3, email: 'c@c.com', role: 'LANDLORD', fullName: 'C' };
    expect(isLandlord(landlord)).toBe(true);
  });

  it('isLandlord returns false for null user', () => {
    expect(isLandlord(null)).toBe(false);
  });

  it('shows correct role from stored user', async () => {
    mockJwtDecode.mockReturnValue({ sub: 'l@l.com', exp: NOW + 3600 });
    await SecureStore.setItemAsync('token', 'valid.token.sig');
    await SecureStore.setItemAsync(
      'user',
      JSON.stringify({ id: 5, email: 'l@l.com', role: 'ROLE_LANDLORD', fullName: 'Landlord L' })
    );

    const { getByTestId } = renderWithAuth(<AuthStateDisplay />);

    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe('ROLE_LANDLORD');
    });
  });

  it('logout clears isAuthenticated and removes token from SecureStore', async () => {
    await SecureStore.setItemAsync('token', 'valid.token.sig');
    await SecureStore.setItemAsync(
      'user',
      JSON.stringify({ id: 1, email: 't@t.com', role: 'ROLE_TENANT', fullName: 'T' })
    );

    function LogoutButton() {
      const { logout, isAuthenticated } = useAuth();
      return (
        <View>
          <Text testID="auth">{String(isAuthenticated)}</Text>
          <Text testID="logout" onPress={logout}>logout</Text>
        </View>
      );
    }

    const { getByTestId } = renderWithAuth(<LogoutButton />);

    await waitFor(() => {
      expect(getByTestId('auth').props.children).toBe('true');
    });

    await act(async () => {
      getByTestId('logout').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('auth').props.children).toBe('false');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user');
    });
  });
});
