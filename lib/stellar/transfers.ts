import { Buffer } from 'buffer';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Operation,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { signHashViaPrivy } from './signer';
import { getUsdcConfig, STELLAR_CONFIG } from './config';

export interface TransferRequest {
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo?: string;
}

export interface TransferResult {
  hash: string;
  createdAt: string;
}

export interface UsdcTransferRecord {
  id: string;
  hash: string;
  direction: 'sent' | 'received';
  counterparty: string;
  amount: number;
  createdAt: string;
}

export type TransferErrorCode =
  | 'INVALID_ADDRESS'
  | 'SAME_ADDRESS'
  | 'ACCOUNT_NOT_FOUND'
  | 'NO_TRUSTLINE'
  | 'TRUSTLINE_LIMIT'
  | 'INVALID_AMOUNT'
  | 'INVALID_MEMO'
  | 'INSUFFICIENT_BALANCE'
  | 'SIGNING_CANCELLED'
  | 'BAD_AUTH'
  | 'BAD_SEQUENCE'
  | 'INSUFFICIENT_XLM'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class TransferError extends Error {
  constructor(public readonly code: TransferErrorCode, message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
const usdcConfig = getUsdcConfig();
const usdcAsset = new Asset(usdcConfig.code, usdcConfig.issuer);

export function normalizeUsdcAmount(value: string): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,7})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new TransferError('INVALID_AMOUNT', 'Informe um valor USDC válido com até 7 casas decimais.');
  }
  return normalized;
}

export function validateTransferFields(params: TransferRequest): TransferRequest {
  const fromAddress = params.fromAddress.trim();
  const toAddress = params.toAddress.trim();
  try {
    Keypair.fromPublicKey(toAddress);
  } catch {
    throw new TransferError('INVALID_ADDRESS', 'Endereço de destino inválido.');
  }
  if (fromAddress === toAddress) {
    throw new TransferError('SAME_ADDRESS', 'A carteira de destino deve ser diferente da carteira de origem.');
  }

  const amount = normalizeUsdcAmount(params.amount);
  const memo = params.memo?.trim();
  if (memo && Buffer.byteLength(memo, 'utf8') > 28) {
    throw new TransferError('INVALID_MEMO', 'O memo deve ter no máximo 28 bytes.');
  }

  return { fromAddress, toAddress, amount, memo: memo || undefined };
}

export async function validateUsdcDestination(address: string, amount?: string): Promise<void> {
  let account;
  try {
    account = await server.loadAccount(address);
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) {
      throw new TransferError('ACCOUNT_NOT_FOUND', 'Conta de destino não encontrada na rede Stellar.');
    }
    throw mapTransferError(error);
  }

  const trustline = account.balances.find(
    (balance) =>
      balance.asset_type !== 'native' &&
      'asset_code' in balance &&
      balance.asset_code === usdcConfig.code &&
      balance.asset_issuer === usdcConfig.issuer,
  );
  if (!trustline) {
    throw new TransferError('NO_TRUSTLINE', 'A carteira de destino não possui trustline para este USDC.');
  }
  if (!('is_authorized' in trustline) || !trustline.is_authorized) {
    throw new TransferError('NO_TRUSTLINE', 'A trustline USDC da carteira de destino não está autorizada.');
  }

  const available = 'limit' in trustline
    ? Number(trustline.limit) - Number(trustline.balance) - Number(
        'buying_liabilities' in trustline ? trustline.buying_liabilities : 0,
      )
    : 0;
  if (available <= 0 || (amount && available < Number(amount))) {
    throw new TransferError('TRUSTLINE_LIMIT', 'A trustline de destino não possui limite disponível.');
  }
}

export async function signAndSubmitTransfer(request: TransferRequest): Promise<TransferResult> {
  const params = validateTransferFields(request);
  await validateUsdcDestination(params.toAddress, params.amount);

  try {
    const account = await server.loadAccount(params.fromAddress);
    const sourceBalance = account.balances.find(
      (balance) =>
        balance.asset_type !== 'native' &&
        'asset_code' in balance &&
        balance.asset_code === usdcConfig.code &&
        balance.asset_issuer === usdcConfig.issuer,
    );
    const spendableBalance = sourceBalance
      ? Number(sourceBalance.balance) - Number(
          'selling_liabilities' in sourceBalance ? sourceBalance.selling_liabilities : 0,
        )
      : 0;
    if (!sourceBalance || spendableBalance < Number(params.amount)) {
      throw new TransferError('INSUFFICIENT_BALANCE', 'Saldo USDC insuficiente.');
    }

    const builder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(Operation.payment({
        destination: params.toAddress,
        asset: usdcAsset,
        amount: params.amount,
      }))
      .setTimeout(600);

    if (params.memo) builder.addMemo(Memo.text(params.memo));

    const tx = builder.build();
    const txHash = Buffer.from(tx.hash());
    const signature = await signHashViaPrivy(
      params.fromAddress,
      `0x${txHash.toString('hex')}`,
    );
    const decoratedSignature = new xdr.DecoratedSignature({
      hint: Keypair.fromPublicKey(params.fromAddress).signatureHint(),
      signature: Buffer.from(signature.replace('0x', ''), 'hex'),
    });
    if (!Keypair.fromPublicKey(params.fromAddress).verify(txHash, decoratedSignature.signature())) {
      throw new TransferError(
        'BAD_AUTH',
        'A assinatura retornada não corresponde à carteira de origem.',
      );
    }
    tx.signatures.push(decoratedSignature);
    const result = await submitTransactionEnvelope(tx.toEnvelope().toXDR());
    return { hash: result.hash, createdAt: new Date().toISOString() };
  } catch (error) {
    throw mapTransferError(error);
  }
}

export async function listUsdcTransfers(
  walletAddress: string,
  limit = 20,
): Promise<UsdcTransferRecord[]> {
  try {
    const transfers: UsdcTransferRecord[] = [];
    let cursor: string | undefined;

    for (let pageIndex = 0; pageIndex < 4 && transfers.length < limit; pageIndex += 1) {
      let request = server.payments().forAccount(walletAddress).order('desc').limit(50);
      if (cursor) request = request.cursor(cursor);
      const page = await request.call();

      for (const record of page.records) {
        if (
          record.type !== 'payment' ||
          record.asset_code !== usdcConfig.code ||
          record.asset_issuer !== usdcConfig.issuer
        ) continue;

        const direction = record.from === walletAddress ? 'sent' : 'received';
        transfers.push({
          id: record.id,
          hash: record.transaction_hash,
          direction,
          counterparty: direction === 'sent' ? record.to : record.from,
          amount: Number(record.amount),
          createdAt: record.created_at,
        });
        if (transfers.length === limit) break;
      }

      if (page.records.length < 50) break;
      cursor = page.records.at(-1)?.paging_token;
    }

    return transfers;
  } catch (error) {
    throw mapTransferError(error);
  }
}

export async function submitTransactionEnvelope(envelopeXdr: Uint8Array | string): Promise<{ hash: string }> {
  const base64 = typeof envelopeXdr === 'string'
    ? envelopeXdr
    : Buffer.from(envelopeXdr).toString('base64');

  const response = await fetch(`${STELLAR_CONFIG.horizonUrl.replace(/\/$/, '')}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tx=${encodeURIComponent(base64)}`,
  });
  const body = await response.json();
  if (!response.ok) {
    throw {
      message: body?.detail ?? `Horizon respondeu com status ${response.status}`,
      response: { status: response.status, ...body },
    };
  }
  if (!body?.hash) {
    throw new TransferError('UNKNOWN', 'Horizon não retornou o hash da transação.');
  }
  return { hash: body.hash };
}

export function mapTransferError(error: unknown, fallback?: TransferErrorCode): TransferError {
  if (error instanceof TransferError) return error;

  const candidate = error as {
    message?: string;
    response?: {
      status?: number;
      title?: string;
      detail?: string;
      extras?: { result_codes?: { transaction?: string; operations?: string[] } };
      data?: {
        title?: string;
        detail?: string;
        extras?: { result_codes?: { transaction?: string; operations?: string[] } };
      };
    };
  };
  const status = candidate.response?.status;
  const responseBody = candidate.response?.data ?? candidate.response;
  const txCode = responseBody?.extras?.result_codes?.transaction ?? '';
  const opCode = responseBody?.extras?.result_codes?.operations?.[0] ?? '';
  const detail = responseBody?.detail ?? responseBody?.title ?? '';
  const raw = `${candidate.message ?? ''} ${detail} ${txCode} ${opCode}`.toLowerCase();

  if (status === 404)
    return new TransferError('ACCOUNT_NOT_FOUND', 'Conta de destino não encontrada na rede Stellar.');
  if (raw.includes('op_no_trust'))
    return new TransferError('NO_TRUSTLINE', 'A carteira de destino não possui trustline para este USDC.');
  if (raw.includes('op_line_full'))
    return new TransferError('TRUSTLINE_LIMIT', 'A trustline de destino não possui limite disponível.');
  if (raw.includes('op_underfunded'))
    return new TransferError('INSUFFICIENT_BALANCE', 'Saldo USDC insuficiente.');
  if (raw.includes('op_no_destination'))
    return new TransferError('ACCOUNT_NOT_FOUND', 'Conta de destino não encontrada na rede Stellar.');
  if (raw.includes('op_not_authorized') || raw.includes('op_src_not_authorized'))
    return new TransferError('NO_TRUSTLINE', 'A trustline USDC não está autorizada para esta operação.');
  if (raw.includes('tx_bad_auth') || raw.includes('tx_bad_auth_extra'))
    return new TransferError('BAD_AUTH', 'A assinatura não está autorizada para a carteira de origem.');
  if (raw.includes('tx_bad_seq'))
    return new TransferError('BAD_SEQUENCE', 'A conta foi atualizada. Tente enviar novamente.');
  if (raw.includes('tx_insufficient_balance') || raw.includes('op_low_reserve'))
    return new TransferError(
      'INSUFFICIENT_XLM',
      'Saldo XLM insuficiente para pagar a taxa ou manter a reserva da conta.',
    );
  if (raw.includes('cancel') || raw.includes('abort') || raw.includes('user rejected'))
    return new TransferError('SIGNING_CANCELLED', 'Assinatura cancelada.');
  if (raw.includes('network') || raw.includes('timeout') || raw.includes('fetch'))
    return new TransferError('NETWORK_ERROR', 'Erro de conexão com a rede Stellar.');
  const resultCode = [txCode, opCode].filter(Boolean).join(' / ');
  return new TransferError(
    fallback ?? 'UNKNOWN',
    resultCode
      ? `A rede Stellar recusou a transação (${resultCode}).`
      : detail || candidate.message || 'Não foi possível processar a transferência.',
  );
}
