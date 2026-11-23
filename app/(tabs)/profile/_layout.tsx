import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { V2Colors } from '@/constants/theme-v2';

// Camada transparente só no Android, como o Histórico da Carteira: o Perfil
// continua montado por baixo e a volta não pisca (um push comum desmontava a
// tela de baixo e a volta mostrava um quadro vazio). No iOS o modal subia de
// baixo para cima, um por cima do outro, e o voltar das Notificações fechava
// também as Preferências: lá é o push normal, que entra pela direita, volta
// uma tela por vez e tem o gesto de voltar (mesma escolha de vault/[id]).
const subScreen = {
  presentation: Platform.OS === 'android' ? 'transparentModal' : 'card',
  animation: 'slide_from_right',
} as const;

// Stack dentro da aba, como a da Carteira: Preferências (e as Notificações, por
// cima dela), Verificação e Gerenciar conta abrem por cima do Perfil sem
// esconder a tab bar (Figma 26i–26q, 39a–39e).
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
      {/* Uma cópia só de cada, mesmo com toque duplo na linha. */}
      <Stack.Screen name="preferences" dangerouslySingular options={subScreen} />
      <Stack.Screen name="notifications" dangerouslySingular options={subScreen} />
      <Stack.Screen name="verification" dangerouslySingular options={subScreen} />
      <Stack.Screen name="account" dangerouslySingular options={subScreen} />
    </Stack>
  );
}
