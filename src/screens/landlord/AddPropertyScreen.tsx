import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { propertyAPI } from '../../services/api';
import { extractErrorMessage } from '../../types';
import { Telemetry } from '../../utils/telemetry';
import type { CreatePropertyRequest, PropertyType, ListingType, PropertyImage } from '../../types';
import { Button, Input } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';

// ── Constants ─────────────────────────────────────────────────
const PROPERTY_TYPES: PropertyType[] = [
  'APARTMENT', 'HOUSE', 'STUDIO', 'BEDSITTER', 'SINGLE_ROOM', 'VILLA', 'COMMERCIAL',
];
const LISTING_TYPES: ListingType[] = ['RENTAL', 'BNB', 'SALE'];
const AMENITY_OPTIONS = [
  'WiFi', 'Parking', 'Security', 'Water 24/7', 'Electricity', 'DSTV',
  'Gym', 'Swimming Pool', 'Backup Generator', 'CCTV', 'Furnished', 'Borehole',
];

// Kenya bounding box for lat/lng sanity check
const KE_LAT = { min: -4.68, max: 4.62 };
const KE_LNG = { min: 33.91, max: 41.9 };

// ── Validation ────────────────────────────────────────────────
interface FormErrors {
  title?: string;
  price?: string;
  deposit?: string;
  bookingFee?: string;
  locationName?: string;
  latitude?: string;
  longitude?: string;
  amenities?: string;
  images?: string;
}

function validateForm(fields: {
  title: string;
  price: string;
  deposit: string;
  bookingFee: string;
  locationName: string;
  latitude: string;
  longitude: string;
  selectedAmenities: string[];
  images: PropertyImage[];
  existingImageUrls: string[];
  listingType: ListingType;
  isEdit: boolean;
}): FormErrors {
  const e: FormErrors = {};
  const { title, price, deposit, bookingFee, locationName, latitude, longitude,
    selectedAmenities, images, existingImageUrls, listingType, isEdit } = fields;

  // Title: 5–100 chars, no pure-number titles
  if (!title.trim()) {
    e.title = 'Title is required';
  } else if (title.trim().length < 5) {
    e.title = 'Title must be at least 5 characters';
  } else if (title.trim().length > 100) {
    e.title = 'Title must be 100 characters or fewer';
  }

  // Price: positive integer, max 100M KES
  const priceNum = Number(price);
  if (!price.trim()) {
    e.price = 'Price is required';
  } else if (isNaN(priceNum) || priceNum <= 0) {
    e.price = 'Price must be a positive number';
  } else if (!Number.isInteger(priceNum)) {
    e.price = 'Price must be a whole number (KES)';
  } else if (priceNum > 100_000_000) {
    e.price = 'Price seems too high — check the value';
  }

  // Deposit: optional but must be positive integer if provided
  if (deposit.trim()) {
    const depNum = Number(deposit);
    if (isNaN(depNum) || depNum <= 0) {
      e.deposit = 'Deposit must be a positive number';
    } else if (!Number.isInteger(depNum)) {
      e.deposit = 'Deposit must be a whole number (KES)';
    } else if (depNum > priceNum * 6) {
      e.deposit = 'Deposit seems high relative to price — check the value';
    }
  }

  // Booking fee: optional, must be positive and reasonable
  if (bookingFee.trim()) {
    const feeNum = Number(bookingFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      e.bookingFee = 'Booking fee must be a positive number';
    } else if (!Number.isInteger(feeNum)) {
      e.bookingFee = 'Booking fee must be a whole number (KES)';
    } else if (feeNum > priceNum) {
      e.bookingFee = 'Booking fee cannot exceed the property price';
    }
  }

  // BnB requires booking fee for per-night calc
  if (listingType === 'BNB' && !bookingFee.trim() && !deposit.trim()) {
    // Not an error, just informational — skip
  }

  // Location name
  if (!locationName.trim()) {
    e.locationName = 'Location name is required';
  } else if (locationName.trim().length < 3) {
    e.locationName = 'Location name must be at least 3 characters';
  }

  // Latitude: optional but must be valid Kenya range if provided
  if (latitude.trim()) {
    const lat = Number(latitude);
    if (isNaN(lat)) {
      e.latitude = 'Latitude must be a number';
    } else if (lat < KE_LAT.min || lat > KE_LAT.max) {
      e.latitude = `Latitude must be between ${KE_LAT.min} and ${KE_LAT.max} (Kenya range)`;
    }
  }

  // Longitude
  if (longitude.trim()) {
    const lng = Number(longitude);
    if (isNaN(lng)) {
      e.longitude = 'Longitude must be a number';
    } else if (lng < KE_LNG.min || lng > KE_LNG.max) {
      e.longitude = `Longitude must be between ${KE_LNG.min} and ${KE_LNG.max} (Kenya range)`;
    }
  }

  // Both lat and lng must be provided together or neither
  if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
    e.latitude = 'Provide both latitude and longitude, or neither';
    e.longitude = 'Provide both latitude and longitude, or neither';
  }

  // Images: required for new listings
  const totalImages = images.length + existingImageUrls.length;
  if (!isEdit && totalImages === 0) {
    e.images = 'Please upload at least one photo of the property';
  }

  return e;
}

// ── Geocoding via Nominatim (no API key) ──────────────────────
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeLocationName(name: string): Promise<NominatimResult | null> {
  try {
    // Bias results toward Kenya
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name + ', Kenya')}&format=json&limit=1&countrycodes=ke`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MakaoSafe Mobile App (contact@makaosafe.co.ke)' },
    });
    const data: NominatimResult[] = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ── Screen ────────────────────────────────────────────────────
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
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [listingType, setListingType] = useState<ListingType>('RENTAL');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState<FormErrors>({});

  // Geo state
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Load existing property for edit
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await propertyAPI.getById(Number(id));
        const p = res.data;
        setTitle(p.title ?? '');
        setDescription(p.description ?? '');
        setPrice(String(p.price ?? ''));
        setDeposit(p.deposit ? String(p.deposit) : '');
        setBookingFee(p.bookingFee ? String(p.bookingFee) : '');
        setLocationName(p.locationName ?? '');
        setLatitude(p.latitude ? String(p.latitude) : '');
        setLongitude(p.longitude ? String(p.longitude) : '');
        setPropertyType((p.propertyType as PropertyType) ?? 'APARTMENT');
        setListingType(p.listingType ?? 'RENTAL');
        setSelectedAmenities(p.amenities ?? []);
        setExistingImageUrls(
          [p.imageUrl, ...(p.imageUrls ?? [])].filter((u): u is string => Boolean(u))
        );
      } catch (err) {
        const msg = extractErrorMessage(err, 'Could not load property');
        Toast.show({ type: 'error', text1: 'Error', text2: msg });
        router.back();
      } finally {
        setFetchLoading(false);
      }
    })();
  }, [id]);

  // ── Geo helpers ────────────────────────────────────────────
  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to auto-fill coordinates.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude.toFixed(6);
      const lng = loc.coords.longitude.toFixed(6);
      setLatitude(lat);
      setLongitude(lng);

      // Reverse geocode to get a human-readable name
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address && !locationName.trim()) {
        const parts = [address.district, address.city, address.region].filter(Boolean);
        if (parts.length > 0) setLocationName(parts.join(', '));
      }

      Toast.show({ type: 'success', text1: 'Location set', text2: `${lat}, ${lng}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Location Error', text2: 'Could not get current location' });
    } finally {
      setLocating(false);
    }
  };

  const geocodeFromName = async () => {
    if (!locationName.trim()) {
      Toast.show({ type: 'info', text1: 'Enter a location name first' });
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeLocationName(locationName.trim());
      if (result) {
        setLatitude(parseFloat(result.lat).toFixed(6));
        setLongitude(parseFloat(result.lon).toFixed(6));
        Toast.show({ type: 'success', text1: 'Coordinates found', text2: result.display_name.slice(0, 60) });
      } else {
        Toast.show({ type: 'error', text1: 'Not found', text2: 'Could not find coordinates for this location in Kenya' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Geocoding failed', text2: 'Check your internet connection' });
    } finally {
      setGeocoding(false);
    }
  };

  // ── Amenities ──────────────────────────────────────────────
  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  // ── Images ─────────────────────────────────────────────────
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
      const newImgs: PropertyImage[] = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName ?? `image_${Date.now()}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
      }));
      setImages(prev => [...prev, ...newImgs].slice(0, 8));
      // Clear image error if now satisfied
      if (errors.images) setErrors(e => ({ ...e, images: undefined }));
    }
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    const formErrors = validateForm({
      title, price, deposit, bookingFee, locationName,
      latitude, longitude, selectedAmenities, images,
      existingImageUrls, listingType, isEdit,
    });

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      Toast.show({ type: 'error', text1: 'Fix the errors below', text2: 'Scroll up to see all fields' });
      return;
    }

    setErrors({});
    setLoading(true);

    const data: CreatePropertyRequest = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      deposit: deposit.trim() ? Number(deposit) : null,
      bookingFee: bookingFee.trim() ? Number(bookingFee) : null,
      locationName: locationName.trim(),
      latitude: latitude.trim() ? Number(latitude) : 0,
      longitude: longitude.trim() ? Number(longitude) : 0,
      propertyType,
      listingType,
      amenities: selectedAmenities,
      imageUrls: existingImageUrls,
    };

    if (isEdit) {
      Telemetry.propertyEditStart(Number(id));
    } else {
      Telemetry.propertyCreateStart(listingType, propertyType);
    }

    try {
      if (isEdit) {
        const res = await propertyAPI.update(Number(id), data, images);
        Telemetry.propertyEditSuccess(Number(id));
        Toast.show({ type: 'success', text1: 'Updated!', text2: 'Property updated successfully' });
      } else {
        const res = await propertyAPI.create(data, images);
        Telemetry.propertyCreateSuccess(res.data?.id ?? 0, listingType);
        Toast.show({ type: 'success', text1: 'Listed!', text2: 'Property added successfully' });
      }
      router.push('/landlord/listings');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to save property. Please try again.');
      if (!isEdit) Telemetry.propertyCreateFailure(msg);
      Toast.show({ type: 'error', text1: 'Save Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading property…</Text>
      </View>
    );
  }

  const totalImages = images.length + existingImageUrls.length;

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

        {/* ── Basic Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Property Title *"
            value={title}
            onChangeText={t => { setTitle(t); if (errors.title) setErrors(e => ({ ...e, title: undefined })); }}
            placeholder="e.g. Modern 2BR Apartment in Kilimani"
            leftIcon="home-outline"
            error={errors.title}
          />
          <Text style={styles.charCount}>{title.trim().length}/100 characters</Text>
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your property, neighbourhood, and what makes it special…"
            multiline
            numberOfLines={4}
            style={{ height: 110, textAlignVertical: 'top' }}
            leftIcon="document-text-outline"
          />
        </View>

        {/* ── Listing Type ── */}
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
                  {t === 'BNB' ? 'BnB / Airbnb' : t === 'RENTAL' ? 'Long-term Rental' : 'For Sale'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Property Type ── */}
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

        {/* ── Pricing ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing (KES)</Text>
          <Input
            label={`Price * (${listingType === 'RENTAL' ? 'per month' : listingType === 'BNB' ? 'per night' : 'sale price'})`}
            value={price}
            onChangeText={p => { setPrice(p); if (errors.price) setErrors(e => ({ ...e, price: undefined })); }}
            keyboardType="numeric"
            placeholder="e.g. 25000"
            leftIcon="cash-outline"
            error={errors.price}
          />
          <View style={styles.row2}>
            <Input
              label="Deposit (optional)"
              value={deposit}
              onChangeText={d => { setDeposit(d); if (errors.deposit) setErrors(e => ({ ...e, deposit: undefined })); }}
              keyboardType="numeric"
              placeholder="e.g. 50000"
              leftIcon="wallet-outline"
              error={errors.deposit}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Booking Fee (optional)"
              value={bookingFee}
              onChangeText={f => { setBookingFee(f); if (errors.bookingFee) setErrors(e => ({ ...e, bookingFee: undefined })); }}
              keyboardType="numeric"
              placeholder="e.g. 2000"
              leftIcon="receipt-outline"
              error={errors.bookingFee}
              containerStyle={{ flex: 1 }}
            />
          </View>
          {listingType === 'BNB' && (
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.info} />
              <Text style={styles.infoNoteText}>
                For BnBs the nightly price × number of nights is charged. The booking fee is optional.
              </Text>
            </View>
          )}
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <Input
            label="Location Name *"
            value={locationName}
            onChangeText={n => { setLocationName(n); if (errors.locationName) setErrors(e => ({ ...e, locationName: undefined })); }}
            placeholder="e.g. Kilimani, Nairobi"
            leftIcon="location-outline"
            error={errors.locationName}
          />

          {/* Geocoding assist buttons */}
          <View style={styles.geoButtons}>
            <TouchableOpacity
              style={[styles.geoBtn, styles.geoBtnSecondary]}
              onPress={geocodeFromName}
              disabled={geocoding || locating}
            >
              {geocoding
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Ionicons name="search-outline" size={16} color={Colors.primary} />}
              <Text style={styles.geoBtnText}>Find Coordinates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.geoBtn, styles.geoBtnPrimary]}
              onPress={useMyLocation}
              disabled={locating || geocoding}
            >
              {locating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="navigate" size={16} color="#fff" />}
              <Text style={[styles.geoBtnText, { color: '#fff' }]}>Use My Location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row2}>
            <Input
              label="Latitude"
              value={latitude}
              onChangeText={v => { setLatitude(v); if (errors.latitude) setErrors(e => ({ ...e, latitude: undefined })); }}
              keyboardType="decimal-pad"
              placeholder="-1.2921"
              leftIcon="navigate-outline"
              error={errors.latitude}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Longitude"
              value={longitude}
              onChangeText={v => { setLongitude(v); if (errors.longitude) setErrors(e => ({ ...e, longitude: undefined })); }}
              keyboardType="decimal-pad"
              placeholder="36.8219"
              leftIcon="navigate-outline"
              error={errors.longitude}
              containerStyle={{ flex: 1 }}
            />
          </View>
          {latitude && longitude ? (
            <Text style={styles.coordsConfirm}>
              📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.coordsHint}>
              Coordinates enable nearby search for tenants. Use the buttons above or type manually.
            </Text>
          )}
        </View>

        {/* ── Amenities ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <Text style={styles.sectionSub}>Select all that apply</Text>
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
          {selectedAmenities.length > 0 && (
            <Text style={styles.selectedCount}>{selectedAmenities.length} selected</Text>
          )}
        </View>

        {/* ── Images ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Photos {!isEdit && <Text style={styles.required}>*</Text>}</Text>
          <Text style={styles.sectionSub}>
            Upload up to 8 photos. The first photo will be the cover image shown in search results.
          </Text>

          {existingImageUrls.length > 0 && (
            <View style={styles.imagesGrid}>
              {existingImageUrls.map((uri, i) => (
                <View key={`existing-${i}`} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>Cover</Text></View>}
                  <TouchableOpacity
                    style={styles.removeImg}
                    onPress={() => setExistingImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((img, i) => (
                <View key={`new-${i}`} style={styles.imageThumb}>
                  <Image source={{ uri: img.uri }} style={styles.thumbImg} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImg}
                    onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {totalImages < 8 && (
            <TouchableOpacity
              style={[styles.uploadBtn, errors.images ? styles.uploadBtnError : null]}
              onPress={pickImages}
            >
              <Ionicons name="camera-outline" size={24} color={errors.images ? Colors.error : Colors.primary} />
              <Text style={[styles.uploadText, errors.images ? { color: Colors.error } : null]}>
                {totalImages > 0 ? `Add More Photos (${totalImages}/8)` : 'Select Photos'}
              </Text>
            </TouchableOpacity>
          )}
          {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
        </View>

        {/* ── Submit ── */}
        <Button
          title={isEdit ? 'Save Changes' : 'List Property'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          icon={isEdit ? 'save-outline' : 'add-circle-outline'}
          style={{ marginTop: 8, marginBottom: 40 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...Typography.h3, color: Colors.text },

  container: { flex: 1 },
  content: { padding: Spacing.md },

  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 14, ...Shadow.sm,
  },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: 14 },
  sectionSub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, marginTop: -10 },
  required: { color: Colors.error },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: -10, marginBottom: 8 },

  row2: { flexDirection: 'row', gap: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: '#fff' },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: Colors.infoLight, borderRadius: Radius.sm,
    padding: 10, marginTop: 6,
  },
  infoNoteText: { flex: 1, fontSize: 12, color: Colors.info, lineHeight: 18 },

  geoButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  geoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5,
  },
  geoBtnSecondary: { borderColor: Colors.primary, backgroundColor: Colors.primary + '0D' },
  geoBtnPrimary: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  geoBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  coordsConfirm: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 4 },
  coordsHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  amenityChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amenityText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  amenityTextActive: { color: '#fff' },
  selectedCount: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 8 },

  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  imageThumb: { width: 90, height: 90, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(108,60,225,0.85)', paddingVertical: 3, alignItems: 'center',
  },
  coverText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  removeImg: { position: 'absolute', top: 3, right: 3 },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.lg, padding: 20, backgroundColor: Colors.primary + '08',
  },
  uploadBtnError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  uploadText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 6 },
});
