import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { registerDevice, unregisterDevice } from '@/lib/api/notifications';
import { useNotificationsStore, type PushPermission } from '@/lib/stores/notifications.store';
import { isPushSupported } from './config';
import { ensureAndroidChannels } from './setup';

/**
 * O último registro aceito pelo backend: token, versão do app e conta. Com os
 * três iguais, abrir o app não chama a API de novo. No SecureStore porque o
 * token deixa mandar push para este aparelho, e o AsyncStorage não é cofre
 * (docs/architecture.md).
 */
const REGISTRATION_KEY = 'pigfi.push-registration';

/** Quanto a saída da conta espera o DELETE do aparelho antes de seguir sem ele. */
const UNREGISTER_TIMEOUT_MS = 2_000;

interface PushRegistration {
  token: string;
  appVersion: string;
  userId: string;
}

function currentAppVersion(): string {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

async function readRegistration(): Promise<PushRegistration | null> {
  try {
    const raw = await SecureStore.getItemAsync(REGISTRATION_KEY);
    return raw ? (JSON.parse(raw) as PushRegistration) : null;
  } catch {
    return null;
  }
}

/** Apaga só o registro local. Nunca lança: roda na saída e na exclusão da conta. */
export async function clearPushRegistration(): Promise<void> {
  if (!isPushSupported) return;
  try {
    await SecureStore.deleteItemAsync(REGISTRATION_KEY);
  } catch {
    // Melhor esforço: o próximo login registra de novo e sobrescreve.
  }
}

function toPushPermission(status: Notifications.PermissionStatus): PushPermission {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/** Relê a permissão do sistema e guarda no store (a pessoa pode ter mudado nos ajustes). */
export async function refreshPushPermission(): Promise<PushPermission | null> {
  if (!isPushSupported) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const permission = toPushPermission(status);
    useNotificationsStore.getState().setPermission(permission);
    return permission;
  } catch {
    return null;
  }
}

/**
 * Pede a permissão do sistema. Só depois de a pessoa aceitar a pré-tela ou
 * tocar em "Ativar" nas Preferências: um "não" aqui é definitivo no iOS.
 * Sem provisional no iOS por enquanto: só alerta e som, sem número no ícone.
 */
export async function requestPushPermission(): Promise<PushPermission | null> {
  if (!isPushSupported) return null;
  // Android 13+: sem canal criado, o diálogo de POST_NOTIFICATIONS não aparece.
  await ensureAndroidChannels();
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    const permission = toPushPermission(status);
    useNotificationsStore.getState().setPermission(permission);
    return permission;
  } catch {
    return refreshPushPermission();
  }
}

/**
 * Registros em fila: o boot e o listener de troca de token podem pedir ao
 * mesmo tempo, e o segundo precisa ver o registro local que o primeiro gravou.
 */
let registrationQueue: Promise<void> = Promise.resolve();

/**
 * Garante o aparelho registrado para a conta `userId`. Pressupõe permissão
 * concedida e sessão com token (quem chama confere). Sem mudança de token,
 * versão ou conta desde o último registro, não chama a API.
 */
export function syncPushRegistration(userId: string): Promise<void> {
  const run = registrationQueue.then(() => registerIfChanged(userId));
  // A fila segue mesmo se este falhar; quem chamou recebe o erro.
  registrationQueue = run.catch(() => {});
  return run;
}

async function registerIfChanged(userId: string): Promise<void> {
  if (!isPushSupported) return;
  // Simulador e emulador sem Google Play não recebem push remoto.
  if (!Device.isDevice) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  await ensureAndroidChannels();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const appVersion = currentAppVersion();

  const last = await readRegistration();
  if (last && last.token === token && last.appVersion === appVersion && last.userId === userId) {
    return;
  }

  // O backend faz upsert pelo token: se o aparelho era de outra conta, passa
  // para esta.
  await registerDevice({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion,
  });

  try {
    await SecureStore.setItemAsync(
      REGISTRATION_KEY,
      JSON.stringify({ token, appVersion, userId } satisfies PushRegistration),
    );
  } catch {
    // Sem o registro local, a próxima abertura só registra de novo.
  }
}

/**
 * Tira o aparelho da conta na saída. Precisa rodar antes do logout do Privy:
 * o DELETE vai autenticado. Melhor esforço com tempo-limite: falha ou demora
 * não seguram a saída, e o próximo login (desta ou de outra conta) reatribui
 * o token no backend de qualquer forma.
 */
export async function unregisterPushDevice(): Promise<void> {
  if (!isPushSupported) return;
  const last = await readRegistration();
  await clearPushRegistration();
  if (!last) return;

  await Promise.race([
    unregisterDevice(last.token).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, UNREGISTER_TIMEOUT_MS)),
  ]);
}
