import { apiClient } from './client';

/** Mirrors the backend's blocker codes, B-1 to B-11. */
export type BlockerCode =
  | 'VAULT_BALANCE'
  | 'VAULT_BALANCE_UNKNOWN'
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

/** Raw values for the sentence the screen writes. Amounts are unformatted. */
export interface BlockerParams {
  amountUsd?: string;
  assetCode?: string;
  vaultId?: string;
  vaultName?: string;
  /** ISO date from which a locked gift can be reclaimed. */
  availableAt?: string;
}

/**
 * A reason the account cannot be deleted.
 *
 * The API sends no display text: the wording depends on the Lite/Pro mode, and
 * only the client knows which one is on. The screen writes the sentence from
 * `code` and `params`, taking crypto terms from `lib/copy/terms.ts`.
 */
export interface Blocker {
  code: BlockerCode;
  /**
   * `false` means there is nothing the user can do but wait — a gift still locked
   * on the network, an operation in flight. The screen must not offer a button.
   */
  resolvable: boolean;
  action: BlockerAction | null;
  params?: BlockerParams;
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
  /**
   * The threshold below which a balance does not block, in USD. Comes from the
   * server so the consent copy is never hard-coded — if the configuration moves
   * and the sentence does not, the screen lies about what the user will lose.
   */
  dustThresholdUsd: string;
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

/** Body of `POST /account-deletion`. */
export interface RequestDeletionResult {
  requestId: string;
  /** `null` when the wallet was never activated — there is nothing to sign. */
  closureXdr: string | null;
  residuals: {
    sweptToTreasuryUsd: string;
    permanentlyLostUsd: string;
  };
  /** The signed transaction is refused by the network after this. */
  expiresAt: string;
}

export interface Acknowledgements {
  dataRetention: boolean;
  onchainHistoryPublic: boolean;
  irreversible: boolean;
}

export interface ConfirmDeletionResult {
  status: string;
  deletedAt: string;
}

/**
 * Opens the deletion request.
 *
 * Nothing is destroyed here: the server re-checks eligibility, records the request
 * and hands back the transaction that closes the Stellar account. A request left
 * unconfirmed simply expires.
 *
 * `idempotencyKey` makes a retried call return the same request instead of opening
 * a second one — the app must reuse the key across retries of the same attempt.
 */
export async function requestAccountDeletion(
  idempotencyKey: string,
): Promise<RequestDeletionResult> {
  const { data } = await apiClient.post<RequestDeletionResult>(
    '/account-deletion',
    { idempotencyKey },
  );
  return data;
}

/**
 * Confirms and executes the deletion. From here it is irreversible.
 *
 * The signature is omitted when `closureXdr` came back null. The three
 * acknowledgements are all required — the server answers 400 if any is missing or
 * false, which is what keeps an unticked box from passing silently.
 */
export async function confirmAccountDeletion(params: {
  requestId: string;
  signedXdr?: string;
  acknowledgements: Acknowledgements;
}): Promise<ConfirmDeletionResult> {
  const { requestId, ...body } = params;
  const { data } = await apiClient.post<ConfirmDeletionResult>(
    `/account-deletion/${requestId}/confirm`,
    body,
  );
  return data;
}
