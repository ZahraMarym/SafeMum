import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      {/* This defines the "home" route */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
         <Stack.Screen name="nutrition-tracking" options={{ headerShown: false }} />

      {/* This defines the "pregnancy-tracker" route */}
      <Stack.Screen name="pregnancy-tracker" options={{ headerShown: false }} />
    </Stack>
  );
}
