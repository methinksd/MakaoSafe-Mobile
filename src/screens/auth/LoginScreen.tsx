import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth, isLandlord } from '../../context/AuthContext';
import { Telemetry } from '../../utils/telemetry';
import { extractErrorMessage } from '../../types';
import { Button, Input } from '../../components/UI';
import { Colors, Spacing, Typography, Radius } from '../../utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    Telemetry.loginStart(email.trim());
    try {
      await login(email.trim(), password);
      // Navigation handled by root layout — AuthContext fires loginSuccess via useProfile
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      const statusCode = axiosErr.response?.status;
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        (statusCode === 401 ? 'Invalid email or password' : 'Login failed. Please try again.');
      Telemetry.loginFailure(email.trim(), msg, statusCode);
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.appName}>MakaoSafe</Text>
          <Text style={styles.tagline}>Kenya's trusted rental platform</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            error={errors.email}
            containerStyle={{ marginBottom: 14 }}
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
            containerStyle={{ marginBottom: 24 }}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            icon="log-in-outline"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.registerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          By using MakaoSafe, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  appName: { ...Typography.h1, color: Colors.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: Colors.textSecondary },

  form: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  formTitle: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  formSubtitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 24 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, marginHorizontal: 12, fontSize: 13 },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: Colors.textSecondary, fontSize: 14 },
  registerLink: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  footer: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 24,
    lineHeight: 16,
  },
});
