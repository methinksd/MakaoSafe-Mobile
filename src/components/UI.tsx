import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TextInput,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Image,
  ImageStyle,
} from 'react-native';
import { Colors, Radius, Shadow, Spacing, Typography } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

// ── Button ────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, style, textStyle, fullWidth = true,
}: ButtonProps) {
  const bg: Record<string, string> = {
    primary: Colors.primary,
    secondary: Colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: Colors.error,
  };
  const fg: Record<string, string> = {
    primary: '#fff',
    secondary: '#fff',
    outline: Colors.primary,
    ghost: Colors.primary,
    danger: '#fff',
  };
  const borderColor: Record<string, string | undefined> = {
    outline: Colors.primary,
    ghost: 'transparent',
  };
  const heights: Record<string, number> = { sm: 38, md: 48, lg: 56 };
  const fontSizes: Record<string, number> = { sm: 13, md: 15, lg: 16 };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bg[variant],
          height: heights[size],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: borderColor[variant],
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && Shadow.md,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <View style={styles.btnRow}>
          {icon && (
            <Ionicons name={icon} size={18} color={fg[variant]} style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.btnText,
              { color: fg[variant], fontSize: fontSizes[size] },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  label, error, leftIcon, rightIcon, onRightIconPress,
  containerStyle, style, ...rest
}: InputProps) {
  return (
    <View style={[styles.inputWrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={Colors.textMuted}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.inputField, leftIcon ? { paddingLeft: 4 } : null, style]}
          placeholderTextColor={Colors.textMuted}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.inputIconRight}>
            <Ionicons name={rightIcon} size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        style={[styles.card, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Badge ─────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = Colors.primary, bg = Colors.infoLight, size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color }, size === 'sm' && { fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

// ── LoadingSpinner ─────────────────────────────────────
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <View style={styles.spinner}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.spinnerText}>{message}</Text>}
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon = 'search-outline', title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={40} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          size="sm"
          fullWidth={false}
          style={{ marginTop: 16, paddingHorizontal: 24 }}
        />
      )}
    </View>
  );
}

const PLACEHOLDER_IMG = { uri: 'https://via.placeholder.com/400x300/DCD7F5/6C3CE1?text=MakaoSafe' };

// ── PropertyImage ─────────────────────────────────────
export function PropertyImage({ uri, style }: { uri?: string; style?: ImageStyle }) {
  return (
    <Image
      source={uri ? { uri } : PLACEHOLDER_IMG}
      style={[{ backgroundColor: Colors.border }, style]}
      resizeMode="cover"
    />
  );
}

// ── ListingTypeBadge ──────────────────────────────────
export function ListingTypeBadge({ type }: { type: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    RENTAL: { color: Colors.rental, bg: Colors.rentalBg },
    BNB: { color: Colors.bnb, bg: Colors.bnbBg },
    SALE: { color: Colors.sale, bg: Colors.saleBg },
  };
  const { color, bg } = map[type] || { color: Colors.primary, bg: Colors.infoLight };
  return <Badge label={type} color={color} bg={bg} size="sm" />;
}

// ── StatusBadge ────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    PAID:             { color: Colors.statusPaid,       bg: Colors.statusPaidBg,       label: 'Paid' },
    PENDING:          { color: Colors.statusPending,    bg: Colors.statusPendingBg,    label: 'Pending' },
    PAYMENT_FAILED:   { color: Colors.statusFailed,     bg: Colors.statusFailedBg,     label: 'Failed' },
    COMPLETED:        { color: Colors.statusCompleted,  bg: Colors.statusCompletedBg,  label: 'Completed' },
    REFUND_REQUESTED: { color: Colors.statusRefund,     bg: Colors.statusRefundBg,     label: 'Refund Req.' },
    CONFIRMED:        { color: Colors.statusConfirmed,  bg: Colors.statusConfirmedBg,  label: 'Confirmed' },
    CANCELLED:        { color: Colors.statusCancelled,  bg: Colors.statusCancelledBg,  label: 'Cancelled' },
  };
  const entry = map[status] || { color: Colors.textSecondary, bg: Colors.border, label: status };
  return <Badge label={entry.label} color={entry.color} bg={entry.bg} size="sm" />;
}

// ── Divider ────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── SectionHeader ──────────────────────────────────────
export function SectionHeader({
  title, action, onAction,
}: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontWeight: '600', letterSpacing: 0.2 },

  // Input
  inputWrap: { marginBottom: 14 },
  label: { ...Typography.label, color: Colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputError: { borderColor: Colors.error },
  inputIcon: { marginRight: 8 },
  inputIconRight: { marginLeft: 8, padding: 4 },
  inputField: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4, marginLeft: 2 },

  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Spinner
  spinner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  spinnerText: { color: Colors.textSecondary, fontSize: 14 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  // SectionHeader
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...Typography.h4, color: Colors.text },
  sectionAction: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
