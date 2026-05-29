import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function EtherfuseOnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
