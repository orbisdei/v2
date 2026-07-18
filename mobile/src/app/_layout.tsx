import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { CatalogProvider } from '../lib/catalog';
import { Colors, Fonts } from '../constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.navy },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: Fonts.serif },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="site/[id]" options={{ title: '' }} />
          <Stack.Screen name="tag/[slug]" options={{ title: '' }} />
          <Stack.Screen name="list/[id]" options={{ title: '' }} />
          <Stack.Screen name="user/[initials]" options={{ title: '' }} />
        </Stack>
      </CatalogProvider>
    </AuthProvider>
  );
}
