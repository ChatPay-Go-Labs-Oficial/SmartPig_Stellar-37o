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
  SheetHint,
  SheetLink,
  SheetPending,
  SheetProgress,
  SheetSuccess,
  SheetWarning,
  StepProgress,
  SummaryCard,
} from './sheet/SheetParts';
import { currencyPrefix, displayBalance, displayTwoDecimals } from './sheet/amounts';
import {
  LIQUIDITY_MESSAGE,
  PENDING_GAVE_UP,
  PENDING_TITLE,
  SLOW_CAPTION,
  pendingCaption,
  SIGN_CAPTION,
  WITHDRAW_FAILED_MESSAGE,
  amountLabel,
  withdrawErrorMessage,
} from './sheet/operation-copy';
import { piggyPill } from './sheet/piggy-pill';

type Step =
  | 'input'
  | 'review'
  | 'authenticating'
  | 'preparing'
  | 'signing'
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
}

/**
 * Tirar do porquinho. Dólar em um passo (Figma "Tirar USDC", 09a–09k); euro
 * e criptomoeda em dois, com revisão antes de aprovar (Figma "Tirar euro/
 * cripto", 16a–16p). O dinheiro volta para a carteira na mesma moeda.
 */
export function WithdrawSheet({ visible, piggy, onClose }: WithdrawSheetProps) {
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
  // Valor do saque fixado na aprovação: depois dela o saldo do porquinho é
  // recarregado, e "Tudo" recalculado daria $0.00 no sucesso.
  const [doneLabel, setDoneLabel] = useState('');
  // Trava contra toque duplo: o estado só muda no próximo render.
  const running = useRef(false);
  const { slow, watch, begin, isCurrent, slowFor, keepWatching } = useOperationWatch(visible);

  useLayoutEffect(() => {
    if (!visible) return;
    setAmount('');
    setChip(null);
    setStep('input');
    setError(null);
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
  // "Tudo" (ou um valor que alcança o saldo) queima todas as cotas: nunca
  // sobra poeira no porquinho por arredondamento.
  const takesAll =
    chip === 'all' || amountUnits >= underlyingUnits || (shownAllUnits > 0n && amountUnits === shownAllUnits);
  const requestedUnits = takesAll ? underlyingUnits : amountUnits;
  const shareUnits =
    takesAll || underlyingUnits === 0n ? sharesUnits : (amountUnits * sharesUnits) / underlyingUnits;
  // "Tudo" vale mesmo abaixo de $0.01 (o campo mostra 0.00, as cotas existem).
  const canContinue =
    requestedUnits > 0n && sharesUnits > 0n && shareUnits > 0n && (takesAll || amountUnits <= underlyingUnits);

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

  const shortAmount = displayTwoDecimals(asset, symbol, fromUnits(requestedUnits));

  function backToInput() {
    setError(null);
    setStep('input');
  }

  function refreshBalances() {
    queryClient.invalidateQueries({ queryKey: portfolioKeys.summary });
    queryClient.invalidateQueries({ queryKey: vaultKeys.all });
    if (walletAddress) queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) });
  }

  function celebrate() {
    setStep('success');
    playRetirarConfirmacao();
    setTimeout(playInvestirCoin, 350);
    setTimeout(playInvestirCoin, 800);
  }

  async function approve() {
    if (!piggy || !canContinue || running.current) return;
    running.current = true;
    const token = begin();
    setDoneLabel(shortAmount);
    setError(null);
    setStep('authenticating');
    try {
      const biometrics = await authenticateWithDeviceBiometrics({
        promptMessage: 'Confirme o saque',
        promptSubtitle: 'Tirar do porquinho',
        promptDescription: `Autorize tirar ${shortAmount} do porquinho.`,
      });
      if (!biometrics.success) throw new BiometricsDeclinedError(biometrics.message);

      setStep(twoSteps ? 'processing' : 'preparing');
      const intent = await createWithdrawal.mutateAsync({
        vaultId: piggy.vault.id,
        shares: fromUnits(shareUnits),
        amount: fromUnits(requestedUnits),
      });
      if (!intent.unsignedXdr) throw new Error('XDR não gerado');

      if (!twoSteps) setStep('signing');
      const signedXdr = await signWithTimeout(intent.unsignedXdr);

      // Daqui em diante a transação pode estar na rede: o resultado vem do
      // status do intent, nunca de um "tente de novo" às cegas.
      if (!twoSteps) setStep('processing');
      const sources = { fetchStatus: () => getWithdrawal(intent.id), txHash: signedTxHash(signedXdr) };
      const outcome = await submitAndConfirm({
        submit: () => submitWithdrawal.mutateAsync({ withdrawalId: intent.id, signedXdr }),
        ...sources,
        onSlow: slowFor(token),
      });
      refreshBalances();

      if (outcome === 'confirmed') {
        celebrate();
      } else if (outcome === 'pending') {
        // Sem resposta no prazo: a tela avisa e segue verificando sozinha.
        setStep('pending');
        keepWatching(token, sources, (settled) => {
          refreshBalances();
          if (!isCurrent(token)) return;
          if (settled === 'confirmed') celebrate();
          else if (settled === 'failed') {
            setError(WITHDRAW_FAILED_MESSAGE);
            setStep(twoSteps ? 'review' : 'input');
          }
        });
      } else {
        setError(WITHDRAW_FAILED_MESSAGE);
        setStep(twoSteps ? 'review' : 'input');
      }
    } catch (e) {
      const kind = classifyOperationError(e);
      // Sem dinheiro livre no porquinho (Figma 16l): aviso próprio e voltar.
      if (kind === 'liquidity' && twoSteps) {
        setStep('liquidity');
        return;
      }
      setError(
        kind === 'liquidity'
          ? LIQUIDITY_MESSAGE
          : withdrawErrorMessage(kind, e instanceof BiometricsDeclinedError ? e.message : undefined),
      );
      setStep(twoSteps ? 'review' : 'input');
    } finally {
      running.current = false;
    }
  }

  const busy = step === 'authenticating' || step === 'preparing' || step === 'signing' || step === 'processing';
  const title = isPro ? `Resgate do vault ${symbol}` : 'Tirar do porquinho';
  const seven = (units: bigint) => displayBalance(asset, symbol, fromUnits(units), isPro);
  const paused = piggy?.depositsPaused ?? false;

  let body: React.ReactNode;
  if (step === 'authenticating') {
    body = (
      <SheetProgress
        title="Confirme com sua biometria..."
        caption={twoSteps ? `Autorize tirar ${shortAmount} do porquinho` : 'Protegendo seu saque antes de continuar'}
      />
    );
  } else if (step === 'preparing') {
    body = <SheetProgress title="Preparando..." caption="Preparando seu saque" />;
  } else if (step === 'signing') {
    body = <SheetProgress title="Assine com sua biometria..." caption={SIGN_CAPTION} />;
  } else if (step === 'processing') {
    body = twoSteps ? (
      <SheetProgress title="Tirando..." caption={slow ? SLOW_CAPTION : 'Enviando para a sua carteira'} />
    ) : (
      <SheetProgress
        title={t('network.processing')}
        caption={slow ? SLOW_CAPTION : isPro ? 'Enviando para sua carteira' : 'Enviando para sua conta'}
      />
    );
  } else if (step === 'success') {
    body = (
      <SheetSuccess
        title="Saque confirmado"
        caption={
          twoSteps ? `${doneLabel} já estão na sua carteira.` : `${doneLabel} já caíram na sua carteira.`
        }
        mascot="sad"
        action={{ label: 'Continuar', onPress: onClose }}
      />
    );
  } else if (step === 'pending') {
    body = (
      <View style={styles.body}>
        <SheetPending
          title={PENDING_TITLE}
          caption={pendingCaption('withdraw')}
          checking={watch === 'checking'}
          note={watch === 'gaveUp' ? PENDING_GAVE_UP : undefined}
        />
        <Button3D label="Entendi" variant="glass" onPress={onClose} />
      </View>
    );
  } else if (step === 'liquidity') {
    body = (
      <View style={styles.body}>
        <SheetWarning message={LIQUIDITY_MESSAGE} />
        <Button3D label="Voltar" variant="glass" onPress={backToInput} />
      </View>
    );
  } else if (step === 'review') {
    body = (
      <View style={styles.body}>
        {/* O valor aparece uma vez só: sai do porquinho na mesma moeda, então
            "tira" e "recebe" são o mesmo número. Sem cotas, dfTokens nem
            lista de etapas (decisão de produto, mais enxuta que o Figma 16a/16p). */}
        <SummaryCard rows={[{ label: 'Você recebe', value: seven(requestedUnits), highlight: true }]} />
        <SheetCaption>
          {isPro
            ? 'Pode levar mais tempo se faltar liquidez no vault.'
            : 'Pode levar mais tempo se faltar dinheiro livre no porquinho.'}
        </SheetCaption>
        {error && <SheetError message={error} />}
        <Button3D label={isPro ? 'Aprovar resgate' : 'Aprovar e tirar'} onPress={approve} />
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
        <SheetWarning message="Não conseguimos ler o saldo deste porquinho agora. Isso costuma voltar em instantes." />
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
        {paused && <SheetWarning message={t('guardar.notice.paused')} />}
        <FieldLabel>{amountLabel(asset, symbol, isPro)}</FieldLabel>
        <AmountField
          value={amount}
          onChangeText={changeAmount}
          prefix={currencyPrefix(asset) ?? (asset ? <AssetIcon asset={asset} size={22} round /> : symbol)}
          accessibilityLabel={amountLabel(asset, symbol, isPro)}
        />
        <QuickChips options={CHIPS} selected={chip} onSelect={selectChip} />
        <SheetHint>Guardado neste porquinho: {displayBalance(asset, symbol, underlying, isPro)}</SheetHint>
        {!paused && <SheetCaption>O valor volta para a sua carteira.</SheetCaption>}
        {error && <SheetError message={error} />}
        <Button3D
          label={twoSteps ? 'Continuar' : 'Confirmar saque'}
          onPress={twoSteps ? () => setStep('review') : approve}
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
