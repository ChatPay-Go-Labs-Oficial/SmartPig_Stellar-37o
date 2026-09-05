import { apiClient } from './client';

/** Mirrors the backend's blocker codes, B-1 to B-11. */
export type BlockerCode =
  | 'VAULT_BALANCE'
  | 'WALLET_USDC_BALANCE'
  | 'WALLET_ASSET_BALANCE'
  | 'GIFT_LOCKED'
  | 'GIFT_REFUNDABLE'
  | 'DEPOSIT_IN_FLIGHT'
  | 'WITHDRAWAL_IN_FLIGHT'
  | 'TX_PENDING'
  | 'ONRAMP_IN_FLIGHT'
  | 'OFFRAMP_IN_FLIGHT'
  | 'ETHERFUSE_ORDER_IN_FLIGHT';

export type BlockerActionType =
  | 'WITHDRAW_VAULT'
  | 'WITHDRAW_WALLET'
  | 'OPEN_GIFTS'
  | 'OPEN_RAMP';

export interface BlockerAction {
  type: BlockerActionType;
  vaultId?: string;
}

export interface Blocker {
  code: BlockerCode;
  title: string;
  detail: string;
  /**
   * `false` means there is nothing the user can do but wait — a gift still locked
   * on the network, an operation in flight. The screen must not offer a button.
   */
  resolvable: boolean;
  action: BlockerAction | null;
}

export interface VaultShareResidual {
  vaultId: string;
  amount: string;
}

export interface WalletAssetResidual {
  assetId: string;
  amount: string;
}

export interface Residuals {
  walletUsdc: string;
  walletAssets: WalletAssetResidual[];
  vaultShares: VaultShareResidual[];
  sweptToTreasuryUsd: string;
  permanentlyLostUsd: string;
}

export type EligibilityWarning =
  | 'ONCHAIN_HISTORY_PUBLIC'
  | 'BLINDPAY_RETAINS_KYC'
  | 'PRIVY_WALLET_ARCHIVED';

export interface EligibilityResult {
  eligible: boolean;
  blockers: Blocker[];
  residuals: Residuals;
  warnings: EligibilityWarning[];
}

/**
 * Asks whether the account can be deleted.
 *
 * The account inspected comes from the auth token, so this takes no arguments —
 * the `userId` that `apiClient` injects into every request is ignored by the route.
 *
 * Every amount arrives as a decimal string already in whole units, so it must NOT
 * go through `normalizeStellarAmount`: that helper divides integer strings by 10^7,
 * and it would turn a residual of "3" into "0.0000003".
 *
 * The answer is advisory. The check that authorises a deletion is re-run on the
 * server at confirmation time, because a Pix can land between one and the other.
 */
export async function getAccountDeletionEligibility(): Promise<EligibilityResult> {
  const { data } = await apiClient.get<EligibilityResult>(
    '/account-deletion/eligibility',
  );
  return data;
}
