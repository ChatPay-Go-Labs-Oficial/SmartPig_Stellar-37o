import { SmartAccountKit } from 'smart-account-kit';
import { ExpoStorageAdapter } from './expo-storage-adapter';
import { rnPasskeysShim } from './rn-passkeys-shim';
import {
  Keypair,
  xdr,
  TransactionBuilder,
  Transaction,
  Asset,
  Operation,
  Memo,
  BASE_FEE,
  Horizon,
} from '@stellar/stellar-sdk';
import { useAuthStore } from '@/lib/stores/auth.store';
import { signHashViaPrivy } from './signer';

// hash.js — pure-JS SHA256, funciona em Hermes/React Native
const hashJs = require('hash.js') as {
  sha256: () => { update: (d: Uint8Array) => { digest: () => number[] } };
};

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

export async function signXdr(unsignedXdr: string): Promise<string> {
  const walletAddress = useAuthStore.getState().walletAddress;
  if (!walletAddress) {
    throw new Error('Carteira não conectada. Reconecte.');
  }

  const envelope = xdr.TransactionEnvelope.fromXDR(unsignedXdr, 'base64');

  // Computa o hash manualmente: SHA256(SHA256(pass) + envelopeType + txBody)
  const v1 = envelope.v1();
  const innerTx = v1 ? v1.tx() : envelope.v0().tx();
  const txBytes = innerTx.toXDR();

  const passHash = hashJs.sha256()
    .update(new Uint8Array(Buffer.from(NETWORK_PASSPHRASE, 'utf-8')))
    .digest();
  const envType = Buffer.alloc(4);
  envType.writeUInt32BE(v1 ? 2 : 0, 0);
  const payload = Buffer.concat([Buffer.from(passHash), envType, Buffer.from(txBytes)]);
  const hash = hashJs.sha256().update(new Uint8Array(payload)).digest();
  const txHash = Buffer.from(hash);
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

const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_CODE = 'USDC';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export async function signTrustlineXdr(walletAddress: string): Promise<string> {
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(walletAddress);

  const usdc = new Asset(USDC_CODE, USDC_ISSUER);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(600)
    .build();

  const txHash = tx.hash();
  const hashHex = `0x${txHash.toString('hex')}` as const;

  const signature = await signHashViaPrivy(walletAddress, hashHex);

  const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
  const hint = Keypair.fromPublicKey(walletAddress).signatureHint();
  const decoratedSignature = new xdr.DecoratedSignature({
    hint,
    signature: signatureBytes,
  });

  const envelope = tx.toEnvelope();
  const v1Envelope = envelope.v1();
  if (v1Envelope) {
    v1Envelope.signatures().push(decoratedSignature);
  } else {
    envelope.v0().signatures().push(decoratedSignature);
  }

  const raw = envelope.toXDR();
  return typeof raw === 'string' ? raw : Buffer.from(raw).toString('base64');
}

export async function signAndSubmitTransfer(params: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo?: string;
}): Promise<{ hash: string }> {
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(params.fromAddress);
  const usdc = new Asset(USDC_CODE, USDC_ISSUER);

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.payment({
      destination: params.toAddress,
      asset: usdc,
      amount: params.amount,
    }))
    .setTimeout(600);

  if (params.memo?.trim()) builder.addMemo(Memo.text(params.memo.trim()));

  const tx = builder.build();
  const txHash = tx.hash();
  const hashHex = `0x${txHash.toString('hex')}` as `0x${string}`;

  const signature = await signHashViaPrivy(params.fromAddress, hashHex);
  const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
  const hint = Keypair.fromPublicKey(params.fromAddress).signatureHint();
  const decoratedSig = new xdr.DecoratedSignature({ hint, signature: signatureBytes });

  const envelope = tx.toEnvelope();
  const v1 = envelope.v1();
  if (v1) v1.signatures().push(decoratedSig);
  else envelope.v0().signatures().push(decoratedSig);

  const rawSigned = envelope.toXDR();
  const signedXdr = typeof rawSigned === 'string' ? rawSigned : Buffer.from(rawSigned).toString('base64');
  const signedTx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(signedTx);
  return { hash: result.hash };
}
