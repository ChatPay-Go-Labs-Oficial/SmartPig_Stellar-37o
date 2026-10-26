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

  // ── Carteira (V2) ─────────────────────────────────────────────────────
  'carteira.balance.label': { lite: 'Saldo na carteira', pro: 'Total estimado' },
  'carteira.assets.title': { lite: 'Suas moedas', pro: 'Ativos' },
  'carteira.segment.coins': { lite: 'Moedas', pro: 'Ativos' },
  'carteira.segment.piggies': { lite: 'Porquinhos', pro: 'Vaults' },
  'carteira.piggies.note': {
    lite: 'O dinheiro dos porquinhos fica separado do saldo da carteira.',
    pro: 'Posições em vaults ficam fora do total da carteira.',
  },
  'carteira.action.swap': { lite: 'Trocar', pro: 'Swap' },
  'carteira.action.send': { lite: 'Enviar', pro: 'Transferir' },
  'carteira.swap.title': { lite: 'Trocar moedas', pro: 'Swap' },
  'carteira.swap.soon': {
    lite: 'Em breve você vai poder converter dólar em euro e em outras moedas, direto da sua carteira.',
    pro: 'Em breve: swap entre os ativos da carteira (USDC, EURC e XLM) pelas rotas da rede Stellar.',
  },
  'carteira.asset.USDC.name': { lite: 'Dólar', pro: 'USDC' },
  'carteira.asset.USDC.caption': { lite: 'Pronto pra guardar', pro: 'Dólar digital' },
  'carteira.asset.EURC.name': { lite: 'Euro', pro: 'EURC' },
  'carteira.asset.EURC.caption': { lite: 'Euro digital', pro: 'Euro digital' },
  'carteira.asset.XLM.name': { lite: 'Criptomoeda', pro: 'XLM' },
  'carteira.asset.XLM.caption': { lite: 'Moeda da rede', pro: 'Stellar' },

  // ── Histórico ─────────────────────────────────────────────────────────
  'history.deposit': {
    lite: 'Guardado no porquinho',
    pro: 'Depósito no vault',
  },
  'history.withdrawal': {
    lite: 'Tirado do porquinho',
    pro: 'Saque do vault',
  },
  'history.pix.deposit': { lite: 'Depósito via Pix', pro: 'On-ramp via Pix' },
  'history.pix.withdrawal': { lite: 'Saque via Pix', pro: 'Off-ramp via Pix' },
  'history.sent': { lite: 'Dinheiro enviado', pro: 'USDC enviado' },
  'history.received': { lite: 'Dinheiro recebido', pro: 'USDC recebido' },
  'history.gift.sent': { lite: 'Presente enviado', pro: 'Presente enviado' },
  'history.gift.received': { lite: 'Presente recebido', pro: 'Presente recebido' },
  'history.filter.vaults': { lite: 'Porquinhos', pro: 'Vaults' },

  // ── Home ──────────────────────────────────────────────────────────────
  'home.total.label': { lite: 'Guardado nos porquinhos', pro: 'Total nos vaults' },
  'home.wallet.label': { lite: 'Saldo na carteira', pro: 'Saldo na carteira' },
  'home.wallet.go': { lite: 'Ir pra carteira', pro: 'Ir pra carteira' },
  'home.piggies.title': { lite: 'Meus porquinhos', pro: 'Meus vaults' },
  'home.piggies.seeAll': { lite: 'Ver todos', pro: 'Ver todos' },
  'home.piggy.empty': { lite: 'Comece e veja crescer', pro: 'Sem depósito' },

  // ── Guardar (aba dos porquinhos) ──────────────────────────────────────
  // Nomes dos porquinhos por moeda, iguais nos dois modos (Figma 10a e 12a–c:
  // o Pro também mostra "Porquinho Poupador"). Provisórios no Figma.
  'guardar.piggy.USDC.name': { lite: 'Porquinho Poupador', pro: 'Porquinho Poupador' },
  'guardar.piggy.EURC.name': { lite: 'Porquinho Viajante', pro: 'Porquinho Viajante' },
  'guardar.piggy.XLM.name': { lite: 'Porquinho Aventureiro', pro: 'Porquinho Aventureiro' },
  // Complemento da pílula da moeda ("Criptomoeda · sobe e desce mais").
  'guardar.pill.USDC.caption': { lite: '', pro: 'Dólar digital' },
  'guardar.pill.EURC.caption': { lite: '', pro: 'Euro digital' },
  'guardar.pill.XLM.caption': { lite: 'sobe e desce mais', pro: 'Stellar' },
  'guardar.title': { lite: 'Seus porquinhos', pro: 'Seus vaults' },
  'guardar.total.label': { lite: 'Total guardado', pro: 'Total nos vaults' },
  'guardar.total.estimated': { lite: 'Total estimado', pro: 'Total estimado' },
  'guardar.total.byPiggy': { lite: 'Ver por porquinho', pro: 'Ver por ativo' },
  'guardar.total.partial': {
    lite: 'Não foi possível ler todos os porquinhos agora.',
    pro: 'Falha ao ler um ou mais vaults.',
  },
  'guardar.error': {
    lite: 'Não foi possível carregar os porquinhos.',
    pro: 'Não foi possível carregar os vaults.',
  },
  'guardar.state.paused': { lite: 'Guardar pausado', pro: 'Depósitos pausados' },
  'guardar.state.risks': { lite: 'Falta ler os riscos', pro: 'Aceite de riscos pendente' },
  'guardar.notice.paused': {
    lite: 'Guardar mais neste porquinho está pausado por enquanto. Tirar continua disponível.',
    pro: 'Novos depósitos neste vault estão pausados.',
  },
  'guardar.notice.risks': {
    lite: 'Antes de guardar pela primeira vez, leia os riscos deste porquinho.',
    pro: 'Antes do primeiro depósito, leia e aceite os riscos deste vault.',
  },
  'guardar.notice.risks.cta': { lite: 'Ler os riscos', pro: 'Ler os riscos' },
  // Bloqueio pela trilha (E6). O Pro não tem bloqueio de lições (bypass do
  // backend); o texto dele segue a anotação do 11b ("requisitos").
  'guardar.state.lessons': { lite: 'Passos pendentes', pro: 'Requisitos pendentes' },
  'guardar.notice.lessons': {
    lite: 'Para guardar de novo neste porquinho, conclua os passos abaixo. Tirar continua disponível.',
    pro: 'Para depositar de novo neste vault, conclua os requisitos abaixo. O resgate continua disponível.',
  },
  'guardar.lock.one': { lite: 'Falta 1 lição', pro: 'Falta 1 lição' },
  'guardar.unlock.title': { lite: 'Pra liberar', pro: 'Pra liberar' },
  'guardar.unlock.cta': { lite: 'Ir pra Trilha', pro: 'Ir pra Trilha' },
  // Porquinho liberado (Figma 11b).
  'guardar.unlocked.seal': { lite: 'Novo porquinho', pro: 'Novo porquinho' },
  'guardar.unlocked.title': { lite: 'Liberado!', pro: 'Liberado!' },
  'guardar.unlocked.later': { lite: 'Agora não', pro: 'Agora não' },
  'guardar.unlocked.continue': { lite: 'Continuar', pro: 'Continuar' },
  'guardar.how.title': { lite: 'Como ele funciona', pro: 'Como funciona' },
  'guardar.how.rate.caption': {
    lite: 'Taxa variável, atualizada todo dia',
    pro: 'Variável, atualizado todo dia',
  },
  'guardar.how.withdraw.title': { lite: 'Tirar do porquinho', pro: 'Resgate do vault' },
  'guardar.how.withdraw.caption': {
    lite: 'O valor volta para a sua carteira',
    pro: 'O valor volta para a sua carteira Stellar',
  },
  'guardar.how.USDC.title': { lite: 'Guardado em dólar', pro: 'Guardado em USDC' },
  'guardar.how.USDC.caption': { lite: 'Cofrinho em dólar do PigFi', pro: 'Vault USDC PigFi' },
  'guardar.how.EURC.title': { lite: 'Guardado em euro', pro: 'Guardado em EURC' },
  'guardar.how.EURC.caption': { lite: 'Cofrinho em euro do PigFi', pro: 'Vault EURC PigFi' },
  'guardar.how.XLM.title': { lite: 'Guardado em criptomoeda', pro: 'Guardado em XLM' },
  'guardar.how.XLM.caption': { lite: 'Cofrinho em criptomoeda do PigFi', pro: 'Vault XLM PigFi' },
  // Genitivo para "cotação do euro" (nota do sheet de total estimado).
  'guardar.quoteOf.EURC': { lite: 'do euro', pro: 'do EURC' },
  'guardar.quoteOf.XLM': { lite: 'da criptomoeda', pro: 'do XLM' },
  'guardar.totalSheet.subtitle': {
    lite: 'Equivalente em dólar, por porquinho',
    pro: 'Equivalente em USD, por vault',
  },
  'guardar.totalSheet.totalCaption': {
    lite: 'Soma em dólar dos ativos acima',
    pro: 'Soma em USD das posições acima',
  },
  'guardar.totalSheet.empty': { lite: 'Sem saldo', pro: 'Sem saldo' },
  'guardar.details.title': { lite: 'Detalhes do porquinho', pro: 'Detalhes do vault' },
  'guardar.details.link': { lite: 'Ver detalhes do porquinho', pro: 'Ver detalhes do vault' },
  'guardar.details.empty': { lite: 'Você ainda não guardou aqui', pro: 'Sem saldo no vault' },
  'guardar.details.lowRate': { lite: 'Taxa muito baixa hoje', pro: 'APY muito baixo' },
  'guardar.details.error': {
    lite: 'Não foi possível carregar este porquinho.',
    pro: 'Não foi possível carregar este vault.',
  },

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

  // ── Exclusão de conta · títulos dos bloqueios ─────────────────────────
  'deletion.blocker.vaultBalance.title': {
    lite: 'Você ainda tem dinheiro guardado',
    pro: 'Você ainda tem saldo em vault',
  },
  'deletion.blocker.vaultUnknown.title': {
    lite: 'Não conseguimos verificar um porquinho',
    pro: 'Não conseguimos ler o saldo de um vault',
  },
  'deletion.blocker.walletUsdc.title': {
    lite: 'Você ainda tem dinheiro na conta',
    pro: 'Você ainda tem USDC na carteira',
  },
  'deletion.blocker.walletAsset.title': {
    lite: 'Você ainda tem dinheiro na conta',
    pro: 'Você tem saldo de outro ativo na carteira',
  },
  'deletion.blocker.giftLocked.title': {
    lite: 'Você tem um presente aguardando resgate',
    pro: 'Você tem um presente aguardando resgate',
  },
  'deletion.blocker.giftRefundable.title': {
    lite: 'Você tem um presente para recuperar',
    pro: 'Você tem um presente para recuperar',
  },
  'deletion.blocker.deposit.title': {
    lite: 'Você tem um depósito em andamento',
    pro: 'Depósito em vault em andamento',
  },
  'deletion.blocker.withdrawal.title': {
    lite: 'Você tem um resgate em andamento',
    pro: 'Saque de vault em andamento',
  },
  'deletion.blocker.tx.title': {
    lite: 'Uma movimentação está sendo confirmada',
    pro: 'Transação on-chain ainda não conciliada',
  },
  'deletion.blocker.onramp.title': {
    lite: 'Você tem um Pix de entrada em aberto',
    pro: 'Payin Pix em aberto',
  },
  'deletion.blocker.offramp.title': {
    lite: 'Você tem um saque via Pix em andamento',
    pro: 'Payout Pix em andamento',
  },
  'deletion.blocker.etherfuse.title': {
    lite: 'Você tem uma ordem em andamento',
    pro: 'Ordem Etherfuse em andamento',
  },

  // ── Exclusão de conta · detalhes sem valor ────────────────────────────
  'deletion.blocker.deposit.detail': {
    lite: 'Espere o depósito terminar para poder excluir a conta.',
    pro: 'Aguarde a confirmação do depósito para excluir a conta.',
  },
  'deletion.blocker.withdrawal.detail': {
    lite: 'Espere o resgate terminar para poder excluir a conta.',
    pro: 'Aguarde a confirmação do saque para excluir a conta.',
  },
  'deletion.blocker.tx.detail': {
    lite: 'Espere a confirmação para poder excluir a conta.',
    pro: 'Aguarde a conciliação da transação na rede.',
  },
  'deletion.blocker.onramp.detail': {
    lite: 'Conclua o pagamento ou espere a cobrança expirar. Se você pagar depois de excluir a conta, o dinheiro se perde.',
    pro: 'Conclua ou deixe expirar o payin. Um Pix pago após a exclusão chega numa carteira sem dono.',
  },
  'deletion.blocker.offramp.detail': {
    lite: 'Espere o dinheiro cair na sua conta bancária.',
    pro: 'Aguarde a liquidação do payout.',
  },
  'deletion.blocker.etherfuse.detail': {
    lite: 'Espere a ordem terminar para poder excluir a conta.',
    pro: 'Aguarde a conclusão da ordem.',
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

  'deletion.blocker.vaultBalance.detail': {
    lite: (v: { amount: string; vaultName: string }) =>
      `$${v.amount} guardados em ${v.vaultName}`,
    pro: (v: { amount: string; vaultName: string }) =>
      `${v.amount} USDC no vault ${v.vaultName}`,
  } as PhraseFn<{ amount: string; vaultName: string }>,

  'deletion.blocker.vaultUnknown.detail': {
    lite: (v: { vaultName: string }) =>
      `Não foi possível consultar ${v.vaultName} agora. Tente de novo em alguns minutos.`,
    pro: (v: { vaultName: string }) =>
      `A consulta de saldo do vault ${v.vaultName} falhou. Tente de novo em alguns minutos.`,
  } as PhraseFn<{ vaultName: string }>,

  'deletion.blocker.walletUsdc.detail': {
    lite: (v: { amount: string }) => `$${v.amount} na sua conta`,
    pro: (v: { amount: string }) => `${v.amount} USDC na carteira`,
  } as PhraseFn<{ amount: string }>,

  'deletion.blocker.walletAsset.detail': {
    lite: (v: { amount: string; assetCode: string }) =>
      v.assetCode === 'EURC'
        ? `€${v.amount} na sua conta`
        : `${v.amount} de ${v.assetCode} na sua conta`,
    pro: (v: { amount: string; assetCode: string }) =>
      `${v.amount} ${v.assetCode} na carteira`,
  } as PhraseFn<{ amount: string; assetCode: string }>,

  'deletion.blocker.giftLocked.detail': {
    lite: (v: { amount: string; date: string }) =>
      `$${v.amount} presos até ${v.date}. Peça para quem recebeu resgatar, ou espere essa data para recuperar.`,
    pro: (v: { amount: string; date: string }) =>
      `${v.amount} USDC em claimable balance até ${v.date}. Só é possível reaver depois dessa data.`,
  } as PhraseFn<{ amount: string; date: string }>,

  'deletion.blocker.giftRefundable.detail': {
    lite: (v: { amount: string }) =>
      `$${v.amount} esperando você recuperar.`,
    pro: (v: { amount: string }) =>
      `${v.amount} USDC em claimable balance expirada, prontos para reaver.`,
  } as PhraseFn<{ amount: string }>,

  // ── Guardar ───────────────────────────────────────────────────────────
  'guardar.rate': {
    lite: (v: { apy: string }) => `${v.apy} ao ano`,
    pro: (v: { apy: string }) => `APY ${v.apy}`,
  } as PhraseFn<{ apy: string }>,

  /** Porquinho bloqueado pela trilha (Figma 10b, 10c, 17a). */
  'guardar.lock.until': {
    lite: (v: { lesson: number }) => `Libera ao concluir a lição ${v.lesson}`,
    pro: (v: { lesson: number }) => `Libera ao concluir a lição ${v.lesson}`,
  } as PhraseFn<{ lesson: number }>,

  /** Só o nível falta (regra com nível mínimo; no Meridian o mínimo é 0). */
  'guardar.lock.level': {
    lite: (v: { level: number }) => `Libera no Nível ${v.level}`,
    pro: (v: { level: number }) => `Libera no Nível ${v.level}`,
  } as PhraseFn<{ level: number }>,

  /** Selo à direita da linha bloqueada na Carteira (17a): "Lição 3". */
  'guardar.lock.pill': {
    lite: (v: { lesson: number }) => `Lição ${v.lesson}`,
    pro: (v: { lesson: number }) => `Lição ${v.lesson}`,
  } as PhraseFn<{ lesson: number }>,

  'guardar.lock.levelPill': {
    lite: (v: { level: number }) => `Nível ${v.level}`,
    pro: (v: { level: number }) => `Nível ${v.level}`,
  } as PhraseFn<{ level: number }>,

  /** Passo do "Pra liberar": Lição “Fundamentos”. */
  'guardar.unlock.lesson': {
    lite: (v: { title: string }) => `Lição “${v.title}”`,
    pro: (v: { title: string }) => `Lição “${v.title}”`,
  } as PhraseFn<{ title: string }>,

  'guardar.unlock.level': {
    lite: (v: { level: number }) => `Chegar ao Nível ${v.level}`,
    pro: (v: { level: number }) => `Chegar ao Nível ${v.level}`,
  } as PhraseFn<{ level: number }>,

  /** Mensagem do 11b, com o aceite de riscos ainda pela frente. */
  'guardar.unlocked.message': {
    lite: (v: { name: string }) =>
      `Você cumpriu todos os passos para liberar o ${v.name}. Antes de guardar pela primeira vez, leia os riscos.`,
    pro: (v: { name: string }) =>
      `Você cumpriu todos os requisitos para liberar o ${v.name}. Antes do primeiro depósito, leia os riscos.`,
  } as PhraseFn<{ name: string }>,

  /** 11b sem aceite pendente (riscos já aceitos ou sem texto publicado). */
  'guardar.unlocked.messageNoRisks': {
    lite: (v: { name: string }) => `Você cumpriu todos os passos para liberar o ${v.name}.`,
    pro: (v: { name: string }) => `Você cumpriu todos os requisitos para liberar o ${v.name}.`,
  } as PhraseFn<{ name: string }>,

  /** Legenda do total estimado: "Dólar e euro · cotação das 14:32". */
  'guardar.total.quote': {
    lite: (v: { assets: string; time: string }) => `${v.assets} · cotação das ${v.time}`,
    pro: (v: { assets: string; time: string }) => `${v.assets} · cotação às ${v.time}`,
  } as PhraseFn<{ assets: string; time: string }>,

  /** Sem hora confiável (preço estático ou velho no backend). */
  'guardar.total.quoteReference': {
    lite: (v: { assets: string }) => `${v.assets} · cotação de referência`,
    pro: (v: { assets: string }) => `${v.assets} · preço de referência`,
  } as PhraseFn<{ assets: string }>,

  'guardar.totalSheet.noteReference': {
    lite: (v: { quoteOf: string }) =>
      `Valores em dólar são estimativas, com uma cotação de referência ${v.quoteOf}.`,
    pro: (v: { quoteOf: string }) =>
      `Valores em USD são estimativas, com preço de referência ${v.quoteOf}.`,
  } as PhraseFn<{ quoteOf: string }>,

  'guardar.totalSheet.note': {
    lite: (v: { quoteOf: string; time: string }) =>
      `Valores em dólar são estimativas, com a cotação ${v.quoteOf} das ${v.time}.`,
    pro: (v: { quoteOf: string; time: string }) =>
      `Valores em USD são estimativas, com a cotação ${v.quoteOf} às ${v.time}.`,
  } as PhraseFn<{ quoteOf: string; time: string }>,
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
