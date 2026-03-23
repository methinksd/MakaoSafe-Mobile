export const Colors = {
  primary: '#6C3CE1',
  primaryLight: '#8B5CF6',
  primaryDark: '#4C1D95',
  secondary: '#F59E0B',
  accent: '#10B981',

  background: '#F8F7FE',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',

  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  border: '#E2E8F0',
  borderFocus: '#6C3CE1',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Status badge colors
  statusPaid: '#10B981',
  statusPaidBg: '#D1FAE5',
  statusPending: '#F59E0B',
  statusPendingBg: '#FEF3C7',
  statusFailed: '#EF4444',
  statusFailedBg: '#FEE2E2',
  statusCompleted: '#6C3CE1',
  statusCompletedBg: '#EDE9FE',
  statusRefund: '#8B5CF6',
  statusRefundBg: '#EDE9FE',
  statusConfirmed: '#10B981',
  statusConfirmedBg: '#D1FAE5',
  statusCancelled: '#6B7280',
  statusCancelledBg: '#F3F4F6',

  // Listing type chips
  rental: '#3B82F6',
  rentalBg: '#DBEAFE',
  bnb: '#10B981',
  bnbBg: '#D1FAE5',
  sale: '#F59E0B',
  saleBg: '#FEF3C7',

  overlay: 'rgba(0,0,0,0.4)',
  card: '#FFFFFF',
  inputBg: '#F8FAFC',
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6C3CE1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};
