import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography } from '../utils/theme';
import { ListingTypeBadge } from './UI';

const PLACEHOLDER = { uri: 'https://via.placeholder.com/400x300/DCD7F5/6C3CE1?text=MakaoSafe' };

interface Property {
  id: number;
  title: string;
  locationName: string;
  price: number;
  imageUrl?: string;
  listingType: string;
  propertyType?: string;
  amenities?: string[];
  isVerified?: boolean;
  landlordName?: string;
}

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  horizontal?: boolean;
}

export function PropertyCard({ property, onPress, horizontal = false }: PropertyCardProps) {
  const imageUri = property.imageUrl || null;

  if (horizontal) {
    return (
      <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.hCard, Shadow.sm]}>
        <Image
          source={imageUri ? { uri: imageUri } : PLACEHOLDER}
          style={styles.hImage}
          resizeMode="cover"
        />
        <View style={styles.hBody}>
          <View style={styles.hTop}>
            <ListingTypeBadge type={property.listingType} />
            {property.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.hTitle} numberOfLines={1}>{property.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{property.locationName}</Text>
          </View>
          <Text style={styles.hPrice}>
            KES {Number(property.price).toLocaleString()}
            <Text style={styles.priceSuffix}>
              {property.listingType === 'RENTAL' ? '/mo' : property.listingType === 'BNB' ? '/night' : ''}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.card, Shadow.sm]}>
      <View style={styles.imageContainer}>
        <Image
          source={imageUri ? { uri: imageUri } : PLACEHOLDER}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.imageBadges}>
          <ListingTypeBadge type={property.listingType} />
        </View>
        {property.isVerified && (
          <View style={styles.verifiedOverlay}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{property.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>{property.locationName}</Text>
        </View>
        {property.amenities && property.amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {property.amenities.slice(0, 3).map((a, i) => (
              <View key={i} style={styles.amenityChip}>
                <Text style={styles.amenityText}>{a}</Text>
              </View>
            ))}
            {property.amenities.length > 3 && (
              <Text style={styles.moreText}>+{property.amenities.length - 3}</Text>
            )}
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.price}>
            KES {Number(property.price).toLocaleString()}
            <Text style={styles.priceSuffix}>
              {property.listingType === 'RENTAL' ? '/mo' : property.listingType === 'BNB' ? '/night' : ''}
            </Text>
          </Text>
          {property.landlordName && (
            <View style={styles.landlordRow}>
              <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.landlordText}>{property.landlordName}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Vertical card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200 },
  imageBadges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  verifiedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
    padding: 4,
  },
  body: { padding: 14 },
  title: { ...Typography.h4, color: Colors.text, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  locationText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  amenityChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amenityText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  moreText: { fontSize: 11, color: Colors.textMuted, alignSelf: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...Typography.h4, color: Colors.primary },
  priceSuffix: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  landlordText: { fontSize: 12, color: Colors.textMuted },

  // Horizontal card
  hCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    width: 280,
    marginRight: 14,
    height: 120,
  },
  hImage: { width: 100, height: 120 },
  hBody: { flex: 1, padding: 10, justifyContent: 'space-between' },
  hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hTitle: { ...Typography.label, color: Colors.text, marginTop: 4 },
  hPrice: { ...Typography.label, color: Colors.primary, fontSize: 14 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 10, color: Colors.success, fontWeight: '600' },
});
