import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { AssetIcon, Button3D, V2Icon, V2Sheet } from '@/components/v2';
import type { AssetLogoId } from '@/components/v2';
import type { WalletAssetBalance } from '@/lib/stellar/balances';
import { getWalletAssetDefs, type WalletAssetId } from '@/lib/stellar/assets';
import {
  createConversion,
  submitSignedConversion,
  type ConversionIntent,
} from '@/lib/api/conversions';
import { submitSignedTrustline } from '@/lib/api/trustlines';
import { signXdr } from '@/lib/stellar/kit';
import { walletKeys } from '@/lib/queries/wallets.queries';
import { truncateDecimalString } from '@/lib/utils/format';

type Step = 'input' | 'preparing' | 'review' | 'signing' | 'submitting' | 'success';

interface SwapSheetProps {
  visible: boolean;
  assets: WalletAssetBalance[];
  walletAddress: string | null;
  walletAccountId: string | null;
  onClose: () => void;
}

interface ApiErrorPayload {
  code?: string;
  message?: string | string[];
  details?: { assetSymbol?: string; unsignedXdr?: string };
}

function errorPayload(error: unknown): ApiErrorPayload | undefined {
  return (error as { response?: { data?: ApiErrorPayload } })?.response?.data;
}

function errorMessage(error: unknown): string {
  const payload = errorPayload(error);
  const raw = Array.isArray(payload?.message)
    ? payload.message.join('. ')
    : payload?.message ?? (error as Error)?.message ?? 'Não foi possível realizar a troca.';
  const normalized = raw.toLowerCase();
  if (payload?.code === 'NO_CONVERSION_ROUTE') return 'Não há uma rota disponível para essa troca agora.';
  if (payload?.code === 'SLIPPAGE_EXCEEDED' || normalized.includes('under_destmin')) {
    return 'A cotação mudou além do limite. Revise uma nova cotação.';
  }
  if (normalized.includes('insufficient') || normalized.includes('underfunded')) {
    return 'Saldo insuficiente para realizar a troca.';
  }
  return raw;
}

function normalizedAmount(value: string): string {
  return value.trim().replace(',', '.');
}

function isValidAmount(value: string): boolean {
  if (!/^\d+(?:[.,]\d{0,7})?$/.test(value.trim())) return false;
  return Number(normalizedAmount(value)) > 0;
}

export function SwapSheet({
  visible,
  assets,
  walletAddress,
  walletAccountId,
  onClose,
}: SwapSheetProps) {
  const accent = useAccent();
  const qc = useQueryClient();
  const supportedAssets = useMemo(
    () => getWalletAssetDefs().map((asset) => asset.id),
    [],
  );
  const firstFunded = assets.find((asset) => Number(asset.balance) > 0)?.id ?? 'USDC';
  const [from, setFrom] = useState<WalletAssetId>(firstFunded);
  const [to, setTo] = useState<WalletAssetId>(firstFunded === 'USDC' ? 'XLM' : 'USDC');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [intent, setIntent] = useState<ConversionIntent | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string | null>(null);
  const [error, setError] = useState('');
  const wasVisible = useRef(false);

  const sourceBalance = assets.find((asset) => asset.id === from)?.balance ?? '0.0000000';
  const amountNumber = Number(normalizedAmount(amount));
  const canReview =
    !!walletAccountId &&
    from !== to &&
    isValidAmount(amount) &&
    amountNumber <= Number(sourceBalance);
  const isBusy = step === 'preparing' || step === 'signing' || step === 'submitting';

  useEffect(() => {
    if (visible && !wasVisible.current) {
      const funded = assets.find((asset) => Number(asset.balance) > 0)?.id ?? 'USDC';
      setFrom(funded);
      setTo(funded === 'USDC' ? 'XLM' : 'USDC');
      setAmount('');
      setIntent(null);
      setReceivedAmount(null);
      setError('');
      setStep('input');
    }
    wasVisible.current = visible;
  }, [assets, visible]);

  function selectFrom(asset: WalletAssetId) {
    setFrom(asset);
    if (asset === to) {
      setTo(supportedAssets.find((candidate) => candidate !== asset) ?? 'USDC');
    }
    setIntent(null);
    setError('');
  }

  function selectTo(asset: WalletAssetId) {
    setTo(asset);
    setIntent(null);
    setError('');
  }

  async function prepareConversion(retryingTrustline = false): Promise<void> {
    if (!walletAccountId || !canReview) return;
    setError('');
    setStep('preparing');
    const idempotencyKey = randomUUID();

    try {
      const created = await createConversion({
        idempotencyKey,
        walletAccountId,
        from,
        to,
        amount: normalizedAmount(amount),
      });
      setIntent(created);
      setStep('review');
    } catch (requestError) {
      const payload = errorPayload(requestError);
      if (
        !retryingTrustline &&
        payload?.code === 'TRUSTLINE_REQUIRED' &&
        payload.details?.assetSymbol &&
        payload.details.unsignedXdr
      ) {
        try {
          setStep('signing');
          const signedTrustline = await signXdr(payload.details.unsignedXdr);
          setStep('submitting');
          await submitSignedTrustline({
            walletAccountId,
            assetSymbol: payload.details.assetSymbol,
            signedXdr: signedTrustline,
          });
          await prepareConversion(true);
          return;
        } catch (trustlineError) {
          setError(errorMessage(trustlineError));
          setStep('input');
          return;
        }
      }
      setError(errorMessage(requestError));
      setStep('input');
    }
  }

  async function confirmSwap() {
    if (!intent?.unsignedXdr) return;
    setError('');
    try {
      setStep('signing');
      const signedXdr = await signXdr(intent.unsignedXdr);
      setStep('submitting');
      const submitted = await submitSignedConversion(intent.id, signedXdr);
      setReceivedAmount(submitted.receivedAmount ?? intent.quotedDestAmount);
      if (walletAddress) {
        await qc.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) });
      }
      setStep('success');
    } catch (submitError) {
      setError(errorMessage(submitError));
      setIntent(null);
      setStep('input');
    }
  }

  function handleClose() {
    if (isBusy) return;
    onClose();
  }

  return (
    <V2Sheet visible={visible} onClose={handleClose} title="Trocar moedas" icon="refresh-cw">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'input' && (
          <>
            <AssetSelector
              label="Você envia"
              assets={assets.map((asset) => asset.id)}
              selected={from}
              onSelect={selectFrom}
            />

            <View style={styles.amountCard}>
              <View style={styles.amountHeader}>
                <Text style={styles.fieldLabel}>Valor</Text>
                <Pressable onPress={() => setAmount(sourceBalance)} hitSlop={8}>
                  <Text style={[styles.available, { color: accent.base }]}>Usar saldo</Text>
                </Pressable>
              </View>
              <View style={styles.amountRow}>
                <TextInput
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    setError('');
                  }}
                  placeholder="0,00"
                  placeholderTextColor={V2Colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                  cursorColor={accent.base}
                />
                <Text style={styles.amountSymbol}>{from}</Text>
              </View>
              <Text style={styles.balanceText}>
                Disponível: {truncateDecimalString(sourceBalance, 7)} {from}
              </Text>
            </View>

            <View style={styles.directionIcon}>
              <V2Icon name="arrow-down" size={18} color={accent.base} />
            </View>

            <AssetSelector
              label="Você recebe"
              assets={supportedAssets.filter((asset) => asset !== from)}
              selected={to}
              onSelect={selectTo}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button3D label="Revisar troca" onPress={() => prepareConversion()} disabled={!canReview} />
          </>
        )}

        {step === 'review' && intent && (
          <>
            <View style={styles.quoteCard}>
              <QuoteRow label="Você envia" value={`${intent.sendAmount} ${intent.sourceSymbol}`} />
              <QuoteRow
                label="Estimativa de recebimento"
                value={`${intent.quotedDestAmount} ${intent.targetSymbol}`}
              />
              <View style={styles.divider} />
              <QuoteRow
                label="Mínimo garantido"
                value={`${intent.destMin} ${intent.targetSymbol}`}
                highlighted
              />
              <QuoteRow
                label="Slippage máximo"
                value={`${(intent.slippageBps / 100).toFixed(2).replace('.', ',')}%`}
              />
            </View>
            <Text style={styles.hint}>
              Se a rede não entregar pelo menos o mínimo indicado, a troca falha inteira e o saldo permanece na carteira.
            </Text>
            <View style={styles.buttonStack}>
              <Button3D label="Confirmar troca" onPress={confirmSwap} />
              <Button3D label="Voltar" variant="glass" onPress={() => setStep('input')} />
            </View>
          </>
        )}

        {isBusy && (
          <View style={styles.processing}>
            <ActivityIndicator size="large" color={accent.base} />
            <Text style={styles.processingTitle}>
              {step === 'preparing'
                ? 'Buscando a melhor rota...'
                : step === 'signing'
                  ? 'Autorize na sua carteira'
                  : 'Confirmando na rede Stellar...'}
            </Text>
            <Text style={styles.hint}>Não feche esta tela durante a operação.</Text>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.success}>
            <View style={[styles.successIcon, { backgroundColor: accent.alpha(0.14) }]}>
              <V2Icon name="check" size={28} color={V2Colors.success} />
            </View>
            <Text style={styles.successTitle}>Troca concluída</Text>
            <Text style={styles.successText}>
              Você recebeu {truncateDecimalString(receivedAmount ?? '0', 7)} {to}.
            </Text>
            <Button3D label="Concluir" onPress={onClose} />
          </View>
        )}
      </ScrollView>
    </V2Sheet>
  );
}

function AssetSelector({
  label,
  assets,
  selected,
  onSelect,
}: {
  label: string;
  assets: WalletAssetId[];
  selected: WalletAssetId;
  onSelect: (asset: WalletAssetId) => void;
}) {
  const accent = useAccent();
  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.assetOptions}>
        {assets.map((asset) => {
          const active = asset === selected;
          return (
            <Pressable
              key={asset}
              onPress={() => onSelect(asset)}
              style={[
                styles.assetOption,
                active && { borderColor: accent.base, backgroundColor: accent.alpha(0.12) },
              ]}
            >
              <AssetIcon asset={asset as AssetLogoId} size={30} />
              <Text style={styles.assetOptionText}>{asset}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function QuoteRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <View style={styles.quoteRow}>
      <Text style={styles.quoteLabel}>{label}</Text>
      <Text style={[styles.quoteValue, highlighted && styles.quoteHighlighted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 620 },
  body: { gap: 16, paddingBottom: 4 },
  selectorBlock: { gap: 9 },
  fieldLabel: {
    fontFamily: V2Font.bold,
    fontSize: 12,
    color: V2Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assetOptions: { flexDirection: 'row', gap: 10 },
  assetOption: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: V2Radius.icon,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assetOptionText: { fontFamily: V2Font.extraBold, fontSize: 13, color: V2Colors.text },
  amountCard: {
    borderRadius: V2Radius.card,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
    padding: 16,
    gap: 8,
  },
  amountHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  available: { fontFamily: V2Font.bold, fontSize: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: {
    flex: 1,
    padding: 0,
    fontFamily: V2Font.black,
    fontSize: 31,
    color: V2Colors.text,
  },
  amountSymbol: { fontFamily: V2Font.extraBold, fontSize: 15, color: V2Colors.textSecondary },
  balanceText: { fontFamily: V2Font.medium, fontSize: 12, color: V2Colors.textTertiary },
  directionIcon: {
    alignSelf: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: V2Colors.chip,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    marginVertical: -6,
  },
  hint: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
  error: {
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: V2Colors.error,
  },
  quoteCard: {
    gap: 14,
    padding: 17,
    borderRadius: V2Radius.card,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quoteLabel: { flex: 1, fontFamily: V2Font.medium, fontSize: 13, color: V2Colors.textSecondary },
  quoteValue: { flexShrink: 1, fontFamily: V2Font.extraBold, fontSize: 13, color: V2Colors.text, textAlign: 'right' },
  quoteHighlighted: { color: V2Colors.success },
  divider: { height: 1, backgroundColor: V2Colors.divider },
  buttonStack: { gap: 10 },
  processing: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 14 },
  processingTitle: { fontFamily: V2Font.extraBold, fontSize: 17, color: V2Colors.text },
  success: { minHeight: 310, alignItems: 'center', justifyContent: 'center', gap: 14 },
  successIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: V2Font.black, fontSize: 22, color: V2Colors.text },
  successText: { fontFamily: V2Font.medium, fontSize: 14, color: V2Colors.textSecondary, textAlign: 'center' },
});
