import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { EtherfuseBankAccount } from '@/lib/api/etherfuse';
import {
  useEtherfuseQuote,
  useCreateOnramp,
  useEtherfuseOrder,
  useSandboxSimulatePayment,
  useEtherfuseBankAccounts,
  useEtherfuseAssets,
} from '@/lib/queries/etherfuse-ramp.queries';

interface EtherfuseOnrampModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step =
  | 'input'
  | 'quoting'
  | 'quote'
  | 'creating'
  | 'instructions'
  | 'pending'
  | 'success'
  | 'error';

export function EtherfuseOnrampModal({ visible, onClose, onSuccess }: EtherfuseOnrampModalProps) {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  const getQuote = useEtherfuseQuote();
  const createOnramp = useCreateOnramp();
  const sandboxPay = useSandboxSimulatePayment();
  const { data: bankAccounts } = useEtherfuseBankAccounts(contractId);
  const { data: assets } = useEtherfuseAssets('brl', walletAddress);
  const { data: orderData } = useEtherfuseOrder(orderId);

  const firstBankId = bankAccounts?.[0]?.id;

  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  useEffect(() => {
    if (orderData && step === 'pending') {
      if (orderData.status === 'COMPLETED') {
        setStep('success');
        setTimeout(() => {
          resetAndClose();
          onSuccess?.();
        }, 2500);
      } else if (orderData.status === 'FAILED' || orderData.status === 'REFUNDED') {
        setError('Ordem falhou. Tente novamente.');
        setStep('error');
      }
    }
  }, [orderData]);

  const selectedAccount = bankAccounts?.find((a: EtherfuseBankAccount) => a.isCompliant) ?? bankAccounts?.[0];
  const usdcAsset = assets?.find(
    (a) => a.symbol === 'USDC' && a.identifier.includes(':'),
  );
  const usdcIdentifier = usdcAsset?.identifier ?? 'USDC';

  async function handleGetQuote() {
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    if (!usdcAsset) {
      setError('Ativo USDC não encontrado');
      return;
    }
    setError('');
    setStep('quoting');
    try {
      await getQuote.mutateAsync({
        userId: contractId!,
        direction: 'onramp',
        sourceAsset: 'BRL',
        targetAsset: usdcIdentifier,
        sourceAmount: String(value),
        walletAddress: walletAddress!,
      });
      setStep('quote');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao obter cotação');
      setStep('input');
    }
  }

  async function handleConfirmQuote() {
    if (!getQuote.data) return;
    setError('');
    setStep('creating');
    try {
      const result = await createOnramp.mutateAsync({
        userId: contractId!,
        bankAccountId: selectedAccount!.id,
        quoteId: getQuote.data.quoteId,
        walletAddress: walletAddress!,
        sourceAsset: 'BRL',
        targetAsset: usdcIdentifier,
        sourceAmount: getQuote.data.sourceAmount,
        destinationAmount: getQuote.data.destinationAmount,
      });
      setOrderId(result.id);
      setStep('instructions');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao criar ordem');
      setStep('quote');
    }
  }

  async function handleSimulatePayment() {
    if (!orderId) return;
    try {
      await sandboxPay.mutateAsync({ id: orderId, userId: contractId! });
      Alert.alert('Pagamento simulado', 'Ordem avança para COMPLETED em alguns segundos.');
      setStep('pending');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Erro ao simular pagamento');
    }
  }

  function handleDoneTransfer() {
    if (isTestEnv) {
      Alert.alert(
        'Ambiente de teste',
        'Deseja simular o recebimento do pagamento para testar o fluxo?',
        [
          { text: 'Apenas aguardar', onPress: () => setStep('pending'), style: 'cancel' },
          { text: 'Simular pagamento', onPress: handleSimulatePayment },
        ],
      );
    } else {
      setStep('pending');
    }
  }

  function resetAndClose() {
    setStep('input');
    setAmount('');
    setError('');
    setOrderId(null);
    getQuote.reset();
    onClose();
  }

  const isTestEnv =
    typeof process !== 'undefined' &&
    (process.env?.EXPO_PUBLIC_API_URL?.includes('sand') ||
     process.env?.EXPO_PUBLIC_API_URL?.includes('dev'));

  const quote = getQuote.data;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={resetAndClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={step === 'input' || step === 'quote' ? resetAndClose : undefined}
      >
        <View style={{ paddingBottom: keyboardHeight }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={[styles.headerIcon, { backgroundColor: 'hsla(320, 90%, 58%, 0.15)' }]}>
                <Text style={[styles.headerIconText, { color: Accent.primary }]}>↓</Text>
              </View>
              <Text style={styles.headerTitle}>Depositar via PIX</Text>
            </View>

            {(step === 'input' || step === 'quoting') && (
              <View style={styles.body}>
                <Text style={styles.label}>Valor em BRL</Text>
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

                {selectedAccount && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Conta destino</Text>
                    <Text style={styles.infoValue}>
                      {selectedAccount.rail === 'pix'
                        ? selectedAccount.pixKey ?? 'Chave PIX'
                        : `CLABE: ${selectedAccount.clabe ?? ''}`}
                    </Text>
                  </View>
                )}

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionBtn, (getQuote.isPending || !amount) && styles.btnDisabled]}
                >
                  <Pressable
                    onPress={handleGetQuote}
                    disabled={getQuote.isPending || !amount || parseFloat(amount) <= 0}
                  >
                    <Text style={styles.actionBtnText}>
                      {getQuote.isPending ? 'Consultando...' : 'Obter cotação'}
                    </Text>
                  </Pressable>
                </LinearGradient>
              </View>
            )}

            {step === 'quote' && quote && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Cotação</Text>

                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você envia</Text>
                    <Text style={styles.quoteValue}>
                      R$ {parseFloat(quote.sourceAmount).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.quoteDivider} />
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você recebe</Text>
                    <Text style={[styles.quoteValue, { color: Accent.success }]}>
                      ${parseFloat(quote.destinationAmount).toFixed(2)} USDC
                    </Text>
                  </View>
                  <View style={styles.quoteDivider} />
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Taxa de câmbio</Text>
                    <Text style={styles.quoteValue}>
                      R$ {parseFloat(quote.exchangeRate).toFixed(4)}
                    </Text>
                  </View>
                  {quote.feeAmount && (
                    <View style={styles.quoteRow}>
                      <Text style={styles.quoteLabel}>Taxa</Text>
                      <Text style={styles.quoteValue}>R$ {parseFloat(quote.feeAmount).toFixed(2)}</Text>
                    </View>
                  )}
                  {quote.destinationAmountAfterFee && (
                    <View style={styles.quoteRow}>
                      <Text style={styles.quoteLabel}>Líquido</Text>
                      <Text style={[styles.quoteValue, { color: Accent.success }]}>
                        ${parseFloat(quote.destinationAmountAfterFee).toFixed(2)} USDC
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.expiryText}>
                  Cotação expira em 2 minutos
                </Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionBtn, createOnramp.isPending && styles.btnDisabled]}
                >
                  <Pressable
                    onPress={handleConfirmQuote}
                    disabled={createOnramp.isPending}
                  >
                    <Text style={styles.actionBtnText}>
                      {createOnramp.isPending ? 'Criando ordem...' : 'Confirmar depósito'}
                    </Text>
                  </Pressable>
                </LinearGradient>

                <Pressable onPress={() => setStep('input')}>
                  <Text style={styles.backBtn}>Voltar</Text>
                </Pressable>
              </View>
            )}

            {step === 'creating' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.primary} size="large" />
                <Text style={styles.statusTitle}>Criando ordem...</Text>
              </View>
            )}

            {step === 'instructions' && (
              <View style={styles.body}>
                <Text style={styles.sectionTitle}>Instruções de Pagamento</Text>
                <Text style={styles.instructionsText}>
                  Faça um PIX no valor de{' '}
                  <Text style={styles.instructionsHighlight}>
                    R$ {getQuote.data ? parseFloat(getQuote.data.sourceAmount).toFixed(2) : ''}
                  </Text>{' '}
                  para a chave abaixo:
                </Text>

                <View style={styles.pixCard}>
                  <Text style={styles.pixLabel}>Chave PIX</Text>
                  <Text style={styles.pixValue} selectable>
                    {orderData?.etherfuseOrderId ?? 'Aguardando chave PIX...'}
                  </Text>
                </View>

                <Text style={styles.instructionsHint}>
                  Após fazer o PIX, clique em "Já transferi" para acompanhar o status.
                </Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtn}
                >
                  <Pressable onPress={handleDoneTransfer}>
                    <Text style={styles.actionBtnText}>Já transferi</Text>
                  </Pressable>
                </LinearGradient>

                {isTestEnv && (
                  <View style={[styles.actionBtn, styles.sandboxBtn]}>
                    <Pressable onPress={handleSimulatePayment}>
                      <Text style={styles.actionBtnText}>
                        [Teste] Simular pagamento
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {step === 'pending' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.primary} size="large" />
                <Text style={styles.statusTitle}>Aguardando pagamento...</Text>
                <Text style={styles.statusSub}>
                  Assim que o PIX for confirmado, seus USDC serão depositados automaticamente.
                </Text>

                {isTestEnv && (
                  <View style={[styles.actionBtn, styles.sandboxBtn, { marginTop: Spacing[4] }]}>
                    <Pressable onPress={handleSimulatePayment}>
                      <Text style={styles.actionBtnText}>
                        [Teste] Simular pagamento
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBody}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.statusTitle}>Depósito confirmado! 🎉</Text>
                <Text style={styles.statusSub}>
                  USDC depositados na sua carteira Stellar
                </Text>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBody}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <LinearGradient
                  colors={Gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtn}
                >
                  <Pressable onPress={resetAndClose}>
                    <Text style={styles.actionBtnText}>Fechar</Text>
                  </Pressable>
                </LinearGradient>
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
  btnDisabled: {
    opacity: 0.5,
  },
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
  instructionsText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 22,
  },
  instructionsHighlight: {
    fontFamily: Font.bold,
    color: Accent.accent,
    fontSize: FontSize.body,
  },
  pixCard: {
    backgroundColor: Colors.muted,
    borderRadius: Radius.md,
    padding: Spacing[4],
    alignItems: 'center',
    gap: 4,
  },
  pixLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pixValue: {
    fontSize: FontSize.bodySmall,
    fontFamily: 'monospace',
    color: Colors.foreground,
    textAlign: 'center',
  },
  instructionsHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  sandboxBtn: {
    backgroundColor: Accent.accent,
    marginTop: Spacing[2],
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
