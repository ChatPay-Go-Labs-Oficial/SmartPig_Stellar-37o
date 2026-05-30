import { SmartAccountKit } from 'smart-account-kit';
import { ExpoStorageAdapter } from './expo-storage-adapter';
import { rnPasskeysShim } from './rn-passkeys-shim';
import { Keypair, xdr } from '@stellar/stellar-sdk';
import { useAuthStore } from '@/lib/stores/auth.store';
import { signHashViaPrivy } from './signer';

let _kit: SmartAccountKit | null = null;
const NETWORK_PASSPHRASE = process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE!;

export function getKit(): SmartAccountKit {
  if (!_kit) {
    _kit = new SmartAccountKit({
      rpcUrl: process.env.EXPO_PUBLIC_STELLAR_RPC_URL!,
      networkPassphrase: NETWORK_PASSPHRASE,
      accountWasmHash: process.env.EXPO_PUBLIC_ACCOUNT_WASM_HASH!,
      webauthnVerifierAddress: process.env.EXPO_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS!,
      rpId: process.env.EXPO_PUBLIC_STELLAR_RP_ID || undefined,
      storage: new ExpoStorageAdapter(),
      webAuthn: rnPasskeysShim,
    });
  }
  return _kit;
}

/**
 * Computes SHA256(transactionEnvelope.toXDR() + networkPassphrase)
 * without using the Transaction constructor (which fails for some operation types).
 */
async function computeTxHash(
  envelope: xdr.TransactionEnvelope,
  passphrase: string,
): Promise<Buffer> {
  const xdrBytes = envelope.toXDR();
  const passphraseBytes = Buffer.from(passphrase, 'utf-8');
  const combined = Buffer.concat([Buffer.from(xdrBytes), passphraseBytes]);

  const crypto = require('crypto');
  return crypto.createHash('sha256').update(combined).digest();
}

export async function signXdr(unsignedXdr: string): Promise<string> {
  const walletAddress = useAuthStore.getState().walletAddress;
  if (!walletAddress) {
    throw new Error('Carteira não conectada. Reconecte.');
  }

  const envelope = xdr.TransactionEnvelope.fromXDR(unsignedXdr, 'base64');

  const txHash = await computeTxHash(envelope, NETWORK_PASSPHRASE);
  const hashHex = `0x${txHash.toString('hex')}` as const;

  const signature = await signHashViaPrivy(walletAddress, hashHex);

  const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
  const hint = Keypair.fromPublicKey(walletAddress).signatureHint();
  const decoratedSignature = new xdr.DecoratedSignature({
    hint,
    signature: signatureBytes,
  });

  const v1Envelope = envelope.v1();
  if (v1Envelope) {
    v1Envelope.signatures().push(decoratedSignature);
  } else {
    const v0Envelope = envelope.v0();
    v0Envelope.signatures().push(decoratedSignature);
  }

  return Buffer.from(envelope.toXDR()).toString('base64');
}
