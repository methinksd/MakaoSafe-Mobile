import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { bookingAPI } from '../../services/api';
import { Card, StatusBadge, EmptyState, LoadingSpinner, Divider, Button } from '../../components/UI';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';

export default function TenantBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await bookingAPI.getMyBookings();
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

  const handleConfirmStay = (id: number) => {
    Alert.alert(
      'Confirm Your Stay',
      'This will release the escrowed funds to the landlord. Are you satisfied with the property?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Stay',
          style: 'default',
          onPress: async () => {
            try {
              await bookingAPI.confirmStay(id);
              Toast.show({ type: 'success', text1: 'Stay Confirmed', text2: 'Funds released to landlord' });
              fetch();
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Could not confirm stay' });
            }
          },
        },
      ]
    );
  };

  const handleRefund = (id: number) => {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a refund for this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingAPI.requestRefund(id);
              Toast.show({ type: 'success', text1: 'Refund Requested', text2: 'We will process your refund.' });
              fetch();
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Could not request refund' });
            }
          },
        },
      ]
    );
  };

  const renderBooking = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.locationText}>{item.locationName}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Divider style={{ marginVertical: 12 }} />

      {/* Dates */}
      <View style={styles.datesRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{item.startDate}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{item.endDate}</Text>
        </View>
      </View>

      <Divider style={{ marginVertical: 12 }} />

      {/* Financials */}
      <View style={styles.financials}>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Total Paid</Text>
          <Text style={styles.finValue}>KES {Number(item.totalPrice || item.price).toLocaleString()}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Service Fee</Text>
          <Text style={styles.finValue}>KES {Number(item.serviceFee || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finLabel}>Escrow Status</Text>
          <View style={[
            styles.escrowBadge,
            { backgroundColor: item.escrowStatus === 'HELD' ? Colors.infoLight :
              item.escrowStatus === 'RELEASED' ? Colors.successLight : Colors.errorLight }
          ]}>
            <Text style={[
              styles.escrowText,
              { color: item.escrowStatus === 'HELD' ? Colors.info :
                item.escrowStatus === 'RELEASED' ? Colors.success : Colors.error }
            ]}>
              {item.escrowStatus || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions — only show when action is available */}
      {item.status === 'PAID' && item.escrowStatus === 'HELD' && (
        <View style={styles.actions}>
          <Button
            title="Confirm Stay"
            onPress={() => handleConfirmStay(item.id)}
            size="sm" fullWidth={false} style={{ flex: 1 }}
            icon="checkmark-circle-outline"
          />
          <Button
            title="Refund"
            onPress={() => handleRefund(item.id)}
            variant="outline" size="sm" fullWidth={false} style={{ flex: 1 }}
            icon="return-down-back-outline"
          />
        </View>
      )}
      {item.status === 'REFUND_REQUESTED' && (
        <View style={styles.refundNote}>
          <Ionicons name="time-outline" size={14} color={Colors.statusRefund} />
          <Text style={styles.refundNoteText}>Refund requested — being processed.</Text>
        </View>
      )}
      {item.status === 'PAYMENT_FAILED' && (
        <View style={styles.failedNote}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
          <Text style={styles.failedNoteText}>Payment was not completed. Please try again.</Text>
        </View>
      )}
    </Card>
  );

  if (loading) return <LoadingSpinner message="Loading bookings..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No bookings yet"
            subtitle="Browse properties and make your first booking"
            action={{ label: 'Browse Properties', onPress: () => router.push('/tenant/browse') }}
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
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h2, color: Colors.text },
  headerSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  list: { padding: Spacing.md },

  card: { marginBottom: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  propertyTitle: { ...Typography.h4, color: Colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { color: Colors.textMuted, fontSize: 12 },

  datesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: Colors.text },

  financials: { gap: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finLabel: { fontSize: 13, color: Colors.textSecondary },
  finValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  escrowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  escrowText: { fontSize: 11, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  refundNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.statusRefundBg, borderRadius: Radius.sm,
    padding: 10, marginTop: 10,
  },
  refundNoteText: { flex: 1, fontSize: 12, color: Colors.statusRefund, fontWeight: '600' },
  failedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.errorLight, borderRadius: Radius.sm,
    padding: 10, marginTop: 10,
  },
  failedNoteText: { flex: 1, fontSize: 12, color: Colors.error },
});
