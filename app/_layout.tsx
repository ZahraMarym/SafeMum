import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router'; // ✅ import useRouter
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet, StatusBar, useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '@/redux/store/store';
import '@react-native-firebase/app';
import * as Linking from 'expo-linking';

// ✅ Import NotificationProvider
import { NotificationProvider } from '@/context/NotificationContext';

export default function RootLayout() {
  const router = useRouter(); // ✅ create router instance

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

  // ✅ deep link handler
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const params = new URLSearchParams(url.split("?")[1]);
      const token = params.get("token");
      console.log("deeplink in layout",token )

      if (token) {
        router.push(`/(signin)/reset-password?token=${token}`);
      }
    });

    return () => sub.remove();
  }, []);

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
  container: { flex: 1 },
});
