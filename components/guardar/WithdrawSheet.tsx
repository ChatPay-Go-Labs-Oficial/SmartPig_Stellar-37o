import { useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useSound } from '@/hooks/use-sound';
import { AssetIcon, Button3D, V2Sheet } from '@/components/v2';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCreateWithdrawal, useSubmitWithdrawal } from '@/lib/queries/withdrawals.queries';
import { walletKeys } from '@/lib/queries/wallets.queries';
import { vaultKeys } from '@/lib/queries/vaults.queries';
import { portfolioKeys, usePortfolioSummary } from '@/lib/queries/portfolio.queries';
import { getWithdrawal } from '@/lib/api/withdrawals';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import { BiometricsDeclinedError, classifyOperationError } from '@/lib/guardar/operation-errors';
import { signWithTimeout, signedTxHash, submitAndConfirm } from '@/lib/guardar/vault-operation';
import { useOperationWatch } from '@/lib/guardar/use-operation-watch';
import { truncateDecimalString } from '@/lib/utils/format';
import { fromUnits, toUnits, type Piggy } from '@/lib/utils/piggy';
import {
  AmountField,
  FieldLabel,
  QuickChips,
  SheetCaption,
  SheetError,
  SheetFieldWarning,
  SheetHint,
  SheetLink,
  SheetPending,
  SheetProgress,
  SheetSuccess,
  SheetWarning,
  StepProgress,
  SummaryCard,
} from './sheet/SheetParts';
import { currencyPrefix, displayBalance, operationAmount } from './sheet/amounts';
import {
  PENDING_TITLE,
  SLOW_CAPTION,
  amountLabel,
  authProgress,
  authPrompt,
  confirmingCaption,
  failedMessage,
  liquidityMessage,
  liquidityNote,
  overBalanceMessage,
  pendingCaption,
  pendingGaveUp,
  preparingProgress,
  successCopy,
  unknownBalanceMessage,
  withdrawErrorMessage,
  withdrawPausedNotice,
} from './sheet/operation-copy';
import { piggyPill } from './sheet/piggy-pill';

// A assinatura da carteira é automática (Privy, sem tela) e fica dentro de
// "preparing", nas três moedas.
type Step =
  | 'input'
  | 'review'
  | 'authenticating'
  | 'preparing'
  | 'processing'
  | 'success'
  | 'pending'
  | 'liquidity';

const CHIPS = [
  { key: '25', label: '25%' },
  { key: '50', label: '50%' },
  { key: 'all', label: 'Tudo' },
] as const;

interface WithdrawSheetProps {
  visible: boolean;
  piggy: Piggy | null;
  onClose: () => void;
  /** Atualiza a tela assim que a rede confirmar, antes da próxima leitura. */
  onConfirmed: (vaultId: string, amount: string) => void;
}

/**
 * Tirar do porquinho. Dólar em um passo (Figma "Tirar USDC", 09a–09k); euro
 * e criptomoeda em dois, com revisão antes de aprovar (Figma "Tirar euro/
 * cripto", 16a–16p). O dinheiro volta para a carteira na mesma moeda.
 */
export function WithdrawSheet({ visible, piggy, onClose, onConfirmed }: WithdrawSheetProps) {
  const accent = useAccent();
  const terms = useTerms();
  const { t, isPro } = terms;
  const { playRetirarConfirmacao, playInvestirCoin } = useSound();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const createWithdrawal = useCreateWithdrawal();
  // Para "Tentar de novo" quando o saldo deste porquinho não veio na leitura.
  const portfolio = usePortfolioSummary(visible);
  const submitWithdrawal = useSubmitWithdrawal();

  const [amount, setAmount] = useState('');
  const [chip, setChip] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  // Valor fixado na aprovação: depois dela o saldo do porquinho é
  // recarregado, e "Tudo" recalculado daria $0.00 no sucesso.
  const [doneLabel, setDoneLabel] = useState('');
  // Trava contra toque duplo: o estado só muda no próximo render.
  const running = useRef(false);
  const confirmedNotified = useRef(false);
  const { slow, watch, begin, isCurrent, slowFor, keepWatching } = useOperationWatch(visible);

  useLayoutEffect(() => {
    if (!visible) return;
    setAmount('');
    setChip(null);
    setStep('input');
    setError(null);
    confirmedNotified.current = false;
    begin();
  }, [visible, begin]);

  const asset = piggy?.asset ?? null;
  const symbol = piggy?.vault.assetSymbol ?? '';
  const twoSteps = asset !== 'USDC';
  const underlying = piggy?.amount ?? '0';
  const underlyingUnits = toUnits(underlying);
  const sharesUnits = toUnits(piggy?.position?.shares ?? '0');
  const amountUnits = toUnits(amount || '0');
  // No dólar o campo mostra 2 casas: digitar o saldo como aparece ("12.34"
  // de 12.3456789) também é tirar tudo.
  const shownAllUnits = asset === 'USDC' ? toUnits(truncateDecimalString(underlying, 2)) : underlyingUnits;
  // "Tudo" (ou o saldo exato) queima todas as cotas: nunca sobra poeira no
  // porquinho por arredondamento. Acima do saldo, o botão não libera e o
  // aviso explica (antes virava "tudo" sem a pessoa ver).
  const takesAll =
    chip === 'all' || amountUnits === underlyingUnits || (shownAllUnits > 0n && amountUnits === shownAllUnits);
  const overBalance = !takesAll && amountUnits > underlyingUnits;
  const requestedUnits = takesAll ? underlyingUnits : amountUnits;
  const shareUnits =
    takesAll || underlyingUnits === 0n ? sharesUnits : (amountUnits * sharesUnits) / underlyingUnits;
  // "Tudo" vale mesmo abaixo de $0.01 (o campo mostra 0.00, as cotas existem).
  const canContinue = requestedUnits > 0n && sharesUnits > 0n && shareUnits > 0n && !overBalance;

  function selectChip(key: string) {
    setChip(key);
    setError(null);
    const units = key === 'all' ? underlyingUnits : (underlyingUnits * BigInt(key)) / 100n;
    // Dólar com 2 casas no campo, como no Figma ("10.00"); euro e cripto, 7.
    setAmount(asset === 'USDC' ? truncateDecimalString(fromUnits(units), 2) : fromUnits(units));
  }

  function changeAmount(text: string) {
    setAmount(text);
    setChip(null);
    setError(null);
  }

  // O valor inteiro, até 7 casas ("$10", "€2.5308641", "10 USDC"): o mesmo
  // da revisão, e nunca "$0.00" num valor pequeno.
  const operationLabel = operationAmount(asset, symbol, fromUnits(requestedUnits), isPro, true);

  // Na revisão o saldo pode ser relido (a cada 30 s): "tudo" fica fixado
  // como intenção, para não virar "acima do saldo" nem deixar poeira.
  function goToReview() {
    if (takesAll) setChip('all');
    setStep('review');
  }

  function backToInput() {
    setError(null);
    setStep('input');
  }

  function refreshBalances() {
    queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
    queryClient.invalidateQueries({ queryKey: vaultKeys.all, exact: true });
    if (walletAddress) queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) });
  }

  function celebrate(vaultId: string, confirmedAmount: string) {
    if (!confirmedNotified.current) {
      confirmedNotified.current = true;
      onConfirmed(vaultId, confirmedAmount);
    }
    setStep('success');
    playRetirarConfirmacao();
    setTimeout(playInvestirCoin, 350);
    setTimeout(playInvestirCoin, 800);
  }

  async function approve() {
    if (!piggy || !canContinue || running.current) return;
    running.current = true;
    const token = begin();
    const vaultId = piggy.vault.id;
    const confirmedAmount = fromUnits(requestedUnits);
    setDoneLabel(operationLabel);
    setError(null);
    setStep('authenticating');
    try {
      const auth = await authenticateWithDeviceBiometrics({
        ...authPrompt('withdraw', operationLabel, symbol, isPro),
        requireDeviceLock: true,
      });
      // O sheet pode ter fechado durante o pedido (ele fica fechável nesta
      // etapa, em que nada aconteceu ainda): não segue.
      if (!isCurrent(token)) return;
      if (!auth.success) throw new BiometricsDeclinedError(auth.message, auth.reason);

      setStep('preparing');
      const intent = await createWithdrawal.mutateAsync({
        vaultId,
        shares: fromUnits(shareUnits),
        amount: confirmedAmount,
      });
      if (!intent.unsignedXdr) throw new Error('XDR não gerado');
      const signedXdr = await signWithTimeout(intent.unsignedXdr);

      // Daqui em diante a transação pode estar na rede: o resultado vem do
      // status do intent, nunca de um "tente de novo" às cegas.
      setStep('processing');
      const sources = { fetchStatus: () => getWithdrawal(intent.id), txHash: signedTxHash(signedXdr) };
      const outcome = await submitAndConfirm({
        submit: () => submitWithdrawal.mutateAsync({ withdrawalId: intent.id, signedXdr }),
        ...sources,
        onSlow: slowFor(token),
      });
      refreshBalances();

      if (outcome === 'confirmed') {
        celebrate(vaultId, confirmedAmount);
      } else if (outcome === 'pending') {
        // Sem resposta no prazo: a tela avisa e segue verificando sozinha.
        setStep('pending');
        keepWatching(token, sources, (settled) => {
          refreshBalances();
          if (!isCurrent(token)) return;
          if (settled === 'confirmed') celebrate(vaultId, confirmedAmount);
          else if (settled === 'failed') {
            setError(failedMessage('withdraw', isPro));
            setStep(twoSteps ? 'review' : 'input');
          }
        });
      } else {
        setError(failedMessage('withdraw', isPro));
        setStep(twoSteps ? 'review' : 'input');
      }
    } catch (e) {
      const kind = classifyOperationError(e);
      // Cancelou a biometria: volta para onde estava, sem erro (nada foi feito).
      if (kind === 'cancelled') {
        setStep(twoSteps ? 'review' : 'input');
        return;
      }
      // Sem dinheiro livre no porquinho (Figma 16l): aviso próprio e voltar.
      if (kind === 'liquidity' && twoSteps) {
        setStep('liquidity');
        return;
      }
      setError(withdrawErrorMessage(kind, isPro));
      setStep(twoSteps ? 'review' : 'input');
    } finally {
      running.current = false;
    }
  }

  // Confirmando a identidade, nada aconteceu ainda: o sheet fecha, para não
  // prender a pessoa se o pedido do sistema nunca responder.
  const busy = step === 'preparing' || step === 'processing';
  const title = isPro ? `Resgate do vault ${symbol}` : 'Tirar do porquinho';
  const seven = (units: bigint) => displayBalance(asset, symbol, fromUnits(units), isPro);
  const paused = piggy?.depositsPaused ?? false;

  let body: React.ReactNode;
  if (step === 'authenticating') {
    const auth = authProgress('withdraw', doneLabel, isPro);
    body = <SheetProgress title={auth.title} caption={auth.caption} />;
  } else if (step === 'preparing') {
    const preparing = preparingProgress('withdraw', isPro);
    body = <SheetProgress title={preparing.title} caption={preparing.caption} />;
  } else if (step === 'processing') {
    body = (
      <SheetProgress
        // Lite: "Tirando..." nas três moedas (Figma 16h); Pro: o termo de rede.
        title={isPro ? t('network.processing') : 'Tirando...'}
        caption={slow ? SLOW_CAPTION : confirmingCaption('withdraw', isPro)}
      />
    );
  } else if (step === 'success') {
    const success = successCopy('withdraw', doneLabel, isPro);
    body = (
      <SheetSuccess
        title={success.title}
        caption={success.caption}
        mascot="sad"
        action={{ label: 'Continuar', onPress: onClose }}
      />
    );
  } else if (step === 'pending') {
    body = (
      <View style={styles.body}>
        <SheetPending
          title={PENDING_TITLE}
          caption={pendingCaption('withdraw', isPro)}
          checking={watch === 'checking'}
          note={watch === 'gaveUp' ? pendingGaveUp(isPro) : undefined}
        />
        <Button3D label="Entendi" variant="glass" onPress={onClose} />
      </View>
    );
  } else if (step === 'liquidity') {
    body = (
      <View style={styles.body}>
        <SheetWarning message={liquidityMessage(isPro)} />
        <Button3D label="Voltar" variant="glass" onPress={backToInput} />
      </View>
    );
  } else if (step === 'review') {
    body = (
      <View style={styles.body}>
        {/* O valor aparece uma vez só: sai do porquinho na mesma moeda, então
            "tira" e "recebe" são o mesmo número. Sem cotas, dfTokens nem
            lista de etapas (decisão de produto, mais enxuta que o Figma 16a/16p). */}
        {/* "Cerca de": o resgate queima cotas com tolerância de preço
            (slippage), e pode chegar um pouco menos. */}
        <SummaryCard
          rows={[
            {
              label: isPro ? 'Você recebe (estimado)' : 'Você recebe cerca de',
              value: seven(requestedUnits),
              highlight: true,
            },
          ]}
        />
        {overBalance ? (
          <SheetFieldWarning message={overBalanceMessage('withdraw', isPro)} />
        ) : (
          <SheetCaption>{liquidityNote(isPro)}</SheetCaption>
        )}
        {error && <SheetError message={error} />}
        <Button3D
          label={isPro ? 'Aprovar resgate' : 'Aprovar e tirar'}
          onPress={approve}
          disabled={!canContinue}
        />
        <SheetLink label="Voltar" onPress={backToInput} />
      </View>
    );
  } else if (piggy && !piggy.balanceKnown) {
    // O backend não conseguiu ler este porquinho agora (limite da DeFindex,
    // por exemplo). O botão Tirar continua abrindo, e aqui a pessoa entende o
    // que houve e tenta de novo; o formulário volta sozinho quando a leitura
    // chega.
    body = (
      <View style={styles.body}>
        <SheetWarning message={unknownBalanceMessage(isPro)} />
        <Button3D
          label="Tentar de novo"
          variant="glass"
          loading={portfolio.isFetching}
          onPress={() => portfolio.refetch()}
        />
      </View>
    );
  } else {
    body = (
      <View style={styles.body}>
        {/* Pausa só barra guardar: tirar continua (Figma 16n). */}
        {paused && <SheetWarning message={withdrawPausedNotice(isPro)} />}
        <FieldLabel>{amountLabel(asset, symbol, isPro)}</FieldLabel>
        <AmountField
          value={amount}
          onChangeText={changeAmount}
          prefix={currencyPrefix(asset) ?? (asset ? <AssetIcon asset={asset} size={22} round /> : symbol)}
          accessibilityLabel={amountLabel(asset, symbol, isPro)}
        />
        <QuickChips options={CHIPS} selected={chip} onSelect={selectChip} />
        <SheetHint>
          {isPro ? 'Saldo no vault' : 'Guardado neste porquinho'}: {displayBalance(asset, symbol, underlying, isPro)}
        </SheetHint>
        {overBalance ? (
          <SheetFieldWarning message={overBalanceMessage('withdraw', isPro)} />
        ) : (
          !paused && <SheetCaption>O valor volta para a sua carteira.</SheetCaption>
        )}
        {error && <SheetError message={error} />}
        <Button3D
          label={twoSteps ? 'Continuar' : isPro ? 'Confirmar resgate' : 'Confirmar'}
          onPress={twoSteps ? goToReview : approve}
          disabled={!canContinue}
        />
      </View>
    );
  }

  const showSteps = twoSteps && step !== 'success' && step !== 'pending' && piggy?.balanceKnown !== false;
  const stepNumber = step === 'input' ? 1 : 2;

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      icon="arrow-up"
      pill={piggy ? piggyPill(piggy, terms, accent.base) : undefined}
      closable={!busy}
    >
      {showSteps ? (
        <View style={styles.withSteps}>
          <StepProgress step={stepNumber} total={2} label={stepNumber === 1 ? 'Valor' : 'Revisar e aprovar'} />
          {body}
        </View>
      ) : (
        body
      )}
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  withSteps: {
    gap: 14,
  },
});
