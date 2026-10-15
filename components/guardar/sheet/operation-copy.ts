import { Platform } from 'react-native';
import type { OperationErrorKind } from '@/lib/guardar/operation-errors';
import type { PiggyAsset } from '@/lib/utils/piggy';

// Textos dos sheets de Guardar e Tirar (Figma "Guardar · Guardar", "Tirar
// USDC" e "Tirar euro/cripto"), por moeda e modo. Ficam juntos aqui porque
// variam nas duas dimensões ao mesmo tempo.

/** "Valor em dólar" / "Valor em USDC". */
export function amountLabel(asset: PiggyAsset | null, symbol: string, isPro: boolean): string {
  if (isPro || !asset) return `Valor em ${symbol}`;
  return { USDC: 'Valor em dólar', EURC: 'Valor em euro', XLM: 'Valor em criptomoeda' }[asset];
}

/** Legenda do passo de assinatura: o aparelho decide o nome da biometria. */
export const SIGN_CAPTION =
  Platform.OS === 'ios'
    ? 'Use Face ID / Touch ID para autorizar'
    : 'Use a biometria do aparelho para autorizar';

const SIGN_TIMEOUT_MESSAGE = 'A assinatura não respondeu. Nada foi enviado. Tente novamente.';

export function saveErrorMessage(kind: OperationErrorKind, asset: PiggyAsset | null, isPro: boolean): string {
  switch (kind) {
    case 'insufficient':
      if (asset === 'EURC') return isPro ? 'Saldo de EURC insuficiente na carteira.' : 'Saldo insuficiente de euro na carteira.';
      if (asset === 'XLM') return isPro ? 'Saldo de XLM insuficiente na carteira.' : 'Saldo insuficiente de criptomoeda na carteira.';
      return 'Saldo insuficiente na carteira. Deposite pelo botão "Depositar" antes de guardar.';
    case 'network':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    case 'session':
      return 'Sessão expirada. Saia e entre novamente no app.';
    case 'paused':
      return isPro
        ? 'Novos depósitos neste porquinho estão pausados.'
        : 'Guardar mais neste porquinho está pausado por enquanto. Tirar continua disponível.';
    case 'signing':
      return SIGN_TIMEOUT_MESSAGE;
    case 'risks':
      return isPro
        ? 'Antes do primeiro depósito, leia e aceite os riscos deste porquinho.'
        : 'Antes de guardar pela primeira vez, leia os riscos deste porquinho.';
    case 'risksMissing':
      return isPro
        ? 'Depósitos indisponíveis: este vault ainda não tem divulgação de riscos publicada.'
        : 'Guardar neste porquinho não está disponível agora. Tente mais tarde.';
    default:
      return 'Não foi possível guardar agora. Tente novamente em instantes.';
  }
}

export function withdrawErrorMessage(kind: OperationErrorKind, biometricsMessage?: string): string {
  switch (kind) {
    case 'biometrics':
      return biometricsMessage || 'Biometria não confirmada. Tente novamente.';
    case 'signing':
      return SIGN_TIMEOUT_MESSAGE;
    case 'insufficient':
      return 'Saldo insuficiente no porquinho para realizar o saque.';
    case 'network':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    case 'session':
      return 'Sessão expirada. Saia e entre novamente no app.';
    default:
      return 'Não foi possível processar o saque. Tente novamente em instantes.';
  }
}

/** Sem a moeda na carteira (Figma 08m). */
export function noFundsMessage(asset: PiggyAsset | null, symbol: string, isPro: boolean): string {
  if (isPro) return `Sem saldo de ${symbol} na carteira. Use o swap para obter ${symbol}.`;
  if (asset === 'XLM') {
    return 'Você não tem criptomoeda na carteira. Você pode usar a troca de moedas para ter criptomoeda.';
  }
  return 'Você não tem euro na carteira. Você pode usar a troca de moedas para ter euro.';
}

export const LIQUIDITY_MESSAGE =
  'Não há dinheiro livre suficiente no porquinho para tirar tudo agora. Tente um valor menor ou volte mais tarde. Nada foi tirado.';

// Depois do envio. Uma transação recusada pela rede não move nada (é atômica),
// então "nada saiu" é seguro de afirmar; sem confirmação, não é.

export const SAVE_FAILED_MESSAGE =
  'A transação não foi concluída e nada saiu da sua carteira. Tente novamente.';

export const WITHDRAW_FAILED_MESSAGE =
  'O saque não foi concluído e nada saiu do porquinho. Tente novamente.';

export const PENDING_TITLE = 'Ainda confirmando';

/**
 * Enviado e sem confirmação no prazo. A transação é atômica: ou o valor muda
 * de lugar inteiro, ou nada sai. É o que a pessoa precisa ouvir aqui, e o
 * saldo (lido da rede) é onde o resultado aparece. O Histórico não serve de
 * referência: ele depende do registro do backend, que pode ficar para trás.
 */
export function pendingCaption(kind: 'save' | 'withdraw'): string {
  // "Não recebemos a confirmação", e não "foi enviada": sem resposta do envio,
  // o app não sabe se a transação saiu do aparelho.
  return kind === 'save'
    ? 'Ainda não recebemos a confirmação da rede. Seu dinheiro não se perde: ou ele entra no porquinho, ou continua na sua carteira.'
    : 'Ainda não recebemos a confirmação da rede. Seu dinheiro não se perde: ou ele chega na sua carteira, ou continua no porquinho.';
}

/** Linha de estado enquanto o app segue verificando, depois do prazo normal. */
export const PENDING_CHECKING = 'Verificando a confirmação...';

/** O acompanhamento acabou sem resposta. */
export const PENDING_GAVE_UP =
  'Não conseguimos confirmar agora. Veja o saldo do porquinho daqui a alguns minutos antes de tentar de novo.';

/** Legenda do passo de confirmação quando passa do tempo normal. */
export const SLOW_CAPTION = 'Está levando mais tempo que o normal. Seu dinheiro está seguro.';
