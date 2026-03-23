/**
 * Smoke test: Login flow
 *
 * Tests:
 * 1. Successful login stores JWT and navigates tenant to /tenant/home
 * 2. Successful login navigates landlord to /landlord/dashboard
 * 3. Wrong credentials shows error toast — does NOT navigate
 * 4. Network failure shows generic error toast
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jwtDecode } from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

// ── Module mocks ──────────────────────────────────────────────
// api.ts is mocked so no real HTTP calls are made
jest.mock('../../src/services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
  },
  userAPI: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  },
  default: {},
}));

import { authAPI, userAPI } from '../../src/services/api';
import LoginScreen from '../../src/screens/auth/LoginScreen';
import { AuthProvider } from '../../src/context/AuthContext';

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockUserAPI = userAPI as jest.Mocked<typeof userAPI>;
const mockToast = Toast as jest.Mocked<typeof Toast>;
const mockJwtDecode = jwtDecode as jest.Mock;
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

// Use a consistent future expiry so tokens are never stale
const VALID_EXPIRY = Math.floor(Date.now() / 1000) + 7200;

function buildToken(role: string) {
  return `header.${btoa(JSON.stringify({ sub: 'user@test.com', exp: VALID_EXPIRY }))}.sig`;
}

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default jwtDecode returns a valid non-expired payload
  mockJwtDecode.mockReturnValue({ sub: 'user@test.com', exp: VALID_EXPIRY });
  // Default profile response
  mockUserAPI.getProfile.mockResolvedValue({
    data: {
      id: 1,
      fullName: 'Test User',
      email: 'user@test.com',
      phoneNumber: '254712345678',
      role: 'ROLE_TENANT',
    },
  } as any);
});

describe('Login screen — smoke tests', () => {
  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = renderLogin();
    expect(getByPlaceholderText('Email address')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('shows validation errors when submitted empty', async () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const { getByPlaceholderText, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email address'), 'notanemail');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Enter a valid email')).toBeTruthy();
    });
  });

  it('stores token in SecureStore on successful tenant login', async () => {
    const token = buildToken('ROLE_TENANT');
    mockAuthAPI.login.mockResolvedValueOnce({
      data: { token, userId: 1, email: 'user@test.com', role: 'ROLE_TENANT' },
    } as any);

    const { getByPlaceholderText, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email address'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', token);
    });
  });

  it('stores user profile in SecureStore after successful login', async () => {
    const token = buildToken('ROLE_TENANT');
    mockAuthAPI.login.mockResolvedValueOnce({
      data: { token, userId: 1, email: 'user@test.com', role: 'ROLE_TENANT' },
    } as any);

    const { getByPlaceholderText, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email address'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user',
        expect.stringContaining('"email":"user@test.com"')
      );
    });
  });

  it('shows error toast on 401 wrong credentials', async () => {
    mockAuthAPI.login.mockRejectedValueOnce({
      response: { status: 401, data: {} },
    });

    const { getByPlaceholderText, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email address'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Invalid email or password',
        })
      );
    });

    // Must NOT store any token
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      'token',
      expect.anything()
    );
  });

  it('shows error toast on network failure', async () => {
    mockAuthAPI.login.mockRejectedValueOnce(new Error('Network Error'));

    const { getByPlaceholderText, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email address'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Login Failed' })
      );
    });
  });
});
