import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, FlatList, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI } from '../../services/api';
import { PropertyCard } from '../../components/PropertyCard';
import { LoadingSpinner, EmptyState, SectionHeader } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LISTING_FILTERS = ['All', 'RENTAL', 'BNB', 'SALE'];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data);
    } catch {
      // silently fail, show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  }, []);

  const handleSearch = () => {
    if (search.trim()) router.push({ pathname: '/tenant/browse', params: { q: search.trim() } });
  };

  const featured = properties.slice(0, 5);
  const filtered = activeFilter === 'All'
    ? properties.slice(0, 20)
    : properties.filter(p => p.listingType === activeFilter).slice(0, 20);

  if (loading) return <LoadingSpinner message="Loading properties..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Hero Header */}
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

      {/* Featured / Recent */}
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
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                horizontal
                onPress={() => router.push({ pathname: '/tenant/property/[id]', params: { id: item.id } })}
              />
            )}
            contentContainerStyle={{ paddingRight: Spacing.md }}
          />
        </View>
      )}

      {/* Type filters */}
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

      {/* Property list */}
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
              onPress={() => router.push({ pathname: '/tenant/property/[id]', params: { id: p.id } })}
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchPlaceholder: { flex: 1, color: Colors.textMuted, fontSize: 14 },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { paddingHorizontal: Spacing.md, marginBottom: 8 },
  listSection: { paddingTop: 4 },

  filters: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
});
