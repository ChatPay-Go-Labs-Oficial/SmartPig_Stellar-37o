import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { signTransaction, hasActiveSession } from '@/lib/wallet-kit';
import { useVault } from '@/lib/queries/vaults.queries';
import { apiClient } from '@/lib/api/client';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

type Step = 'amount' | 'confirm' | 'signing' | 'success';

function formatAmount(val: string | number, decimals = 4): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function genKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface WithdrawalIntent {
  id: string;
  unsignedXdr?: string;
  status: string;
}

async function createWithdrawalIntent(params: {
  idempotencyKey: string;
  userId: string;
  walletAccountId: string;
  vaultId: string;
  amount: string;
  assetSymbol: string;
}): Promise<WithdrawalIntent> {
  if (IS_MOCK) {
    return new Promise((res) =>
      setTimeout(
        () =>
          res({
            id: `mock-withdrawal-${Date.now()}`,
            unsignedXdr: 'AAAAAQAAA_MOCK_WITHDRAWAL_XDR_BASE64==',
            status: 'XDR_READY',
          }),
        800,
      ),
    );
  }
  const { data } = await apiClient.post<WithdrawalIntent>('/withdrawals', params);
  return data;
}

async function submitWithdrawalXdr(id: string, signedXdr: string): Promise<{ txHash: string }> {
  if (IS_MOCK) {
    return new Promise((res) =>
      setTimeout(
        () => res({ txHash: `mock_withdraw_tx_${Math.random().toString(36).substring(2, 18)}` }),
        800,
      ),
    );
  }
  const { data } = await apiClient.post<{ txHash: string }>(`/withdrawals/${id}/signed-xdr`, {
    signedXdr,
  });
  return data;
}

export default function VaultWithdrawScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const userId = useAuthStore((s) => s.userId);
  const walletAccountId = useWalletStore((s) => s.walletAccountId);
  const walletAddress = useWalletStore((s) => s.walletAddress);

  const { data: vault, isLoading: vaultLoading } = useVault(id);

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [signingLabel, setSigningLabel] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const canConfirm = !isNaN(parsedAmount) && parsedAmount > 0 && !!userId && !!walletAccountId;

  async function handleWithdraw() {
    if (!userId || !walletAccountId || !vault) return;
    setStep('signing');
    setError(null);

    try {
      setSigningLabel('Criando ordem de retirada…');
      const intent = await createWithdrawalIntent({
        idempotencyKey: genKey(),
        userId,
        walletAccountId,
        vaultId: id,
        amount: parsedAmount.toFixed(7),
        assetSymbol: vault.assetSymbol,
      });

      let signedXdr: string;
      if (IS_MOCK) {
        setSigningLabel('Assinando transação… (mock)');
        await new Promise((res) => setTimeout(res, 800));
        signedXdr = `MOCK_SIGNED_WITHDRAWAL_XDR_${Date.now()}`;
      } else {
        if (!hasActiveSession()) {
          throw new Error('Conecte sua carteira para assinar a transação.');
        }
        if (!intent.unsignedXdr) {
          throw new Error('Nenhum XDR retornado pelo backend.');
        }
        setSigningLabel('Aguardando aprovação no Lobstr…');
        signedXdr = await signTransaction(intent.unsignedXdr);
      }

      setSigningLabel('Enviando para a rede Stellar…');
      const result = await submitWithdrawalXdr(intent.id, signedXdr);
      setTxHash(result.txHash);
      setStep('success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao processar retirada';
      setError(typeof msg === 'string' ? msg : 'Erro ao processar retirada');
      addToast(typeof msg === 'string' ? msg : 'Erro ao processar retirada', 'error');
      setStep('confirm');
    }
  }

  if (vaultLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Accent.primary} size="large" />
      </View>
    );
  }

  if (!vault) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Vault não encontrado</Text>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Retirada</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.heroBlock}>
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={64} color={Accent.success} />
          </View>
          <Text style={styles.heroTitle}>Retirada confirmada!</Text>
          <Text style={styles.heroSub}>
            <Text style={styles.heroHighlight}>{formatAmount(parsedAmount)} {vault.assetSymbol}</Text>
            {' '}estão disponíveis na sua carteira Stellar.
          </Text>
        </View>

        {txHash ? (
          <Card style={styles.txCard}>
            <Text style={styles.txLabel}>Hash da transação</Text>
            <Text style={styles.txHash}>
              {txHash.length > 20 ? `${txHash.slice(0, 10)}…${txHash.slice(-10)}` : txHash}
            </Text>
            {IS_MOCK && <Text style={styles.mockBadge}>MODO MOCK</Text>}
          </Card>
        ) : null}

        <Card style={styles.offrampCard}>
          <View style={styles.offrampHeader}>
            <IconSymbol name="arrow.up.circle.fill" size={20} color={Accent.primary} />
            <Text style={styles.offrampTitle}>Quer converter para BRL?</Text>
          </View>
          <Text style={styles.offrampSub}>
            Use o botão "Sacar" no dashboard para converter seus USDC em BRL via PIX.
          </Text>
        </Card>

        <View style={styles.successActions}>
          <Button
            label="Ir para o Dashboard"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<IconSymbol name="house.fill" size={16} color="#fff" />}
            onPress={() => {
              router.dismiss();
              router.replace('/(tabs)');
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (step === 'signing') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Retirada</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.signingBlock}>
          <ActivityIndicator size="large" color={Accent.primary} />
          <Text style={styles.signingLabel}>{signingLabel}</Text>
          {!IS_MOCK && (
            <Text style={styles.signingHint}>
              Aprove a transação no Lobstr e retorne a este app.
            </Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  if (step === 'amount') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <IconSymbol name="xmark" size={20} color={Colors.mutedForeground} />
          </Pressable>
          <Text style={styles.title}>Retirar do Vault</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.vaultInfo}>
          <Text style={styles.vaultName}>{vault.name}</Text>
          {vault.apy ? (
            <Text style={styles.vaultApy}>APY {parseFloat(vault.apy).toFixed(2)}%</Text>
          ) : null}
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>VALOR EM {vault.assetSymbol}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.mutedForeground}
              returnKeyType="done"
            />
            <Text style={styles.assetTag}>{vault.assetSymbol}</Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
            <Text style={styles.infoText}>
              As cotas do vault serão convertidas de volta em{' '}
              <Text style={styles.infoHighlight}>{vault.assetSymbol}</Text>
            </Text>
          </View>
          {IS_MOCK && (
            <View style={styles.infoRow}>
              <IconSymbol name="exclamationmark" size={14} color={Accent.accent} />
              <Text style={[styles.infoText, { color: Accent.accent }]}>
                Modo mock — nenhuma transação real será enviada
              </Text>
            </View>
          )}
        </Card>

        <Button
          label="Continuar"
          rightIcon={<IconSymbol name="arrow.right" size={16} color="#fff" />}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => setStep('confirm')}
          disabled={!canConfirm}
          style={{ marginTop: Spacing[6] }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => setStep('amount')} hitSlop={8}>
          <IconSymbol name="arrow.left" size={20} color={Colors.mutedForeground} />
        </Pressable>
        <Text style={styles.title}>Confirmar</Text>
        <View style={{ width: 20 }} />
      </View>

      <Card style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Vault</Text>
          <Text style={styles.confirmValue}>{vault.name}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Valor a retirar</Text>
          <Text style={[styles.confirmValue, { color: Accent.destructive }]}>
            {formatAmount(parsedAmount)} {vault.assetSymbol}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Destino</Text>
          <Text style={styles.confirmValueSmall} numberOfLines={1} ellipsizeMode="middle">
            {walletAddress ?? '—'}
          </Text>
        </View>
      </Card>

      {error ? <Text style={styles.errorInline}>{error}</Text> : null}

      <View style={styles.confirmActions}>
        <Button
          label="Retirar agora"
          rightIcon={<IconSymbol name="arrow.up" size={16} color="#fff" />}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleWithdraw}
        />
        <Button
          label="Voltar"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => setStep('amount')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
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
  vaultInfo: { marginBottom: Spacing[4], gap: Spacing[1] },
  vaultName: {
    fontSize: FontSize.heading,
    fontFamily: Font.extraBold,
    color: Colors.foreground,
  },
  vaultApy: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Accent.success,
  },
  amountCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing[6],
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  amountLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
  },
  amountInput: {
    flex: 1,
    fontSize: FontSize.displaySm,
    fontFamily: Font.black,
    color: Colors.foreground,
    minWidth: 60,
  },
  assetTag: {
    fontSize: FontSize.subheading,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
  infoCard: { gap: Spacing[3], marginBottom: Spacing[4] },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  infoHighlight: {
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  signingBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[4],
    paddingHorizontal: Spacing[6],
  },
  signingLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    textAlign: 'center',
  },
  signingHint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  heroBlock: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[6],
  },
  successIcon: { marginBottom: Spacing[2] },
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
  txCard: { marginBottom: Spacing[3], gap: Spacing[1] },
  txLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  txHash: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  mockBadge: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Accent.accent,
    letterSpacing: 1,
  },
  offrampCard: {
    marginBottom: Spacing[4],
    gap: Spacing[2],
    borderColor: Accent.primary,
    borderWidth: 1,
  },
  offrampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  offrampTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Accent.primary,
  },
  offrampSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  successActions: { gap: Spacing[3], marginTop: Spacing[2] },
  confirmCard: { gap: Spacing[3], marginBottom: Spacing[4] },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing[3],
  },
  confirmLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  confirmValue: {
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
    flexShrink: 1,
    textAlign: 'right',
  },
  confirmValueSmall: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
    flexShrink: 1,
    maxWidth: 180,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: Colors.border },
  errorInline: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  confirmActions: { gap: Spacing[3], marginTop: Spacing[2] },
});
