import { Stack } from 'expo-router';
import { V2Colors } from '@/constants/theme-v2';

// Quem chega ao Seu nível de outra aba (card da Home, cabeçalho do Perfil)
// encontra a Trilha por baixo: o voltar leva a ela. Vale para links diretos;
// a navegação de dentro do app precisa pedir com withAnchor.
export const unstable_settings = {
  initialRouteName: 'index',
};

// Stack dentro da aba, como as da Carteira e do Perfil: o Seu nível abre por
// cima da Trilha sem esconder a tab bar (Figma 36a).
export default function LearnLayout() {
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
      {/* Camada transparente, como o Histórico da Carteira (ver
          wallet/_layout): a Trilha continua montada por baixo e a volta não
          pisca. Uma cópia só, mesmo com toque duplo no card. */}
      <Stack.Screen
        name="level"
        dangerouslySingular
        options={{ presentation: 'transparentModal', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
