import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { bookingAPI } from '../../services/api';
import { Card, EmptyState, LoadingSpinner, StatusBadge, Divider } from '../../components/UI';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';

const FILTERS = ['All', 'PENDING', 'PAID', 'COMPLETED', 'REFUND_REQUESTED', 'PAYMENT_FAILED'];

export default function LandlordBookingsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetch = async () => {
    try {
      const res = await bookingAPI.getLandlordBookings();
      setBookings(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, []);

  const displayed = filter === 'All' ? bookings : bookings.filter(b => b.status === filter);

  // Revenue summary
  const totalRevenue = bookings
    .filter(b => b.status === 'PAID' || b.status === 'COMPLETED')
    .reduce((s, b) => s + (b.escrowAmount || 0), 0);

  const renderBooking = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.propTitle} numberOfLines={1}>{item.propertyTitle}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.locationText}>{item.locationName}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Divider style={{ marginVertical: 10 }} />

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Check-in</Text>
          <Text style={styles.infoValue}>{item.startDate}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Check-out</Text>
          <Text style={styles.infoValue}>{item.endDate}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Amount</Text>
          <Text style={[styles.infoValue, { color: Colors.primary }]}>
            KES {Number(item.escrowAmount || item.price || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Escrow</Text>
          <Text style={[
            styles.infoValue,
            { color: item.escrowStatus === 'RELEASED' ? Colors.success :
              item.escrowStatus === 'HELD' ? Colors.info : Colors.textSecondary }
          ]}>
            {item.escrowStatus || '—'}
          </Text>
        </View>
      </View>

      {item.status === 'PAID' && item.escrowStatus === 'HELD' && (
        <View style={styles.heldNote}>
          <Ionicons name="lock-closed-outline" size={14} color={Colors.info} />
          <Text style={styles.heldText}>
            Funds held in escrow. Released when tenant confirms stay.
          </Text>
        </View>
      )}
      {item.escrowStatus === 'RELEASED' && (
        <View style={styles.releasedNote}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
          <Text style={styles.releasedText}>Payment has been released to you.</Text>
        </View>
      )}
      {item.status === 'REFUND_REQUESTED' && (
        <View style={styles.refundNote}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.statusRefund} />
          <Text style={styles.refundText}>Tenant has requested a refund. Contact support if disputed.</Text>
        </View>
      )}
    </Card>
  );

  if (loading) return <LoadingSpinner message="Loading bookings..." />;

  return (
    <View style={styles.container}>
      {/* Revenue banner */}
      <View style={styles.revenueBanner}>
        <View>
          <Text style={styles.revenueLabel}>Total Revenue (Escrow Released)</Text>
          <Text style={styles.revenueValue}>KES {Number(totalRevenue).toLocaleString()}</Text>
        </View>
        <View style={styles.revenueIcon}>
          <Ionicons name="trending-up" size={28} color={Colors.success} />
        </View>
      </View>

      {/* Filter chips */}
      <View>
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
                {f}
              </Text>
              {f !== 'All' && (
                <View style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f && { color: '#fff' }]}>
                    {bookings.filter(b => b.status === f).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={item => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No bookings found"
            subtitle={filter !== 'All' ? `No ${filter.toLowerCase()} bookings` : 'Bookings will appear here when tenants book your properties'}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  revenueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  revenueLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  revenueValue: { ...Typography.h2, color: Colors.text },
  revenueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterList: { paddingHorizontal: Spacing.md, paddingBottom: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

  list: { padding: Spacing.md, paddingTop: 4 },

  card: { marginBottom: 14, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  propTitle: { ...Typography.label, color: Colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: Colors.textMuted },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoBox: { minWidth: '40%' },
  infoLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '700', color: Colors.text },

  heldNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.infoLight,
    borderRadius: Radius.sm,
    padding: 10,
    marginTop: 10,
  },
  heldText: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 18 },
  releasedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: Radius.sm,
    padding: 10, marginTop: 10,
  },
  releasedText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  refundNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.statusRefundBg, borderRadius: Radius.sm,
    padding: 10, marginTop: 10,
  },
  refundText: { flex: 1, fontSize: 12, color: Colors.statusRefund, lineHeight: 18 },
});
