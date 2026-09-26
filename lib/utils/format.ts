import type { AppMode } from "@/lib/stores/app-mode.store";

// Trunca, nunca arredonda — evita exibir um saldo maior do que o real
// (ex.: 34.7092266 nunca deve virar "34.71", só "34.70").
export function truncateDecimalString(raw: string, decimals = 2): string {
  const [integerPart, decimalPart = ""] = raw.split(".");
  if (decimals <= 0) return integerPart;
  const paddedDecimals = decimalPart.padEnd(decimals, "0").slice(0, decimals);
  return `${integerPart}.${paddedDecimals}`;
}

/** Casas decimais da Stellar. O Pro mostra o número exato, sem arredondar. */
const STELLAR_DECIMALS = 7;

/**
 * Valor monetário conforme o modo.
 *
 * Lite formata como banco formata: duas casas, separador pt-BR. Pro mostra a
 * precisão nativa da Stellar — quem escolheu Pro quer o número exato, não o
 * arredondado. Em ambos os casos trunca, nunca arredonda para cima.
 */
export function formatAmountForMode(
  raw: string | null | undefined,
  mode: AppMode,
): string {
  if (!raw) return mode === "pro" ? "0.0000000" : "0,00";

  if (mode === "pro") return truncateDecimalString(raw, STELLAR_DECIMALS);

  const n = parseFloat(truncateDecimalString(raw, 2));
  if (Number.isNaN(n)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Valor que está no caminho da exclusão da conta.
 *
 * Duas casas nos dois modos. As sete casas do Pro existem para conferir saldo;
 * aqui o número serve para decidir o que fazer com ele, e o resto é ruído.
 */
export function formatBlockingAmount(
  raw: string | null | undefined,
  mode: AppMode,
): string {
  const truncated = truncateDecimalString(raw ?? "0", 2);
  if (mode === "pro") return truncated;

  const n = parseFloat(truncated);
  if (Number.isNaN(n)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Quatro casas bastam para um valor que, por definição, é menor que a poeira. */
const RESIDUAL_DECIMALS = 4;

/**
 * Valor residual — o que será varrido ou perdido ao excluir a conta.
 *
 * Duas casas exibiriam sempre zero, já que o valor é sempre menor que o limite
 * de poeira. Mostra até quatro, sem zeros à direita e nunca menos que duas. O
 * que não couber em quatro vira "menor que", em vez de virar zero.
 */
export function formatResidualAmount(
  raw: string | null | undefined,
  mode: AppMode,
): string {
  const separator = (value: string) =>
    mode === "pro" ? value : value.replace(".", ",");

  const truncated = truncateDecimalString(raw ?? "0", RESIDUAL_DECIMALS);
  if (Number(truncated) === 0 && Number(raw ?? 0) > 0) {
    return separator(`< 0.${"0".repeat(RESIDUAL_DECIMALS - 1)}1`);
  }

  return separator(truncated.replace(/(.d{2}d*?)0+$/, "$1"));
}

/**
 * Rendimento anual — mesmo formato nos dois modos.
 *
 * Chegou a variar por modo (quatro casas no Pro), mas o número comprido
 * empurrava o nome do vault para reticências no card. A precisão extra não
 * valia o custo de layout: entre 8,4% e 8,4210% não há decisão diferente a
 * tomar. Por isso a função não recebe `mode` — se um dia voltar a variar, o
 * parâmetro volta junto.
 */
export function formatApy(apy: number | string | null | undefined): string {
  if (apy == null) return "—";
  const n = parseFloat(String(apy));
  if (Number.isNaN(n)) return "—";

  return `${n.toFixed(1).replace(".", ",")}%`;
}

/**
 * Total do fundo. Lite abrevia (é um número de contexto, não de conferência);
 * Pro mostra o valor cheio.
 */
export function formatTvlForMode(
  tvl: string | null | undefined,
  mode: AppMode,
): string {
  if (!tvl) return "—";
  const n = parseFloat(tvl);
  if (Number.isNaN(n)) return "—";

  if (mode === "pro") return `$${formatAmountForMode(tvl, "pro")}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${formatAmountForMode(tvl, "lite")}`;
}

/**
 * Nome do vault. Vaults recém-sincronizados chegam com o contract ID cru como
 * nome; no Lite isso vira um nome legível, no Pro fica o identificador
 * abreviado, que é o que um usuário técnico quer conferir.
 */
export function formatVaultNameForMode(name: string, mode: AppMode): string {
  if (!name) return "";

  const isRawContractId = /^[A-Z0-9]{40,}$/.test(name);
  if (isRawContractId) {
    return mode === "pro"
      ? `${name.slice(0, 6)}…${name.slice(-4)}`
      : "Porquinho do PigFi";
  }
  if (mode === "pro") return name;

  const lower = name.replace(/[-_]+/g, " ");
  if (/pig/i.test(lower)) return "Porquinho do PigFi";
  return lower
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
