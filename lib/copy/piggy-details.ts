import type { AppMode } from '@/lib/stores/app-mode.store';
import type { PiggyAsset } from '@/lib/utils/piggy';

// Textos da tela "Detalhes do porquinho" (Figma "Guardar · Detalhes", 12a–12f).
// Ficam fora de terms.ts por serem blocos longos por moeda: cada porquinho
// tem a sua versão Lite (linguagem simples) e Pro (termos técnicos).
// O Figma marca os textos como provisórios; o "X%" das taxas é o vaultFeeBps.

export type DetailsIcon = 'coins' | 'trending' | 'arrow-up' | 'info' | 'shield';

export interface DetailsSection {
  icon: DetailsIcon;
  title: string;
  body: string;
}

export interface PiggyDetailsCopy {
  sections: DetailsSection[];
  risksTitle: string;
  risks: string[];
}

const SHARED_POOL_LITE =
  'Dólar, euro e criptomoeda usam o mesmo serviço de empréstimos. Ter porquinhos diferentes não espalha esse risco.';
const SHARED_POOL_PRO =
  'As estratégias de USDC, EURC e XLM compartilham o pool Blend: diversificar moeda não diversifica protocolo.';

const RATE_LITE =
  'O dinheiro guardado é emprestado, por meio de um serviço de empréstimos, a quem precisa. Os juros pagos e alguns prêmios do serviço voltam para o seu porquinho e são guardados de novo sozinhos.';
const WITHDRAW_LITE =
  'Você pode pedir para tirar a qualquer momento, e o dinheiro volta para a sua carteira. Em alguns momentos pode levar mais tempo, porque depende de haver dinheiro livre no porquinho. Não há prazo fixo garantido.';
const APY_PRO =
  'Juros do mercado de empréstimos do Blend e recompensas BLND, convertidas e reinvestidas pela estratégia. O APY varia, não é garantido e depende da colheita e do reinvestimento da estratégia.';
const WITHDRAW_PRO =
  'O resgate depende da liquidez não emprestada do pool Blend, da posição e das condições do vault. Sem carência fixa e sem garantia de saque instantâneo.';
const PROTOCOL_RISK_PRO = 'Falha de contrato ou do protocolo, oráculos e dívida ruim no pool.';
const LIQUIDITY_RISK_PRO = 'Liquidez insuficiente para o resgate.';
const ROLES_RISK_PRO =
  'Poderes do manager e do emergency manager (upgrades e pausa de estratégia).';

function feesLite(fee: string | null): string {
  return fee
    ? `Uma parte do ganho (${fee}) paga a gestão do porquinho.`
    : 'Uma parte do ganho paga a gestão do porquinho.';
}

function feesPro(fee: string | null): string {
  return fee
    ? `Performance fee de ${fee} sobre o yield (vaultFeeBps). Não é uma taxa anual sobre o TVL.`
    : 'Performance fee sobre o yield (vaultFeeBps). Não é uma taxa anual sobre o TVL.';
}

const LITE: Record<PiggyAsset, (fee: string | null) => PiggyDetailsCopy> = {
  USDC: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Em que fica guardado',
        body: 'Seu dinheiro fica em dólar, a moeda dos Estados Unidos. É um dólar digital, emitido por uma empresa e feito para valer 1 dólar. Esse valor não é garantido como o de uma conta no banco.',
      },
      { icon: 'trending', title: 'De onde vem a taxa', body: `${RATE_LITE} A taxa muda de dia para dia e não é garantida.` },
      { icon: 'arrow-up', title: 'Como tirar o dinheiro', body: WITHDRAW_LITE },
      { icon: 'info', title: 'Taxas', body: feesLite(fee) },
      {
        icon: 'shield',
        title: 'De quem esse porquinho depende',
        body: 'Da empresa que emite o dólar usado aqui, do serviço de empréstimos e dos preços usados nos cálculos. Se um deles falhar, o seu porquinho pode ser afetado.',
      },
    ],
    risksTitle: 'Principais riscos',
    risks: [
      'O dólar usado aqui pode, em momentos raros, valer menos de 1 dólar.',
      'O serviço de empréstimos pode ter falhas ou perdas.',
      'Tirar pode demorar quando falta dinheiro livre.',
      'A taxa muda e não é garantida.',
      SHARED_POOL_LITE,
    ],
  }),
  EURC: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Em que fica guardado',
        body: 'Seu dinheiro fica em euro, a moeda de países da Europa. É um euro digital, emitido por uma empresa e feito para valer 1 euro. Esse valor não é garantido como o de uma conta no banco.',
      },
      { icon: 'trending', title: 'De onde vem a taxa', body: `${RATE_LITE} A taxa muda de dia para dia e não é garantida.` },
      { icon: 'arrow-up', title: 'Como tirar o dinheiro', body: WITHDRAW_LITE },
      { icon: 'info', title: 'Taxas', body: feesLite(fee) },
      {
        icon: 'shield',
        title: 'De quem esse porquinho depende',
        body: 'Da empresa que emite o euro usado aqui, do serviço de empréstimos e dos preços usados nos cálculos. Se um deles falhar, o seu porquinho pode ser afetado.',
      },
    ],
    risksTitle: 'Principais riscos',
    risks: [
      'O euro usado aqui pode, em momentos raros, valer menos de 1 euro.',
      'O serviço de empréstimos pode ter falhas ou perdas.',
      'Tirar pode demorar quando falta dinheiro livre.',
      'A taxa muda e não é garantida.',
      SHARED_POOL_LITE,
    ],
  }),
  XLM: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Em que fica guardado',
        body: 'Seu dinheiro fica em uma criptomoeda. Diferente do dólar e do euro, o preço dela sobe e desce bastante. Você pode ter menos do que guardou, mesmo somando o ganho.',
      },
      {
        icon: 'trending',
        title: 'De onde vem a taxa',
        body: `${RATE_LITE} A taxa muda de dia para dia, não é garantida e hoje é muito baixa.`,
      },
      { icon: 'arrow-up', title: 'Como tirar o dinheiro', body: WITHDRAW_LITE },
      { icon: 'info', title: 'Taxas', body: feesLite(fee) },
      {
        icon: 'shield',
        title: 'De quem esse porquinho depende',
        body: 'Do serviço de empréstimos e dos preços usados nos cálculos. Se um deles falhar, o seu porquinho pode ser afetado.',
      },
    ],
    risksTitle: 'Principais riscos',
    risks: [
      'O preço da criptomoeda sobe e desce bastante.',
      'O serviço de empréstimos pode ter falhas ou perdas.',
      'Tirar pode demorar quando falta dinheiro livre.',
      'A taxa muda, é muito baixa hoje e não é garantida.',
      SHARED_POOL_LITE,
    ],
  }),
};

const PRO: Record<PiggyAsset, (fee: string | null) => PiggyDetailsCopy> = {
  USDC: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Ativo e estratégia',
        body: 'USDC (emissor: Circle) na rede Stellar. Estratégia DeFindex Blend Autocompound USDC, sobre o pool Blend.',
      },
      { icon: 'trending', title: 'Origem do APY', body: APY_PRO },
      { icon: 'arrow-up', title: 'Resgate e liquidez', body: WITHDRAW_PRO },
      { icon: 'info', title: 'Fees', body: feesPro(fee) },
      {
        icon: 'shield',
        title: 'Dependências',
        body: 'Emissor (Circle), protocolo Blend, oráculos de preço, contratos DeFindex (vault e estratégia) e chaves de administração do vault.',
      },
    ],
    risksTitle: 'Riscos',
    risks: [
      'Depeg ou restrição do USDC pelo emissor; sem equivalência garantida a depósito bancário.',
      PROTOCOL_RISK_PRO,
      LIQUIDITY_RISK_PRO,
      ROLES_RISK_PRO,
      SHARED_POOL_PRO,
    ],
  }),
  EURC: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Ativo e estratégia',
        body: 'EURC (emissor: Circle) na rede Stellar. Estratégia DeFindex Blend Autocompound EURC, sobre o pool Blend.',
      },
      { icon: 'trending', title: 'Origem do APY', body: APY_PRO },
      { icon: 'arrow-up', title: 'Resgate e liquidez', body: WITHDRAW_PRO },
      { icon: 'info', title: 'Fees', body: feesPro(fee) },
      {
        icon: 'shield',
        title: 'Dependências',
        body: 'Emissor (Circle), protocolo Blend, oráculos de preço, contratos DeFindex (vault e estratégia) e chaves de administração do vault.',
      },
    ],
    risksTitle: 'Riscos',
    risks: [
      'Depeg ou restrição do EURC pelo emissor; sem equivalência garantida a depósito bancário.',
      PROTOCOL_RISK_PRO,
      LIQUIDITY_RISK_PRO,
      ROLES_RISK_PRO,
      SHARED_POOL_PRO,
    ],
  }),
  XLM: (fee) => ({
    sections: [
      {
        icon: 'coins',
        title: 'Ativo e estratégia',
        body: 'XLM, ativo nativo da rede Stellar, sem emissor nem trustline. Estratégia DeFindex Blend Autocompound XLM, sobre o pool Blend.',
      },
      { icon: 'trending', title: 'Origem do APY', body: APY_PRO },
      { icon: 'arrow-up', title: 'Resgate e liquidez', body: WITHDRAW_PRO },
      { icon: 'info', title: 'Fees', body: feesPro(fee) },
      {
        icon: 'shield',
        title: 'Dependências',
        body: 'Protocolo Blend, oráculos de preço, contratos DeFindex (vault e estratégia) e chaves de administração do vault.',
      },
    ],
    risksTitle: 'Riscos',
    risks: [
      'Volatilidade: o preço do XLM sobe e desce bastante e o valor em dólar pode cair mesmo com yield.',
      'O APY observado do XLM é muito baixo.',
      PROTOCOL_RISK_PRO,
      LIQUIDITY_RISK_PRO,
      ROLES_RISK_PRO,
      SHARED_POOL_PRO,
    ],
  }),
};

/**
 * Textos do porquinho. Vault de ativo fora dos três conhecidos (descoberto e
 * ainda não curado) fica só com o que vale para qualquer porquinho.
 */
export function piggyDetailsCopy(
  asset: PiggyAsset | null,
  mode: AppMode,
  fee: string | null,
): PiggyDetailsCopy {
  if (asset) return (mode === 'pro' ? PRO : LITE)[asset](fee);
  return mode === 'pro'
    ? {
        sections: [
          { icon: 'trending', title: 'Origem do APY', body: APY_PRO },
          { icon: 'arrow-up', title: 'Resgate e liquidez', body: WITHDRAW_PRO },
          { icon: 'info', title: 'Fees', body: feesPro(fee) },
        ],
        risksTitle: 'Riscos',
        risks: [PROTOCOL_RISK_PRO, LIQUIDITY_RISK_PRO, ROLES_RISK_PRO],
      }
    : {
        sections: [
          { icon: 'trending', title: 'De onde vem a taxa', body: `${RATE_LITE} A taxa muda de dia para dia e não é garantida.` },
          { icon: 'arrow-up', title: 'Como tirar o dinheiro', body: WITHDRAW_LITE },
          { icon: 'info', title: 'Taxas', body: feesLite(fee) },
        ],
        risksTitle: 'Principais riscos',
        risks: [
          'O serviço de empréstimos pode ter falhas ou perdas.',
          'Tirar pode demorar quando falta dinheiro livre.',
          'A taxa muda e não é garantida.',
        ],
      };
}

/** 1000 bps → "10%"; 250 → "2,5%". */
export function formatFeeBps(bps: number | null | undefined): string | null {
  if (bps == null || !Number.isFinite(bps) || bps < 0) return null;
  const pct = bps / 100;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0+$/, '');
  return `${text.replace('.', ',')}%`;
}
