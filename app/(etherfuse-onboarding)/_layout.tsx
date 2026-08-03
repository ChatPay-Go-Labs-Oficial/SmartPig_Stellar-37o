import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function EtherfuseOnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        // Mesmo motivo do (blindpay-onboarding)/_layout.tsx: sem transição
        // animada não há startViewTransaction, e o mount layer do Fabric não
        // estoura com "addViewAt: cannot insert view [...] View already has a
        // parent" (software-mansion/react-native-screens#3249).
        animation: 'none',
      }}
    />
  );
}
