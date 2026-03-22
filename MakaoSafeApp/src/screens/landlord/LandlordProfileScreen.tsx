import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { Button, Card, Divider } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';

export default function LandlordProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || fullName.trim().length < 3) {
      Toast.show({ type: 'error', text1: 'Invalid name', text2: 'Full name must be at least 3 characters' });
      return;
    }
    setSaving(true);
    try {
      await userAPI.updateProfile({ fullName: fullName.trim(), phoneNumber });
      await refreshUser();
      setEditModal(false);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Update failed', text2: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setFullName(user?.fullName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setEditModal(true);
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'LL';

  const menuItems = [
    { icon: 'home-outline', label: 'My Listings', onPress: () => router.push('/landlord/listings') },
    { icon: 'add-circle-outline', label: 'Add Property', onPress: () => router.push('/landlord/add-property') },
    { icon: 'calendar-outline', label: 'Bookings', onPress: () => router.push('/landlord/bookings') },
    { icon: 'create-outline', label: 'Edit Profile', onPress: openEdit },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => router.push('/auth/privacy') },
    { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => router.push('/auth/terms') },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Landlord'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phoneNumber ? <Text style={styles.phone}>{user.phoneNumber}</Text> : null}
        <View style={styles.roleBadge}>
          <Ionicons name="key-outline" size={13} color={Colors.secondary} />
          <Text style={[styles.roleText, { color: Colors.secondary }]}>Property Owner</Text>
        </View>
        <TouchableOpacity style={[styles.editBtn, { borderColor: Colors.secondary }]} onPress={openEdit}>
          <Ionicons name="create-outline" size={16} color={Colors.secondary} />
          <Text style={[styles.editBtnText, { color: Colors.secondary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {i < menuItems.length - 1 && <Divider style={{ marginVertical: 0, marginHorizontal: 16 }} />}
          </React.Fragment>
        ))}
      </Card>

      <View style={styles.logoutWrap}>
        <Button title="Sign Out" onPress={handleLogout} variant="danger" icon="log-out-outline" />
      </View>
      <Text style={styles.version}>MakaoSafe v1.0.0 — Landlord Portal</Text>

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.fieldInput} value={fullName} onChangeText={setFullName}
                placeholder="Your full name" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.fieldInput} value={phoneNumber} onChangeText={setPhoneNumber}
                placeholder="0712345678" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={styles.sheetBtns}>
              <Button title="Cancel" onPress={() => setEditModal(false)} variant="outline" fullWidth={false} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSaveProfile} loading={saving} fullWidth={false} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.surface, alignItems: 'center',
    paddingTop: 32, paddingBottom: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginBottom: 20, ...Shadow.sm,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  email: { color: Colors.textSecondary, fontSize: 14, marginBottom: 4 },
  phone: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.warningLight, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  menuCard: { marginHorizontal: Spacing.md, marginBottom: 16, padding: 0, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, ...Typography.body, color: Colors.text },
  logoutWrap: { marginHorizontal: Spacing.md, marginBottom: 16 },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: 32 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.lg, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { ...Typography.h3, color: Colors.text, marginBottom: 20 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { ...Typography.label, color: Colors.text, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.inputBg, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 14, fontSize: 15, color: Colors.text,
  },
  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
