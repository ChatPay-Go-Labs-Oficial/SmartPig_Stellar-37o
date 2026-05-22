import { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Accent, Font, FontSize, Radius, Spacing, Glow } from '@/constants/theme';
import { useCreateWithdrawal, useSubmitWithdrawal } from '@/lib/queries/withdrawals.queries';
import { vaultKeys } from '@/lib/queries/vaults.queries';
import { signXdr } from '@/lib/stellar/kit';
import { useAuthStore } from '@/lib/stores/auth.store';

interface WithdrawModalProps {
  visible: boolean;
  vaultId: string;
  dfTokens: string;
  underlyingBalance: string;
  assetSymbol: string;
  onClose: () => void;
}

type Step = 'input' | 'confirm' | 'processing' | 'signing' | 'submitting' | 'success';

export function WithdrawModal({
  visible, vaultId, dfTokens, underlyingBalance, assetSymbol, onClose,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setError] = useState('');
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const createWithdrawal = useCreateWithdrawal();
  const submitWithdrawal = useSubmitWithdrawal();
  const qc = useQueryClient();

  const parsedUnderlying = parseFloat(underlyingBalance || '0');
  const parsedDfTokens = parseFloat(dfTokens || '0');
  const parsedAmount = parseFloat(amount || '0');

  const shareAmount = useMemo(() => {
    if (!parsedAmount || parsedUnderlying <= 0) return 0;
    return Math.floor((parsedAmount / parsedUnderlying) * parsedDfTokens);
  }, [parsedAmount, parsedUnderlying, parsedDfTokens]);

  const handleContinue = () => {
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > parsedUnderlying) return;
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    if (shareAmount <= 0) return;
    setError('');
    setStep('processing');
    try {
      const result = await createWithdrawal.mutateAsync({
        vaultId,
        shares: shareAmount,
      });

      if (!result.unsignedXdr) throw new Error('XDR não gerado');

      setStep('signing');
      const signedXdr = await signXdr(result.unsignedXdr);

      setStep('submitting');
      await submitWithdrawal.mutateAsync({ withdrawalId: result.id, signedXdr });

      setStep('success');
      qc.invalidateQueries({ queryKey: vaultKeys.all });
      if (walletAddress) {
        qc.invalidateQueries({ queryKey: vaultKeys.balance(vaultId, walletAddress) });
      }
      setTimeout(() => {
        setStep('input');
        setAmount('');
        onClose();
      }, 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao processar saque');
      setStep('input');
    }
  };

  const handleClose = () => {
    if (step !== 'processing' && step !== 'signing' && step !== 'submitting') {
      onClose();
      setStep('input');
      setAmount('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: 'hsla(270, 80%, 60%, 0.15)' }]}>
              <Text style={[styles.headerIconText, { color: Accent.secondary }]}>↑</Text>
            </View>
            <Text style={styles.headerTitle}>Sacar do Vault</Text>
          </View>

          {step === 'input' && (
            <View style={styles.body}>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceCardLabel}>Saldo no vault</Text>
                <Text style={styles.balanceCardValue}>
                  {parsedUnderlying.toFixed(2)} {assetSymbol}
                </Text>
                <Text style={styles.balanceCardShares}>
                  {parsedDfTokens} dfTokens
                </Text>
              </View>

              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
                cursorColor="transparent"
              />

              {parsedAmount > 0 && parsedAmount <= parsedUnderlying && (
                <Text style={styles.conversionHint}>
                  ≈ {shareAmount} dfTokens serão resgatados
                </Text>
              )}

              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <View style={styles.withdrawActionRow}>
                <Pressable
                  onPress={() => setAmount(parsedUnderlying.toFixed(2))}
                  style={styles.sacarTudoBtn}
                >
                  <Text style={styles.sacarTudoText}>Sacar Tudo</Text>
                </Pressable>
                <Pressable
                  onPress={handleContinue}
                  disabled={!parsedAmount || parsedAmount <= 0 || parsedAmount > parsedUnderlying}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.continueBtn, (!parsedAmount || parsedAmount <= 0 || parsedAmount > parsedUnderlying) && styles.btnDisabled]}
                  >
                    <Text style={styles.continueBtnText}>Continuar</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.body}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Valor</Text>
                  <Text style={styles.confirmValue}>{parsedAmount.toFixed(2)} {assetSymbol}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>dfTokens</Text>
                  <Text style={styles.confirmValue}>{shareAmount}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Destino</Text>
                  <Text style={styles.confirmValue}>Sua carteira Stellar</Text>
                </View>
              </View>
              <Text style={styles.pixHint}>
                ⚡ Os {assetSymbol} voltam direto pra sua wallet
              </Text>
              <Pressable onPress={handleWithdraw} style={{ alignSelf: 'stretch' }}>
                <LinearGradient
                  colors={[Accent.secondary, Accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>Confirmar Saque</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {(step === 'processing' || step === 'signing' || step === 'submitting') && (
            <View style={styles.centerBody}>
              <ActivityIndicator color={Accent.secondary} size="large" />
              <Text style={styles.statusTitle}>
                {step === 'processing' && 'Gerando transação...'}
                {step === 'signing' && 'Assine com biometria...'}
                {step === 'submitting' && 'Processando na Stellar...'}
              </Text>
              <Text style={styles.statusSub}>
                {step === 'processing' && 'Preparando saque do vault'}
                {step === 'signing' && 'Use Face ID / Touch ID para autorizar'}
                {step === 'submitting' && 'Enviando para sua carteira ⚡'}
              </Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.centerBody}>
              <View style={[styles.checkCircle, Glow.green]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.statusTitle}>Saque Confirmado! ⚡</Text>
              <Text style={styles.statusSub}>
                {parsedAmount.toFixed(2)} {assetSymbol} enviados para sua carteira
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.muted,
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing[6],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Font.black,
  },
  headerTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  body: {
    gap: Spacing[4],
  },
  balanceCard: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    alignItems: 'center',
    gap: 2,
  },
  balanceCardLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceCardValue: {
    fontSize: FontSize.heading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  balanceCardShares: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  amountInput: {
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.foreground,
    fontFamily: Font.black,
    fontSize: 28,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  conversionHint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  withdrawActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sacarTudoBtn: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Accent.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sacarTudoText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.secondary,
  },
  continueBtn: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.black,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  confirmBtn: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.black,
  },
  confirmCard: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  confirmValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  pixHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
    textAlign: 'center',
  },
  centerBody: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing[8],
  },
  statusTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Accent.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 32,
    color: '#fff',
    fontFamily: Font.black,
  },
});
