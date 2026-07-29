import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { PressableScale } from './PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayReceiver } from '@/lib/queries/blindpay.queries';
import { useSubmitTrustlineXdr } from '@/lib/queries/etherfuse-ramp.queries';
import {
  useCreateOfframp,
  useOfframpOrder,
  useOfframpQuote,
  useRefreshOfframpDelegation,
  useSubmitOfframp,
  signBlindPayXdr,
} from '@/lib/queries/blindpay-ramp.queries';

const RAMP_ASSET_SYMBOL = process.env.EXPO_PUBLIC_RAMP_ASSET_SYMBOL || 'USDC';
const MICRO_UNITS_PER_TOKEN = 1_000_000;

interface BlindPayOfframpModalProps {
  visible: boolean;
  maxAmount?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step =
  | 'input'
  | 'quoting'
  | 'quote'
  | 'creating'
  | 'confirming'
  | 'submitting'
  | 'pending'
  | 'success'
  | 'error';

function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('cadastro') || s.includes('not found') || s.includes('404'))
    return 'Finalize seu cadastro Pix antes de sacar.';
  if (s.includes('insufficient') || s.includes('saldo') || s.includes('balance'))
    return 'Saldo insuficiente para este saque.';
  if (s.includes('expired') || s.includes('expirad'))
    return 'A confirmação expirou. Gere uma nova e tente de novo.';
  if (s.includes('network') || s.includes('timeout') || s.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível processar o saque. Tente novamente em instantes.';
}

export function BlindPayOfframpModal({
  visible,
  maxAmount,
  onClose,
  onSuccess,
}: BlindPayOfframpModalProps) {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const { data: receiver } = useBlindPayReceiver(contractId);
  const bankAccount = receiver?.bankAccounts?.find((a) => a.isDefault) ?? receiver?.bankAccounts?.[0];

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [unsignedDelegationXdr, setUnsignedDelegationXdr] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const getQuote = useOfframpQuote();
  const createOfframp = useCreateOfframp();
  const submitTrustline = useSubmitTrustlineXdr();
  const submitOfframp = useSubmitOfframp();
  const refreshDelegation = useRefreshOfframpDelegation();
  const { data: order } = useOfframpOrder(step === 'pending' ? orderId : null, contractId);

  useEffect(() => {
    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  function resetAndClose() {
    setStep('input');
    setAmount('');
    setErrorMsg('');
    setOrderId(null);
    setUnsignedDelegationXdr(null);
    getQuote.reset();
    onClose();
  }

  useEffect(() => {
    if (step !== 'pending' || !order) return;
    if (order.status === 'COMPLETED') {
      setStep('success');
      setTimeout(() => {
        resetAndClose();
        onSuccess?.();
      }, 2500);
    } else if (order.status === 'FAILED' || order.status === 'REFUNDED') {
      setErrorMsg('O saque não foi concluído. Tente novamente.');
      setStep('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, step]);

  async function handleGetQuote() {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) return;
    if (!bankAccount) {
      setErrorMsg('Finalize seu cadastro Pix antes de sacar.');
      setStep('error');
      return;
    }
    setErrorMsg('');
    setStep('quoting');
    try {
      await getQuote.mutateAsync({
        userId: contractId!,
        bankAccountId: bankAccount.id,
        amountUsdc: Math.round(value * MICRO_UNITS_PER_TOKEN),
      });
      setStep('quote');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('input');
    }
  }

  async function handleConfirmQuote() {
    if (!bankAccount || !walletAddress) return;
    const value = parseFloat(amount.replace(',', '.'));
    setErrorMsg('');
    setStep('creating');
    try {
      const result = await createOfframp.mutateAsync({
        userId: contractId!,
        bankAccountId: bankAccount.id,
        senderWalletAddress: walletAddress,
        amountUsdc: Math.round(value * MICRO_UNITS_PER_TOKEN),
      });
      setOrderId(result.id);

      if (result.trustlineXdr) {
        const signedTrustline = await signBlindPayXdr(result.trustlineXdr);
        await submitTrustline.mutateAsync({ signedXdr: signedTrustline, stellarAddress: walletAddress });
      }

      setUnsignedDelegationXdr(result.unsignedDelegationXdr);
      setStep('confirming');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('quote');
    }
  }

  async function handleConfirmWithdraw() {
    if (!orderId || !unsignedDelegationXdr) return;
    setErrorMsg('');
    setStep('submitting');
    try {
      const signedXdr = await signBlindPayXdr(unsignedDelegationXdr);
      await submitOfframp.mutateAsync({
        id: orderId,
        dto: { userId: contractId!, signedDelegationHash: signedXdr },
      });
      setStep('pending');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('confirming');
    }
  }

  async function handleRenewConfirmation() {
    if (!orderId) return;
    setErrorMsg('');
    try {
      const result = await refreshDelegation.mutateAsync({ id: orderId, userId: contractId! });
      setUnsignedDelegationXdr(result.unsignedDelegationXdr);
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
    }
  }

  const quote = getQuote.data;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={resetAndClose}>
      <Pressable
        style={styles.backdrop}
        onPress={step === 'input' || step === 'quote' ? resetAndClose : undefined}
      >
        <View style={{ paddingBottom: keyboardHeight }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={[styles.headerIcon, { backgroundColor: 'hsla(270, 80%, 60%, 0.15)' }]}>
                <Text style={[styles.headerIconText, { color: Accent.secondary }]}>↑</Text>
              </View>
              <Text style={styles.headerTitle}>Sacar via Pix</Text>
            </View>

            {(step === 'input' || step === 'quoting') && (
              <View style={styles.body}>
                <Text style={styles.label}>Valor em {RAMP_ASSET_SYMBOL}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0,00"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />

                {typeof maxAmount === 'number' && maxAmount > 0 && (
                  <Text style={styles.maxHint}>
                    Saldo disponível: {maxAmount.toFixed(2)} {RAMP_ASSET_SYMBOL}
                  </Text>
                )}

                {bankAccount && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Receber em</Text>
                    <Text style={styles.infoValue}>{bankAccount.pixKey ?? 'Chave Pix'}</Text>
                  </View>
                )}

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <PressableScale onPress={handleGetQuote} disabled={getQuote.isPending || !amount}>
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, (getQuote.isPending || !amount) && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {getQuote.isPending ? 'Consultando...' : 'Obter cotação'}
                    </Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            )}

            {step === 'quote' && quote && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Cotação</Text>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você envia</Text>
                    <Text style={styles.quoteValue}>
                      {(quote.sender_amount / MICRO_UNITS_PER_TOKEN).toFixed(2)} {RAMP_ASSET_SYMBOL}
                    </Text>
                  </View>
                  <View style={styles.quoteDivider} />
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você recebe</Text>
                    <Text style={[styles.quoteValue, { color: Accent.success }]}>
                      R$ {(quote.receiver_amount / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.expiryText}>Cotação válida por alguns minutos</Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <PressableScale onPress={handleConfirmQuote} disabled={createOfframp.isPending}>
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, createOfframp.isPending && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {createOfframp.isPending ? 'Preparando...' : 'Continuar'}
                    </Text>
                  </LinearGradient>
                </PressableScale>

                <PressableScale onPress={() => setStep('input')}>
                  <Text style={styles.backBtn}>Voltar</Text>
                </PressableScale>
              </View>
            )}

            {step === 'creating' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Preparando seu saque...</Text>
              </View>
            )}

            {step === 'confirming' && quote && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Confirmar saque</Text>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você recebe</Text>
                    <Text style={[styles.quoteValue, { color: Accent.success }]}>
                      R$ {(quote.receiver_amount / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <PressableScale onPress={handleConfirmWithdraw}>
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Confirmar saque</Text>
                  </LinearGradient>
                </PressableScale>

                <PressableScale onPress={handleRenewConfirmation} disabled={refreshDelegation.isPending}>
                  <Text style={styles.backBtn}>
                    {refreshDelegation.isPending ? 'Gerando nova confirmação...' : 'Demorou? Gerar nova confirmação'}
                  </Text>
                </PressableScale>
              </View>
            )}

            {step === 'submitting' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Confirme com sua biometria...</Text>
                <Text style={styles.statusSub}>Estamos processando seu saque</Text>
              </View>
            )}

            {step === 'pending' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Processando saque...</Text>
                <Text style={styles.statusSub}>
                  O valor será enviado para sua conta em até 2 dias úteis.
                </Text>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBody}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.statusTitle}>Saque confirmado! 🎉</Text>
                <Text style={styles.statusSub}>O valor está a caminho da sua conta</Text>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBody}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <PressableScale onPress={resetAndClose}>
                  <LinearGradient
                    colors={[Accent.secondary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>Fechar</Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            )}
          </Pressable>
        </View>
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
    gap: Spacing[3],
  },
  centerBody: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing[8],
  },
  label: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
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
  maxHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  infoValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  actionBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  quoteCard: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    gap: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
  },
  quoteValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  quoteDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  expiryText: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  backBtn: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.secondary,
    textAlign: 'center',
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
    lineHeight: 22,
  },
  errorText: {
    fontSize: FontSize.bodySmall,
    color: Accent.destructive,
    fontFamily: Font.regular,
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
