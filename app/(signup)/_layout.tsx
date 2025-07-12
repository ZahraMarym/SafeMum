import { Stack } from 'expo-router';


export default function Layout() {

  return (
      <Stack
      screenOptions={{
        headerShown: false,
      }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
         <Stack.Screen name="phone-number" options={{ headerShown: false }} />
          <Stack.Screen name="otp" options={{ headerShown: false }} />
           <Stack.Screen name="set-password" options={{ headerShown: false }} />
            <Stack.Screen name="medical-information" options={{ headerShown: false }} />
      </Stack>
  );
}
