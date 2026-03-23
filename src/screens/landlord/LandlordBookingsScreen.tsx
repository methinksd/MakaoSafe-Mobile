import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { bookingAPI } from '../../services/api';
import { useApiCall } from '../../services/apiResponse';
import { BookingCard } from '../../components/BookingCard';
import { ScreenState } from '../../components/ScreenState';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';
import type { BookingResponse, BookingStatus } from '../../types';

const FILTERS: Array<'All' | BookingStatus> = [
  'All', 'PENDING', 'PAID', 'COMPLETED', 'REFUND_REQUESTED', 'PAYMENT_FAILED',
];

export default function LandlordBookingsScreen() {
  const [filter, setFilter] = React.useState<'All' | BookingStatus>('All');

  const {
    data: bookings,
    loading,
    error,
    refresh,
  } = useApiCall(() => bookingAPI.getLandlordBookings(), { context: 'LandlordBookingsScreen' });

  const displayed = React.useMemo(
    () => filter === 'All' ? (bookings ?? []) : (bookings ?? []).filter(b => b.status === filter),
    [bookings, filter]
  );

  const totalRevenue = React.useMemo(
    () => (bookings ?? [])
      .filter(b => b.status === 'PAID' || b.status === 'COMPLETED')
      .reduce((s, b) => s + Number(b.escrowAmount ?? 0), 0),
    [bookings]
  );

  const renderItem = useCallback(({ item }: { item: BookingResponse }) => (
    <BookingCard booking={item} variant="landlord" />
  ), []);

  const filterCount = useCallback((f: 'All' | BookingStatus) =>
    f === 'All' ? (bookings?.length ?? 0) : (bookings ?? []).filter(b => b.status === f).length,
    [bookings]
  );

  return (
    <View style={styles.container}>
      {/* Revenue banner */}
      <View style={styles.revenueBanner}>
        <View>
          <Text style={styles.revenueLabel}>Total Revenue (Released)</Text>
          <Text style={styles.revenueValue}>KES {totalRevenue.toLocaleString()}</Text>
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={f => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'All' ? 'All' : f.replace('_', ' ')}
            </Text>
            {f !== 'All' && filterCount(f) > 0 && (
              <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f && { color: '#fff' }]}>
                  {filterCount(f)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <ScreenState
        loading={loading}
        error={error}
        empty={!loading && !error && displayed.length === 0}
        onRetry={refresh}
        loadingMessage="Loading bookings…"
        emptyIcon="calendar-outline"
        emptyTitle="No bookings found"
        emptySubtitle={
          filter !== 'All'
            ? `No ${filter.replace('_', ' ').toLowerCase()} bookings`
            : 'Bookings will appear here when tenants book your properties'
        }
      >
        <FlatList
          data={displayed}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && (bookings?.length ?? 0) > 0}
              onRefresh={refresh}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  revenueBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.lg,
    padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.success,
  },
  revenueLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  revenueValue: { ...Typography.h2, color: Colors.text },

  filterList: { paddingHorizontal: Spacing.md, paddingBottom: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  filterBadge: {
    backgroundColor: Colors.background, borderRadius: Radius.full,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

  list: { padding: Spacing.md, paddingTop: 4 },
});
