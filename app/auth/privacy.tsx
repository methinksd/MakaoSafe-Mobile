import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../src/utils/theme';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h2}>Data We Collect</Text>
        <Text style={styles.body}>We collect your name, email, phone number, and booking history to provide our services. We do not sell your data to third parties.</Text>
        <Text style={styles.h2}>M-Pesa Payments</Text>
        <Text style={styles.body}>Payment processing is handled by Safaricom M-Pesa. We only store transaction references, not your M-Pesa PIN or card details.</Text>
        <Text style={styles.h2}>Property Data</Text>
        <Text style={styles.body}>Property photos are stored on Cloudinary. Location data (latitude/longitude) is used to power the nearby search feature.</Text>
        <Text style={styles.h2}>Your Rights</Text>
        <Text style={styles.body}>You can request deletion of your account and associated data at any time by contacting support@makaosafe.co.ke.</Text>
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
