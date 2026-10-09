import { Stack } from 'expo-router';
import { V2Colors } from '@/constants/theme-v2';

// Stack dentro da aba: o Histórico abre por cima da Carteira sem esconder a
// tab bar, como no Figma (25a–25i).
export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: V2Colors.background },
        // Mesmo motivo do root _layout: o freeze do react-native-screens quebra
        // a remontagem de views nativas no Fabric.
        freezeOnBlur: false,
      }}
    />
  );
}
