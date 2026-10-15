import { Platform } from 'react-native';
import type { OperationErrorKind } from '@/lib/guardar/operation-errors';
import type { PiggyAsset } from '@/lib/utils/piggy';

// Textos dos sheets de Guardar e Tirar, por moeda e modo. Ficam juntos aqui
// porque variam nas duas dimensões ao mesmo tempo.
//
// Regras (auditoria de 15/10/2026, com o Matheus):
// - Cada texto descreve o que de fato acontece. A assinatura da carteira é
//   automática (Privy, sem tela): nenhuma etapa fala em "assinar com a
//   biometria". A confirmação de identidade (biometria ou bloqueio de tela)
//   acontece antes de preparar, nos dois modais.
// - Vocabulário: no Lite, "guardar" e "tirar"; no Pro, "depósito no vault" e
//   "resgate". "Depósito" e "saque" no Lite são o Pix, então não aparecem aqui.
// - Nada promete prazo: a rede leva alguns segundos e pode levar mais.
// - O resgate queima cotas com tolerância de preço (slippage): o valor que
//   chega na carteira é "cerca de", nunca exato.

type Kind = 'save' | 'withdraw';

/** "Valor em dólar" / "Valor em USDC". */
export function amountLabel(asset: PiggyAsset | null, symbol: string, isPro: boolean): string {
  if (isPro || !asset) return `Valor em ${symbol}`;
  return { USDC: 'Valor em dólar', EURC: 'Valor em euro', XLM: 'Valor em criptomoeda' }[asset];
}

// ─── Confirmação de identidade (antes de preparar) ──────────────────────────

// O bloqueio de tela tem nome diferente em cada sistema: "PIN" no Android
// (que também aceita padrão e senha), "código" no iPhone.
const IOS = Platform.OS === 'ios';
const LOCK = IOS ? 'o código' : 'o PIN';

/** Etapa na tela enquanto o aparelho pede biometria ou bloqueio de tela. */
export function authProgress(kind: Kind, amount: string, isPro: boolean): { title: string; caption: string } {
  if (isPro) {
    return kind === 'save'
      ? { title: 'Confirme o depósito...', caption: `Biometria ou bloqueio de tela para depositar ${amount}` }
      : { title: 'Confirme o resgate...', caption: `Biometria ou bloqueio de tela para resgatar ${amount}` };
  }
  return {
    title: 'Confirme que é você...',
    caption: `Use a biometria ou ${LOCK} do aparelho para ${kind === 'save' ? 'guardar' : 'tirar'} ${amount}`,
  };
}

/**
 * Textos do pedido do sistema. No iOS só o título aparece, então o valor vai
 * nele; subtítulo e descrição são do Android.
 */
export function authPrompt(
  kind: Kind,
  amount: string,
  symbol: string,
  isPro: boolean,
): { promptMessage: string; promptSubtitle: string; promptDescription: string } {
  if (isPro) {
    return kind === 'save'
      ? {
          promptMessage: `Confirme o depósito de ${amount}`,
          promptSubtitle: `Depósito no vault ${symbol}`,
          promptDescription: 'O valor sai da sua carteira para o vault.',
        }
      : {
          promptMessage: `Confirme o resgate de ${amount}`,
          promptSubtitle: `Resgate do vault ${symbol}`,
          promptDescription: 'O valor volta para a sua carteira.',
        };
  }
  return kind === 'save'
    ? {
        promptMessage: `Confirme para guardar ${amount}`,
        promptSubtitle: 'Guardar no porquinho',
        promptDescription: 'O valor sai da sua carteira para o porquinho.',
      }
    : {
        promptMessage: `Confirme para tirar ${amount}`,
        promptSubtitle: 'Tirar do porquinho',
        promptDescription: 'O valor volta para a sua carteira.',
      };
}

/** Aparelho sem nenhum bloqueio de tela: a operação não segue. */
export function deviceLockMessage(isPro: boolean): string {
  if (IOS) {
    return isPro
      ? 'Ative o código do iPhone em Ajustes para autorizar a operação.'
      : 'Para continuar, ative o código do iPhone em Ajustes.';
  }
  return isPro
    ? 'Ative um bloqueio de tela no aparelho (PIN, padrão ou senha) para autorizar a operação.'
    : 'Para continuar, ative um bloqueio de tela no celular (PIN, padrão ou senha).';
}

// ─── Etapas ──────────────────────────────────────────────────────────────────

/** Criar o pedido e assinar (automático): uma etapa só. */
export function preparingProgress(kind: Kind, isPro: boolean): { title: string; caption: string } {
  if (isPro) {
    return {
      title: 'Gerando transação...',
      caption: kind === 'save' ? 'Preparando depósito no vault' : 'Preparando resgate do vault',
    };
  }
  return {
    title: 'Preparando...',
    caption: kind === 'save' ? 'Preparando para guardar no porquinho' : 'Preparando para tirar do porquinho',
  };
}

/** Enviado: esperando a rede. */
export function confirmingCaption(kind: Kind, isPro: boolean): string {
  if (isPro) return 'Aguardando inclusão no ledger';
  return kind === 'save' ? 'Levando o valor para o porquinho' : 'Enviando para a sua carteira';
}

/** Legenda do passo de confirmação quando passa do tempo normal. */
export const SLOW_CAPTION = 'Está levando mais tempo que o normal. Seu dinheiro está seguro.';

/** Tirar com o porquinho pausado: a pausa só barra guardar (Figma 16n). */
export function withdrawPausedNotice(isPro: boolean): string {
  return isPro
    ? 'Depósitos pausados neste vault. Resgates seguem disponíveis.'
    : 'Guardar mais neste porquinho está pausado por enquanto. Tirar continua disponível.';
}

/** Tirar com o saldo deste porquinho fora da leitura. */
export function unknownBalanceMessage(isPro: boolean): string {
  return isPro
    ? 'Não foi possível ler o saldo deste vault agora. Tente novamente.'
    : 'Não conseguimos ler o saldo deste porquinho agora. Isso costuma voltar em instantes.';
}

// ─── Valor acima do saldo ────────────────────────────────────────────────────

// "Disponível": no XLM, parte do saldo fica presa na reserva da conta.
export function overBalanceMessage(kind: Kind, isPro: boolean): string {
  if (kind === 'save') return isPro ? 'Valor acima do saldo disponível.' : 'Esse valor é maior que o seu saldo disponível.';
  return isPro ? 'Valor acima do saldo no vault.' : 'Esse valor é maior que o guardado neste porquinho.';
}

// ─── Sucesso ─────────────────────────────────────────────────────────────────

export function successCopy(kind: Kind, amount: string, isPro: boolean): { title: string; caption: string } {
  if (kind === 'save') {
    return isPro
      ? { title: 'Depósito confirmado', caption: `Você depositou ${amount} no vault.` }
      : { title: 'Valor guardado', caption: `Você guardou ${amount} no seu porquinho.` };
  }
  return isPro
    ? { title: 'Resgate confirmado', caption: `Você resgatou cerca de ${amount}. O valor está na sua carteira.` }
    : { title: 'Valor de volta na carteira', caption: `Você tirou cerca de ${amount} do porquinho.` };
}

// ─── Erros ───────────────────────────────────────────────────────────────────

// A assinatura acontece antes do envio: se ela falha, nada saiu do lugar.
function signingMessage(kind: Kind, isPro: boolean): string {
  if (isPro) return 'A assinatura da carteira falhou ou não respondeu a tempo. Nada foi enviado à rede. Tente novamente.';
  return kind === 'save'
    ? 'Não conseguimos concluir agora. Nada saiu da sua carteira. Verifique sua internet e tente de novo.'
    : 'Não conseguimos concluir agora. Nada saiu do porquinho. Verifique sua internet e tente de novo.';
}

const NETWORK_MESSAGE = 'Erro de conexão. Verifique sua internet e tente novamente.';
const SESSION_MESSAGE = 'Sessão expirada. Saia e entre novamente no app.';
const AUTH_MESSAGE = 'Não foi possível confirmar sua identidade. Tente novamente.';

export function saveErrorMessage(kind: OperationErrorKind, asset: PiggyAsset | null, isPro: boolean): string {
  switch (kind) {
    case 'insufficient':
      if (asset === 'EURC') return isPro ? 'Saldo de EURC insuficiente na carteira.' : 'Saldo insuficiente de euro na carteira.';
      if (asset === 'XLM') return isPro ? 'Saldo de XLM insuficiente na carteira.' : 'Saldo insuficiente de criptomoeda na carteira.';
      return isPro
        ? 'Saldo de USDC insuficiente na carteira. Use "Depositar" para adicionar fundos.'
        : 'Saldo insuficiente na carteira. Deposite pelo botão "Depositar" antes de guardar.';
    case 'network':
      return NETWORK_MESSAGE;
    case 'session':
      return SESSION_MESSAGE;
    case 'biometrics':
      return AUTH_MESSAGE;
    case 'deviceLock':
      return deviceLockMessage(isPro);
    case 'paused':
      return isPro
        ? 'Novos depósitos neste vault estão pausados.'
        : 'Guardar mais neste porquinho está pausado por enquanto. Tirar continua disponível.';
    case 'signing':
      return signingMessage('save', isPro);
    case 'risks':
      return isPro
        ? 'Antes do primeiro depósito, leia e aceite os riscos deste vault.'
        : 'Antes de guardar pela primeira vez, leia e aceite os riscos deste porquinho.';
    case 'risksMissing':
      return isPro
        ? 'Depósitos indisponíveis: este vault ainda não tem divulgação de riscos publicada.'
        : 'Guardar neste porquinho não está disponível agora. Tente mais tarde.';
    default:
      return isPro
        ? 'Não foi possível processar o depósito. Tente novamente em instantes.'
        : 'Não foi possível guardar agora. Tente novamente em instantes.';
  }
}

export function withdrawErrorMessage(kind: OperationErrorKind, isPro: boolean): string {
  switch (kind) {
    case 'biometrics':
      return AUTH_MESSAGE;
    case 'deviceLock':
      return deviceLockMessage(isPro);
    case 'signing':
      return signingMessage('withdraw', isPro);
    // "Saldo insuficiente" no resgate costuma ser o vault sem dinheiro livre,
    // não a pessoa: o saldo dela é o teto do campo. O texto vale para as duas.
    case 'insufficient':
      return isPro
        ? 'O vault não conseguiu executar este resgate agora (saldo ou liquidez). Tente um valor menor ou mais tarde. Nada saiu do vault.'
        : 'O porquinho não conseguiu liberar esse valor agora. Tente um valor menor ou volte mais tarde. Nada foi tirado.';
    case 'liquidity':
      return liquidityMessage(isPro);
    case 'network':
      return NETWORK_MESSAGE;
    case 'session':
      return SESSION_MESSAGE;
    default:
      return isPro
        ? 'Não foi possível processar o resgate. Tente novamente em instantes.'
        : 'Não foi possível tirar agora. Tente novamente em instantes.';
  }
}

/** Sem a moeda na carteira (Figma 08m). No Lite a troca ainda não existe. */
export function noFundsMessage(asset: PiggyAsset | null, symbol: string, isPro: boolean): string {
  if (isPro) return `Sem saldo de ${symbol} disponível na carteira. Use o swap para obter ${symbol}.`;
  // No XLM o saldo pode existir e estar todo preso na reserva da conta.
  const coin = asset === 'XLM' ? 'criptomoeda disponível' : 'euro';
  return `Você não tem ${coin} na carteira. A troca de moedas chega em breve.`;
}

/** Sem dinheiro livre no porquinho: a operação falha na hora e nada sai. */
export function liquidityMessage(isPro: boolean): string {
  return isPro
    ? 'Liquidez insuficiente no vault para este resgate agora. Tente um valor menor ou mais tarde. Nada saiu do vault.'
    : 'O porquinho não tem dinheiro livre suficiente para esse valor agora. Tente um valor menor ou volte mais tarde. Nada foi tirado.';
}

/** Na revisão do Tirar (euro e cripto): o que acontece se faltar liquidez. */
export function liquidityNote(isPro: boolean): string {
  return isPro
    ? 'Sem liquidez suficiente no vault, o resgate não é executado e nada sai do vault.'
    : 'Se o porquinho não tiver dinheiro livre suficiente agora, a operação não acontece e nada é tirado.';
}

// ─── Depois do envio ─────────────────────────────────────────────────────────
// Uma transação recusada pela rede não move nada (é atômica), então "nada
// saiu" é seguro de afirmar; sem confirmação, não é.

export function failedMessage(kind: Kind, isPro: boolean): string {
  if (kind === 'save') {
    return isPro
      ? 'A transação não foi concluída e nada saiu da sua carteira. Tente novamente.'
      : 'Não deu certo e nada saiu da sua carteira. Tente novamente.';
  }
  return isPro
    ? 'O resgate não foi concluído e nada saiu do vault. Tente novamente.'
    : 'Não deu certo e nada saiu do porquinho. Tente novamente.';
}

export const PENDING_TITLE = 'Ainda confirmando';

/**
 * Enviado e sem confirmação no prazo. A transação é atômica: ou o valor muda
 * de lugar inteiro, ou nada sai. O saldo (lido da rede) é onde o resultado
 * aparece; o Histórico depende do registro do backend, que pode ficar para trás.
 * "Não recebemos a confirmação", e não "foi enviada": sem resposta do envio,
 * o app não sabe se a transação saiu do aparelho.
 */
export function pendingCaption(kind: Kind, isPro: boolean): string {
  if (isPro) {
    return kind === 'save'
      ? 'Sem confirmação da rede ainda. A transação é atômica: ou o depósito entra no vault, ou nada sai da carteira. Pode fechar; confira o saldo antes de reenviar.'
      : 'Sem confirmação da rede ainda. A transação é atômica: ou o resgate chega na carteira, ou nada sai do vault. Pode fechar; confira o saldo antes de reenviar.';
  }
  return kind === 'save'
    ? 'Ainda não recebemos a confirmação da rede. Seu dinheiro não se perde: ou ele entra no porquinho, ou continua na sua carteira. Pode fechar; confira o saldo antes de tentar de novo.'
    : 'Ainda não recebemos a confirmação da rede. Seu dinheiro não se perde: ou ele chega na sua carteira, ou continua no porquinho. Pode fechar; confira o saldo antes de tentar de novo.';
}

/** Linha de estado enquanto o app segue verificando, depois do prazo normal. */
export const PENDING_CHECKING = 'Verificando a confirmação...';

/** O acompanhamento acabou sem resposta (a legenda acima já diz o que fazer). */
export function pendingGaveUp(isPro: boolean): string {
  return isPro
    ? 'Sem resposta da rede até agora. Confira o saldo do vault e da carteira em alguns minutos.'
    : 'Não recebemos resposta até agora. Confira o saldo daqui a alguns minutos.';
}
