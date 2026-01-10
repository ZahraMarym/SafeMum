import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet, StatusBar, useColorScheme, Alert } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '@/redux/store/store';
import '@react-native-firebase/app';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { NotificationProvider } from '@/context/NotificationContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  const [loaded] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins-ExtraLight.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins-Thin.ttf'),
  });

  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // --------------------------
  // 🔥 DEEP LINK HANDLER
  // --------------------------
  useEffect(() => {
    // Handle deep link when app is opened from a closed state
    Linking.getInitialURL().then((url) => {
      console.log('🚀 Initial URL:', url);
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('📨 URL Event:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('🔗 Handling deep link:', url);

    if (!url) {
      console.log('❌ No URL provided');
      return;
    }

    try {
      // Parse the URL using Expo Linking
      const parsed = Linking.parse(url);
      console.log('🔍 Parsed URL:', JSON.stringify(parsed, null, 2));

      // Skip expo development client URLs
      if (parsed.hostname === 'expo-development-client') {
        console.log('⏭ Skipping expo development client URL');
        return;
      }

      // Check if it's a reset-password deep link
      if (
        parsed.hostname === 'reset-password' ||
        parsed.path === 'reset-password' ||
        parsed.path === '/api/users/reset-password-redirect'
      ) {
        console.log('🔑 Reset password link detected!');

        // First, try to get tokens from parsed queryParams
        let accessToken = parsed.queryParams?.access_token;
        let refreshToken = parsed.queryParams?.refresh_token;
        let expiresAt = parsed.queryParams?.expires_at;
        let expiresIn = parsed.queryParams?.expires_in;
        let tokenType = parsed.queryParams?.token_type;
        let type = parsed.queryParams?.type;

        console.log('📦 From queryParams:');
        console.log('  Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING');
        console.log('  Refresh Token:', refreshToken ? refreshToken.substring(0, 15) + '...' : 'MISSING');

        // If tokens not in queryParams, try extracting from raw URL
        if (!accessToken && url.includes('access_token=')) {
          console.log('🔍 Extracting tokens from raw URL...');

          // Extract access_token
          const accessMatch = url.match(/[?#&]access_token=([^&#]+)/);
          if (accessMatch) {
            accessToken = decodeURIComponent(accessMatch[1]);
            console.log('✅ Extracted Access Token:', accessToken.substring(0, 20) + '...');
          }

          // Extract refresh_token
          const refreshMatch = url.match(/[?#&]refresh_token=([^&#]+)/);
          if (refreshMatch) {
            refreshToken = decodeURIComponent(refreshMatch[1]);
            console.log('✅ Extracted Refresh Token:', refreshToken.substring(0, 15) + '...');
          }

          // Extract expires_at
          const expiresAtMatch = url.match(/[?#&]expires_at=([^&#]+)/);
          if (expiresAtMatch) {
            expiresAt = decodeURIComponent(expiresAtMatch[1]);
          }

          // Extract expires_in
          const expiresInMatch = url.match(/[?#&]expires_in=([^&#]+)/);
          if (expiresInMatch) {
            expiresIn = decodeURIComponent(expiresInMatch[1]);
          }

          // Extract token_type
          const tokenTypeMatch = url.match(/[?#&]token_type=([^&#]+)/);
          if (tokenTypeMatch) {
            tokenType = decodeURIComponent(tokenTypeMatch[1]);
          }

          // Extract type
          const typeMatch = url.match(/[?#&]type=([^&#]+)/);
          if (typeMatch) {
            type = decodeURIComponent(typeMatch[1]);
          }
        }

        console.log('📋 Final extracted values:');
        console.log('  🎟 Access Token:', accessToken ? accessToken.substring(0, 25) + '...' : 'MISSING');
        console.log('  🔄 Refresh Token:', refreshToken ? refreshToken.substring(0, 15) + '...' : 'MISSING');
        console.log('  ⏰ Expires At:', expiresAt || 'N/A');
        console.log('  ⏱ Expires In:', expiresIn || 'N/A');
        console.log('  🔖 Token Type:', tokenType || 'N/A');
        console.log('  📝 Type:', type || 'N/A');

        if (accessToken && refreshToken) {
          console.log('✅ Navigating to reset-password screen with tokens...');

          // Navigate to reset password screen
          router.push({
            pathname: '/reset-password',
            params: {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: expiresAt || '',
              expires_in: expiresIn || '',
              token_type: tokenType || 'bearer',
              type: type || 'recovery'
            }
          });
        } else {
          console.error('❌ Missing required tokens!');
          console.error('   Access Token:', accessToken ? 'Present' : 'MISSING');
          console.error('   Refresh Token:', refreshToken ? 'Present' : 'MISSING');
          Alert.alert(
            'Error',
            'Invalid reset link - missing authentication tokens. Please request a new reset link.'
          );
        }
      } else {
        console.log('ℹ Not a reset-password link');
        console.log('   Hostname:', parsed.hostname);
        console.log('   Path:', parsed.path);
      }
    } catch (error) {
      console.error('❌ Error parsing deep link:', error);
      Alert.alert('Error', 'Failed to process reset link. Please try again.');
    }
  };

  if (!loaded) return null;

  return (
    <Provider store={store}>
      <NotificationProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={styles.container}>
            <StatusBar
              barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
              backgroundColor={colorScheme === 'dark' ? '#000' : '#fff'}
            />
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </ThemeProvider>
      </NotificationProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {flex:1},
});