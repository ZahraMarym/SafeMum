import { Stack } from 'expo-router';


export default function Layout() {

  return (
      <Stack
      screenOptions={{
        headerShown: false,
      }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack name="pregnancy-tracker" options={{headerShown:false}}/>
      </Stack>
  );
}
