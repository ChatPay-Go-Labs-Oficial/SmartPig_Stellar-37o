import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function BlindPayOnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        // O slide_from_right dispara startViewTransition nas views das telas
        // durante a troca. Com o Fabric (New Architecture) isso deixa a view
        // "em transição" com um parent ainda atribuído, e o mount layer estoura
        // com "addViewAt: cannot insert view [...] View already has a parent" ao
        // reinserir a view (software-mansion/react-native-screens#3249 — o fix
        // #3250 no RNS não basta; o RN core, que é AAR pré-compilado aqui, ainda
        // não trata views in-transition). Sem animação de transição não há
        // startViewTransition, então o crash não ocorre.
        animation: 'none',
      }}
    />
  );
}
