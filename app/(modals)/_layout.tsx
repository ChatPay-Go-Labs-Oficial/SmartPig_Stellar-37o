import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="deposit/index" />
      <Stack.Screen name="deposit/quote" />
      <Stack.Screen name="deposit/payment" />
      <Stack.Screen name="offramp/index" />
    </Stack>
  );
}
