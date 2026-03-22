import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI } from '../../services/api';
import { PropertyCard } from '../../components/PropertyCard';
import { EmptyState, LoadingSpinner } from '../../components/UI';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';

export default function BrowseScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [search, setSearch] = useState(q || '');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeType, setActiveType] = useState('All');

  const TYPES = ['All', 'RENTAL', 'BNB', 'SALE'];

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data);
    } catch {}
    setLoading(false);
  };

  const doSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) { loadAll(); return; }
    setSearching(true);
    try {
      const res = await propertyAPI.search(keyword.trim());
      setProperties(res.data);
    } catch {}
    setSearching(false);
  }, []);

  useEffect(() => {
    if (q) doSearch(q);
    else loadAll();
  }, [q]);

  const handleSearchSubmit = () => doSearch(search);

  const displayList = activeType === 'All'
    ? properties
    : properties.filter(p => p.listingType === activeType);

  return (
    <View style={styles.container}>
      {/* Search header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search properties..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            autoFocus={!q}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadAll(); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchSubmit} onPress={handleSearchSubmit}>
          {searching
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="search" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Type filter chips */}
      <View style={styles.filterRow}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, activeType === t && styles.chipActive]}
            onPress={() => setActiveType(t)}
          >
            <Text style={[styles.chipText, activeType === t && styles.chipTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>{displayList.length} results</Text>
      </View>

      {/* Results */}
      {loading ? (
        <LoadingSpinner message="Loading properties..." />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push({ pathname: '/tenant/property/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              title={search ? `No results for "${search}"` : 'No properties found'}
              subtitle="Try a different search term or filter"
              action={{ label: 'Clear Search', onPress: () => { setSearch(''); loadAll(); } }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, height: 42 },
  searchSubmit: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  countText: { flex: 1, textAlign: 'right', fontSize: 12, color: Colors.textMuted },

  list: { padding: Spacing.md },
});
