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
import { classifyOperationError } from '@/lib/guardar/operation-errors';
import { signWithTimeout, signedTxHash, submitAndConfirm } from '@/lib/guardar/vault-operation';
import { useOperationWatch } from '@/lib/guardar/use-operation-watch';
import { fromUnits, toUnits, trimDecimal, type Piggy } from '@/lib/utils/piggy';
import {
  AmountField,
  FieldLabel,
  QuickChips,
  SheetCaption,
  SheetError,
  SheetHint,
  SheetNote,
  SheetPending,
  SheetProgress,
  SheetSuccess,
  SheetWarning,
  YieldHint,
  type QuickOption,
} from './sheet/SheetParts';
import { currencyPrefix, displayBalance, displayShort } from './sheet/amounts';
import {
  PENDING_GAVE_UP,
  PENDING_TITLE,
  SLOW_CAPTION,
  pendingCaption,
  SAVE_FAILED_MESSAGE,
  SIGN_CAPTION,
  amountLabel,
  noFundsMessage,
  saveErrorMessage,
} from './sheet/operation-copy';
import { piggyPill } from './sheet/piggy-pill';

type Step = 'input' | 'preparing' | 'signing' | 'confirming' | 'success' | 'pending';

interface SaveSheetProps {
  visible: boolean;
  piggy: Piggy | null;
  onClose: () => void;
  /** "Trocar moedas" quando falta a moeda do porquinho na carteira. */
  onSwap: () => void;
  /** "Ler os riscos" quando o backend pede o aceite antes do depósito. */
  onRisks: () => void;
}

/**
 * Guardar no porquinho (Figma "Guardar · Guardar", 08a–08p): valor na moeda
 * do próprio porquinho (dólar, euro ou criptomoeda), com o saldo dessa moeda
 * na carteira.
 */
export function SaveSheet({ visible, piggy, onClose, onSwap, onRisks }: SaveSheetProps) {
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
  const { slow, watch, begin, isCurrent, slowFor, keepWatching } = useOperationWatch(visible);

  // Cada abertura começa do zero, antes de pintar (sem piscar o estado anterior).
  useLayoutEffect(() => {
    if (!visible) return;
    setAmount('');
    setChip(null);
    setStep('input');
    setError(null);
    setRisksBlocked(false);
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
  const canConfirm = loaded && amountUnits > 0n && amountUnits <= spendableUnits;

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
    queryClient.invalidateQueries({ queryKey: portfolioKeys.summary });
    queryClient.invalidateQueries({ queryKey: vaultKeys.all });
    if (walletAddress) queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) });
  }

  function celebrate() {
    setStep('success');
    playInvestirConfirmacao();
    setTimeout(playInvestirCoin, 350);
    setTimeout(playInvestirCoin, 800);
  }

  async function confirm() {
    if (!piggy || !canConfirm || running.current) return;
    running.current = true;
    const token = begin();
    clearError();
    setStep('preparing');
    try {
      const intent = await createDeposit.mutateAsync({
        vaultId: piggy.vault.id,
        amount: fromUnits(amountUnits),
        assetSymbol: piggy.vault.assetSymbol,
      });
      if (!intent.unsignedXdr) throw new Error('XDR não gerado');

      setStep('signing');
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
        celebrate();
      } else if (outcome === 'pending') {
        // Sem resposta no prazo: a tela avisa e segue verificando sozinha.
        setStep('pending');
        keepWatching(token, sources, (settled) => {
          refreshBalances();
          if (!isCurrent(token)) return;
          if (settled === 'confirmed') celebrate();
          else if (settled === 'failed') {
            setError(SAVE_FAILED_MESSAGE);
            setStep('input');
          }
        });
      } else {
        setError(SAVE_FAILED_MESSAGE);
        setStep('input');
      }
    } catch (e) {
      const kind = classifyOperationError(e);
      setRisksBlocked(kind === 'risks');
      setError(saveErrorMessage(kind, asset, isPro));
      setStep('input');
    } finally {
      running.current = false;
    }
  }

  const busy = step === 'preparing' || step === 'signing' || step === 'confirming';
  const reserveUnits = balanceUnits - spendableUnits;
  const showReserve = asset === 'XLM' && chip === 'all' && reserveUnits > 0n;

  let yieldNode: React.ReactNode = null;
  if (asset === 'XLM') {
    yieldNode =
      apy != null && apy >= 1 ? (
        <YieldHint value={displayShort(asset, symbol, yearlyGain(amount, apy).toFixed(7))} />
      ) : (
        <SheetCaption>A taxa é muito baixa hoje.</SheetCaption>
      );
  } else if (apy != null) {
    yieldNode = <YieldHint value={yieldValue(asset, amount, apy)} />;
  }

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title="Guardar no porquinho"
      icon="arrow-down"
      pill={piggy ? piggyPill(piggy, terms, accent.base) : undefined}
      closable={!busy}
    >
      {step === 'preparing' ? (
        <SheetProgress
          title={isPro ? 'Gerando transação...' : 'Preparando...'}
          caption={isPro ? 'Preparando depósito no vault' : 'Preparando seu depósito'}
        />
      ) : step === 'signing' ? (
        <SheetProgress title="Assine com sua biometria..." caption={SIGN_CAPTION} />
      ) : step === 'confirming' ? (
        <SheetProgress
          title={t('network.confirming')}
          caption={slow ? SLOW_CAPTION : 'Transação em menos de 1 segundo'}
        />
      ) : step === 'pending' ? (
        <View style={styles.body}>
          <SheetPending
            title={PENDING_TITLE}
            caption={pendingCaption('save')}
            checking={watch === 'checking'}
            note={watch === 'gaveUp' ? PENDING_GAVE_UP : undefined}
          />
          <Button3D label="Entendi" variant="glass" onPress={onClose} />
        </View>
      ) : step === 'success' ? (
        <SheetSuccess
          title="Valor guardado"
          caption={`${displayShort(asset, symbol, fromUnits(amountUnits))} já estão no seu porquinho.`}
          mascot="happy"
          action={{ label: 'Continuar', onPress: onClose }}
        />
      ) : noFunds ? (
        <View style={styles.body}>
          <SheetWarning message={noFundsMessage(asset, symbol, isPro)} />
          <Button3D label={isPro ? 'Fazer swap' : 'Trocar moedas'} onPress={onSwap} />
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
                ? `Reserva mínima da conta (${trimDecimal(fromUnits(reserveUnits))} XLM) descontada do máximo.`
                : `Deixamos ${trimDecimal(fromUnits(reserveUnits))} na carteira: é o mínimo que a rede exige para manter a sua conta. Você guarda ${trimDecimal(fromUnits(spendableUnits))} de ${trimDecimal(balance)}.`}
            </SheetNote>
          )}
          {yieldNode}
          {error && <SheetError message={error} />}
          {risksBlocked ? (
            <Button3D label={t('guardar.notice.risks.cta')} onPress={onRisks} />
          ) : (
            <Button3D label="Confirmar" onPress={confirm} disabled={!canConfirm} />
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
