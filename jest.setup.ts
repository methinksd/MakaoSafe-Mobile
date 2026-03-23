/**
 * Jest global setup — runs once before all test suites.
 *
 * Mocks native modules that Jest (Node.js) cannot execute:
 * SecureStore, Expo Router, react-native-toast-message, etc.
 */
import '@testing-library/jest-native/extend-expect';

// ── expo-secure-store ─────────────────────────────────────────
// Replace the native Keychain/Keystore implementation with an
// in-memory map so tests can read/write tokens without native modules.
const secureStoreMap = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(secureStoreMap.get(key) ?? null)
  ),
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStoreMap.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    secureStoreMap.delete(key);
    return Promise.resolve();
  }),
}));

// ── expo-router ────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => null,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// ── react-native-toast-message ────────────────────────────────
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  default: () => null,
}));

// ── react-native-reanimated ───────────────────────────────────
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// ── react-native-safe-area-context ────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// ── @expo/vector-icons ────────────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// ── jwt-decode ────────────────────────────────────────────────
// Default mock — individual tests override this for specific payloads
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({
    sub: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600, // expires 1 hour from now
    iat: Math.floor(Date.now() / 1000),
  })),
}));

// ── axios ─────────────────────────────────────────────────────
// Individual tests configure axios mocks via jest.spyOn or jest.fn()
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios, ...mockAxios };
});

// Clear in-memory SecureStore between tests
beforeEach(() => {
  secureStoreMap.clear();
});
