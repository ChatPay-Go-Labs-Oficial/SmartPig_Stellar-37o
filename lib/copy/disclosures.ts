import type { DisclosureSections, RiskCode, RiskEntry, RiskParams, VaultDisclosure } from '@/lib/api/vaults';
import type { PiggyAsset } from '@/lib/utils/piggy';
import { formatFeeBps } from './piggy-details';

// Textos do aceite de riscos (Figma "Guardar · Aceite de riscos", 13a–13h).
//
// O backend manda só códigos e números (RiskEntry); a frase é daqui, porque
// muda com o modo Lite/Pro. O Figma agrupa códigos parecidos num cartão só
// ("Serviço de empréstimos" cobre protocolo e backstop), então o código vira
// um tema, e cada tema presente vira um cartão, na ordem do Figma.
//
// O Figma não tem a tela de cripto: os textos do XLM seguem os de Detalhes
// (12c e 12f), no mesmo tom dos cartões de euro e dólar.

export type RiskTopic =
  | 'issuer'
  | 'volatility'
  | 'fx'
  | 'liquidity'
  | 'yield'
  | 'contracts'
  | 'oracle'
  | 'lending'
  | 'roles'
  | 'fees'
  | 'conversion'
  | 'insurance';

/** Ordem dos cartões: a do Figma (13a e 13d), com os temas sem cartão no fim. */
const TOPIC_ORDER: readonly RiskTopic[] = [
  'issuer',
  'volatility',
  'fx',
  'liquidity',
  'yield',
  'contracts',
  'oracle',
  'lending',
  'roles',
  'fees',
  'conversion',
  'insurance',
];

/** Subconjunto de V2IconName usado pelos cartões (selo âmbar do Figma). */
export type DisclosureIcon = 'coins' | 'info' | 'arrow-up' | 'trending' | 'lock' | 'shield' | 'settings' | 'alert';

// Record exaustivo: um código novo no tipo quebra a compilação até ganhar tema.
const TOPIC_OF: Record<RiskCode, RiskTopic> = {
  ISSUER_CREDIT: 'issuer',
  DEPEG: 'issuer',
  PRICE_VOLATILITY: 'volatility',
  FX_EXPOSURE: 'fx',
  LIQUIDITY_WITHDRAWAL: 'liquidity',
  YIELD_NOT_GUARANTEED: 'yield',
  SMART_CONTRACT: 'contracts',
  ORACLE_DEPENDENCY: 'oracle',
  STRATEGY_PROTOCOL: 'lending',
  BACKSTOP_DEPENDENCY: 'lending',
  ROLE_TRUST: 'roles',
  // "Atualizar partes do porquinho" já está no cartão de quem administra.
  UPGRADEABILITY: 'roles',
  FEES: 'fees',
  SLIPPAGE_CONVERSION: 'conversion',
  NO_DEPOSIT_INSURANCE: 'insurance',
};

export function isKnownRiskCode(code: string): code is RiskCode {
  return Object.prototype.hasOwnProperty.call(TOPIC_OF, code);
}

/**
 * Temas de um conjunto de códigos. "Sem garantia de banco" já está no texto
 * da moeda ("Não é igual a dinheiro no banco"): com o cartão da moeda, ele
 * não ganha cartão próprio.
 */
export function topicsOf(codes: readonly string[]): Set<RiskTopic> {
  const topics = new Set<RiskTopic>();
  for (const code of codes) if (isKnownRiskCode(code)) topics.add(TOPIC_OF[code]);
  if (topics.has('issuer')) topics.delete('insurance');
  return topics;
}

export interface RiskCopyContext {
  asset: PiggyAsset | null;
  /** Símbolo do vault ("EURC"). */
  symbol: string;
  isPro: boolean;
  /** APY de hoje já formatado ("3,4%"), ou null. */
  apy: string | null;
  /** Cripto com taxa muito baixa ou sem taxa: o texto diz isso. */
  lowRate: boolean;
}

export interface RiskCard {
  key: string;
  /** null para itens fora dos temas (código desconhecido ou seção livre). */
  topic: RiskTopic | null;
  icon: DisclosureIcon;
  title: string;
  body: string;
  /**
   * Os dados do backend por trás do cartão (códigos, números, textos), sem o
   * texto montado: muda quando o risco muda, não quando muda o modo ou o APY.
   * É o que marca o cartão como "Atualizado" numa versão nova (Figma 13e).
   */
  fingerprint: string;
}

export interface RiskCardsResult {
  cards: RiskCard[];
  /** Códigos que a tela mostrou (vão no registro do aceite). */
  shownCodes: string[];
  /** Códigos desconhecidos e sem texto reserva: não dá para aceitar. */
  unreadable: string[];
}

/** Monta os cartões de um texto de riscos, na ordem do Figma. */
export function buildRiskCards(disclosure: VaultDisclosure, ctx: RiskCopyContext): RiskCardsResult {
  const byTopic = new Map<RiskTopic, { codes: Set<RiskCode>; params: RiskParams }>();
  const extra: RiskCard[] = [];
  const shownCodes: string[] = [];
  const unreadable: string[] = [];
  const risks: RiskEntry[] = Array.isArray(disclosure.risks) ? disclosure.risks : [];

  for (const risk of risks) {
    if (!risk || typeof risk.code !== 'string') continue;
    if (isKnownRiskCode(risk.code)) {
      const topic = TOPIC_OF[risk.code];
      const group = byTopic.get(topic) ?? { codes: new Set<RiskCode>(), params: {} };
      group.codes.add(risk.code);
      if (isRecord(risk.params)) Object.assign(group.params, risk.params);
      byTopic.set(topic, group);
      shownCodes.push(risk.code);
      continue;
    }
    const fallback = risk.fallbackText?.[ctx.isPro ? 'pro' : 'lite'];
    if (typeof fallback === 'string' && fallback.trim()) {
      extra.push({
        key: `extra:${risk.code}`,
        topic: null,
        icon: 'alert',
        title: 'Outro risco',
        body: fallback.trim(),
        fingerprint: stableJson(risk.fallbackText),
      });
      shownCodes.push(risk.code);
    } else {
      unreadable.push(risk.code);
    }
  }

  const topics = topicsOf([...byTopic.values()].flatMap((group) => [...group.codes]));
  const cards: RiskCard[] = [];
  for (const topic of TOPIC_ORDER) {
    const group = byTopic.get(topic);
    // Fora de `topics`: seguro de depósito, coberto pelo cartão da moeda.
    if (!group || !topics.has(topic)) continue;
    cards.push({
      key: topic,
      topic,
      ...topicCopy(topic, group.codes, group.params, ctx),
      fingerprint: stableJson({ codes: [...group.codes].sort(), params: group.params }),
    });
  }

  return { cards: [...cards, ...extra, ...sectionCards(disclosure.sections, ctx.isPro)], shownCodes, unreadable };
}

/**
 * Cartões que mudaram desde o último aceite: novos, ou com outros dados por
 * trás. Sem as impressões (registro antigo), compara só os temas.
 */
export function updatedCardKeys(
  cards: readonly RiskCard[],
  previous: { codes: readonly string[]; fingerprints?: Record<string, string> },
): Set<string> {
  if (previous.fingerprints) {
    const before = previous.fingerprints;
    return new Set(cards.filter((card) => before[card.key] !== card.fingerprint).map((card) => card.key));
  }
  const topics = topicsOf(previous.codes);
  return new Set(cards.filter((card) => card.topic && !topics.has(card.topic)).map((card) => card.key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON com as chaves em ordem: a mesma informação dá sempre o mesmo texto. */
function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null, (_, v) =>
    isRecord(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v,
  );
}

/** Nomes vindos do backend: os parâmetros não são validados lá. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// ─── Textos por tema ─────────────────────────────────────────────────────────

const COIN: Record<PiggyAsset, string> = { USDC: 'dólar', EURC: 'euro', XLM: 'criptomoeda' };

/** Parte do Figma: o pool é o Blend, salvo se o backend disser outro. */
function protocolOf(params: RiskParams): string {
  return text(params.protocolName) || 'Blend';
}

function topicCopy(
  topic: RiskTopic,
  codes: Set<RiskCode>,
  params: RiskParams,
  ctx: RiskCopyContext,
): { icon: DisclosureIcon; title: string; body: string } {
  const { asset, isPro } = ctx;
  const symbol = text(params.assetCode) || ctx.symbol;

  switch (topic) {
    case 'issuer': {
      if (isPro) {
        const issuer = text(params.issuerName) || (asset === 'USDC' || asset === 'EURC' ? 'Circle' : null);
        return {
          icon: 'coins',
          title: 'Ativo e emissor',
          body: `${symbol} é emitido ${issuer ? `pela ${issuer}` : 'por uma empresa'}. Depeg ou restrição pelo emissor podem reduzir o valor; não há equivalência garantida a depósito bancário.`,
        };
      }
      if (asset === 'USDC' || asset === 'EURC') {
        const coin = COIN[asset];
        return {
          icon: 'coins',
          title: `O ${coin} usado aqui`,
          body: `É um ${coin} digital, emitido por uma empresa. Ele foi feito para valer 1 ${coin}, mas pode, em momentos raros, valer menos. Não é igual a dinheiro no banco.`,
        };
      }
      return {
        icon: 'coins',
        title: 'Quem emite a moeda',
        body: 'A moeda depende da empresa que a emite. Se ela tiver problemas ou bloquear a moeda, o valor pode cair. Não é igual a dinheiro no banco.',
      };
    }

    case 'volatility':
      if (isPro) {
        return {
          icon: 'trending',
          title: 'Volatilidade',
          body: `O preço do ${symbol} sobe e desce bastante, e o valor em dólar pode cair mesmo com yield.`,
        };
      }
      return asset === 'XLM'
        ? {
            icon: 'trending',
            title: 'O preço da criptomoeda',
            body: 'O preço da criptomoeda sobe e desce bastante. O que você guardou pode valer menos, mesmo com o ganho do porquinho.',
          }
        : {
            icon: 'trending',
            title: 'O preço da moeda',
            body: 'O preço desta moeda sobe e desce. O que você guardou pode valer menos, mesmo com o ganho do porquinho.',
          };

    case 'fx':
      if (isPro) {
        const body =
          asset === 'EURC'
            ? 'Exposição a EUR/BRL e EUR/USD. A variação cambial altera o valor da posição em reais e em dólar, independentemente do APY.'
            : asset === 'USDC'
              ? 'Exposição a USD/BRL: a variação do dólar altera o valor da posição em reais, independentemente do APY.'
              : `Exposição a USD/BRL: o ${symbol} é cotado em dólar, e a variação cambial altera o valor da posição em reais.`;
        return { icon: 'info', title: 'Risco cambial', body };
      }
      if (asset === 'USDC' || asset === 'EURC') {
        const coin = COIN[asset];
        return {
          icon: 'info',
          title: `O valor do ${coin} em reais`,
          body:
            `Seu dinheiro fica em ${coin}. Se o ${coin} cair em relação ao real, o que você guardou vale menos em reais, mesmo que o valor em ${coin} não mude.` +
            (asset === 'EURC' ? ' O euro e o dólar também variam entre si.' : ''),
        };
      }
      return {
        icon: 'info',
        title: 'O valor em reais',
        body: 'O preço da criptomoeda é dado em dólar. Se o dólar cair em relação ao real, o que você guardou vale menos em reais.',
      };

    case 'liquidity': {
      const hours = positiveNumber(params.lockupHours);
      if (isPro) {
        return {
          icon: 'arrow-up',
          title: 'Liquidez e resgate',
          body:
            `O resgate depende da liquidez não emprestada do pool ${protocolOf(params)}, da posição e das condições do vault. ` +
            (hours
              ? `Carência de ${hours} h após o depósito, e sem saque instantâneo garantido.`
              : 'Sem carência fixa e sem saque instantâneo garantido.'),
        };
      }
      return {
        icon: 'arrow-up',
        title: 'Tirar o dinheiro',
        body:
          'Pedir para tirar nem sempre é imediato. Depende de haver dinheiro livre no porquinho, e não prometemos prazo.' +
          (hours ? ` Depois de guardar, é preciso esperar ${hours} ${hours === 1 ? 'hora' : 'horas'} para poder tirar.` : ''),
      };
    }

    case 'yield':
      if (isPro) {
        const lead = ctx.lowRate
          ? 'O APY observado é muito baixo hoje, varia e não é garantido.'
          : ctx.apy
            ? `O APY (${ctx.apy} hoje) varia e não é garantido.`
            : 'O APY varia e não é garantido.';
        return {
          icon: 'trending',
          title: 'APY variável',
          body: `${lead} Depende de juros do pool, recompensas BLND e do reinvestimento da estratégia.`,
        };
      }
      return {
        icon: 'trending',
        title: 'A taxa muda',
        body: ctx.lowRate
          ? 'A taxa muda, é muito baixa hoje e não é garantida.'
          : ctx.apy
            ? `A taxa de ${ctx.apy} ao ano é a de hoje e pode mudar a qualquer momento. Ela não é garantida.`
            : 'A taxa muda a qualquer momento e não é garantida.',
      };

    case 'contracts':
      return isPro
        ? {
            icon: 'lock',
            title: 'Contratos',
            body: 'Vault e estratégia são contratos DeFindex. Bugs, exploits ou falhas de implantação podem causar perda de fundos.',
          }
        : {
            icon: 'lock',
            title: 'Falhas no sistema',
            body: 'O porquinho funciona por meio de programas na internet. Mesmo revisados, eles podem ter erros que causem perdas.',
          };

    case 'oracle':
      return isPro
        ? {
            icon: 'info',
            title: 'Oráculos e preços',
            body: `Preços de oráculos${text(params.oracleName) ? ` (${text(params.oracleName)})` : ''} alimentam o pool ${protocolOf(params)}. Dados errados ou atrasados podem causar liquidações indevidas e dívida ruim.`,
          }
        : {
            icon: 'info',
            title: 'Preços usados nos cálculos',
            body: 'Alguns cálculos dependem de preços de fontes externas. Se uma fonte errar ou falhar, o porquinho pode ser afetado.',
          };

    case 'lending': {
      if (isPro) {
        const protocol = protocolOf(params);
        const backstop = codes.has('BACKSTOP_DEPENDENCY');
        return {
          icon: 'shield',
          title: backstop ? `Pool ${protocol} e backstop` : `Pool ${protocol}`,
          body:
            `As estratégias de USDC, EURC e XLM compartilham o pool ${protocol}: diversificar moeda não diversifica protocolo.` +
            (backstop ? ' O backstop pode ser acionado para cobrir dívida ruim, o que pode afetar a posição.' : ''),
        };
      }
      return {
        icon: 'shield',
        title: 'Serviço de empréstimos',
        body: 'O dinheiro é emprestado por um serviço de empréstimos. Se houver calote ou falha nele, o porquinho pode perder valor. Dólar, euro e criptomoeda usam o mesmo serviço, então ter vários porquinhos não espalha esse risco.',
      };
    }

    case 'roles':
      return isPro
        ? {
            icon: 'settings',
            title: 'Papéis administrativos',
            body:
              'O manager do vault pode atualizar parâmetros; o emergency manager pode pausar e resgatar estratégias para idle. Esses poderes podem mudar o comportamento do vault.' +
              (codes.has('UPGRADEABILITY') ? ' Os contratos também podem receber upgrade.' : ''),
          }
        : {
            icon: 'settings',
            title: 'Quem administra',
            body: 'Algumas pessoas e sistemas podem pausar ou atualizar partes do porquinho. Isso pode mudar como ele funciona.',
          };

    case 'fees': {
      const fee = formatFeeBps(positiveNumber(params.vaultFeeBps) ?? positiveNumber(params.feeBps));
      return isPro
        ? {
            icon: 'info',
            title: 'Fees',
            body: fee
              ? `Performance fee de ${fee} sobre o yield (vaultFeeBps). Não é uma taxa anual sobre o TVL.`
              : 'Performance fee sobre o yield (vaultFeeBps). Não é uma taxa anual sobre o TVL.',
          }
        : {
            icon: 'info',
            title: 'Taxas',
            body: fee
              ? `Uma parte do ganho (${fee}) paga a gestão do porquinho. A taxa de rendimento que você vê já é depois disso.`
              : 'Uma parte do ganho paga a gestão do porquinho. A taxa de rendimento que você vê já é depois disso.',
          };
    }

    case 'conversion': {
      const slippage = formatFeeBps(positiveNumber(params.slippageBps));
      return isPro
        ? {
            icon: 'arrow-up',
            title: 'Slippage na conversão',
            body: `A conversão para ${symbol} é executada a preço de mercado e pode sofrer slippage${slippage ? ` de até ${slippage}` : ''}.`,
          }
        : {
            icon: 'arrow-up',
            title: 'Troca de moedas',
            body:
              'Se for preciso trocar de moeda para guardar, a troca usa a cotação do momento e pode sair um pouco pior que a mostrada.' +
              (slippage ? ` A diferença pode chegar a ${slippage}.` : ''),
          };
    }

    case 'insurance':
      return isPro
        ? {
            icon: 'shield',
            title: 'Sem seguro de depósito',
            body: 'Não há FGC, seguro de depósito ou fundo garantidor. Em caso de perda, não há recuperação.',
          }
        : {
            icon: 'shield',
            title: 'Sem garantia de banco',
            body: 'O dinheiro guardado aqui não tem a garantia do FGC, como num banco. Se houver perda, não há fundo que cubra.',
          };
  }
}

function positiveNumber(raw: unknown): number | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

// ─── Seções livres do texto ──────────────────────────────────────────────────

const SECTIONS: readonly {
  key: keyof DisclosureSections;
  icon: DisclosureIcon;
  lite: string;
  pro: string;
}[] = [
  { key: 'howItEarns', icon: 'trending', lite: 'Como ele rende', pro: 'Como rende' },
  { key: 'withdrawalConditions', icon: 'arrow-up', lite: 'Para tirar', pro: 'Condições de resgate' },
  { key: 'additionalNotes', icon: 'info', lite: 'Outros pontos', pro: 'Notas adicionais' },
];

/** O backend não valida o formato das seções: só entra texto de verdade. */
function sectionCards(sections: DisclosureSections | null | undefined, isPro: boolean): RiskCard[] {
  if (!sections || typeof sections !== 'object') return [];
  const cards: RiskCard[] = [];
  for (const section of SECTIONS) {
    const entry: unknown = sections[section.key];
    const content = isRecord(entry) ? entry[isPro ? 'pro' : 'lite'] : undefined;
    if (typeof content !== 'string' || !content.trim()) continue;
    cards.push({
      key: `section:${section.key}`,
      topic: null,
      icon: section.icon,
      title: isPro ? section.pro : section.lite,
      body: content.trim(),
      fingerprint: stableJson(sections[section.key]),
    });
  }
  return cards;
}

// ─── Textos da tela ──────────────────────────────────────────────────────────

/** Estratégia dos três porquinhos (a mesma de Detalhes). */
const STRATEGY = 'DeFindex Blend Autocompound';

export function disclosureScreenCopy(isPro: boolean, piggyName: string, symbol: string) {
  return isPro
    ? {
        title: 'Riscos do vault',
        intro: `Principais riscos do vault ${symbol} (${STRATEGY}). O PigFi não recomenda vaults: a escolha é sua.`,
        checkbox: 'Li e entendi os riscos deste vault.',
        footnote: 'O aceite vale só para depósitos. O resgate nunca depende dele.',
        updated: 'Os riscos deste vault foram atualizados. Leia de novo para continuar depositando.',
      }
    : {
        title: 'Antes de guardar',
        intro: `Leia com calma. Estes são os principais riscos de guardar no ${piggyName}. O PigFi não recomenda nenhum porquinho: a escolha é sua.`,
        checkbox: 'Li e entendi os riscos deste porquinho.',
        footnote: 'Aceitar vale só para guardar. Tirar o seu dinheiro nunca depende disso.',
        updated: 'Os riscos deste porquinho foram atualizados. Leia de novo para continuar guardando.',
      };
}

export const DISCLOSURE_ACCEPT = 'Aceitar e continuar';

/** O texto mudou enquanto a pessoa lia (409 DISCLOSURE_VERSION_STALE). */
export const DISCLOSURE_STALE =
  'O texto dos riscos mudou enquanto você lia. Leia a versão nova para continuar.';

/** Pede a rolagem antes do aceite (anotação do Figma 13a). */
export const DISCLOSURE_READ_TO_END = 'Leia até o fim da lista para continuar.';

export const DISCLOSURE_UNREADABLE =
  'Este texto tem um item que esta versão do app não consegue mostrar. Atualize o app para ler e aceitar.';

/** "Texto de 15/09/2026" (Lite) ou "v1 · 15/09/2026" (Pro). */
export function disclosureCaption(isPro: boolean, version: number, publishedAt: string): string {
  const date = formatDisclosureDate(publishedAt);
  if (isPro) return date ? `v${version} · ${date}` : `v${version}`;
  return date ? `Texto de ${date}` : `Versão ${version}`;
}

/**
 * dd/mm/aaaa no horário de Brasília. Montado à mão: o Intl do Hermes varia
 * entre versões (mesmo motivo de lib/wallet/history.ts). Brasília não tem
 * horário de verão desde 2019, então o fuso é fixo em −3 h.
 */
export function formatDisclosureDate(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const local = new Date(ms - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

function isLower(char: string): boolean {
  return char !== '' && char === char.toLowerCase() && char !== char.toUpperCase();
}

/** "Mudou: preços usados nos cálculos e quem administra." */
export function changedLine(titles: readonly string[]): string | null {
  if (titles.length === 0) return null;
  // Minúscula só na palavra comum: "APY variável" continua com a sigla.
  const lower = titles.map((title) => (isLower(title.charAt(1)) ? title.charAt(0).toLowerCase() + title.slice(1) : title));
  const list = lower.length === 1 ? lower[0] : `${lower.slice(0, -1).join(', ')} e ${lower[lower.length - 1]}`;
  return `Mudou: ${list}.`;
}
