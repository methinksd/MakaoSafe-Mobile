import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/UI';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';

type Role = 'ROLE_TENANT' | 'ROLE_LANDLORD';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('ROLE_TENANT');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhone = (p: string) => {
    let f = p.replace('+', '');
    if (f.startsWith('0')) f = '254' + f.substring(1);
    return f;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) e.fullName = 'Enter your full name (min 3 chars)';
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!/^(?:\+254|254|0)[17]\d{8}$/.test(phone)) e.phone = 'Enter a valid Kenyan number (e.g. 0712345678)';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!agreed) e.agreed = 'You must agree to the Terms of Service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: formatPhone(phone),
        password,
        role,
      });
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Please sign in to continue.',
      });
      router.replace('/auth/login');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 409 ? 'An account with this email or phone already exists' : 'Registration failed. Try again.');
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Kenya's trusted rental platform</Text>
        </View>

        {/* Role selector */}
        <View style={styles.roleRow}>
          {(['ROLE_TENANT', 'ROLE_LANDLORD'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.85}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r === 'ROLE_TENANT' ? '🏠 I\'m a Tenant' : '🔑 I\'m a Landlord'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            leftIcon="person-outline"
            error={errors.fullName}
          />
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={errors.email}
          />
          <Input
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon="call-outline"
            placeholder="0712345678"
            error={errors.phone}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon="lock-closed-outline"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            error={errors.password}
          />

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/auth/terms')}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/auth/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          {errors.agreed && <Text style={styles.errorText}>{errors.agreed}</Text>}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={{ marginTop: 16 }}
            icon="person-add-outline"
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg },

  header: { paddingTop: Spacing.md, marginBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 4 },
  subtitle: { color: Colors.textSecondary, fontSize: 14 },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  roleText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  roleTextActive: { color: Colors.primary },

  form: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
  errorText: { color: Colors.error, fontSize: 12, marginLeft: 32, marginBottom: 8 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
