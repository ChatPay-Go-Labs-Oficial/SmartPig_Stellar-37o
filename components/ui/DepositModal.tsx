import { Accent, Colors, Font, FontSize, Glow, Gradients, Radius, Spacing } from '@/constants/theme';
import { useCreateDeposit } from '@/lib/queries/deposits.queries';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PigSVG, getPigLevel } from './EvolutionaryPig';

const QUICK_VALUES = [10, 50, 100, 500];

interface DepositModalProps {
  visible: boolean;
  vaultId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'input' | 'processing' | 'success';

export function DepositModal({ visible, vaultId, onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const createDeposit = useCreateDeposit();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfirm = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0 || !vaultId) return;
    setStep('processing');
    try {
      await createDeposit.mutateAsync({ vaultId, amount: value });
      setStep('success');
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setStep('input');
        setAmount('');
        onClose();
        setTimeout(() => onSuccess?.(), 300);
      }, 2500);
    } catch {
      setStep('input');
    }
  };

  const level = getPigLevel(parseFloat(amount || '0'));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={step !== 'processing' ? onClose : undefined}>
        <Pressable style={styles.sheet} onPress={() => { }}>
          {/* Confetti */}
          {showConfetti && (
            <View style={styles.confettiLayer} pointerEvents="none">
              {['🎉', '✨', '⭐', '💫', '🌟'].map((e, i) => (
                <Text key={i} style={[styles.confetti, { left: 20 + i * 60, top: 10 + Math.random() * 40 }]}>
                  {e}
                </Text>
              ))}
            </View>
          )}

          {/* Header */}
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: 'hsla(320, 90%, 58%, 0.15)' }]}>
              <Text style={styles.headerIconText}>↓</Text>
            </View>
            <Text style={styles.headerTitle}>Depositar via Stellar</Text>
          </View>

          {step === 'input' && (
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
              />

              <View style={styles.quickRow}>
                {QUICK_VALUES.map((v) => {
                  const isActive = amount === String(v);
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setAmount(String(v))}
                      style={{ flex: 1 }}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={Gradients.hot}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.quickBtn, styles.quickBtnActive]}
                        >
                          <Text style={[styles.quickText, styles.quickTextActive]}>
                            ${v}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.quickBtn}>
                          <Text style={styles.quickText}>${v}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
                style={{ alignSelf: 'stretch' }}
              >
                <LinearGradient
                  colors={Gradients.hot}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.confirmBtn, (!amount || parseFloat(amount) <= 0) && styles.btnDisabled]}
                >
                  <Text style={styles.confirmBtnText}>Confirmar Depósito</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.centerBody}>
              <ActivityIndicator color={Accent.primary} size="large" />
              <Text style={styles.statusTitle}>Confirmando na Stellar...</Text>
              <Text style={styles.statusSub}>Transação em menos de 1s ⚡</Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.centerBody}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <Text style={styles.statusTitle}>Confirmado na Stellar ⚡</Text>
              <Text style={styles.statusSub}>${amount} adicionados ao seu porquinho</Text>
              <PigSVG level={level} />
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
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  confetti: {
    position: 'absolute',
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
    color: Accent.primary,
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
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  quickText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.mutedForeground,
  },
  quickTextActive: {
    color: '#fff',
  },
  confirmBtn: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.black,
    fontWeight: '900',
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
    ...Glow.green,
  },
  checkMark: {
    fontSize: 32,
    color: '#fff',
    fontFamily: Font.black,
  },
});
