import { SmartAccountKit } from 'smart-account-kit';
import { ExpoStorageAdapter } from './expo-storage-adapter';
import { rnPasskeysShim } from './rn-passkeys-shim';

let _kit: SmartAccountKit | null = null;

export function getKit(): SmartAccountKit {
  if (!_kit) {
    _kit = new SmartAccountKit({
      rpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL!,
      networkPassphrase: process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE!,
      accountWasmHash: process.env.EXPO_PUBLIC_ACCOUNT_WASM_HASH!,
      webauthnVerifierAddress: process.env.EXPO_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS!,
      rpId: process.env.EXPO_PUBLIC_STELLAR_RP_ID || undefined,
      storage: new ExpoStorageAdapter(),
      webAuthn: rnPasskeysShim,
    });
  }
  return _kit;
}

export async function signXdr(unsignedXdr: string): Promise<string> {
  const kit = getKit();

  if (!kit.isConnected) {
    throw new Error('Carteira não conectada. Reconecte.');
  }

  if (kit.relayer) {
    try {
      const result = await kit.relayer.sendXdr(unsignedXdr);
      return result.hash ?? unsignedXdr;
    } catch {
      throw new Error('Falha ao submeter transação via relayer.');
    }
  }

  throw new Error(
    'Relayer não configurado. A assinatura de XDR com passkey requer backend compatível com smart accounts.',
  );
}
