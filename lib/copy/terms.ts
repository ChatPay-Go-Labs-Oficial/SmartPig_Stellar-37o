import type { AppMode } from '@/lib/stores/app-mode.store';

type TermPair = Readonly<Record<AppMode, string>>;

/**
 * Dicionário Lite/Pro.
 *
 * O projeto não tem i18n e não vale a pena introduzir: só ~50 strings mudam
 * entre os modos, o resto do copy segue inline no JSX. Este arquivo é o único
 * lugar onde termo cripto pode aparecer — se um termo novo precisar existir na
 * tela, ele entra aqui com as duas versões, não hardcoded no componente.
 *
 * Lite é a voz da marca (ver README: blockchain e DeFi são infraestrutura, não
 * a história do usuário). Pro é terminologia real, para quem optou por ver a
 * engrenagem.
 */
export const TERMS = {
  // ── Carteira / conta ──────────────────────────────────────────────────
  'wallet.title': { lite: 'Sua conta', pro: 'Carteira Stellar' },
  'wallet.address.label': {
    lite: 'Código da sua conta',
    pro: 'Endereço Stellar',
  },
  'wallet.address.empty': { lite: 'Conta não criada', pro: 'Nenhuma carteira' },
  'wallet.status.ok': { lite: 'Conta pronta', pro: 'Conta ativada' },
  'wallet.status.pending': {
    lite: 'Finalizando sua conta',
    pro: 'Conta não ativada',
  },
  'wallet.activate.cta': { lite: 'Concluir', pro: 'Ativar agora' },
  'wallet.activate.busy': {
    lite: 'Concluindo...',
    pro: 'Ativando conta Stellar...',
  },
  'wallet.activate.ok': {
    lite: 'Tudo certo! Sua conta está pronta.',
    pro: 'Conta ativada com sucesso!',
  },
  'wallet.activate.fail': {
    lite: 'Não foi possível concluir agora: ',
    pro: 'Nao foi possivel ativar: ',
  },

  // ── Ativo / moeda ─────────────────────────────────────────────────────
  'asset.name': { lite: 'dólar', pro: 'USDC' },
  'asset.symbol': { lite: 'USD', pro: 'USDC' },

  // ── Rede ──────────────────────────────────────────────────────────────
  'network.confirming': {
    lite: 'Confirmando...',
    pro: 'Confirmando na Stellar...',
  },
  'network.processing': {
    lite: 'Processando...',
    pro: 'Processando na Stellar...',
  },
  'network.badge': { lite: 'Cofrinho em dólar', pro: 'Stellar · USDC' },

  // ── Transferência entre contas ────────────────────────────────────────
  'transfer.title': { lite: 'Enviar dinheiro', pro: 'Transferir USDC' },
  'transfer.cta': {
    lite: 'Enviar para outra conta',
    pro: 'Transferir USDC',
  },
  'transfer.dest.label': { lite: 'Para quem?', pro: 'Endereço de destino' },
  'transfer.dest.placeholder': {
    lite: 'Código da conta de destino',
    pro: 'G... (endereço Stellar)',
  },
  'transfer.memo.label': { lite: 'Mensagem', pro: 'Memo' },
  'transfer.memo.placeholder': {
    lite: 'Ex: almoço, aluguel...',
    pro: 'Ex: pagamento, referência...',
  },
  'transfer.memo.empty': { lite: 'Sem mensagem', pro: 'Sem memo' },
  'transfer.warning': {
    lite: 'Confira o código de destino. Envios não podem ser desfeitos.',
    pro: 'Envie somente para endereços Stellar com trustline USDC. Transferências são irreversíveis.',
  },
  'transfer.success.title': {
    lite: 'Dinheiro enviado!',
    pro: 'Transferência enviada!',
  },

  // ── Transação ─────────────────────────────────────────────────────────
  'tx.hash.label': { lite: 'Comprovante', pro: 'Tx' },

  // ── Histórico ─────────────────────────────────────────────────────────
  'history.deposit': {
    lite: 'Guardado no cofrinho',
    pro: 'Investimento (vault)',
  },
  'history.withdrawal': {
    lite: 'Retirado do cofrinho',
    pro: 'Saque (vault)',
  },
  'history.sent': { lite: 'Enviado', pro: 'USDC enviado' },
  'history.received': { lite: 'Recebido', pro: 'USDC recebido' },

  // ── Cofrinho / vault ──────────────────────────────────────────────────
  'vault.apy.label': { lite: 'Quanto rende por ano', pro: 'APY (anualizado)' },
  'vault.apy.short': { lite: 'AO ANO', pro: 'APY' },
  'vault.tvl.label': {
    lite: 'Total de todos os investidores',
    pro: 'TVL',
  },
  'vault.tvl.note': {
    lite: 'É o total guardado por todo mundo neste porquinho, não só por você.',
    pro: 'TVL é o total depositado no vault por todos os participantes.',
  },
  'vault.shares.suffix': { lite: 'no cofrinho', pro: 'dfTokens (cotas)' },
  'vault.balance.label': {
    lite: 'Você tem guardado aqui',
    pro: 'Seu saldo no vault',
  },

  // ── Ramp ──────────────────────────────────────────────────────────────
  'ramp.deposit.fromWallet': {
    lite: 'Guarde o dinheiro disponível no seu cofrinho',
    pro: 'Deposite USDC da carteira direto no vault',
  },
  'ramp.withdraw.toWallet': {
    lite: 'Tire do cofrinho e deixe disponível na sua conta',
    pro: 'Retire do vault para sua carteira Stellar',
  },

  // ── Presente ──────────────────────────────────────────────────────────
  'gift.claim.confirming': {
    lite: 'Confirmando seu presente...',
    pro: 'Confirmando na rede Stellar...',
  },
} as const satisfies Record<string, TermPair>;

export type TermKey = keyof typeof TERMS;

type PhraseFn<V> = Readonly<Record<AppMode, (v: V) => string>>;

/**
 * Strings com interpolação. Separadas de TERMS para que TERMS continue
 * serializável — assim um override remoto de copy pode ser mesclado nele no
 * futuro sem tocar nos pontos de uso.
 */
export const PHRASES = {
  'tx.hash.short': {
    lite: (v: { hash: string }) => `Comprovante ${v.hash.slice(0, 6)}`,
    pro: (v: { hash: string }) =>
      `Tx: ${v.hash.slice(0, 8)}...${v.hash.slice(-6)}`,
  } as PhraseFn<{ hash: string }>,

  'balance.pill': {
    lite: (v: { amount: string }) => `$${v.amount}`,
    pro: (v: { amount: string }) => `$${v.amount} USDC`,
  } as PhraseFn<{ amount: string }>,

  'gift.reserving': {
    lite: (v: { amount: string }) => `Guardando $${v.amount} no seu cofrinho...`,
    pro: (v: { amount: string }) =>
      `Reservando ${v.amount} USDC na rede Stellar`,
  } as PhraseFn<{ amount: string }>,
} as const;

export type PhraseKey = keyof typeof PHRASES;

/** Acessor puro, para uso fora de componentes (formatters, helpers). */
export function term(key: TermKey, mode: AppMode): string {
  return TERMS[key][mode];
}

export function phrase<K extends PhraseKey>(
  key: K,
  mode: AppMode,
  vars: Parameters<(typeof PHRASES)[K]['lite']>[0],
): string {
  return (PHRASES[key][mode] as (v: unknown) => string)(vars);
}
