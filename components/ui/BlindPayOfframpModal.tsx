import { useEffect, useRef, useState } from 'react';
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
import { RampStepIndicator } from './RampStepIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';

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

function extractAmountRange(raw: string): { min: string; max: string } | null {
  const match = /between \$?([\d,.]+)\s*and\s*\$?([\d,.]+)/i.exec(raw);
  return match ? { min: match[1], max: match[2] } : null;
}

/** Trata o último separador (`,` ou `.`) como decimal; os demais como milhar. */
function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const decimalIndex = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  if (decimalIndex === -1) return parseFloat(cleaned) || 0;
  const intPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, '');
  const decPart = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, '');
  return parseFloat(`${intPart}.${decPart}`) || 0;
}

function friendlyError(raw: string): string {
  const range = extractAmountRange(raw);
  if (range) {
    return `O valor deve ficar entre US$ ${range.min} e US$ ${range.max} em equivalente. Tente um valor dentro dessa faixa.`;
  }
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
  const [pendingTrustlineXdr, setPendingTrustlineXdr] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [amountRange, setAmountRange] = useState<{ min: string; max: string } | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setStep('input');
    setAmount('');
    setErrorMsg('');
    setOrderId(null);
    setUnsignedDelegationXdr(null);
    setPendingTrustlineXdr(null);
    setAmountRange(null);
    getQuote.reset();
    onClose();
  }

  // Garante que o timeout de auto-fechamento não sobrevive ao desmonte do
  // componente nem dispara onSuccess numa instância que o usuário já fechou.
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 'pending' || !order) return;
    if (order.status === 'COMPLETED') {
      setStep('success');
      successTimeoutRef.current = setTimeout(() => {
        successTimeoutRef.current = null;
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
    const value = parseAmountInput(amount);
    if (!value || value <= 0) return;
    if (!bankAccount) {
      setErrorMsg('Finalize seu cadastro Pix antes de sacar.');
      setStep('error');
      return;
    }
    if (typeof maxAmount === 'number' && value > maxAmount) {
      setErrorMsg(`Valor maior que o saldo disponível ($${maxAmount.toFixed(2)}).`);
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
      const message = e?.response?.data?.message || e?.message || '';
      setErrorMsg(friendlyError(message));
      const range = extractAmountRange(message);
      if (range) setAmountRange(range);
      setStep('input');
    }
  }

  async function handleConfirmQuote() {
    if (!bankAccount || !walletAddress) return;
    setErrorMsg('');
    setStep('creating');
    try {
      // Se a ordem já foi criada numa tentativa anterior (só a submissão da
      // trustline falhou), não recria — isso deixaria uma ordem órfã pra trás
      // no backend. Só retoma de onde parou.
      if (!orderId) {
        const value = parseAmountInput(amount);
        // Débito técnico conhecido: o backend gera uma cotação nova aqui dentro
        // em vez de honrar a cotação já mostrada no passo anterior (`quote`).
        // O app não pode simplesmente mandar o `quote.id` — CreateOfframpDto
        // não tem esse campo, e o ValidationPipe do backend usa
        // forbidNonWhitelisted: true, então um campo extra derruba a
        // requisição com 400. Corrigir exige adicionar `quoteId` ao DTO no
        // backend primeiro.
        const result = await createOfframp.mutateAsync({
          userId: contractId!,
          bankAccountId: bankAccount.id,
          senderWalletAddress: walletAddress,
          amountUsdc: Math.round(value * MICRO_UNITS_PER_TOKEN),
        });
        setOrderId(result.id);
        setPendingTrustlineXdr(result.trustlineXdr ?? null);
        setUnsignedDelegationXdr(result.unsignedDelegationXdr);

        if (result.trustlineXdr) {
          const signedTrustline = await signBlindPayXdr(result.trustlineXdr);
          await submitTrustline.mutateAsync({ signedXdr: signedTrustline, stellarAddress: walletAddress });
          setPendingTrustlineXdr(null);
        }
      } else if (pendingTrustlineXdr) {
        const signedTrustline = await signBlindPayXdr(pendingTrustlineXdr);
        await submitTrustline.mutateAsync({ signedXdr: signedTrustline, stellarAddress: walletAddress });
        setPendingTrustlineXdr(null);
      }

      setStep('confirming');
    } catch (e: any) {
      setErrorMsg(friendlyError(e?.response?.data?.message || e?.message || ''));
      setStep('quote');
    }
  }

  async function handleConfirmWithdraw() {
    if (!orderId || !unsignedDelegationXdr) return;
    setErrorMsg('');
    try {
      const biometricResult = await authenticateWithDeviceBiometrics({
        promptMessage: 'Confirme o saque',
        promptSubtitle: 'Saque via Pix — PigFi',
        promptDescription: quote
          ? `Autorize o saque de R$ ${(quote.receiver_amount / 100).toFixed(2)}.`
          : 'Autorize o saque via Pix.',
      });

      if (!biometricResult.success) {
        setErrorMsg(biometricResult.message ?? 'Biometria não confirmada. Tente novamente.');
        return;
      }

      setStep('submitting');
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
                <MaterialIcons name="arrow-upward" size={18} color={Accent.secondary} />
              </View>
              <Text style={styles.headerTitle}>Sacar via Pix</Text>
              <Pressable onPress={resetAndClose} hitSlop={12} style={styles.closeBtn}>
                <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
              </Pressable>
            </View>

            {(step === 'input' || step === 'quoting') && (
              <View style={styles.body}>
                <RampStepIndicator step={1} total={4} label="Valor" accentColor={Accent.secondary} />
                <Text style={styles.stepSubtitle}>
                  Informe quanto você quer sacar. O valor sai do seu porquinho e cai na sua chave
                  Pix.
                </Text>
                <Text style={styles.label}>Valor em dólares</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountPrefix}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0,00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>

                {typeof maxAmount === 'number' && maxAmount > 0 && (
                  <Text style={styles.maxHint}>
                    Saldo disponível: ${maxAmount.toFixed(2)}
                  </Text>
                )}

                {bankAccount && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Receber em</Text>
                    <Text style={styles.infoValue}>{bankAccount.pixKey ?? 'Chave Pix'}</Text>
                  </View>
                )}

                {amountRange && (
                  <Text style={styles.hintText}>
                    Valor permitido: entre US$ {amountRange.min} e US$ {amountRange.max} em
                    equivalente
                  </Text>
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
                <RampStepIndicator step={2} total={4} label="Confirmar" accentColor={Accent.secondary} />
                <Text style={styles.stepSubtitle}>Confira os valores antes de continuar.</Text>
                <Text style={styles.sectionTitle}>Cotação</Text>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Você envia</Text>
                    {/* Escala diferente de propósito: BlindPayPayoutQuote.sender_amount vem
                        em micro-unidades (÷1_000_000), enquanto BlindPayPayinQuote.receiver_amount
                        (usado no modal de depósito) vem em centavos (÷100) — são campos de DTOs
                        diferentes e a própria API da BlindPay é assimétrica aqui. Ver comentário
                        equivalente em BlindPayOnrampModal.tsx. Não "corrigir" pra bater com o
                        outro modal. */}
                    <Text style={styles.quoteValue}>
                      ${(quote.sender_amount / MICRO_UNITS_PER_TOKEN).toFixed(2)}
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
                <RampStepIndicator step={3} total={4} label="Confirmar saque" accentColor={Accent.secondary} />
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Preparando seu saque...</Text>
              </View>
            )}

            {step === 'confirming' && quote && (
              <View style={styles.body}>
                <RampStepIndicator step={3} total={4} label="Confirmar saque" accentColor={Accent.secondary} />
                <Text style={styles.stepSubtitle}>
                  Use a biometria do aparelho para autorizar o saque com segurança.
                </Text>
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
                <RampStepIndicator step={3} total={4} label="Confirmar saque" accentColor={Accent.secondary} />
                <ActivityIndicator color={Accent.secondary} size="large" />
                <Text style={styles.statusTitle}>Confirme com sua biometria...</Text>
                <Text style={styles.statusSub}>Estamos processando seu saque</Text>
              </View>
            )}

            {step === 'pending' && (
              <View style={styles.centerBody}>
                <RampStepIndicator step={4} total={4} label="Processando" accentColor={Accent.secondary} />
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
                  <MaterialIcons name="check" size={32} color="#fff" />
                </View>
                <Text style={styles.statusTitle}>Saque confirmado</Text>
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
  stepSubtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing[1],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    gap: 6,
  },
  amountPrefix: {
    color: Colors.mutedForeground,
    fontFamily: Font.black,
    fontSize: 22,
  },
  amountInput: {
    flex: 1,
    color: Colors.foreground,
    fontFamily: Font.black,
    fontSize: 28,
    textAlign: 'center',
  },
  maxHint: {
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  hintText: {
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
});
