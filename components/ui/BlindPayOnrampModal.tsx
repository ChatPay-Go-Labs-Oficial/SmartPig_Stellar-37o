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
import * as Clipboard from 'expo-clipboard';
import { PressableScale } from './PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useBlindPayReceiver } from '@/lib/queries/blindpay.queries';
import { useCreateOnramp, useOnrampOrder, useOnrampQuote } from '@/lib/queries/blindpay-ramp.queries';

// Ver risco documentado no plano de implementação: o backend não retorna o
// símbolo do ativo em nenhuma resposta de ramp — vem de configuração do
// ambiente. USDB é o padrão em testnet (BlindPay não suporta USDC em dev).
const RAMP_ASSET_SYMBOL = process.env.EXPO_PUBLIC_RAMP_ASSET_SYMBOL || 'USDC';

interface BlindPayOnrampModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'input' | 'quoting' | 'quote' | 'creating' | 'pix' | 'success' | 'error';

function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('cadastro') || s.includes('not found') || s.includes('404'))
    return 'Finalize seu cadastro Pix antes de depositar.';
  if (s.includes('network') || s.includes('timeout') || s.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível processar o depósito. Tente novamente em instantes.';
}

export function BlindPayOnrampModal({ visible, onClose, onSuccess }: BlindPayOnrampModalProps) {
  const contractId = useAuthStore((s) => s.contractId);
  const { data: receiver } = useBlindPayReceiver(contractId);
  const blockchainWalletId = receiver?.blockchainWallets?.[0]?.id ?? null;

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const getQuote = useOnrampQuote();
  const createOnramp = useCreateOnramp();
  const { data: order } = useOnrampOrder(step === 'pix' ? orderId : null, contractId);

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
    setCopied(false);
    getQuote.reset();
    onClose();
  }

  useEffect(() => {
    if (step !== 'pix' || !order) return;
    if (order.status === 'COMPLETED') {
      setStep('success');
      setTimeout(() => {
        resetAndClose();
        onSuccess?.();
      }, 2500);
    } else if (order.status === 'FAILED' || order.status === 'REFUNDED') {
      setErrorMsg('O pagamento não foi concluído. Tente novamente.');
      setStep('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, step]);

  async function handleGetQuote() {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) return;
    if (!blockchainWalletId) {
      setErrorMsg('Finalize seu cadastro Pix antes de depositar.');
      setStep('error');
      return;
    }
    setErrorMsg('');
    setStep('quoting');
    try {
      await getQuote.mutateAsync({
        userId: contractId!,
        blockchainWalletId,
        amountBrl: Math.round(value * 100),
      });
      setStep('quote');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('input');
    }
  }

  async function handleConfirm() {
    if (!blockchainWalletId) return;
    const value = parseFloat(amount.replace(',', '.'));
    setErrorMsg('');
    setStep('creating');
    try {
      const result = await createOnramp.mutateAsync({
        userId: contractId!,
        blockchainWalletId,
        amountBrl: Math.round(value * 100),
      });
      setOrderId(result.id);
      setStep('pix');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('quote');
    }
  }

  async function handleCopyPixCode() {
    if (!order?.pixCode) return;
    await Clipboard.setStringAsync(order.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialIcons name="pix" size={18} color="#fff" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Depositar com Pix</Text>
              <Pressable onPress={resetAndClose} hitSlop={12} style={styles.closeBtn}>
                <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
              </Pressable>
            </View>

            {(step === 'input' || step === 'quoting') && (
              <View style={styles.body}>
                <Text style={styles.label}>Valor em reais</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0,00"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <PressableScale onPress={handleGetQuote} disabled={getQuote.isPending || !amount}>
                  <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, (getQuote.isPending || !amount) && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {getQuote.isPending ? 'Consultando...' : 'Continuar'}
                    </Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            )}

            {step === 'quote' && quote && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Resumo</Text>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você paga</Text>
                    <Text style={styles.quoteValue}>
                      R$ {(quote.sender_amount / 100).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.quoteDivider} />
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você recebe</Text>
                    <Text style={[styles.quoteValue, { color: Accent.success }]}>
                      {quote.receiver_amount.toFixed(2)} {RAMP_ASSET_SYMBOL}
                    </Text>
                  </View>
                </View>
                <Text style={styles.expiryText}>Cotação válida por alguns minutos</Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <PressableScale onPress={handleConfirm} disabled={createOnramp.isPending}>
                  <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionBtn, createOnramp.isPending && styles.btnDisabled]}
                  >
                    <Text style={styles.actionBtnText}>
                      {createOnramp.isPending ? 'Gerando Pix...' : 'Gerar código Pix'}
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
                <ActivityIndicator color={Accent.primary} size="large" />
                <Text style={styles.statusTitle}>Gerando seu código Pix...</Text>
              </View>
            )}

            {step === 'pix' && order && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Pague com Pix</Text>
                <View style={styles.pixCodeCard}>
                  <Text style={styles.pixCodeText} numberOfLines={3}>
                    {order.pixCode}
                  </Text>
                </View>
                <PressableScale onPress={handleCopyPixCode}>
                  <View style={[styles.copyBtn, copied && styles.copyBtnDone]}>
                    <MaterialIcons
                      name={copied ? 'check' : 'content-copy'}
                      size={16}
                      color={copied ? Accent.success : Accent.primary}
                    />
                    <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                      {copied ? 'Copiado!' : 'Copiar código Pix'}
                    </Text>
                  </View>
                </PressableScale>
                <View style={styles.waitingRow}>
                  <ActivityIndicator color={Accent.primary} size="small" />
                  <Text style={styles.waitingText}>
                    Aguardando pagamento — isso pode levar alguns minutos
                  </Text>
                </View>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBody}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.statusTitle}>Depósito confirmado! 🎉</Text>
                <Text style={styles.statusSub}>O valor já está na sua conta</Text>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBody}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <PressableScale onPress={resetAndClose}>
                  <LinearGradient
                    colors={Gradients.primary}
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
    gap: 12,
    marginBottom: Spacing[6],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: Accent.primary,
    textAlign: 'center',
  },
  pixCodeCard: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  pixCodeText: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.foreground,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(244,52,180,0.12)',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,52,180,0.25)',
  },
  copyBtnDone: {
    backgroundColor: 'rgba(72,207,120,0.12)',
    borderColor: 'rgba(72,207,120,0.25)',
  },
  copyText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.primary,
  },
  copyTextDone: {
    color: Accent.success,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: Spacing[2],
  },
  waitingText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    flexShrink: 1,
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
