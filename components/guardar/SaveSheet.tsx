import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useSound } from '@/hooks/use-sound';
import { AssetIcon, Button3D, V2Sheet } from '@/components/v2';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCreateDeposit, useSubmitDeposit } from '@/lib/queries/deposits.queries';
import { useWalletAssets, walletKeys } from '@/lib/queries/wallets.queries';
import { vaultKeys } from '@/lib/queries/vaults.queries';
import { portfolioKeys } from '@/lib/queries/portfolio.queries';
import { getDeposit } from '@/lib/api/deposits';
import { apiErrorDetails, type ApiErrorDetails } from '@/lib/api/errors';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import { BiometricsDeclinedError, classifyOperationError } from '@/lib/guardar/operation-errors';
import { signWithTimeout, signedTxHash, submitAndConfirm } from '@/lib/guardar/vault-operation';
import { useOperationWatch } from '@/lib/guardar/use-operation-watch';
import { fromUnits, toUnits, trimDecimal, type Piggy } from '@/lib/utils/piggy';
import {
  AmountField,
  FieldLabel,
  QuickChips,
  SheetCaption,
  SheetError,
  SheetFieldWarning,
  SheetHint,
  SheetNote,
  SheetPending,
  SheetProgress,
  SheetSuccess,
  SheetWarning,
  YieldHint,
  type QuickOption,
} from './sheet/SheetParts';
import { currencyPrefix, displayBalance, displayShort, operationAmount } from './sheet/amounts';
import {
  PENDING_TITLE,
  SLOW_CAPTION,
  amountLabel,
  authProgress,
  authPrompt,
  confirmingCaption,
  failedMessage,
  noFundsMessage,
  overBalanceMessage,
  pendingCaption,
  pendingGaveUp,
  preparingProgress,
  saveErrorMessage,
  successCopy,
} from './sheet/operation-copy';
import { piggyPill } from './sheet/piggy-pill';

// A assinatura da carteira é automática (Privy, sem tela) e fica dentro de
// "preparing"; a confirmação de identidade é a etapa "authenticating".
type Step = 'input' | 'authenticating' | 'preparing' | 'confirming' | 'success' | 'pending';

interface SaveSheetProps {
  visible: boolean;
  piggy: Piggy | null;
  onClose: () => void;
  /** Atualiza a tela assim que a rede confirmar, antes da próxima leitura. */
  onConfirmed: (vaultId: string, amount: string) => void;
  /** "Fazer swap" (Pro) quando falta a moeda do vault na carteira. */
  onSwap: () => void;
  /** "Ler os riscos" quando o backend pede o aceite antes do depósito. */
  onRisks: () => void;
  /**
   * O backend recusou pela trilha (409 VAULT_EDUCATION_LOCKED): a tela de
   * trás mostra o porquinho bloqueado com o que falta (Figma 11a).
   */
  onLessonLock: (details: ApiErrorDetails['VAULT_EDUCATION_LOCKED'] | null) => void;
}

/**
 * Guardar no porquinho (Figma "Guardar · Guardar", 08a–08p): valor na moeda
 * do próprio porquinho (dólar, euro ou criptomoeda), com o saldo dessa moeda
 * na carteira.
 */
export function SaveSheet({
  visible,
  piggy,
  onClose,
  onConfirmed,
  onSwap,
  onRisks,
  onLessonLock,
}: SaveSheetProps) {
  const accent = useAccent();
  const terms = useTerms();
  const { t, isPro } = terms;
  const { playInvestirConfirmacao, playInvestirCoin } = useSound();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const assetsQuery = useWalletAssets(walletAddress);
  const createDeposit = useCreateDeposit();
  const submitDeposit = useSubmitDeposit();

  const [amount, setAmount] = useState('');
  const [chip, setChip] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState<string | null>(null);
  // O backend pediu o aceite de riscos (409): o botão leva à leitura, porque
  // confirmar de novo só repetiria a recusa.
  const [risksBlocked, setRisksBlocked] = useState(false);
  // Trava contra toque duplo: o estado só muda no próximo render.
  const running = useRef(false);
  const confirmedNotified = useRef(false);
  const { slow, watch, begin, isCurrent, slowFor, keepWatching } = useOperationWatch(visible);

  // Cada abertura começa do zero, antes de pintar (sem piscar o estado anterior).
  useLayoutEffect(() => {
    if (!visible) return;
    setAmount('');
    setChip(null);
    setStep('input');
    setError(null);
    setRisksBlocked(false);
    confirmedNotified.current = false;
    begin();
  }, [visible, begin]);

  const asset = piggy?.asset ?? null;
  const symbol = piggy?.vault.assetSymbol ?? '';
  const walletAsset = assetsQuery.data?.assets.find((a) => a.id === asset);
  const loaded = !!assetsQuery.data;
  const balance = walletAsset?.balance ?? '0';
  const spendableUnits = toUnits(walletAsset?.spendable ?? '0');
  const balanceUnits = toUnits(balance);
  const amountUnits = toUnits(amount || '0');
  const apy = piggy?.vault.apy != null ? parseFloat(piggy.vault.apy) : null;

  // Euro e cripto sem saldo: em vez do campo, o convite para trocar moedas.
  const noFunds = loaded && asset !== 'USDC' && spendableUnits <= 0n;
  const overBalance = loaded && amountUnits > spendableUnits;
  const canConfirm = loaded && amountUnits > 0n && !overBalance;
  // "$10", "1.5 XLM", "10 USDC" no Pro: o valor digitado, inteiro.
  const operationLabel = operationAmount(asset, symbol, fromUnits(amountUnits), isPro, true);

  const options: QuickOption[] = useMemo(() => {
    if (asset === 'XLM') {
      return [
        { key: '25', label: '25%' },
        { key: '50', label: '50%' },
        { key: '75', label: '75%' },
        { key: 'all', label: 'Tudo' },
      ];
    }
    const prefix = currencyPrefix(asset) ?? '';
    return [
      { key: '10', label: `${prefix}10` },
      { key: '50', label: `${prefix}50` },
      { key: '100', label: `${prefix}100` },
      { key: 'all', label: 'Tudo' },
    ];
  }, [asset]);

  function selectChip(key: string) {
    setChip(key);
    clearError();
    if (key === 'all') {
      setAmount(trimDecimal(fromUnits(spendableUnits)));
    } else if (asset === 'XLM') {
      setAmount(trimDecimal(fromUnits((spendableUnits * BigInt(key)) / 100n)));
    } else {
      setAmount(key);
    }
  }

  function changeAmount(text: string) {
    setAmount(text);
    setChip(null);
    clearError();
  }

  function clearError() {
    setError(null);
    setRisksBlocked(false);
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
    playInvestirConfirmacao();
    setTimeout(playInvestirCoin, 350);
    setTimeout(playInvestirCoin, 800);
  }

  async function confirm() {
    if (!piggy || !canConfirm || running.current) return;
    running.current = true;
    const token = begin();
    const vaultId = piggy.vault.id;
    const confirmedAmount = fromUnits(amountUnits);
    clearError();
    setStep('authenticating');
    try {
      // Biometria ou PIN do aparelho antes de qualquer coisa, como no Tirar.
      const auth = await authenticateWithDeviceBiometrics({
        ...authPrompt('save', operationLabel, symbol, isPro),
        requireDeviceLock: true,
      });
      // O sheet pode ter fechado durante o pedido (ele fica fechável nesta
      // etapa, em que nada aconteceu ainda): não segue.
      if (!isCurrent(token)) return;
      if (!auth.success) throw new BiometricsDeclinedError(auth.message, auth.reason);

      setStep('preparing');
      const intent = await createDeposit.mutateAsync({
        vaultId,
        amount: confirmedAmount,
        assetSymbol: piggy.vault.assetSymbol,
      });
      if (!intent.unsignedXdr) throw new Error('XDR não gerado');
      const signedXdr = await signWithTimeout(intent.unsignedXdr);

      // Daqui em diante a transação pode estar na rede: o resultado vem do
      // status do intent, nunca de um "tente de novo" às cegas.
      setStep('confirming');
      const sources = { fetchStatus: () => getDeposit(intent.id), txHash: signedTxHash(signedXdr) };
      const outcome = await submitAndConfirm({
        submit: () => submitDeposit.mutateAsync({ depositId: intent.id, signedXdr }),
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
            setError(failedMessage('save', isPro));
            setStep('input');
          }
        });
      } else {
        setError(failedMessage('save', isPro));
        setStep('input');
      }
    } catch (e) {
      const kind = classifyOperationError(e);
      // Cancelou a biometria: volta ao valor, sem erro (nada foi feito).
      if (kind === 'cancelled') {
        setStep('input');
        return;
      }
      // Recusado antes de gerar a transação: nada foi assinado nem enviado.
      if (kind === 'lessons') {
        setStep('input');
        onLessonLock(apiErrorDetails(e, 'VAULT_EDUCATION_LOCKED'));
        return;
      }
      setRisksBlocked(kind === 'risks');
      setError(saveErrorMessage(kind, asset, isPro));
      setStep('input');
    } finally {
      running.current = false;
    }
  }

  // Confirmando a identidade, nada aconteceu ainda: o sheet fecha, para não
  // prender a pessoa se o pedido do sistema nunca responder.
  const busy = step === 'preparing' || step === 'confirming';
  const reserveUnits = balanceUnits - spendableUnits;
  // A reserva explica o "Tudo" e também o valor entre o disponível e o saldo.
  const showReserve = asset === 'XLM' && (chip === 'all' || overBalance) && reserveUnits > 0n;
  const xlm = (value: string) => `${trimDecimal(value)} XLM`;

  // Sem APY conhecido, nada de rendimento: "taxa baixa" seria inventar.
  let yieldNode: React.ReactNode = null;
  if (overBalance) {
    yieldNode = <SheetFieldWarning message={overBalanceMessage('save', isPro)} />;
  } else if (apy == null) {
    yieldNode = null;
  } else if (asset === 'XLM') {
    yieldNode =
      apy >= 1 ? (
        <YieldHint value={displayShort(asset, symbol, yearlyGain(amount, apy).toFixed(7))} />
      ) : (
        <SheetCaption>{isPro ? 'APY muito baixo hoje.' : 'A taxa é muito baixa hoje.'}</SheetCaption>
      );
  } else {
    yieldNode = <YieldHint value={yieldValue(asset, amount, apy)} />;
  }

  const auth = authProgress('save', operationLabel, isPro);
  const preparing = preparingProgress('save', isPro);
  const success = successCopy('save', operationLabel, isPro);

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title={isPro ? `Depósito no vault ${symbol}` : 'Guardar no porquinho'}
      icon="arrow-down"
      pill={piggy ? piggyPill(piggy, terms, accent.base) : undefined}
      closable={!busy}
    >
      {step === 'authenticating' ? (
        <SheetProgress title={auth.title} caption={auth.caption} />
      ) : step === 'preparing' ? (
        <SheetProgress title={preparing.title} caption={preparing.caption} />
      ) : step === 'confirming' ? (
        <SheetProgress
          title={t('network.confirming')}
          caption={slow ? SLOW_CAPTION : confirmingCaption('save', isPro)}
        />
      ) : step === 'pending' ? (
        <View style={styles.body}>
          <SheetPending
            title={PENDING_TITLE}
            caption={pendingCaption('save', isPro)}
            checking={watch === 'checking'}
            note={watch === 'gaveUp' ? pendingGaveUp(isPro) : undefined}
          />
          <Button3D label="Entendi" variant="glass" onPress={onClose} />
        </View>
      ) : step === 'success' ? (
        <SheetSuccess
          title={success.title}
          caption={success.caption}
          mascot="happy"
          action={{ label: 'Continuar', onPress: onClose }}
        />
      ) : noFunds ? (
        <View style={styles.body}>
          <SheetWarning message={noFundsMessage(asset, symbol, isPro)} />
          {isPro ? (
            <Button3D label="Fazer swap" onPress={onSwap} />
          ) : (
            <Button3D label="Entendi" variant="glass" onPress={onClose} />
          )}
        </View>
      ) : (
        <View style={styles.body}>
          <FieldLabel>{amountLabel(asset, symbol, isPro)}</FieldLabel>
          <AmountField
            value={amount}
            onChangeText={changeAmount}
            prefix={
              currencyPrefix(asset) ?? (asset ? <AssetIcon asset={asset} size={22} round /> : symbol)
            }
            accessibilityLabel={amountLabel(asset, symbol, isPro)}
          />
          <QuickChips options={options} selected={chip} onSelect={selectChip} disabled={!loaded} />
          <SheetHint>
            Saldo disponível: {loaded ? displayBalance(asset, symbol, fromUnits(spendableUnits), isPro) : '—'}
          </SheetHint>
          {showReserve && (
            <SheetNote>
              {isPro
                ? `Reserva mínima da conta (${xlm(fromUnits(reserveUnits))}) descontada do máximo.`
                : `Deixamos ${xlm(fromUnits(reserveUnits))} na carteira: é o mínimo que a rede exige para manter a sua conta. Você pode guardar até ${xlm(fromUnits(spendableUnits))} de ${xlm(balance)}.`}
            </SheetNote>
          )}
          {yieldNode}
          {error && <SheetError message={error} />}
          {risksBlocked ? (
            <Button3D label={t('guardar.notice.risks.cta')} onPress={onRisks} />
          ) : (
            <Button3D label={isPro ? 'Confirmar depósito' : 'Confirmar'} onPress={confirm} disabled={!canConfirm} />
          )}
        </View>
      )}
    </V2Sheet>
  );
}

/** Ganho estimado em 1 ano, na moeda do porquinho (estimativa: number basta). */
function yearlyGain(amount: string, apy: number): number {
  const value = (Number(amount || 0) * apy) / 100;
  return Number.isFinite(value) ? value : 0;
}

/** "Cerca de $0.71 por ano" — o ganho estimado em 1 ano na moeda do porquinho. */
function yieldValue(asset: Piggy['asset'], amount: string, apy: number): string {
  const two = (Math.floor(yearlyGain(amount, apy) * 100) / 100).toFixed(2);
  return asset === 'EURC' ? `€${two}` : `$${two}`;
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
});
