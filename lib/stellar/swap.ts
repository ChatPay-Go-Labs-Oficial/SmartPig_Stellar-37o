import { Buffer } from 'buffer';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { signHashViaPrivy } from './signer';
import { getUsdcConfig, STELLAR_CONFIG } from './config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
const usdcConfig = getUsdcConfig();
const usdcAsset = new Asset(usdcConfig.code, usdcConfig.issuer);

export interface SwapResult {
  hash: string;
  xlmSpent: string;
  usdcReceived: string;
  rate: string;
}

export class SwapError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'SwapError';
  }
}

export async function findXlmToUsdcPath(
  destinationAddress: string,
  desiredUsdc: string,
): Promise<{ sourceAmount: string; path: any[] } | null> {
  const url = `${STELLAR_CONFIG.horizonUrl}/paths/strict-receive?` +
    `source_account=${destinationAddress}` +
    `&destination_account=${destinationAddress}` +
    `&destination_asset_type=credit_alphanum4` +
    `&destination_asset_code=${usdcConfig.code}` +
    `&destination_asset_issuer=${usdcConfig.issuer}` +
    `&destination_amount=${desiredUsdc}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const records = data._embedded?.records ?? [];

  for (const r of records) {
    if (r.source_asset_type === 'native') {
      return {
        sourceAmount: r.source_amount,
        path: r.path ?? [],
      };
    }
  }

  return null;
}

export async function swapXlmForUsdc(
  walletAddress: string,
  usdcAmount: string,
): Promise<SwapResult> {
  const pathInfo = await findXlmToUsdcPath(walletAddress, usdcAmount);
  if (!pathInfo) {
    throw new SwapError(
      'Nenhum caminho de troca XLM → USDC encontrado na testnet.'
    );
  }

  const xlmNeeded = pathInfo.sourceAmount;
  if (Number(xlmNeeded) <= 0) {
    throw new SwapError('Valor de troca inválido.');
  }

  const account = await server.loadAccount(walletAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: xlmNeeded,
        destination: walletAddress,
        destAsset: usdcAsset,
        destAmount: usdcAmount,
        path: pathInfo.path,
      }),
    )
    .setTimeout(600)
    .build();

  const txHash = Buffer.from(tx.hash());
  const signature = await signHashViaPrivy(
    walletAddress,
    `0x${txHash.toString('hex')}`,
  );

  const decoratedSignature = new xdr.DecoratedSignature({
    hint: Keypair.fromPublicKey(walletAddress).signatureHint(),
    signature: Buffer.from(signature.replace('0x', ''), 'hex'),
  });

  if (!Keypair.fromPublicKey(walletAddress).verify(txHash, decoratedSignature.signature())) {
    throw new SwapError('A assinatura retornada não corresponde à carteira.');
  }

  tx.signatures.push(decoratedSignature);

  const envelopeXdr = Buffer.from(tx.toEnvelope().toXDR()).toString('base64');
  const submitRes = await fetch(
    `${STELLAR_CONFIG.horizonUrl.replace(/\/$/, '')}/transactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `tx=${encodeURIComponent(envelopeXdr)}`,
    },
  );

  const body = await submitRes.json();
  if (!submitRes.ok) {
    const detail = body?.detail ?? 'Erro desconhecido ao submeter transação.';
    if (detail.includes('op_underfunded')) {
      throw new SwapError(`XLM insuficiente. Necessário ~${Number(xlmNeeded).toFixed(2)} XLM.`);
    }
    throw new SwapError(detail);
  }

  const rate = (Number(xlmNeeded) / Number(usdcAmount)).toFixed(4);

  return {
    hash: body.hash,
    xlmSpent: xlmNeeded,
    usdcReceived: usdcAmount,
    rate,
  };
}
