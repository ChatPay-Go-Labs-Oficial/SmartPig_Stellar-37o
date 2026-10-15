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
        // Empurrão lateral nativo: a animação roda fora do JS.
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      {/* No Android o react-native-screens desmonta a tela de baixo de um push
          comum; ao voltar, ela é remontada e fica um quadro vazio (a
          "piscada"). Como camada transparente, a Carteira continua montada
          por baixo do Histórico e a volta é tão limpa quanto a ida. O
          Histórico pinta o próprio fundo. */}
      <Stack.Screen
        name="history"
        options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
