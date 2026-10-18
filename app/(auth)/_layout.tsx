import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      {/* O login tem fundo próprio. No Android ele desliza para fora revelando
          a Home embaixo (app/_layout.tsx): com o fundo desta pilha, o que
          aparecia no lugar dele era uma área escura, não a Home. */}
      <Stack.Screen
        name="index"
        options={
          Platform.OS === 'android'
            ? { contentStyle: { backgroundColor: 'transparent' } }
            : undefined
        }
      />
    </Stack>
  );
}
