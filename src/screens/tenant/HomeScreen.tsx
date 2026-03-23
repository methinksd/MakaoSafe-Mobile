import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, FlatList, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { propertyAPI } from '../../services/api';
import type { Property } from '../../types';
import { PropertyCard } from '../../components/PropertyCard';
import { LoadingSpinner, EmptyState, SectionHeader } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { Telemetry } from '../../utils/telemetry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LISTING_FILTERS = ['All', 'RENTAL', 'BNB', 'SALE'] as const;
type ListingFilter = typeof LISTING_FILTERS[number];

// ── Nearby state machine ──────────────────────────────────────
type NearbyState =
  | { phase: 'idle' }
  | { phase: 'requesting' }
  | { phase: 'loading' }
  | { phase: 'denied' }
  | { phase: 'done'; results: Property[] }
  | { phase: 'error' };

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ListingFilter>('All');
  const [nearby, setNearby] = useState<NearbyState>({ phase: 'idle' });

  // ── Data fetching ─────────────────────────────────────────
  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data);
    } catch (err) {
      console.warn('[HomeScreen] fetchProperties error:', err);
      Toast.show({ type: 'error', text1: 'Could not load properties', text2: 'Pull down to retry' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProperties();
    // Reset nearby so user can re-trigger if they moved
    setNearby({ phase: 'idle' });
    setRefreshing(false);
  }, []);

  // ── Nearby flow ───────────────────────────────────────────
  const handleNearby = async () => {
    if (nearby.phase === 'loading' || nearby.phase === 'requesting') return;

    setNearby({ phase: 'requesting' });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearby({ phase: 'denied' });
        Toast.show({
          type: 'info',
          text1: 'Location Permission Needed',
          text2: 'Enable location in Settings to find nearby properties',
          visibilityTime: 4000,
        });
        return;
      }

      setNearby({ phase: 'loading' });
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await propertyAPI.nearby(
        loc.coords.latitude,
        loc.coords.longitude,
        10 // 10 km radius
      );

      setNearby({ phase: 'done', results: res.data });
      Telemetry.nearbySearch(loc.coords.latitude, loc.coords.longitude, res.data.length);

      if (res.data.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No properties nearby',
          text2: 'No listings found within 10 km of your location',
        });
      }
    } catch (err) {
      console.warn('[HomeScreen] nearby error:', err);
      setNearby({ phase: 'error' });
      Toast.show({ type: 'error', text1: 'Location Error', text2: 'Could not fetch nearby properties' });
    }
  };

  // ── Derived lists ─────────────────────────────────────────
  const featured = properties.slice(0, 5);
  const filtered = activeFilter === 'All'
    ? properties.slice(0, 20)
    : properties.filter(p => p.listingType === activeFilter).slice(0, 20);

  if (loading) return <LoadingSpinner message="Loading properties..." />;

  const nearbyResults = nearby.phase === 'done' ? nearby.results : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* ── Hero header ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.fullName?.split(' ')[0] || 'there'} 👋
            </Text>
            <Text style={styles.heroTitle}>Find your perfect home</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/tenant/bookings')}
          >
            <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/tenant/browse')}
          activeOpacity={0.9}
        >
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search by location or type...</Text>
          <View style={styles.searchBtn}>
            <Ionicons name="options-outline" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Near Me section ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Near Me"
          action={nearby.phase === 'done' && nearbyResults.length > 0 ? `${nearbyResults.length} found` : undefined}
        />

        {nearby.phase === 'idle' || nearby.phase === 'denied' ? (
          <TouchableOpacity style={styles.nearbyCard} onPress={handleNearby} activeOpacity={0.85}>
            <View style={styles.nearbyIconWrap}>
              <Ionicons name="navigate" size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nearbyTitle}>Find properties near you</Text>
              <Text style={styles.nearbySubtitle}>
                {nearby.phase === 'denied'
                  ? 'Location access denied — tap to try again'
                  : 'Tap to search within 10 km of your location'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : nearby.phase === 'requesting' || nearby.phase === 'loading' ? (
          <View style={styles.nearbyLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.nearbyLoadingText}>
              {nearby.phase === 'requesting' ? 'Requesting location…' : 'Searching nearby…'}
            </Text>
          </View>
        ) : nearby.phase === 'error' ? (
          <TouchableOpacity style={styles.nearbyError} onPress={handleNearby}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.nearbyErrorText}>Failed to load — tap to retry</Text>
          </TouchableOpacity>
        ) : nearbyResults.length === 0 ? (
          <View style={styles.nearbyEmpty}>
            <Ionicons name="location-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.nearbyEmptyText}>No properties within 10 km of you</Text>
            <TouchableOpacity onPress={() => setNearby({ phase: 'idle' })}>
              <Text style={styles.nearbyReset}>Reset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={nearbyResults}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => `near-${item.id}`}
              renderItem={({ item }) => (
                <PropertyCard
                  property={item}
                  horizontal
                  onPress={() =>
                    router.push({ pathname: '/tenant/property/[id]', params: { id: item.id } })
                  }
                />
              )}
              contentContainerStyle={{ paddingRight: Spacing.md }}
            />
            <TouchableOpacity
              style={styles.nearbyReset}
              onPress={() => setNearby({ phase: 'idle' })}
            >
              <Text style={styles.nearbyResetText}>Clear nearby results</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Featured ── */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Featured Properties"
            action="See all"
            onAction={() => router.push('/tenant/browse')}
          />
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                horizontal
                onPress={() =>
                  router.push({ pathname: '/tenant/property/[id]', params: { id: item.id } })
                }
              />
            )}
            contentContainerStyle={{ paddingRight: Spacing.md }}
          />
        </View>
      )}

      {/* ── Filter chips + property list ── */}
      <View style={styles.section}>
        <SectionHeader title="Browse Properties" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {LISTING_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.section, styles.listSection]}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="No properties yet"
            subtitle="Check back soon for new listings in your area."
          />
        ) : (
          filtered.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              onPress={() =>
                router.push({ pathname: '/tenant/property/[id]', params: { id: p.id } })
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },

  hero: {
    backgroundColor: Colors.surface,
    paddingTop: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    ...Shadow.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  heroTitle: { ...Typography.h2, color: Colors.text },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.full,
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  searchPlaceholder: { flex: 1, color: Colors.textMuted, fontSize: 14 },
  searchBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  section: { paddingHorizontal: Spacing.md, marginBottom: 8 },
  listSection: { paddingTop: 4 },

  // Near Me
  nearbyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 8, borderWidth: 1.5,
    borderColor: Colors.primary + '40', ...Shadow.sm,
  },
  nearbyIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  nearbyTitle: { ...Typography.label, color: Colors.text, marginBottom: 3 },
  nearbySubtitle: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  nearbyLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 8,
  },
  nearbyLoadingText: { color: Colors.textSecondary, fontSize: 14 },
  nearbyError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 8,
  },
  nearbyErrorText: { color: Colors.error, fontSize: 13 },
  nearbyEmpty: {
    alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, marginBottom: 8,
  },
  nearbyEmptyText: { color: Colors.textMuted, fontSize: 13 },
  nearbyReset: { marginTop: 8, marginBottom: 4, alignSelf: 'center' },
  nearbyResetText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  filters: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
});
