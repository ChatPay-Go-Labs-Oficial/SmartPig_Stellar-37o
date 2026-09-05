import type { AppMode } from '@/lib/stores/app-mode.store';
import type { Blocker, BlockerCode } from '@/lib/api/account-deletion';
import { phrase, term, type TermKey } from './terms';
import { formatAmountForMode, formatVaultNameForMode } from '@/lib/utils/format';

/**
 * Turns a blocker into the sentence the user reads.
 *
 * The API sends `code` and raw values, never text: the wording depends on the
 * Lite/Pro mode and only the client knows which is on. This is where the two meet.
 *
 * Every code must be handled — the switch is exhaustive, so adding one to the API
 * without adding copy here fails the build instead of rendering an empty card.
 */
export interface BlockerCopy {
  title: string;
  detail: string;
  /** Label of the action button, when the blocker is resolvable. */
  cta: string | null;
}

const CTA: Record<string, { lite: string; pro: string }> = {
  WITHDRAW_VAULT: { lite: 'Resgatar deste porquinho', pro: 'Sacar do vault' },
  WITHDRAW_WALLET: { lite: 'Tirar da conta', pro: 'Sacar da carteira' },
  OPEN_GIFTS: { lite: 'Ver meus presentes', pro: 'Ver meus presentes' },
  OPEN_RAMP: { lite: 'Abrir', pro: 'Abrir' },
};

function ctaFor(blocker: Blocker, mode: AppMode): string | null {
  if (!blocker.resolvable || !blocker.action) return null;
  return CTA[blocker.action.type]?.[mode] ?? null;
}

function titleKey(code: BlockerCode): TermKey {
  switch (code) {
    case 'VAULT_BALANCE':
      return 'deletion.blocker.vaultBalance.title';
    case 'VAULT_BALANCE_UNKNOWN':
      return 'deletion.blocker.vaultUnknown.title';
    case 'WALLET_USDC_BALANCE':
      return 'deletion.blocker.walletUsdc.title';
    case 'WALLET_ASSET_BALANCE':
      return 'deletion.blocker.walletAsset.title';
    case 'GIFT_LOCKED':
      return 'deletion.blocker.giftLocked.title';
    case 'GIFT_REFUNDABLE':
      return 'deletion.blocker.giftRefundable.title';
    case 'DEPOSIT_IN_FLIGHT':
      return 'deletion.blocker.deposit.title';
    case 'WITHDRAWAL_IN_FLIGHT':
      return 'deletion.blocker.withdrawal.title';
    case 'TX_PENDING':
      return 'deletion.blocker.tx.title';
    case 'ONRAMP_IN_FLIGHT':
      return 'deletion.blocker.onramp.title';
    case 'OFFRAMP_IN_FLIGHT':
      return 'deletion.blocker.offramp.title';
    case 'ETHERFUSE_ORDER_IN_FLIGHT':
      return 'deletion.blocker.etherfuse.title';
  }
}

function detailFor(blocker: Blocker, mode: AppMode): string {
  const params = blocker.params ?? {};
  const amount = formatAmountForMode(params.amountUsd, mode);

  switch (blocker.code) {
    case 'VAULT_BALANCE':
      return phrase('deletion.blocker.vaultBalance.detail', mode, {
        amount,
        vaultName: formatVaultNameForMode(params.vaultName ?? '', mode),
      });
    case 'VAULT_BALANCE_UNKNOWN':
      return phrase('deletion.blocker.vaultUnknown.detail', mode, {
        vaultName: formatVaultNameForMode(params.vaultName ?? '', mode),
      });
    case 'WALLET_USDC_BALANCE':
      return phrase('deletion.blocker.walletUsdc.detail', mode, { amount });
    case 'WALLET_ASSET_BALANCE':
      return phrase('deletion.blocker.walletAsset.detail', mode, {
        amount,
        assetCode: params.assetCode ?? '',
      });
    case 'GIFT_LOCKED':
      return phrase('deletion.blocker.giftLocked.detail', mode, {
        amount,
        date: formatDate(params.availableAt),
      });
    case 'GIFT_REFUNDABLE':
      return phrase('deletion.blocker.giftRefundable.detail', mode, { amount });
    case 'DEPOSIT_IN_FLIGHT':
      return term('deletion.blocker.deposit.detail', mode);
    case 'WITHDRAWAL_IN_FLIGHT':
      return term('deletion.blocker.withdrawal.detail', mode);
    case 'TX_PENDING':
      return term('deletion.blocker.tx.detail', mode);
    case 'ONRAMP_IN_FLIGHT':
      return term('deletion.blocker.onramp.detail', mode);
    case 'OFFRAMP_IN_FLIGHT':
      return term('deletion.blocker.offramp.detail', mode);
    case 'ETHERFUSE_ORDER_IN_FLIGHT':
      return term('deletion.blocker.etherfuse.detail', mode);
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function blockerCopy(blocker: Blocker, mode: AppMode): BlockerCopy {
  return {
    title: term(titleKey(blocker.code), mode),
    detail: detailFor(blocker, mode),
    cta: ctaFor(blocker, mode),
  };
}
