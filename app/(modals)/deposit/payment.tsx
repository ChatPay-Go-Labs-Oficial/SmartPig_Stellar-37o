import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { EtherfuseApi } from '@/lib/api/etherfuse.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const IS_SANDBOX = (process.env.EXPO_PUBLIC_API_URL ?? '').includes('localhost') ||
  (process.env.EXPO_PUBLIC_ETHERFUSE_SANDBOX === 'true');

function formatAmount(val: string | number, decimals = 2): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}>
        <IconSymbol name={icon as any} size={14} color={Accent.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 52, 180, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  label: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
});

export default function DepositPaymentScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const userId = useAuthStore((s) => s.userId);

  const params = useLocalSearchParams<{
    orderId: string;
    etherfuseOrderId: string;
    sourceAmount: string;
    destinationAmount: string;
  }>();

  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState(false);

  async function handleSimulate() {
    if (!userId) return;
    setSimulating(true);
    try {
      await EtherfuseApi.sandboxSimulatePayment(params.orderId, userId);
      setSimulated(true);
      addToast('Pagamento simulado! USDC será creditado em breve.', 'sucesso');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao simular pagamento';
      addToast(typeof msg === 'string' ? msg : 'Erro ao simular pagamento', 'error');
    } finally {
      setSimulating(false);
    }
  }

  return (
    <ScreenContainer scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 20 }} />
        <Text style={styles.title}>Pedido Criado</Text>
        <Pressable onPress={() => router.dismiss()} hitSlop={8}>
          <IconSymbol name="xmark" size={20} color={Colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Success icon */}
      <View style={styles.heroBlock}>
        <View style={styles.successIcon}>
          <IconSymbol name="checkmark.circle.fill" size={48} color={Accent.success} />
        </View>
        <Text style={styles.heroTitle}>Pedido confirmado!</Text>
        <Text style={styles.heroSub}>
          Assim que recebermos seu pagamento em BRL, enviaremos{' '}
          <Text style={styles.heroHighlight}>
            {formatAmount(params.destinationAmount, 4)} USDC
          </Text>{' '}
          para sua carteira Stellar.
        </Text>
      </View>

      {/* Order details */}
      <Card style={styles.detailCard}>
        <InfoRow
          icon="doc.text.fill"
          label="ID do Pedido"
          value={params.orderId}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="arrow.down"
          label="Valor a pagar"
          value={`R$ ${formatAmount(params.sourceAmount)}`}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="checkmark.circle.fill"
          label="Você receberá"
          value={`${formatAmount(params.destinationAmount, 4)} USDC`}
        />
      </Card>

      <View style={styles.notice}>
        <IconSymbol name="exclamationmark" size={13} color={Colors.mutedForeground} />
        <Text style={styles.noticeText}>
          As instruções de pagamento PIX foram enviadas ao nosso parceiro Etherfuse.
          O crédito ocorre automaticamente após confirmação da transferência.
        </Text>
      </View>

      {/* Sandbox simulate */}
      {IS_SANDBOX && (
        <Card style={styles.sandboxCard}>
          <Text style={styles.sandboxTitle}>Ambiente Sandbox</Text>
          <Text style={styles.sandboxSub}>
            Simule o recebimento do pagamento para testar o fluxo completo.
          </Text>
          <Button
            label={simulated ? 'Pagamento simulado!' : 'Simular pagamento PIX'}
            rightIcon={
              simulating
                ? <ActivityIndicator size="small" color="#fff" />
                : simulated
                ? <IconSymbol name="checkmark" size={16} color="#fff" />
                : <IconSymbol name="arrow.right" size={16} color="#fff" />
            }
            variant="primary"
            size="md"
            fullWidth
            onPress={handleSimulate}
            disabled={simulating || simulated}
          />
        </Card>
      )}

      <View style={styles.footer}>
        <Button
          label="Fechar"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.dismiss()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  heroBlock: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[4],
  },
  successIcon: {
    marginBottom: Spacing[2],
  },
  heroTitle: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: FontSize.body,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing[2],
  },
  heroHighlight: {
    fontFamily: Font.bold,
    color: Accent.success,
  },
  detailCard: {
    gap: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[1],
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  sandboxCard: {
    marginTop: Spacing[4],
    gap: Spacing[3],
    borderColor: Accent.accent,
    borderWidth: 1,
  },
  sandboxTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.accent,
    letterSpacing: 0.5,
  },
  sandboxSub: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing[4],
  },
});
