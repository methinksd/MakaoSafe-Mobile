import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { propertyAPI } from '../../services/api';
import { useApiCall, callApi, handleApiError } from '../../services/apiResponse';
import { ScreenState } from '../../components/ScreenState';
import { Telemetry } from '../../utils/telemetry';
import { Card, ListingTypeBadge, Button } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';

export default function MyListingsScreen() {
  const router = useRouter();
  const {
    data: properties,
    loading,
    error,
    refresh,
  } = useApiCall(() => propertyAPI.getMyListings(), { context: 'MyListingsScreen' });

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            (async () => {
              Telemetry.propertyDelete(id);
              const result = await callApi(() => propertyAPI.delete(id), 'deleteProperty');
              if (result.ok) {
                Toast.show({ type: 'success', text1: 'Deleted', text2: 'Property removed successfully' });
                refresh();
              } else {
                handleApiError(result, { title: 'Delete Failed' });
              }
            })();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/landlord/edit-property/[id]', params: { id: item.id } })}
      >
        <View style={styles.imageWrap}>
          <Image
            source={item.imageUrl ? { uri: item.imageUrl } : { uri: 'https://via.placeholder.com/400x300/DCD7F5/6C3CE1?text=MakaoSafe' }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageBadges}>
            <ListingTypeBadge type={item.listingType} />
          </View>
          {item.isVerified && (
            <View style={styles.verifiedOverlay}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{item.locationName}</Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>KES {Number(item.price).toLocaleString()}</Text>
            </View>
            {item.deposit && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>Deposit</Text>
                <Text style={styles.detailValue}>KES {Number(item.deposit).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{item.propertyType?.replace('_', ' ') || '—'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/landlord/edit-property/[id]', params: { id: item.id } })}
        >
          <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
          <Text style={[styles.actionText, { color: Colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/tenant/property/[id]', params: { id: item.id } })}
        >
          <Ionicons name="eye-outline" size={16} color={Colors.info} />
          <Text style={[styles.actionText, { color: Colors.info }]}>Preview</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id, item.title)}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSub}>{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/landlord/add-property')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={properties}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="home-outline"
            title="No properties yet"
            subtitle="Add your first property to start receiving bookings"
            action={{ label: 'Add Property', onPress: () => router.push('/landlord/add-property') }}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h2, color: Colors.text },
  headerSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  list: { padding: Spacing.md },

  card: { marginBottom: 16, padding: 0 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 180, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  imageBadges: { position: 'absolute', top: 10, left: 10 },
  verifiedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  body: { padding: 14 },
  title: { ...Typography.h4, color: Colors.text, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 12 },
  locationText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },

  detailsRow: { flexDirection: 'row', gap: 16 },
  detail: {},
  detailLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.text },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  actionDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 8 },
});
