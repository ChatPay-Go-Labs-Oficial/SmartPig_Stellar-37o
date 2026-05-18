import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { randomUUID } from 'expo-crypto';
import { Colors, Accent, Font, FontSize, Radius, Spacing, Glow } from '@/constants/theme';
import { useCreateWithdrawal, useSubmitWithdrawal } from '@/lib/queries/withdrawals.queries';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usePixStore } from '@/lib/stores/pix.store';
import { signTransaction } from '@/lib/wallet-kit';
import { router } from 'expo-router';

interface WithdrawModalProps {
  visible: boolean;
  vaultId: string;
  balance: string;
  onClose: () => void;
}

type Step = 'input' | 'nopix' | 'confirm' | 'processing' | 'signing' | 'submitting' | 'success';

export function WithdrawModal({ visible, vaultId, balance, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setError] = useState('');
  const { userId, walletAccountId } = useAuthStore();
  const pixKey = usePixStore((s) => s.pixKey);
  const createWithdrawal = useCreateWithdrawal();
  const submitWithdrawal = useSubmitWithdrawal();

  const parsedBalance = parseFloat(balance || '0');
  const parsedAmount = parseFloat(amount || '0');

  const maskedPix = pixKey
    ? pixKey.length > 6
      ? pixKey.slice(0, 3) + '***' + pixKey.slice(-3)
      : '***'
    : '';

  const handleContinue = () => {
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > parsedBalance) return;
    if (!pixKey) {
      setStep('nopix');
      return;
    }
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    if (!userId || !walletAccountId) return;
    setError('');
    setStep('processing');
    try {
      const idempotencyKey = randomUUID();
      const result = await createWithdrawal.mutateAsync({
        idempotencyKey,
        userId,
        walletAccountId,
        vaultId,
        shareAmount: String(parsedAmount),
      });

      if (!result.unsignedXdr) {
        setError('Falha ao gerar transação. Tente novamente.');
        setStep('input');
        return;
      }

      setStep('signing');
      const signedXdr = await signTransaction(result.unsignedXdr);

      setStep('submitting');
      await submitWithdrawal.mutateAsync({ withdrawalId: result.id, signedXdr });

      setStep('success');
      setTimeout(() => {
        setStep('input');
        setAmount('');
        onClose();
      }, 2500);
    } catch (e: any) {
      setError(e?.message || 'Erro ao processar saque');
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
            <Text style={styles.headerTitle}>Sacar via Stellar</Text>
          </View>

          {step === 'input' && (
            <View style={styles.body}>
              <Text style={styles.balanceHint}>
                Saldo disponível: <Text style={styles.balanceHighlight}>${parsedBalance.toFixed(2)}</Text>
              </Text>
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
              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              <View style={styles.withdrawActionRow}>
                <Pressable
                  onPress={() => setAmount(parsedBalance.toFixed(2))}
                  style={styles.sacarTudoBtn}
                >
                  <Text style={styles.sacarTudoText}>Sacar Tudo</Text>
                </Pressable>
                <Pressable
                  onPress={handleContinue}
                  disabled={!amount || parsedAmount <= 0 || parsedAmount > parsedBalance}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.continueBtn, (!amount || parsedAmount <= 0 || parsedAmount > parsedBalance) && styles.btnDisabled]}
                  >
                    <Text style={styles.continueBtnText}>Continuar</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {step === 'nopix' && (
            <View style={styles.centerBody}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.statusTitle}>Chave PIX não cadastrada</Text>
              <Text style={styles.statusSub}>Para sua segurança, cadastre sua chave PIX no Perfil antes de sacar.</Text>
              <Pressable onPress={() => { handleClose(); router.push('/(tabs)/profile'); }} style={{ alignSelf: 'stretch' }}>
                <LinearGradient
                  colors={[Accent.primary, Accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>Ir para o Perfil</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.body}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Valor</Text>
                  <Text style={styles.confirmValue}>${parsedAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Chave PIX</Text>
                  <Text style={styles.confirmValue}>{maskedPix}</Text>
                </View>
              </View>
              <Text style={styles.pixHint}>⚡ Processado via Stellar {'→'} PIX</Text>
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
                {step === 'signing' && 'Assine no seu Lobstr...'}
                {step === 'submitting' && 'Processando saque na Stellar...'}
              </Text>
              <Text style={styles.statusSub}>
                {step === 'processing' && 'Preparando saque do vault'}
                {step === 'signing' && 'Abra seu Lobstr e aprove a transação'}
                {step === 'submitting' && 'Convertendo e enviando'}
              </Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.centerBody}>
              <View style={[styles.checkCircle, Glow.green]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.statusTitle}>Saque Processado! ⚡</Text>
              <Text style={styles.statusSub}>${amount} via Stellar {'→'} PIX</Text>
              <Text style={styles.arrivalText}>Chegará em 1-2 dias úteis</Text>
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
  balanceHint: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  balanceHighlight: {
    fontFamily: Font.black,
    color: Colors.foreground,
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
  warningIcon: {
    fontSize: 40,
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
  arrivalText: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
});
