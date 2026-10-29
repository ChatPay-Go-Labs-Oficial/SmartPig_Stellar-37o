import { useEffect, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { isPushSupported } from '@/lib/notifications/config';
import {
  refreshPushPermission,
  requestPushPermission,
  syncPushRegistration,
} from '@/lib/notifications/push-token';
import { consumeLaunchResponse, handleNotificationResponse } from '@/lib/notifications/responses';
import { useAppLockStore } from '@/lib/stores/app-lock.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useNotificationsStore } from '@/lib/stores/notifications.store';
import { useVersionGateStore } from '@/lib/stores/version-gate.store';
import { NotificationPermissionSheet } from './NotificationPermissionSheet';

/**
 * Folga entre a sessão liberar e a navegação: a abertura se dissolve e o
 * cadeado sai nesse intervalo, e o AppGate faz o próprio dismissTo das abas.
 * Navegando antes, a rota do push entrava e o dismissTo a tirava.
 */
const NAVIGATE_DELAY_MS = 300;
/** O sheet da ação que acabou (o Guardar) termina de descer antes da pré-tela. */
const PROMPT_DELAY_MS = 600;
/** A pré-tela termina de descer antes do diálogo do sistema. */
const REQUEST_DELAY_MS = 400;

function logRegistrationError(error: unknown) {
  const e = error as { message?: string; response?: { status?: number } };
  console.error('[notifications] registro do aparelho', e?.response?.status, e?.message);
}

/**
 * Montado uma vez no layout raiz, dentro do QueryClientProvider. Cuida de
 * tudo que é push com o app vivo: registro do aparelho, toque nas
 * notificações e a pré-tela de permissão. Na web não monta nada.
 */
export function NotificationsGate() {
  return isPushSupported ? <NativeNotificationsGate /> : null;
}

function NativeNotificationsGate() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.contractId);
  const locked = useAppLockStore((s) => s.locked);
  const forceUpdateRequired = useVersionGateStore((s) => s.forceUpdateRequired);
  const permission = useNotificationsStore((s) => s.permission);
  const pendingUrl = useNotificationsStore((s) => s.pendingUrl);
  const promptQueued = useNotificationsStore((s) => s.promptQueued);
  const promptAnswered = useNotificationsStore((s) => s.promptAnswered);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [promptVisible, setPromptVisible] = useState(false);

  // Sessão pronta: logada, com o Privy de pé e nada do AppGate cobrindo o app
  // (abertura, erro de sessão, cadeado). O `locked` só cai depois de tudo isso.
  const sessionReady = isAuthenticated && !!userId && !locked && !forceUpdateRequired;

  // A permissão muda fora do app (ajustes do sistema): relida ao voltar.
  useEffect(() => {
    refreshPushPermission();
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
      if (next === 'active') refreshPushPermission();
    });
    return () => subscription.remove();
  }, []);

  // Toques: o que abriu o app fechado e os que chegam com ele vivo. Os dois
  // só guardam a rota; quem navega é o efeito abaixo, quando a sessão libera.
  useEffect(() => {
    consumeLaunchResponse(queryClient);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      handleNotificationResponse(response, queryClient),
    );
    return () => subscription.remove();
  }, [queryClient]);

  // Registro do aparelho. Depois da sessão pronta porque o POST vai com o
  // token do Privy. Sem mudança de token, versão ou conta, não chama a API.
  useEffect(() => {
    if (!sessionReady || !userId || permission !== 'granted') return;
    syncPushRegistration(userId).catch(logRegistrationError);

    // O sistema pode trocar o token (reinstalação de serviços, restauração de
    // backup): registra o novo.
    const subscription = Notifications.addPushTokenListener(() => {
      syncPushRegistration(userId).catch(logRegistrationError);
    });
    return () => subscription.remove();
  }, [permission, sessionReady, userId]);

  // Rota pendente de um toque. Só com a sessão pronta e o app à frente;
  // confere o cadeado de novo na hora, porque voltando do segundo plano ele
  // pode ter acabado de subir.
  useEffect(() => {
    if (!sessionReady || !appActive || !pendingUrl) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const interaction = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (useAppLockStore.getState().locked) return;
        const { pendingUrl: url, setPendingUrl } = useNotificationsStore.getState();
        if (!url) return;
        setPendingUrl(null);
        router.push(url as Href);
      }, NAVIGATE_DELAY_MS);
    });

    return () => {
      interaction.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [appActive, pendingUrl, sessionReady]);

  // Pré-tela de permissão, uma vez por aparelho, depois do primeiro guardar
  // (ver SaveSheet). Só com a pergunta ainda em aberto no sistema: com
  // "denied" não insiste; o caminho é Perfil > Preferências.
  const promptEligible =
    sessionReady && appActive && promptQueued && !promptAnswered && permission === 'undetermined';

  useEffect(() => {
    if (!promptEligible) {
      // O cadeado ou a saída da conta não podem ficar atrás do sheet.
      setPromptVisible(false);
      return;
    }
    const timer = setTimeout(() => setPromptVisible(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [promptEligible]);

  const handleAccept = () => {
    useNotificationsStore.getState().answerPrompt();
    setPromptVisible(false);
    setTimeout(() => {
      requestPushPermission();
    }, REQUEST_DELAY_MS);
  };

  const handleDecline = () => {
    useNotificationsStore.getState().answerPrompt();
    setPromptVisible(false);
  };

  return (
    <NotificationPermissionSheet
      visible={promptVisible}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
