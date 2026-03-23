/**
 * BookingCard — shared booking card component used by both
 * tenant (BookingsScreen) and landlord (LandlordBookingsScreen).
 *
 * variant="tenant"   — shows financials, Confirm Stay / Request Refund actions
 * variant="landlord" — shows grid layout, escrow notes, refund warning
 *
 * All date display goes through formatDisplayDate() so the Spring Boot
 * LocalDate array/string ambiguity is handled in one place.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge, Divider, Button } from './UI';
import { Colors, Typography, Radius, Spacing } from '../utils/theme';
import { formatDisplayDate } from '../utils/dates';
import type { BookingResponse } from '../types';

// ── Types ─────────────────────────────────────────────────────

interface TenantActions {
  onConfirmStay: (id: number) => void;
  onRequestRefund: (id: number) => void;
}

interface BookingCardProps {
  booking: BookingResponse;
  variant: 'tenant' | 'landlord';
  /** Required when variant="tenant" */
  tenantActions?: TenantActions;
}

// ── Main component ────────────────────────────────────────────

export function BookingCard({ booking: item, variant, tenantActions }: BookingCardProps) {
  return (
    <Card style={styles.card}>
      {/* ── Header: title + location + status badge ── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {item.propertyTitle}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.locationName}
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <Divider style={styles.divider} />

      {/* ── Dates ── */}
      <View style={styles.datesRow}>
        <DateCell label="Check-in"  value={formatDisplayDate(item.startDate)} />
        <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
        <DateCell label="Check-out" value={formatDisplayDate(item.endDate)} align="right" />
      </View>

      <Divider style={styles.divider} />

      {/* ── Financials ── */}
      {variant === 'tenant' ? (
        <TenantFinancials item={item} />
      ) : (
        <LandlordFinancials item={item} />
      )}

      {/* ── Status notes ── */}
      <StatusNotes item={item} variant={variant} />

      {/* ── Tenant actions ── */}
      {variant === 'tenant' &&
        item.status === 'PAID' &&
        item.escrowStatus === 'HELD' &&
        tenantActions && (
          <View style={styles.actions}>
            <Button
              title="Confirm Stay"
              onPress={() => tenantActions.onConfirmStay(item.id)}
              size="sm"
              fullWidth={false}
              style={styles.actionBtn}
              icon="checkmark-circle-outline"
            />
            <Button
              title="Refund"
              onPress={() => tenantActions.onRequestRefund(item.id)}
              variant="outline"
              size="sm"
              fullWidth={false}
              style={styles.actionBtn}
              icon="return-down-back-outline"
            />
          </View>
        )}
    </Card>
  );
}

// ── Sub-components ────────────────────────────────────────────

function DateCell({
  label, value, align = 'left',
}: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <View style={align === 'right' ? styles.dateCellRight : styles.dateCell}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value}</Text>
    </View>
  );
}

function TenantFinancials({ item }: { item: BookingResponse }) {
  return (
    <View style={styles.financials}>
      <FinRow label="Total Paid"    value={`KES ${Number(item.totalPrice ?? item.price ?? 0).toLocaleString()}`} />
      <FinRow label="Service Fee"   value={`KES ${Number(item.serviceFee ?? 0).toLocaleString()}`} />
      <FinRow
        label="Escrow"
        value={item.escrowStatus ?? '—'}
        valueColor={
          item.escrowStatus === 'HELD'     ? Colors.info    :
          item.escrowStatus === 'RELEASED' ? Colors.success :
          item.escrowStatus === 'REFUNDED' ? Colors.error   : Colors.textSecondary
        }
      />
    </View>
  );
}

function LandlordFinancials({ item }: { item: BookingResponse }) {
  return (
    <View style={styles.infoGrid}>
      <InfoBox label="Check-in"  value={formatDisplayDate(item.startDate)} />
      <InfoBox label="Check-out" value={formatDisplayDate(item.endDate)} />
      <InfoBox
        label="Amount"
        value={`KES ${Number(item.escrowAmount ?? item.price ?? 0).toLocaleString()}`}
        valueColor={Colors.primary}
      />
      <InfoBox
        label="Escrow"
        value={item.escrowStatus ?? '—'}
        valueColor={
          item.escrowStatus === 'RELEASED' ? Colors.success :
          item.escrowStatus === 'HELD'     ? Colors.info    : Colors.textSecondary
        }
      />
    </View>
  );
}

function FinRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.finRow}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[styles.finValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function InfoBox({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function StatusNotes({ item, variant }: { item: BookingResponse; variant: 'tenant' | 'landlord' }) {
  if (variant === 'landlord') {
    if (item.status === 'PAID' && item.escrowStatus === 'HELD') {
      return (
        <View style={[styles.note, styles.noteInfo]}>
          <Ionicons name="lock-closed-outline" size={14} color={Colors.info} />
          <Text style={[styles.noteText, { color: Colors.info }]}>
            Funds held in escrow — released when tenant confirms stay.
          </Text>
        </View>
      );
    }
    if (item.escrowStatus === 'RELEASED') {
      return (
        <View style={[styles.note, styles.noteSuccess]}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
          <Text style={[styles.noteText, { color: Colors.success }]}>Payment has been released to you.</Text>
        </View>
      );
    }
    if (item.status === 'REFUND_REQUESTED') {
      return (
        <View style={[styles.note, styles.noteRefund]}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.statusRefund} />
          <Text style={[styles.noteText, { color: Colors.statusRefund }]}>
            Tenant has requested a refund. Contact support if disputed.
          </Text>
        </View>
      );
    }
    return null;
  }

  // Tenant notes
  if (item.status === 'REFUND_REQUESTED') {
    return (
      <View style={[styles.note, styles.noteRefund]}>
        <Ionicons name="time-outline" size={14} color={Colors.statusRefund} />
        <Text style={[styles.noteText, { color: Colors.statusRefund }]}>Refund requested — being processed.</Text>
      </View>
    );
  }
  if (item.status === 'PAYMENT_FAILED') {
    return (
      <View style={[styles.note, styles.noteError]}>
        <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
        <Text style={[styles.noteText, { color: Colors.error }]}>Payment was not completed. Please try booking again.</Text>
      </View>
    );
  }
  return null;
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { marginBottom: 14, padding: 16 },
  divider: { marginVertical: 12 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1 },
  propertyTitle: { ...Typography.h4, color: Colors.text, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, color: Colors.textMuted, flex: 1 },

  datesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateCell: { flex: 1 },
  dateCellRight: { flex: 1, alignItems: 'flex-end' },
  dateLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: Colors.text },

  financials: { gap: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finLabel: { fontSize: 13, color: Colors.textSecondary },
  finValue: { fontSize: 13, fontWeight: '600', color: Colors.text },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoBox: { minWidth: '44%' },
  infoLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '700', color: Colors.text },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: Radius.sm,
    padding: 10,
    marginTop: 12,
  },
  noteInfo:    { backgroundColor: Colors.infoLight },
  noteSuccess: { backgroundColor: Colors.successLight },
  noteRefund:  { backgroundColor: Colors.statusRefundBg },
  noteError:   { backgroundColor: Colors.errorLight },
  noteText:    { flex: 1, fontSize: 12, lineHeight: 18 },

  actions:   { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1 },
});
