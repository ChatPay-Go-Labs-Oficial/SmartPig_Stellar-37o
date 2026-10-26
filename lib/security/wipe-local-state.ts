import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayStore } from '@/lib/stores/blindpay.store';
import { useEtherfuseStore } from '@/lib/stores/etherfuse.store';
import { useGiftStore } from '@/lib/stores/gift.store';
import { usePixStore } from '@/lib/stores/pix.store';
import { useAppModeStore } from '@/lib/stores/app-mode.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useVersionGateStore } from '@/lib/stores/version-gate.store';

/** Chave da store de progresso da trilha v1, removida com a trilha V2. */
export const LEGACY_LEARNING_STORAGE_KEY = 'smartpig-learning-progress';

/**
 * Every persisted store in the app.
 *
 * Listing them by hand is the point: a store added later does not silently escape
 * the wipe, because adding one means touching this array. The previous approach —
 * clearing three stores inline in a screen handler — is how `gift` and `etherfuse`
 * came to survive a sign-out.
 */
const PERSISTED_STORES = [
  useAuthStore,
  useBlindPayStore,
  useEtherfuseStore,
  useGiftStore,
  usePixStore,
  useAppModeStore,
  useSettingsStore,
  useVersionGateStore,
];

/**
 * Erases everything this device holds about the account.
 *
 * Two layers, and both are needed. The persisted copy in device storage is the one
 * that outlives the process; the in-memory copy is the one still readable while
 * the app is open. Clearing only storage would leave a Pix key sitting in memory.
 *
 * Written for account deletion, where the promise is absolute. It is deliberately
 * not wired into sign-out: that path works today and changing it is a separate
 * decision.
 *
 * Never throws. A device that refuses to clear one key must not stop a deletion
 * that already completed on the server — the account is gone either way, and
 * surfacing an error here would suggest otherwise.
 */
export async function wipeLocalState(): Promise<void> {
  for (const store of PERSISTED_STORES) {
    try {
      await store.persist.clearStorage();
    } catch {
      // Intentionally silent: see above.
    }
  }

  // Progresso da trilha v1, que ficava só no aparelho. A trilha agora vem do
  // backend; a chave antiga pode sobrar em quem atualizou o app.
  try {
    await AsyncStorage.removeItem(LEGACY_LEARNING_STORAGE_KEY);
  } catch {
    // Intentionally silent: see above.
  }

  // In-memory state, through each store's own reset. Only the stores that hold
  // something worth clearing expose one; the rest carry preferences that the
  // storage wipe already removed for the next launch.
  try {
    useBlindPayStore.getState().resetOnboarding();
    useBlindPayStore.getState().clearKycDraft();
    usePixStore.getState().clearPixKey();
    useEtherfuseStore.getState().resetOnboarding();
    // A data da última troca de modo é desta conta (ver app-mode.store).
    useAppModeStore.getState().reset();
    useAuthStore.getState().clearAuth();
  } catch {
    // Intentionally silent: see above.
  }
}
