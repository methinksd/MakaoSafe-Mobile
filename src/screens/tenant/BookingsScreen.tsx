import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { bookingAPI } from '../../services/api';
import { useApiCall, callApi, handleApiError } from '../../services/apiResponse';
import { Telemetry } from '../../utils/telemetry';
import { BookingCard } from '../../components/BookingCard';
import { ScreenState } from '../../components/ScreenState';
import { Colors, Spacing, Typography } from '../../utils/theme';
import type { BookingResponse } from '../../types';

export default function TenantBookingsScreen() {
  const router = useRouter();

  const {
    data: bookings,
    loading,
    error,
    refresh,
  } = useApiCall(() => bookingAPI.getMyBookings(), { context: 'TenantBookingsScreen' });

  const handleConfirmStay = useCallback((id: number) => {
    Alert.alert(
      'Confirm Your Stay',
      'This will release the escrowed funds to the landlord. Are you satisfied with the property?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Stay',
          style: 'default',
          onPress: async () => {
            Telemetry.bookingConfirmStay(id);
            const result = await callApi(() => bookingAPI.confirmStay(id), 'confirmStay');
            if (result.ok) {
              Toast.show({ type: 'success', text1: 'Stay Confirmed', text2: 'Funds released to landlord' });
              refresh();
            } else {
              handleApiError(result, { title: 'Could not confirm stay' });
            }
          },
        },
      ]
    );
  }, [refresh]);

  const handleRequestRefund = useCallback((id: number) => {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a refund for this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            Telemetry.bookingRefundRequested(id);
            const result = await callApi(() => bookingAPI.requestRefund(id), 'requestRefund');
            if (result.ok) {
              Toast.show({ type: 'success', text1: 'Refund Requested', text2: 'We will process your refund.' });
              refresh();
            } else {
              handleApiError(result, { title: 'Could not request refund' });
            }
          },
        },
      ]
    );
  }, [refresh]);

  const renderItem = useCallback(({ item }: { item: BookingResponse }) => (
    <BookingCard
      booking={item}
      variant="tenant"
      tenantActions={{
        onConfirmStay: handleConfirmStay,
        onRequestRefund: handleRequestRefund,
      }}
    />
  ), [handleConfirmStay, handleRequestRefund]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        {bookings && (
          <Text style={styles.headerSub}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <ScreenState
        loading={loading}
        error={error}
        empty={!loading && !error && (bookings?.length ?? 0) === 0}
        onRetry={refresh}
        loadingMessage="Loading bookings…"
        emptyIcon="calendar-outline"
        emptyTitle="No bookings yet"
        emptySubtitle="Browse properties and make your first booking"
        emptyAction={{ label: 'Browse Properties', onPress: () => router.push('/tenant/browse') }}
      >
        <FlatList
          data={bookings ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading && (bookings?.length ?? 0) > 0} onRefresh={refresh} colors={[Colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      </ScreenState>
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
  headerSub:   { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  list: { padding: Spacing.md },
});
