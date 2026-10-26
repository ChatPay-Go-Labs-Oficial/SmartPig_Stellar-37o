import { apiClient } from './client';

export interface Vault {
  id: string;
  defindexVaultId: string;
  name: string;
  assetSymbol: string;
  description?: string;
  apy: string | null;    // Decimal from backend — string
  tvl: string | null;    // Decimal from backend — string
  lastSyncedAt: string | null;
  // Campos do vault registry (backend development). Opcionais: um backend
  // anterior ao registry não os envia, e a tela trata a ausência como o
  // comportamento antigo (depósito liberado, sem aceite de riscos).
  /** false = depósitos pausados; o saque continua liberado. */
  depositsEnabled?: boolean;
  /** No máximo um vault em destaque: o porquinho que a aba Guardar abre. */
  isFeatured?: boolean;
  displayOrder?: number;
  assetDecimals?: number;
  /** null = vault sem texto de riscos publicado. */
  disclosure?: VaultDisclosureSummary | null;
  /**
   * O que a pessoa pode fazer neste vault (PigFi Experience, plano 5.4). Só
   * vem de um backend com a trilha; sem ele, vale a regra antiga da flag
   * (hooks/use-vault-access.ts).
   */
  access?: VaultAccess;
}

/** Projeção por pessoa: modo, trilha, operação e aceite de riscos. */
export interface VaultAccess {
  experienceMode: 'LITE' | 'PRO';
  /** Lite e vault diferente de USDC: guardar pede as lições. */
  educationRequired: boolean;
  /** Lições cumpridas ou liberação permanente já conquistada. */
  educationUnlocked: boolean;
  /** ENFORCE_VAULT_EDUCATION do backend. */
  educationEnforced: boolean;
  currentLevel: number | null;
  /** Nível mínimo da regra; o item de nível só aparece quando passa de 0. */
  requiredLevel: number | null;
  /** Lições que faltam, como 'M3'. */
  missingModules: string[];
  /** Depósitos ligados no vault (a pausa vale mesmo com a trilha feita). */
  operationallyAvailable: boolean;
  disclosureAcknowledged: boolean | null;
  /** Operação, trilha e aceite cumpridos. */
  canDeposit: boolean;
}

export interface VaultDisclosureSummary {
  version: number;
  /**
   * Se a pessoa ainda precisa aceitar esta versão. Só vem quando a chamada
   * leva `userId` (o interceptor do client sempre manda). O backend não aplica
   * aqui a isenção do USDC: quem lê precisa aplicar.
   */
  acknowledgmentRequired?: boolean;
}

// ─── Texto de riscos (backend: src/vault-registry/types/risk-codes.ts) ──────
// O backend manda códigos e números; a frase é do app, porque depende do modo
// Lite/Pro (lib/copy/disclosures.ts).

export type RiskCode =
  | 'SMART_CONTRACT'
  | 'STRATEGY_PROTOCOL'
  | 'ISSUER_CREDIT'
  | 'DEPEG'
  | 'FX_EXPOSURE'
  | 'PRICE_VOLATILITY'
  | 'LIQUIDITY_WITHDRAWAL'
  | 'SLIPPAGE_CONVERSION'
  | 'ORACLE_DEPENDENCY'
  | 'YIELD_NOT_GUARANTEED'
  | 'FEES'
  | 'ROLE_TRUST'
  | 'UPGRADEABILITY'
  | 'BACKSTOP_DEPENDENCY'
  | 'NO_DEPOSIT_INSURANCE';

/** Números e nomes, nunca frase. Valores em string, sem formatação. */
export interface RiskParams {
  assetCode?: string;
  issuerName?: string;
  protocolName?: string;
  feeBps?: string;
  vaultFeeBps?: string;
  defindexFeeBps?: string;
  lockupHours?: string;
  oracleName?: string;
  roleHolder?: string;
  slippageBps?: string;
}

export interface RiskEntry {
  /**
   * string, não RiskCode: uma versão nova do texto pode trazer um código que
   * este build ainda não conhece. Para esse caso existe o `fallbackText`.
   */
  code: string;
  severity: 'INFO' | 'MEDIUM' | 'HIGH';
  params?: RiskParams;
  fallbackText?: { lite: string; pro: string };
}

type ModeText = { lite: string; pro: string };

/** Textos livres que acompanham os riscos (o backend não valida o formato). */
export interface DisclosureSections {
  howItEarns?: ModeText;
  withdrawalConditions?: ModeText;
  additionalNotes?: ModeText;
}

export interface VaultDisclosure {
  version: number;
  risks: RiskEntry[];
  sections: DisclosureSections | null;
  /** ISO. */
  publishedAt: string;
}

/** GET /vaults/:id/disclosure. A pessoa vem do token, não do `userId`. */
export interface VaultDisclosureResponse {
  vaultId: string;
  /** null = vault sem texto publicado (o backend então barra o depósito). */
  disclosure: VaultDisclosure | null;
  /** Sem a isenção do USDC: quem lê aplica. */
  acknowledgmentRequired: boolean;
}

export interface AcknowledgeDisclosureBody {
  /** A versão lida: se outra foi publicada no meio, o backend recusa (409). */
  version: number;
  appVersion?: string;
  mode: 'lite' | 'pro';
  /** Códigos que a tela de fato mostrou, para o registro do aceite. */
  shownCodes: string[];
}

export interface AcknowledgeDisclosureResult {
  vaultId: string;
  version: number;
  acknowledgedAt: string;
}

export interface VaultDetail extends Vault {
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Leitura ao vivo do DeFindex; ausente quando ele falha. */
  liveInfo?: VaultLiveInfo;
  /** Ficha do vault curada no admin; null enquanto ninguém preencheu. */
  configRecord?: VaultConfigRecord | null;
}

export interface VaultLiveInfo {
  fees?: { vaultFeeBps: number; defindexFeeBps: number } | null;
  assets?: {
    address: string;
    symbol: string;
    strategies: { address: string; name: string; paused: boolean }[];
  }[];
}

/** Só os campos que o app lê (o registro completo vive no backend). */
export interface VaultConfigRecord {
  strategies?: { contractId: string; name: string }[];
  fees?: { vaultFeeBps: number; defindexFeeBps: number };
  dependencies?: { type: string; name: string; identifier: string }[];
}

export interface VaultApy {
  vaultId: string;
  apy: number;
  cached: boolean;
}

export interface VaultBalance {
  vaultId: string;
  walletAddress: string;
  // Raw share amount used when calculating withdrawals.
  dfTokens: string;
  // Normalized to asset units by getVaultBalance.
  underlyingBalance: string[];
}

const STELLAR_AMOUNT_DECIMALS = 7;

/** Converts contract integer amounts (7-decimal atomic units) to asset units. */
export function normalizeStellarAmount(amount: string | null | undefined): string {
  if (!amount) return '0';

  const value = amount.trim();
  // Decimal values are already expressed in asset units by the backend.
  if (value.includes('.')) return value;
  if (!/^-?\d+$/.test(value)) return '0';

  const negative = value.startsWith('-');
  const digits = (negative ? value.slice(1) : value).replace(/^0+(?=\d)/, '');
  const padded = digits.padStart(STELLAR_AMOUNT_DECIMALS + 1, '0');
  const integerPart = padded.slice(0, -STELLAR_AMOUNT_DECIMALS);
  const fractionalPart = padded
    .slice(-STELLAR_AMOUNT_DECIMALS)
    .replace(/0+$/, '');
  const normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;

  return negative && normalized !== '0' ? `-${normalized}` : normalized;
}

export const getVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vaults');
  return data;
};

export const getVault = async (id: string): Promise<VaultDetail> => {
  const { data } = await apiClient.get(`/vaults/${id}`);
  return data;
};

export const getVaultDisclosure = async (id: string): Promise<VaultDisclosureResponse> => {
  const { data } = await apiClient.get(`/vaults/${id}/disclosure`);
  return data;
};

export const acknowledgeVaultDisclosure = async (
  id: string,
  body: AcknowledgeDisclosureBody,
): Promise<AcknowledgeDisclosureResult> => {
  const { data } = await apiClient.post(`/vaults/${id}/disclosure/acknowledge`, body);
  return data;
};

export const getVaultApy = async (id: string): Promise<VaultApy> => {
  const { data } = await apiClient.get(`/vaults/${id}/apy`);
  return data;
};

export const getVaultBalance = async (id: string, walletAddress: string): Promise<VaultBalance> => {
  const { data } = await apiClient.get(`/vaults/${id}/balance`, { params: { walletAddress } });
  return {
    ...data,
    dfTokens: normalizeStellarAmount(String(data.dfTokens ?? '0')),
    underlyingBalance: Array.isArray(data.underlyingBalance)
      ? data.underlyingBalance.map(normalizeStellarAmount)
      : [],
  };
};

export const getVaultManagerVaults = async (): Promise<Vault[]> => {
  const { data } = await apiClient.get('/vault-manager/vaults');
  return data;
};
