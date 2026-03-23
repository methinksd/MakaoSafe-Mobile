import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h2}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>By using MakaoSafe, you agree to these terms. MakaoSafe is a rental marketplace connecting tenants and landlords in Kenya.</Text>
        <Text style={styles.h2}>2. Escrow & Payments</Text>
        <Text style={styles.body}>All payments are processed via M-Pesa. Funds are held in escrow until the tenant confirms the stay. MakaoSafe charges a 2% service fee on all transactions.</Text>
        <Text style={styles.h2}>3. Landlord Responsibilities</Text>
        <Text style={styles.body}>Landlords must ensure all listings are accurate, legal, and safe. MakaoSafe reserves the right to remove listings that violate our policies.</Text>
        <Text style={styles.h2}>4. Tenant Responsibilities</Text>
        <Text style={styles.body}>Tenants must use properties responsibly and report any issues promptly. Refund requests must be made within the agreed window.</Text>
        <Text style={styles.h2}>5. Contact</Text>
        <Text style={styles.body}>For support, reach us at support@makaosafe.co.ke</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.surface, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  title: { ...Typography.h2, color: Colors.text },
  content: { padding: Spacing.md },
  h2: { ...Typography.h4, color: Colors.text, marginTop: 20, marginBottom: 8 },
  body: { color: Colors.textSecondary, lineHeight: 24, fontSize: 14 },
});
