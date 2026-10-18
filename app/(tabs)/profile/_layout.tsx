import { Stack } from 'expo-router';
import { V2Colors } from '@/constants/theme-v2';

// Stack dentro da aba, como a da Carteira: Preferências, Verificação e
// Gerenciar conta abrem por cima do Perfil sem esconder a tab bar (Figma 26i–26q).
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: V2Colors.background },
        // Mesmo motivo do root _layout: o freeze do react-native-screens quebra
        // a remontagem de views nativas no Fabric.
        freezeOnBlur: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      {/* Camadas transparentes, como o Histórico da Carteira (ver
          wallet/_layout): o Perfil continua montado por baixo e a volta não
          pisca. Uma cópia só de cada, mesmo com toque duplo na linha. */}
      <Stack.Screen
        name="preferences"
        dangerouslySingular
        options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="verification"
        dangerouslySingular
        options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="account"
        dangerouslySingular
        options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
