import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { propertyAPI } from '../../services/api';
import { Button, Input } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';

const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'STUDIO', 'BEDSITTER', 'SINGLE_ROOM', 'VILLA', 'COMMERCIAL'];
const LISTING_TYPES = ['RENTAL', 'BNB', 'SALE'];
const AMENITY_OPTIONS = [
  'WiFi', 'Parking', 'Security', 'Water 24/7', 'Electricity', 'DSTV',
  'Gym', 'Swimming Pool', 'Backup Generator', 'CCTV', 'Furnished', 'Borehole',
];

export default function AddPropertyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [bookingFee, setBookingFee] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [propertyType, setPropertyType] = useState('APARTMENT');
  const [listingType, setListingType] = useState('RENTAL');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing property for edit
  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const res = await propertyAPI.getById(Number(id));
          const p = res.data;
          setTitle(p.title || '');
          setDescription(p.description || '');
          setPrice(String(p.price || ''));
          setDeposit(String(p.deposit || ''));
          setBookingFee(String(p.bookingFee || ''));
          setLocationName(p.locationName || '');
          setLatitude(String(p.latitude || ''));
          setLongitude(String(p.longitude || ''));
          setPropertyType(p.propertyType || 'APARTMENT');
          setListingType(p.listingType || 'RENTAL');
          setSelectedAmenities(p.amenities || []);
          setExistingImageUrls([p.imageUrl, ...(p.imageUrls || [])].filter(Boolean));
        } catch {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load property' });
          router.back();
        } finally {
          setFetchLoading(false);
        }
      })();
    }
  }, [id]);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload property images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });
    if (!result.canceled) {
      const newImgs = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
      }));
      setImages(prev => [...prev, ...newImgs].slice(0, 8));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!price || isNaN(Number(price)) || Number(price) <= 0) e.price = 'Enter a valid price';
    if (!locationName.trim()) e.locationName = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fix the errors below' });
      return;
    }
    setLoading(true);
    const data = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      deposit: deposit ? Number(deposit) : null,
      bookingFee: bookingFee ? Number(bookingFee) : null,
      locationName: locationName.trim(),
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      propertyType,
      listingType,
      amenities: selectedAmenities,
    };

    try {
      if (isEdit) {
        await propertyAPI.update(Number(id), data, images);
        Toast.show({ type: 'success', text1: 'Updated!', text2: 'Property updated successfully' });
      } else {
        await propertyAPI.create(data, images);
        Toast.show({ type: 'success', text1: 'Listed!', text2: 'Property added successfully' });
      }
      router.push('/landlord/listings');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save property. Please try again.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading property...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Property' : 'Add Property'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label="Property Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Modern 2BR Apartment in Kilimani"
            leftIcon="home-outline"
            error={errors.title}
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your property..."
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
            leftIcon="document-text-outline"
          />
        </View>

        {/* Listing Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
          <View style={styles.chipRow}>
            {LISTING_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, listingType === t && styles.typeChipActive]}
                onPress={() => setListingType(t)}
              >
                <Text style={[styles.typeChipText, listingType === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Property Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.chipRow}>
            {PROPERTY_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, propertyType === t && styles.typeChipActive]}
                onPress={() => setPropertyType(t)}
              >
                <Text style={[styles.typeChipText, propertyType === t && styles.typeChipTextActive]}>
                  {t.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing (KES)</Text>
          <Input
            label="Price *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="e.g. 25000"
            leftIcon="cash-outline"
            error={errors.price}
          />
          <View style={styles.row2}>
            <Input
              label="Deposit"
              value={deposit}
              onChangeText={setDeposit}
              keyboardType="numeric"
              placeholder="Optional"
              leftIcon="wallet-outline"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Booking Fee"
              value={bookingFee}
              onChangeText={setBookingFee}
              keyboardType="numeric"
              placeholder="Optional"
              leftIcon="receipt-outline"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Location Name *"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="e.g. Kilimani, Nairobi"
            leftIcon="location-outline"
            error={errors.locationName}
          />
          <View style={styles.row2}>
            <Input
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
              placeholder="-1.2921"
              leftIcon="navigate-outline"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
              placeholder="36.8219"
              leftIcon="navigate-outline"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITY_OPTIONS.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.amenityChip, selectedAmenities.includes(a) && styles.amenityChipActive]}
                onPress={() => toggleAmenity(a)}
              >
                {selectedAmenities.includes(a) && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
                <Text style={[styles.amenityText, selectedAmenities.includes(a) && styles.amenityTextActive]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Images</Text>
          <Text style={styles.sectionSub}>Upload up to 8 photos. First image will be the cover.</Text>

          {/* Existing images (edit mode) */}
          {existingImageUrls.length > 0 && (
            <View style={styles.imagesGrid}>
              {existingImageUrls.map((uri, i) => (
                <View key={`existing-${i}`} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  {i === 0 && (
                    <View style={styles.coverBadge}><Text style={styles.coverText}>Cover</Text></View>
                  )}
                  <TouchableOpacity style={styles.removeImg} onPress={() => removeExistingImage(i)}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* New images */}
          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((img, i) => (
                <View key={`new-${i}`} style={styles.imageThumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImg} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.uploadText}>
              {images.length + existingImageUrls.length > 0 ? 'Add More Photos' : 'Select Photos'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <Button
          title={isEdit ? 'Save Changes' : 'List Property'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          icon={isEdit ? 'save-outline' : 'add-circle-outline'}
          style={{ marginTop: 8, marginBottom: 32 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...Typography.h3, color: Colors.text },

  container: { flex: 1 },
  content: { padding: Spacing.md },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: 14 },
  sectionSub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, marginTop: -10 },

  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  amenityChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amenityText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  amenityTextActive: { color: '#fff' },

  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  imageThumb: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(108,60,225,0.85)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  coverText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  removeImg: { position: 'absolute', top: 4, right: 4 },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 20,
    backgroundColor: Colors.primary + '08',
  },
  uploadText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
});
