/**
 * ScreenState — standardized loading, error, and empty states.
 *
 * Replaces the pattern of:
 *   if (loading) return <LoadingSpinner />;
 *   // ... render real content
 *   <EmptyState ... />
 *
 * with a single component that handles all three states consistently
 * and always provides a retry action for error states.
 *
 * Usage:
 *   <ScreenState
 *     loading={loading}
 *     error={error}
 *     empty={bookings.length === 0}
 *     onRetry={refresh}
 *     emptyIcon="calendar-outline"
 *     emptyTitle="No bookings yet"
 *     emptySubtitle="Browse properties and make your first booking"
 *     emptyAction={{ label: 'Browse', onPress: () => router.push('/tenant/browse') }}
 *   >
 *     {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
 *   </ScreenState>
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../utils/theme';

// ── Types ─────────────────────────────────────────────────────

interface ScreenStateProps {
  /** Show the full-screen loading spinner */
  loading: boolean;
  /** When non-null, shows the error state with a retry button */
  error?: string | null;
  /** When true and not loading/error, shows the empty state */
  empty?: boolean;
  /** Called when the user taps Retry in the error state */
  onRetry?: () => void;
  /** Loading spinner message */
  loadingMessage?: string;
  /** Icon for the empty state (Ionicons name) */
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  /** Heading for the empty state */
  emptyTitle: string;
  /** Optional subtitle for the empty state */
  emptySubtitle?: string;
  /** Optional CTA button in the empty state */
  emptyAction?: { label: string; onPress: () => void };
  /** Content rendered when not loading, not errored, and not empty */
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────

export function ScreenState({
  loading,
  error,
  empty,
  onRetry,
  loadingMessage = 'Loading…',
  emptyIcon = 'search-outline',
  emptyTitle,
  emptySubtitle,
  emptyAction,
  children,
}: ScreenStateProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.error} />
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={emptyIcon} size={38} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        {emptySubtitle && <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>}
        {emptyAction && (
          <TouchableOpacity style={styles.actionBtn} onPress={emptyAction.onPress} activeOpacity={0.8}>
            <Text style={styles.actionText}>{emptyAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },

  // Loading
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Error
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Empty
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
