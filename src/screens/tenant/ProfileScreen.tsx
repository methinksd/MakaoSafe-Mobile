import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, isLandlord } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { Button, Card, Divider } from '../../components/UI';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../utils/theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    editModal, fullName, phoneNumber, saving, deleting, initials,
    openEdit, closeEdit, setFullName, setPhoneNumber,
    handleSaveProfile, handleLogout, handleDeleteAccount,
  } = useProfile();

  const menuItems = [
    { icon: 'calendar-outline',        label: 'My Bookings',       onPress: () => router.push('/tenant/bookings') },
    { icon: 'home-outline',            label: 'Browse Properties', onPress: () => router.push('/tenant/browse') },
    { icon: 'create-outline',          label: 'Edit Profile',      onPress: openEdit },
    { icon: 'shield-checkmark-outline',label: 'Privacy Policy',    onPress: () => router.push('/auth/privacy') },
    { icon: 'document-text-outline',   label: 'Terms of Service',  onPress: () => router.push('/auth/terms') },
  ] as const;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'MakaoSafe User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phoneNumber ? <Text style={styles.phone}>{user.phoneNumber}</Text> : null}
        <View style={styles.roleBadge}>
          <Ionicons name={isLandlord(user) ? 'key-outline' : 'home-outline'} size={13} color={Colors.primary} />
          <Text style={styles.roleText}>{isLandlord(user) ? 'Landlord' : 'Tenant'}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {!isLandlord(user) && (
        <Card style={styles.switchCard}>
          <Ionicons name="briefcase-outline" size={24} color={Colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Are you a landlord?</Text>
            <Text style={styles.switchSub}>Register a new account with Landlord role</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </Card>
      )}

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

      <View style={styles.actionBtns}>
        <Button title="Sign Out" onPress={handleLogout} variant="danger" icon="log-out-outline" />
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deleting}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
          <Text style={styles.deleteBtnText}>{deleting ? 'Deleting account…' : 'Delete Account'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>MakaoSafe v1.0.0</Text>

      {/* Edit Profile Modal */}
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
              <Button title="Cancel" onPress={closeEdit} variant="outline" fullWidth={false} style={{ flex: 1 }} />
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
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  email: { color: Colors.textSecondary, fontSize: 14, marginBottom: 4 },
  phone: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.background, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.primary,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  switchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.md, marginBottom: 14, padding: 16,
  },
  switchTitle: { ...Typography.label, color: Colors.text },
  switchSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  menuCard: { marginHorizontal: Spacing.md, marginBottom: 16, padding: 0, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, ...Typography.body, color: Colors.text },
  actionBtns: { marginHorizontal: Spacing.md, marginBottom: 8, gap: 12 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  deleteBtnText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
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
