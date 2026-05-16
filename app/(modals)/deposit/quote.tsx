import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { EtherfuseApi } from '@/lib/api/etherfuse.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

function formatAmount(val: string | number, decimals = 2): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.highlighted]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: FontSize.bodySmall, fontFamily: Font.regular, color: Colors.mutedForeground },
  value: { fontSize: FontSize.bodySmall, fontFamily: Font.bold, color: Colors.foreground },
  highlighted: { color: Accent.success, fontFamily: Font.black, fontSize: FontSize.body },
});

export default function DepositQuoteScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const userId = useAuthStore((s) => s.userId);

  const params = useLocalSearchParams<{
    quoteId: string;
    sourceAmount: string;
    destinationAmount: string;
    exchangeRate: string;
    expiresAt: string;
    bankAccountId: string;
    walletAddress: string;
    sourceAsset: string;
    targetAsset: string;
  }>();

  const expiresAt = params.expiresAt ? new Date(params.expiresAt).getTime() : Date.now() + 120_000;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
  );
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard against retrying T&C acceptance more than once.
  const termsRetriedRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const expired = secondsLeft === 0;
  const urgentColor = secondsLeft <= 30 ? Accent.destructive : Accent.success;

  async function handleConfirm() {
    if (expired || !userId) return;
    setLoading(true);
    setLoadingLabel('Criando pedido…');
    try {
      const order = await EtherfuseApi.createOnramp({
        userId,
        bankAccountId: params.bankAccountId,
        quoteId: params.quoteId,
        walletAddress: params.walletAddress,
        sourceAsset: params.sourceAsset,
        targetAsset: params.targetAsset,
        sourceAmount: params.sourceAmount,
        destinationAmount: params.destinationAmount,
      });
      router.replace({
        pathname: '/(modals)/deposit/payment',
        params: {
          orderId: order.id,
          etherfuseOrderId: order.etherfuseOrderId ?? '',
          sourceAmount: order.sourceAmount,
          destinationAmount: order.destinationAmount,
          depositInstructions: order.depositInstructions
            ? JSON.stringify(order.depositInstructions)
            : '',
        },
      });
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? e?.message ?? 'Erro ao criar pedido';
      const isTermsError = msg.toLowerCase().includes('terms') || msg.toLowerCase().includes('conditions');

      if (isTermsError && !termsRetriedRef.current) {
        // Silently accept Etherfuse agreements then retry once.
        termsRetriedRef.current = true;
        setLoadingLabel('Aceitando termos de uso…');
        try {
          const { presignedUrl } = await EtherfuseApi.getPresignedUrl(userId, params.walletAddress);
          await EtherfuseApi.acceptAgreements(userId, presignedUrl);
          setLoadingLabel('Criando pedido…');
          const order = await EtherfuseApi.createOnramp({
            userId,
            bankAccountId: params.bankAccountId,
            quoteId: params.quoteId,
            walletAddress: params.walletAddress,
            sourceAsset: params.sourceAsset,
            targetAsset: params.targetAsset,
            sourceAmount: params.sourceAmount,
            destinationAmount: params.destinationAmount,
          });
          router.replace({
            pathname: '/(modals)/deposit/payment',
            params: {
              orderId: order.id,
              etherfuseOrderId: order.etherfuseOrderId ?? '',
              sourceAmount: order.sourceAmount,
              destinationAmount: order.destinationAmount,
              depositInstructions: order.depositInstructions
                ? JSON.stringify(order.depositInstructions)
                : '',
            },
          });
          return;
        } catch (retryErr: any) {
          const retryMsg: string = retryErr?.response?.data?.message ?? retryErr?.message ?? 'Erro ao criar pedido';
          addToast(typeof retryMsg === 'string' ? retryMsg : 'Erro ao criar pedido', 'error');
          return;
        }
      }

      addToast(typeof msg === 'string' ? msg : 'Erro ao criar pedido', 'error');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <IconSymbol name="chevron.left" size={20} color={Colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Confirmação</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Countdown */}
      <View style={styles.countdownBlock}>
        <Text style={styles.countdownLabel}>COTAÇÃO EXPIRA EM</Text>
        <Text style={[styles.countdown, { color: urgentColor }]}>
          {expired ? 'Expirada' : formatCountdown(secondsLeft)}
        </Text>
        {expired && (
          <Text style={styles.expiredHint}>Volte e solicite uma nova cotação</Text>
        )}
      </View>

      {/* Quote details */}
      <Card style={styles.detailCard}>
        <Row label="Você envia" value={`R$ ${formatAmount(params.sourceAmount)}`} />
        <View style={styles.divider} />
        <Row
          label="Taxa de câmbio"
          value={`1 USDC ≈ R$ ${formatAmount(parseFloat(params.exchangeRate) > 0 ? 1 / parseFloat(params.exchangeRate) : 0)}`}
        />
        <View style={styles.divider} />
        <Row
          label="Você recebe"
          value={`${formatAmount(params.destinationAmount, 4)} USDC`}
          highlight
        />
      </Card>

      <View style={styles.notice}>
        <IconSymbol name="exclamationmark" size={13} color={Colors.mutedForeground} />
        <Text style={styles.noticeText}>
          Após confirmar, você receberá as instruções de pagamento via PIX.
          O USDC será creditado automaticamente após a confirmação do pagamento.
        </Text>
      </View>

      {loading && loadingLabel ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Accent.primary} />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <Button
        label="Cancelar"
        variant="secondary"
        size="lg"
        fullWidth
        onPress={() => router.back()}
        disabled={loading}
        style={{ marginTop: Spacing[4] }}
      />
      <Button
        label={expired ? 'Cotação expirada' : 'Confirmar pedido'}
        rightIcon={
          loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <IconSymbol name="checkmark" size={16} color="#fff" />
        }
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleConfirm}
        disabled={expired || loading}
        style={{ marginTop: Spacing[3] }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing[6],
    marginBottom: Spacing[6],
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },

  countdownBlock: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  countdownLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  countdown: {
    fontSize: FontSize.display,
    fontFamily: Font.black,
  },
  expiredHint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },

  detailCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  loadingText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
