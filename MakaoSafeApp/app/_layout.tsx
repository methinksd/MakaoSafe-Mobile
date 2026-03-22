import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth, isLandlord } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/utils/theme';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (isLandlord(user)) {
        router.replace('/landlord/dashboard');
      } else {
        router.replace('/tenant/home');
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="tenant" />
      <Stack.Screen name="landlord" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
        <Toast />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
