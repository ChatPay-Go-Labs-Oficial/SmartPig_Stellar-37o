import { ScreenContainer } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Accent, Colors, Font, FontSize, Spacing } from '@/constants/theme';
import { DepositsApi } from '@/lib/api/deposits';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletStore } from '@/lib/stores/wallet.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { signTransaction, hasActiveSession } from '@/lib/wallet-kit';
import { useVault } from '@/lib/queries/vaults.queries';
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
function genKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

type Step = 'amount' | 'confirm' | 'signing' | 'success';

function formatAmount(val: string | number, decimals = 4): string {
  return parseFloat(String(val)).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-10)}`;
}

export default function VaultDepositScreen() {
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

  async function handleDeposit() {
    if (!userId || !walletAccountId || !vault) return;
    setStep('signing');
    setError(null);

    try {
      // Step 1: Create deposit intent (get unsigned XDR)
      setSigningLabel('Criando ordem de investimento…');
      const intent = await DepositsApi.createDeposit({
        idempotencyKey: genKey(),
        userId,
        walletAccountId,
        vaultId: id,
        amount: parsedAmount.toFixed(7),
        assetSymbol: vault.assetSymbol,
      });

      if (!intent.unsignedXdr) {
        throw new Error('Backend não retornou o XDR para assinatura.');
      }

      // Step 2: Sign the XDR (Lobstr in real mode, skip in mock)
      let signedXdr: string;
      if (IS_MOCK) {
        setSigningLabel('Assinando transação… (mock)');
        await new Promise((res) => setTimeout(res, 800));
        signedXdr = `MOCK_SIGNED_XDR_${Date.now()}`;
      } else {
        if (!hasActiveSession()) {
          throw new Error('Conecte sua carteira para assinar a transação.');
        }
        setSigningLabel('Aguardando aprovação no Lobstr…');
        signedXdr = await signTransaction(intent.unsignedXdr);
      }

      // Step 3: Submit signed XDR to backend
      setSigningLabel('Enviando para a rede Stellar…');
      const result = await DepositsApi.submitSignedXdr(intent.id, signedXdr);
      setTxHash(result.txHash);
      setStep('success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao processar investimento';
      setError(typeof msg === 'string' ? msg : 'Erro ao processar investimento');
      addToast(typeof msg === 'string' ? msg : 'Erro ao processar investimento', 'error');
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

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Investimento</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.heroBlock}>
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={64} color={Accent.success} />
          </View>
          <Text style={styles.heroTitle}>Investimento confirmado!</Text>
          <Text style={styles.heroSub}>
            Seus{' '}
            <Text style={styles.heroHighlight}>{formatAmount(parsedAmount)} {vault.assetSymbol}</Text>
            {' '}foram depositados no vault com sucesso.
          </Text>
        </View>

        {txHash ? (
          <Card style={styles.txCard}>
            <Text style={styles.txLabel}>Hash da transação</Text>
            <Text style={styles.txHash}>{truncateTxHash(txHash)}</Text>
            {IS_MOCK && (
              <Text style={styles.mockBadge}>MODO MOCK</Text>
            )}
          </Card>
        ) : null}

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
          <Button
            label="Ver meus Vaults"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => {
              router.dismiss();
              router.replace('/(tabs)/vaults' as any);
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ── Signing (loading) ─────────────────────────────────────────────────────
  if (step === 'signing') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ width: 20 }} />
          <Text style={styles.title}>Investimento</Text>
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

  // ── Amount input ──────────────────────────────────────────────────────────
  if (step === 'amount') {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <IconSymbol name="xmark" size={20} color={Colors.mutedForeground} />
          </Pressable>
          <Text style={styles.title}>Depositar no Vault</Text>
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
              Seus {vault.assetSymbol} serão convertidos em{' '}
              <Text style={styles.infoHighlight}>cotas do vault</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="arrow.right" size={14} color={Accent.primary} />
            <Text style={styles.infoText}>
              A transação será assinada pela sua carteira{' '}
              <Text style={styles.infoHighlight}>Lobstr</Text>
            </Text>
          </View>
          {IS_MOCK && (
            <View style={styles.infoRow}>
              <IconSymbol name="exclamationmark" size={14} color={Accent.accent} />
              <Text style={[styles.infoText, { color: Accent.accent }]}>
                Modo mock ativo — nenhuma transação real será enviada
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

  // ── Confirm ───────────────────────────────────────────────────────────────
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
          <Text style={styles.confirmLabel}>Valor</Text>
          <Text style={[styles.confirmValue, { color: Accent.success }]}>
            {formatAmount(parsedAmount)} {vault.assetSymbol}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Carteira</Text>
          <Text style={styles.confirmValueSmall} numberOfLines={1} ellipsizeMode="middle">
            {walletAddress ?? '—'}
          </Text>
        </View>
        {vault.apy ? (
          <>
            <View style={styles.divider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>APY estimado</Text>
              <Text style={[styles.confirmValue, { color: Accent.primary }]}>
                {parseFloat(vault.apy).toFixed(2)}%
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      {error ? (
        <Text style={styles.errorInline}>{error}</Text>
      ) : null}

      <View style={styles.confirmActions}>
        <Button
          label="Investir agora"
          rightIcon={<IconSymbol name="arrow.right" size={16} color="#fff" />}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleDeposit}
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

  // Amount step
  vaultInfo: {
    marginBottom: Spacing[4],
    gap: Spacing[1],
  },
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
  infoCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
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

  // Signing step
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

  // Success step
  heroBlock: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[6],
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
  txCard: {
    marginBottom: Spacing[4],
    gap: Spacing[1],
  },
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
  successActions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },

  // Confirm step
  confirmCard: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  errorInline: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Accent.destructive,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  confirmActions: {
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
});
