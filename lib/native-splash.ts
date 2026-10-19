import * as SplashScreen from 'expo-splash-screen';

// Importado no topo do entrypoint, antes do expo-router: ele esconde o splash
// nativo sozinho quando a navegação fica pronta, a menos que o app já tenha
// pedido para segurá-lo. Pedido mais tarde (no módulo do layout, que agora só
// carrega quando é usado), o splash saía antes da abertura existir e ficava
// uma tela vazia no lugar.
//
// O splash fica até a abertura estar desenhada, idêntica a ele (OpeningSplash
// o esconde). A saída de segurança só existe para um JS que nunca chega a
// desenhar.
SplashScreen.preventAutoHideAsync().catch(() => {});
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 8_000);
