import { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { EtherfuseBankAccount } from '@/lib/api/etherfuse';
import {
  useEtherfuseQuote,
  useCreateOfframp,
  useSubmitOfframp,
  useEtherfuseOrder,
  useRefreshOfframpXdr,
  useEtherfuseBankAccounts,
  useEtherfuseAssets,
  signOfframpBurnXdr,
} from '@/lib/queries/etherfuse-ramp.queries';

interface EtherfuseOfframpModalProps {
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
  | 'wait-xdr'
  | 'signing'
  | 'submitting'
  | 'pending'
  | 'success'
  | 'error';

export function EtherfuseOfframpModal({
  visible,
  maxAmount,
  onClose,
  onSuccess,
}: EtherfuseOfframpModalProps) {
  const contractId = useAuthStore((s) => s.contractId);
  const walletAddress = useAuthStore((s) => s.walletAddress);

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const getQuote = useEtherfuseQuote();
  const createOfframp = useCreateOfframp();
  const submitOfframp = useSubmitOfframp();
  const refreshXdr = useRefreshOfframpXdr();
  const { data: orderData } = useEtherfuseOrder(orderId);
  const { data: bankAccounts } = useEtherfuseBankAccounts(contractId);
  const { data: assets } = useEtherfuseAssets('brl', walletAddress);

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
        direction: 'offramp',
        sourceAsset: usdcIdentifier,
        targetAsset: 'BRL',
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
    if (!getQuote.data || !selectedAccount) return;
    setError('');
    setStep('creating');
    try {
      const result = await createOfframp.mutateAsync({
        userId: contractId!,
        bankAccountId: selectedAccount.id,
        quoteId: getQuote.data.quoteId,
        walletAddress: walletAddress!,
        sourceAsset: usdcIdentifier,
        targetAsset: 'BRL',
        sourceAmount: getQuote.data.sourceAmount,
        destinationAmount: getQuote.data.destinationAmount,
      });
      setOrderId(result.id);

      if (result.unsignedBurnXdr) {
        await signAndSubmit(result.id, result.unsignedBurnXdr);
      } else {
        setStep('wait-xdr');
        pollForXdr(result.id, 0);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao criar ordem');
      setStep('quote');
    }
  }

  async function pollForXdr(orderInternalId: string, attempt: number) {
    const MAX_ATTEMPTS = 12;
    if (attempt >= MAX_ATTEMPTS) {
      setError('XDR não ficou disponível. Tente novamente.');
      setStep('quote');
      return;
    }
    try {
      const refreshed = await refreshXdr.mutateAsync({
        id: orderInternalId,
        userId: contractId!,
      });
      if (refreshed.unsignedBurnXdr) {
        await signAndSubmit(orderInternalId, refreshed.unsignedBurnXdr);
        return;
      }
    } catch {
      // Ainda não disponível, continua tentando
    }
    setPollCount(attempt + 1);
    setTimeout(() => pollForXdr(orderInternalId, attempt + 1), 3000);
  }

  async function signAndSubmit(orderInternalId: string, unsignedBurnXdr: string) {
    setStep('signing');
    try {
      const signedXdr = await signOfframpBurnXdr(unsignedBurnXdr);

      setStep('submitting');
      await submitOfframp.mutateAsync({
        id: orderInternalId,
        dto: { signedBurnXdr: signedXdr, userId: contractId! },
      });

      setStep('pending');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao assinar/enviar');
      setStep('quote');
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

  const maxVal = maxAmount ?? 0;
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
              <View style={[styles.headerIcon, { backgroundColor: 'hsla(270, 80%, 60%, 0.15)' }]}>
                <Text style={[styles.headerIconText, { color: Accent.secondary }]}>↑</Text>
              </View>
              <Text style={styles.headerTitle}>Sacar via PIX</Text>
            </View>

            {(step === 'input' || step === 'quoting') && (
              <View style={styles.body}>
                <Text style={styles.label}>Valor em USDC</Text>
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

                {maxVal > 0 && (
                  <Text style={styles.maxHint}>
                    Saldo disponível: ${maxVal.toFixed(2)} USDC
                  </Text>
                )}

                {selectedAccount && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Receber em</Text>
                    <Text style={styles.infoValue}>
                      {selectedAccount.rail === 'pix'
                        ? selectedAccount.pixKey ?? 'Chave PIX'
                        : `CLABE: ${selectedAccount.clabe ?? ''}`}
                    </Text>
                  </View>
                )}

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <LinearGradient
                  colors={[Accent.secondary, Accent.secondary]}
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
                      ${parseFloat(quote.sourceAmount).toFixed(2)} USDC
                    </Text>
                  </View>
                  <View style={styles.quoteDivider} />
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você recebe</Text>
                    <Text style={[styles.quoteValue, { color: Accent.success }]}>
                      R$ {parseFloat(quote.destinationAmount).toFixed(2)}
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
                      <Text style={styles.quoteValue}>
                        ${parseFloat(quote.feeAmount).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.expiryText}>
                  Cotação expira em 2 minutos
                </Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <LinearGradient
                  colors={[Accent.secondary, Accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionBtn, createOfframp.isPending && styles.btnDisabled]}
                >
                  <Pressable
                    onPress={handleConfirmQuote}
                    disabled={createOfframp.isPending}
                  >
                    <Text style={styles.actionBtnText}>
                      {createOfframp.isPending
                        ? 'Criando ordem...'
                        : 'Confirmar saque'}
                    </Text>
                  </Pressable>
                </LinearGradient>

                <Pressable onPress={() => setStep('input')}>
                  <Text style={styles.backBtn}>Voltar</Text>
                </Pressable>
              </View>
            )}

            {(step === 'creating' ||
              step === 'wait-xdr' ||
              step === 'signing' ||
              step === 'submitting') && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>
                  {step === 'creating' && 'Criando ordem...'}
                  {step === 'wait-xdr' &&
                    `Aguardando XDR (${pollCount}/12)...`}
                  {step === 'signing' && 'Assine com sua biometria...'}
                  {step === 'submitting' && 'Enviando transação...'}
                </Text>
                <Text style={styles.statusSub}>
                  {step === 'creating' && 'Preparando saque via Etherfuse'}
                  {step === 'wait-xdr' &&
                    'O burn transaction está sendo gerado...'}
                  {step === 'signing' && 'Use Face ID / Touch ID para autorizar'}
                  {step === 'submitting' && 'Confirmando na Stellar ⚡'}
                </Text>
              </View>
            )}

            {step === 'pending' && (
              <View style={styles.centerBody}>
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Processando saque...</Text>
                <Text style={styles.statusSub}>
                  O valor será enviado para sua conta bancária em até 2 dias úteis.
                </Text>
              </View>
            )}

            {step === 'success' && (
              <View style={styles.centerBody}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.statusTitle}>Saque confirmado! 🎉</Text>
                <Text style={styles.statusSub}>
                  BRL a caminho da sua conta bancária
                </Text>
              </View>
            )}

            {step === 'error' && (
              <View style={styles.centerBody}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <LinearGradient
                  colors={[Accent.secondary, Accent.secondary]}
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
