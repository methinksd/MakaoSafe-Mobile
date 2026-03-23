import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI, bookingAPI } from '../../services/api';
import { useApiCall } from '../../services/apiResponse';
import { ScreenState } from '../../components/ScreenState';
import { Card, SectionHeader, StatusBadge } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LandlordDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    data: properties, loading: propsLoading, error: propsError, refresh: refreshProps,
  } = useApiCall(() => propertyAPI.getMyListings(), { context: 'DashboardScreen:properties' });

  const {
    data: bookings, loading: booksLoading, error: booksError, refresh: refreshBookings,
  } = useApiCall(() => bookingAPI.getLandlordBookings(), { context: 'DashboardScreen:bookings' });

  const loading = propsLoading || booksLoading;
  const error = propsError || booksError;
  const refresh = () => { refreshProps(); refreshBookings(); };

  // Metrics
  const totalRevenue = (bookings ?? [])
    .filter(b => b.status === 'PAID' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.escrowAmount || 0), 0);
  const pendingBookings = (bookings ?? []).filter(b => b.status === 'PENDING').length;
  const paidBookings = (bookings ?? []).filter(b => b.status === 'PAID').length;

  const allProperties = properties ?? [];
  const allBookings = bookings ?? [];
  const stats = [
    { label: 'Listings', value: allProperties.length, icon: 'home', color: Colors.primary },
    { label: 'Bookings', value: allBookings.length, icon: 'calendar', color: Colors.info },
    { label: 'Pending', value: pendingBookings, icon: 'time', color: Colors.warning },
    { label: 'Revenue', value: `KES ${(totalRevenue / 1000).toFixed(0)}K`, icon: 'cash', color: Colors.success },
  ];



  return (
    <ScreenState
      loading={loading && !properties && !bookings}
      error={!loading ? error : null}
      onRetry={refresh}
      loadingMessage="Loading dashboard…"
      emptyTitle="Dashboard"
    >
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading && Boolean(properties || bookings)} onRefresh={refresh} colors={[Colors.primary]} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.name}>{user?.fullName?.split(' ')[0] || 'Landlord'}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/landlord/add-property')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {stats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon as any} size={22} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsRow}>
          {[
            { icon: 'add-circle-outline', label: 'Add Property', route: '/landlord/add-property' },
            { icon: 'list-outline', label: 'My Listings', route: '/landlord/listings' },
            { icon: 'calendar-outline', label: 'Bookings', route: '/landlord/bookings' },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon as any} size={26} color={Colors.primary} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent bookings */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Bookings"
          action="View All"
          onAction={() => router.push('/landlord/bookings')}
        />
        {allBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </Card>
        ) : (
          allBookings.slice(0, 3).map(b => (
            <Card key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingTitle} numberOfLines={1}>{b.propertyTitle}</Text>
                  <Text style={styles.bookingDates}>{b.startDate} → {b.endDate}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <StatusBadge status={b.status} />
                  <Text style={styles.bookingAmount}>
                    KES {Number(b.escrowAmount || b.price || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Recent listings */}
      <View style={styles.section}>
        <SectionHeader
          title="My Listings"
          action="View All"
          onAction={() => router.push('/landlord/listings')}
        />
        {allProperties.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="home-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No properties listed yet</Text>
          </Card>
        ) : (
          allProperties.slice(0, 3).map(p => (
            <Card
              key={p.id}
              style={styles.propertyCard}
              onPress={() => router.push({ pathname: '/landlord/edit-property/[id]', params: { id: p.id } })}
            >
              <View style={styles.propertyRow}>
                <View style={[styles.propIcon, { backgroundColor: Colors.primary + '18' }]}>
                  <Ionicons name="home" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propTitle} numberOfLines={1}>{p.title}</Text>
                  <Text style={styles.propLocation} numberOfLines={1}>{p.locationName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.propPrice}>KES {Number(p.price).toLocaleString()}</Text>
                  {p.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
    </ScreenState>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    ...Shadow.sm,
  },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  name: { ...Typography.h2, color: Colors.text },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'flex-start',
    ...Shadow.sm,
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { ...Typography.h2, color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },

  section: { paddingHorizontal: Spacing.md, marginBottom: 20 },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    ...Shadow.sm,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },

  emptyCard: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  bookingCard: { marginBottom: 10, padding: 14 },
  bookingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bookingTitle: { ...Typography.label, color: Colors.text, marginBottom: 3 },
  bookingDates: { fontSize: 12, color: Colors.textMuted },
  bookingAmount: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  propertyCard: { marginBottom: 10, padding: 14 },
  propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  propIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  propTitle: { ...Typography.label, color: Colors.text, marginBottom: 2 },
  propLocation: { fontSize: 12, color: Colors.textMuted },
  propPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  verifiedText: { fontSize: 10, color: Colors.success, fontWeight: '600' },
});
