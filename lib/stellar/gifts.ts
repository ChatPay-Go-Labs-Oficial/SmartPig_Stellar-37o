import { Buffer } from 'buffer';
import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Memo,
  Operation,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { signHashViaPrivy } from './signer';
import { getUsdcConfig, STELLAR_CONFIG } from './config';
import {
  TransferError,
  mapTransferError,
  normalizeUsdcAmount,
  submitTransactionEnvelope,
} from './transfers';

export interface GiftFundingRequest {
  fromAddress: string;
  claimAgentAddress: string;
  amount: string;
  memo: string;
  /** ISO date from the backend gift intent */
  expiresAt: string;
}

export interface GiftTxResult {
  hash: string;
  createdAt: string;
}

const server = new Horizon.Server(STELLAR_CONFIG.horizonUrl);
const usdcConfig = getUsdcConfig();
const usdcAsset = new Asset(usdcConfig.code, usdcConfig.issuer);

// A claimable balance with 2 claimants locks 2 × 0.5 XLM of the sender's
// reserve (returned on claim/refund), plus a small margin for the fee.
const GIFT_RESERVE_XLM = 1;
const FEE_MARGIN_XLM = 0.05;
const BASE_RESERVE_XLM = 0.5;
const ACCOUNT_BASE_ENTRIES = 2;

/**
 * Funds a gift: moves USDC from the sender into a Stellar claimable balance
 * claimable by the backend agent until expiry, and refundable by the sender
 * (trustlessly) after expiry.
 */
export async function signAndSubmitGiftFunding(
  request: GiftFundingRequest,
): Promise<GiftTxResult> {
  const fromAddress = request.fromAddress.trim();
  const claimAgentAddress = request.claimAgentAddress.trim();
  try {
    Keypair.fromPublicKey(claimAgentAddress);
  } catch {
    throw new TransferError('INVALID_ADDRESS', 'Endereço do agente de resgate inválido.');
  }
  const amount = normalizeUsdcAmount(request.amount);

  const memo = request.memo.trim();
  if (!memo || Buffer.byteLength(memo, 'utf8') > 28) {
    throw new TransferError('INVALID_MEMO', 'Identificador do presente inválido.');
  }

  const expiryUnix = Math.floor(new Date(request.expiresAt).getTime() / 1000);
  if (!Number.isFinite(expiryUnix) || expiryUnix * 1000 <= Date.now()) {
    throw new TransferError('INVALID_AMOUNT', 'O prazo do presente é inválido ou já expirou.');
  }

  try {
    const account = await server.loadAccount(fromAddress);
    assertUsdcSpendable(account, amount);
    assertXlmAvailableForGift(account);

    const beforeExpiry = Claimant.predicateBeforeAbsoluteTime(String(expiryUnix));
    const claimants = [
      new Claimant(claimAgentAddress, beforeExpiry),
      new Claimant(fromAddress, Claimant.predicateNot(beforeExpiry)),
    ];

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(
        Operation.createClaimableBalance({ asset: usdcAsset, amount, claimants }),
      )
      .addMemo(Memo.text(memo))
      .setTimeout(600)
      .build();

    return await signWithPrivyAndSubmit(tx, fromAddress);
  } catch (error) {
    throw mapTransferError(error);
  }
}

/**
 * Reclaims an expired gift back to the sender. Trustless: after expiry the
 * sender's claim predicate is enforced by the network itself.
 */
export async function reclaimExpiredGift(params: {
  fromAddress: string;
  balanceId: string;
}): Promise<GiftTxResult> {
  try {
    const account = await server.loadAccount(params.fromAddress.trim());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(
        Operation.claimClaimableBalance({ balanceId: params.balanceId }),
      )
      .setTimeout(600)
      .build();

    return await signWithPrivyAndSubmit(tx, params.fromAddress.trim());
  } catch (error) {
    throw mapTransferError(error);
  }
}

function assertUsdcSpendable(account: Horizon.AccountResponse, amount: string): void {
  const usdcBalance = account.balances.find(
    (balance) =>
      balance.asset_type !== 'native' &&
      'asset_code' in balance &&
      balance.asset_code === usdcConfig.code &&
      balance.asset_issuer === usdcConfig.issuer,
  );
  const spendable = usdcBalance
    ? Number(usdcBalance.balance) - Number(
        'selling_liabilities' in usdcBalance ? usdcBalance.selling_liabilities : 0,
      )
    : 0;
  if (!usdcBalance || spendable < Number(amount)) {
    throw new TransferError('INSUFFICIENT_BALANCE', 'Saldo USDC insuficiente.');
  }
}

function assertXlmAvailableForGift(account: Horizon.AccountResponse): void {
  const native = account.balances.find((balance) => balance.asset_type === 'native');
  const nativeBalance = native ? Number(native.balance) : 0;
  const sellingLiabilities = native && 'selling_liabilities' in native
    ? Number(native.selling_liabilities)
    : 0;
  const minBalance =
    (ACCOUNT_BASE_ENTRIES + account.subentry_count) * BASE_RESERVE_XLM;
  const available = nativeBalance - sellingLiabilities - minBalance;
  if (available < GIFT_RESERVE_XLM + FEE_MARGIN_XLM) {
    throw new TransferError(
      'INSUFFICIENT_XLM',
      'Saldo XLM insuficiente para reservar o presente na rede (a reserva é devolvida no resgate).',
    );
  }
}

async function signWithPrivyAndSubmit(
  tx: Transaction,
  fromAddress: string,
): Promise<GiftTxResult> {
  const txHash = Buffer.from(tx.hash());
  const signature = await signHashViaPrivy(fromAddress, `0x${txHash.toString('hex')}`);
  const decoratedSignature = new xdr.DecoratedSignature({
    hint: Keypair.fromPublicKey(fromAddress).signatureHint(),
    signature: Buffer.from(signature.replace('0x', ''), 'hex'),
  });
  if (!Keypair.fromPublicKey(fromAddress).verify(txHash, decoratedSignature.signature())) {
    throw new TransferError(
      'BAD_AUTH',
      'A assinatura retornada não corresponde à carteira de origem.',
    );
  }
  tx.signatures.push(decoratedSignature);
  const result = await submitTransactionEnvelope(tx.toEnvelope().toXDR());
  return { hash: result.hash, createdAt: new Date().toISOString() };
}
