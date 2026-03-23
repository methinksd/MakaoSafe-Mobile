/**
 * useProfile — shared profile logic extracted from tenant and landlord screens.
 *
 * Encapsulates:
 *   - Edit modal open/close state
 *   - fullName and phoneNumber form fields (synced to current user)
 *   - handleSaveProfile — validates, calls API, shows toast, triggers telemetry
 *   - handleLogout — shows Alert confirmation
 *   - handleDeleteAccount — shows double-confirm Alert
 *   - computed `initials` from user's name or email
 *
 * Both ProfileScreen and LandlordProfileScreen import this hook and
 * pass only the variant-specific pieces (menu items, accent color) as props.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { handleApiError } from '../services/apiResponse';
import { Telemetry } from '../utils/telemetry';

export interface ProfileHookResult {
  // State
  editModal: boolean;
  fullName: string;
  phoneNumber: string;
  saving: boolean;
  deleting: boolean;
  initials: string;

  // Actions
  openEdit: () => void;
  closeEdit: () => void;
  setFullName: (v: string) => void;
  setPhoneNumber: (v: string) => void;
  handleSaveProfile: () => Promise<void>;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
}

export function useProfile(): ProfileHookResult {
  const { user, logout, refreshUser, deleteAccount } = useAuth();

  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  const openEdit = useCallback(() => {
    setFullName(user?.fullName ?? '');
    setPhoneNumber(user?.phoneNumber ?? '');
    setEditModal(true);
  }, [user]);

  const closeEdit = useCallback(() => setEditModal(false), []);

  const handleSaveProfile = useCallback(async () => {
    if (!fullName.trim() || fullName.trim().length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Invalid name',
        text2: 'Full name must be at least 3 characters',
      });
      return;
    }
    setSaving(true);
    Telemetry.profileUpdateStart();
    try {
      await userAPI.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      await refreshUser();
      setEditModal(false);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      Telemetry.profileUpdateSuccess();
    } catch (err) {
      Telemetry.profileUpdateFailure(String(err));
      handleApiError(err, { title: 'Update Failed', fallback: 'Update failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [fullName, phoneNumber, refreshUser]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          if (user?.id) Telemetry.logout(user.id);
          logout();
        },
      },
    ]);
  }, [user, logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and anonymise all your data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Your bookings, profile and payment history will be permanently removed.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      if (user?.id) Telemetry.accountDeleted(user.id);
                      await deleteAccount();
                      // AuthContext clears state → root layout redirects to login
                    } catch (err) {
                      setDeleting(false);
                      handleApiError(err, {
                        title: 'Deletion Failed',
                        fallback: 'Could not delete account. Please try again.',
                      });
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [user, deleteAccount]);

  return {
    editModal,
    fullName,
    phoneNumber,
    saving,
    deleting,
    initials,
    openEdit,
    closeEdit,
    setFullName,
    setPhoneNumber,
    handleSaveProfile,
    handleLogout,
    handleDeleteAccount,
  };
}
