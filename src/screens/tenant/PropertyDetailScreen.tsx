import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Modal, TextInput, Alert, Linking, FlatList, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { propertyAPI, bookingAPI, paymentAPI } from '../../services/api';
import { Telemetry } from '../../utils/telemetry';
import { Button, LoadingSpinner, ListingTypeBadge, StatusBadge, Badge, Divider } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { Config } from '../../config/env';

const { width: SCREEN_W } = Dimensions.get('window');
const PLACEHOLDER = { uri: 'https://via.placeholder.com/400x300/DCD7F5/6C3CE1?text=MakaoSafe' };

// ── Helpers ──────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function validateDates(start: string, end: string, listingType: string): string | null {
  if (!start) return 'Check-in date is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return 'Use format YYYY-MM-DD';
  if (listingType === 'BNB') {
    if (!end) return 'Check-out date is required for BnB';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return 'Use format YYYY-MM-DD for check-out';
    if (end <= start) return 'Check-out must be after check-in';
    if (start < today()) return 'Check-in cannot be in the past';
  }
  return null;
}

function formatPhone(p: string): string {
  let f = p.replace(/\s+/g, '').replace('+', '');
  if (f.startsWith('0')) f = '254' + f.substring(1);
  return f;
}

// ── Payment status polling ────────────────────────────
function usePaymentPoller(
  bookingId: number | null,
  onPaid: (attempts: number) => void,
  onFailed: (attempts: number) => void
) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!bookingId) return;
    attempts.current = 0;
    pollRef.current = setInterval(async () => {
      attempts.current += 1;
      try {
        const res = await bookingAPI.getStatus(bookingId);
        const status = res.data?.status;
        if (status === 'PAID') {
          clearInterval(pollRef.current!);
          onPaid(attempts.current);
        } else if (status === 'PAYMENT_FAILED') {
          clearInterval(pollRef.current!);
          onFailed(attempts.current);
        }
      } catch { /* ignore network errors during polling */ }
      if (attempts.current >= Config.MPESA_POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        if (bookingId) Telemetry.paymentPollTimeout(bookingId, attempts.current);
      }
    }, Config.MPESA_POLL_INTERVAL_MS);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [bookingId]);
}

// ── Screen ────────────────────────────────────────────
export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Booking modal
  const [bookingModal, setBookingModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [pollingBookingId, setPollingBookingId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'paid' | 'failed' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await propertyAPI.getById(Number(id));
        setProperty(res.data);
        Telemetry.propertyView(res.data.id, res.data.listingType);
      } catch {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load property details' });
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Prefill phone from logged-in user
  useEffect(() => {
    if (user?.phoneNumber) setPhone(user.phoneNumber);
  }, [user?.phoneNumber]);

  // Set sensible default dates when booking modal opens
  const openBookingModal = () => {
    const t = today();
    setStartDate(t);
    setEndDate(property?.listingType === 'BNB' ? addDays(t, 1) : '');
    setDateError('');
    setBookingModal(true);
  };

  usePaymentPoller(
    pollingBookingId,
    (attempts) => {
      setPaymentStatus('paid');
      if (pollingBookingId) Telemetry.paymentPollPaid(pollingBookingId, attempts);
      setPollingBookingId(null);
      Toast.show({
        type: 'success',
        text1: '✅ Payment Confirmed!',
        text2: 'Your booking is now active. Funds held in escrow.',
        visibilityTime: 6000,
      });
    },
    (attempts) => {
      setPaymentStatus('failed');
      if (pollingBookingId) Telemetry.paymentPollFailed(pollingBookingId, attempts);
      setPollingBookingId(null);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: 'The M-Pesa payment was cancelled or declined.',
        visibilityTime: 6000,
      });
    }
  );

  const allImages = property
    ? [property.imageUrl, ...(property.imageUrls || [])].filter(Boolean)
    : [];

  const handleBook = async () => {
    const err = validateDates(startDate, endDate, property?.listingType);
    if (err) { setDateError(err); return; }
    setDateError('');
    setBookingLoading(true);
    Telemetry.bookingCreateStart(property.id, property.listingType);
    try {
      const res = await bookingAPI.create({
        propertyId: property.id,
        startDate,
        endDate: endDate || startDate,
      });
      Telemetry.bookingCreateSuccess(res.data.id, property.id, Number(res.data.totalPrice ?? 0));
      setCurrentBooking(res.data);
      setBookingModal(false);
      setPaymentStatus('waiting');
      setPayModal(true);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } | string }; response?: { status?: number } };
      const statusCode = (axErr as any).response?.status;
      const msg = (typeof axErr.response?.data === 'object' ? axErr.response?.data?.message : undefined) || 'Booking failed. Try again.';
      Telemetry.bookingCreateFailure(property.id, msg, statusCode);
      Toast.show({ type: 'error', text1: 'Booking Failed', text2: msg });
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePay = async () => {
    const formatted = formatPhone(phone);
    if (!/^2547\d{8}$|^2541\d{8}$/.test(formatted)) {
      Toast.show({ type: 'error', text1: 'Invalid number', text2: 'Enter a valid Safaricom or Airtel number' });
      return;
    }
    setPayLoading(true);
    Telemetry.paymentStart(currentBooking.id, Number(currentBooking.totalPrice ?? 0), formatted);
    try {
      await paymentAPI.stkPush(currentBooking.id, formatted);
      Telemetry.paymentStkSent(currentBooking.id);
      setPayModal(false);
      setPollingBookingId(currentBooking.id);
      Toast.show({
        type: 'info',
        text1: '📱 Check your phone!',
        text2: 'Enter your M-Pesa PIN to complete payment.',
        visibilityTime: 7000,
      });
      router.push('/tenant/bookings');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = axErr.response?.data?.message || 'STK push failed. Try again.';
      Telemetry.paymentStkFailed(currentBooking.id, msg, axErr.response?.status);
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: msg });
    } finally {
      setPayLoading(false);
    }
  };

  const handleContact = async () => {
    Telemetry.propertyContact(property.id);
    try {
      const res = await propertyAPI.getContactLink(property.id);
      const url = res.data?.url || res.data?.chatLink;
      if (url) Linking.openURL(url);
      else Toast.show({ type: 'info', text1: 'No contact link available' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not get contact details' });
    }
  };

  if (loading) return <LoadingSpinner message="Loading property..." />;
  if (!property) return null;

  const isBnB = property.listingType === 'BNB';
  const priceSuffix = isBnB ? '/night' : property.listingType === 'RENTAL' ? '/mo' : '';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={styles.gallery}>
          <FlatList
            data={allImages.length ? allImages : [null]}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
            }
            renderItem={({ item }) => (
              <Image
                source={item ? { uri: item } : PLACEHOLDER}
                style={[styles.galleryImage, { width: SCREEN_W }]}
                resizeMode="cover"
              />
            )}
            keyExtractor={(_, i) => String(i)}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          {allImages.length > 1 && (
            <View style={styles.dots}>
              {allImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title + badges */}
          <View style={styles.badgesRow}>
            <ListingTypeBadge type={property.listingType} />
            {property.isVerified && (
              <Badge label="✓ Verified" color={Colors.success} bg={Colors.successLight} size="sm" />
            )}
          </View>
          <Text style={styles.title}>{property.title}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{property.locationName}</Text>
          </View>

          {/* Price card */}
          <View style={styles.priceCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.priceLabel}>
                {isBnB ? 'Per Night' : property.listingType === 'RENTAL' ? 'Monthly Rent' : 'Sale Price'}
              </Text>
              <Text style={styles.price}>
                KES {Number(property.price).toLocaleString()}
                <Text style={styles.priceSuffix}>{priceSuffix}</Text>
              </Text>
            </View>
            {property.deposit ? (
              <View style={styles.priceExtra}>
                <Text style={styles.priceExtraLabel}>Deposit</Text>
                <Text style={styles.priceExtraValue}>KES {Number(property.deposit).toLocaleString()}</Text>
              </View>
            ) : null}
            {property.bookingFee ? (
              <View style={styles.priceExtra}>
                <Text style={styles.priceExtraLabel}>Booking fee</Text>
                <Text style={styles.priceExtraValue}>KES {Number(property.bookingFee).toLocaleString()}</Text>
              </View>
            ) : null}
          </View>

          {property.propertyType && (
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.infoText}>
                {property.propertyType.replace('_', ' ')} • {property.listingType}
              </Text>
            </View>
          )}

          <Divider />

          {property.description ? (
            <>
              <Text style={styles.sectionTitle}>About this property</Text>
              <Text style={styles.description}>{property.description}</Text>
              <Divider />
            </>
          ) : null}

          {property.amenities?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map((a: string, i: number) => (
                  <View key={i} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
              <Divider />
            </>
          )}

          {property.landlordName && (
            <>
              <Text style={styles.sectionTitle}>Listed by</Text>
              <View style={styles.landlordCard}>
                <View style={styles.landlordAvatar}>
                  <Text style={styles.landlordInitial}>
                    {property.landlordName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.landlordName}>{property.landlordName}</Text>
                  <Text style={styles.landlordRole}>Property Owner</Text>
                </View>
                <TouchableOpacity style={styles.contactIconBtn} onPress={handleContact}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.cta}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaPrice}>KES {Number(property.price).toLocaleString()}</Text>
          <Text style={styles.ctaSuffix}>{priceSuffix}</Text>
        </View>
        <View style={styles.ctaBtns}>
          <Button title="Contact" onPress={handleContact} variant="outline"
            fullWidth={false} style={{ paddingHorizontal: 20 }} />
          <Button title="Book Now" onPress={openBookingModal} fullWidth={false}
            style={{ paddingHorizontal: 24 }} icon="calendar-outline" />
        </View>
      </View>

      {/* ── Booking Modal ── */}
      <Modal visible={bookingModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Book Property</Text>
            <Text style={styles.sheetSub}>{property.title}</Text>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>
                  {isBnB ? 'Check-in' : 'Start Date'}
                </Text>
                <TextInput
                  style={[styles.fieldInput, dateError ? styles.inputError : null]}
                  value={startDate}
                  onChangeText={(v) => { setStartDate(v); setDateError(''); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {isBnB && (
                <>
                  <View style={styles.dateArrow}>
                    <Ionicons name="arrow-forward" size={18} color={Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Check-out</Text>
                    <TextInput
                      style={[styles.fieldInput, dateError ? styles.inputError : null]}
                      value={endDate}
                      onChangeText={(v) => { setEndDate(v); setDateError(''); }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </>
              )}
            </View>

            {dateError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
                <Text style={styles.errorText}>{dateError}</Text>
              </View>
            ) : null}

            <View style={styles.feeNote}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.info} />
              <Text style={styles.feeNoteText}>
                2% MakaoSafe service fee applied. Funds held in escrow until you confirm your stay.
              </Text>
            </View>

            <View style={styles.modalBtns}>
              <Button title="Cancel" onPress={() => setBookingModal(false)}
                variant="outline" fullWidth={false} style={{ flex: 1 }} />
              <Button title="Proceed to Pay" onPress={handleBook}
                loading={bookingLoading} fullWidth={false} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal visible={payModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.mpesaHeader}>
              <View style={styles.mpesaLogo}>
                <Text style={styles.mpesaLogoText}>M</Text>
              </View>
              <Text style={styles.sheetTitle}>M-Pesa Payment</Text>
            </View>

            {currentBooking && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total amount</Text>
                  <Text style={styles.summaryValue}>
                    KES {Number(currentBooking.totalPrice ?? currentBooking.price ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service fee (2%)</Text>
                  <Text style={styles.summaryValue}>
                    KES {Number(currentBooking.serviceFee ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Escrow (landlord)</Text>
                  <Text style={styles.summaryTotalValue}>
                    KES {Number(currentBooking.escrowAmount ?? currentBooking.totalPrice ?? 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>M-Pesa Phone Number</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="0712345678"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.fieldHint}>Safaricom or Airtel number registered with M-Pesa</Text>
            </View>

            <Text style={styles.payNote}>
              You will receive a prompt on your phone. Enter your M-Pesa PIN to confirm.
            </Text>

            <View style={styles.modalBtns}>
              <Button title="Cancel" onPress={() => setPayModal(false)}
                variant="outline" fullWidth={false} style={{ flex: 1 }} />
              <Button title="Pay Now" onPress={handlePay} loading={payLoading}
                fullWidth={false} style={{ flex: 1 }} icon="phone-portrait-outline" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  gallery: { position: 'relative' },
  galleryImage: { height: 300 },
  backBtn: {
    position: 'absolute', top: 50, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  dots: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 20, backgroundColor: '#fff' },

  content: { padding: Spacing.md },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  title: { ...Typography.h2, color: Colors.text, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  locationText: { color: Colors.textSecondary, fontSize: 14, flex: 1 },

  priceCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 16, marginBottom: 14, gap: 16, ...Shadow.sm,
  },
  priceLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  price: { ...Typography.h2, color: Colors.primary },
  priceSuffix: { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  priceExtra: { borderLeftWidth: 1, borderLeftColor: Colors.border, paddingLeft: 16, justifyContent: 'center' },
  priceExtraLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  priceExtraValue: { fontSize: 13, fontWeight: '600', color: Colors.text },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { color: Colors.textSecondary, fontSize: 13 },

  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: 12 },
  description: { color: Colors.textSecondary, lineHeight: 24, fontSize: 14, marginBottom: 4 },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  amenityText: { fontSize: 13, color: Colors.textSecondary },

  landlordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 14, gap: 12, ...Shadow.sm,
  },
  landlordAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  landlordInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },
  landlordName: { ...Typography.h4, color: Colors.text },
  landlordRole: { color: Colors.textMuted, fontSize: 12 },
  contactIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },

  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingBottom: 32, gap: 12,
  },
  ctaPrice: { ...Typography.h3, color: Colors.primary },
  ctaSuffix: { fontSize: 11, color: Colors.textMuted },
  ctaBtns: { flexDirection: 'row', gap: 10 },

  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.lg, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  sheetSub: { color: Colors.textSecondary, fontSize: 13, marginBottom: 20 },

  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  dateArrow: { paddingBottom: 14 },
  fieldLabel: { ...Typography.label, color: Colors.text, marginBottom: 6, fontSize: 12 },
  fieldInput: {
    backgroundColor: Colors.inputBg, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Radius.md,
    padding: 12, fontSize: 14, color: Colors.text,
  },
  fieldWrap: { marginBottom: 14 },
  fieldHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  inputError: { borderColor: Colors.error },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.errorLight, borderRadius: Radius.sm,
    padding: 10, marginBottom: 12,
  },
  errorText: { color: Colors.error, fontSize: 12, flex: 1 },

  feeNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.infoLight, borderRadius: Radius.md,
    padding: 12, marginBottom: 16,
  },
  feeNoteText: { flex: 1, color: Colors.info, fontSize: 12, lineHeight: 18 },

  mpesaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  mpesaLogo: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50',
    alignItems: 'center', justifyContent: 'center',
  },
  mpesaLogoText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  summaryBox: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 14, marginBottom: 16, gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  summaryTotalRow: {
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4,
  },
  summaryTotalLabel: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  summaryTotalValue: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  payNote: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginVertical: 8, lineHeight: 18 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
