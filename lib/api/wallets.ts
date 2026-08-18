import { apiClient } from './client';
import { signXdr } from '@/lib/stellar/kit';

export interface WalletBalance {
  asset: string;
  balance: string;
}

export interface ActivationXdrResponse {
  unsignedXdr: string;
}

export interface ActivationSubmitResponse {
  success: boolean;
  txHash: string;
}

export interface WalletDetails {
  id: string;
  userId: string;
  stellarAddress: string;
  isActivated: boolean;
}

const ACTIVATION_TIMEOUT_MS = 35_000;

export async function getWalletBalance(stellarAddress: string): Promise<WalletBalance[]> {
  const { data } = await apiClient.get(`/wallets/${stellarAddress}/balance`);
  return data.balances;
}

export function findUsdcBalance(balances: WalletBalance[]): string {
  const usdc = balances.find((b) => b.asset.startsWith('USDC:'));
  return usdc?.balance ?? '0';
}

export async function getActivationXdr(params: {
  userId: string;
  walletAccountId: string;
  stellarAddress: string;
}): Promise<ActivationXdrResponse> {
  const { data } = await apiClient.post('/wallets/activate', params, {
    timeout: ACTIVATION_TIMEOUT_MS,
  });
  return data;
}

export async function submitActivation(params: {
  walletAccountId: string;
  signedXdr: string;
}): Promise<ActivationSubmitResponse> {
  const { data } = await apiClient.post('/wallets/activate/submit', params, {
    timeout: ACTIVATION_TIMEOUT_MS,
  });
  return data;
}

export async function getWallet(walletAccountId: string): Promise<WalletDetails> {
  const { data } = await apiClient.get(`/wallets/${walletAccountId}`);
  return data;
}

const RECONCILIATION_ATTEMPTS = 4;
const RECONCILIATION_DELAY_MS = 2_000;

// Quando o client desiste de esperar a resposta de /wallets/activate/submit
// (timeout ou queda de rede), o backend pode ainda estar no meio do processo
// de ativação — ele mantém um advisory lock e só grava isActivated=true ao
// commitar, o que pode levar até ~30s (orçamento + retries de fee-bump no
// Horizon). Uma única leitura logo após o timeout do client tem boa chance de
// pegar esse estado intermediário e reportar falha por engano. Faz poll por
// alguns segundos antes de desistir de verdade.
export async function reconcileWalletActivation(
  walletAccountId: string,
  attempts = RECONCILIATION_ATTEMPTS,
  delayMs = RECONCILIATION_DELAY_MS,
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const walletDetails = await getWallet(walletAccountId);
      if (walletDetails.isActivated) return true;
    } catch {
      // Leitura de reconciliação falhou nesta tentativa; tenta de novo.
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

export interface ActivationAttemptResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Shared by the manual "ativar conta" retry (profile.tsx) and the automatic
// on-app-open check (useAutoWalletActivation) — same XDR-fetch/sign/submit
// sequence, same network-error reconciliation fallback.
export async function attemptActivation(params: {
  userId: string;
  walletAccountId: string;
  stellarAddress: string;
}): Promise<ActivationAttemptResult> {
  try {
    const { unsignedXdr } = await getActivationXdr(params);
    const signedXdr = await signXdr(unsignedXdr);
    const { txHash } = await submitActivation({
      walletAccountId: params.walletAccountId,
      signedXdr,
    });
    return { success: true, txHash };
  } catch (err: any) {
    const isNetworkLevelError = !err?.response;
    if (isNetworkLevelError) {
      const reconciled = await reconcileWalletActivation(params.walletAccountId);
      if (reconciled) return { success: true };
    }
    const error = err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido';
    return { success: false, error };
  }
}
