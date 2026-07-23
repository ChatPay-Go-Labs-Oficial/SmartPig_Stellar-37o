import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Accent, Font, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useGiftStore } from '@/lib/stores/gift.store';
import { useGifts, giftKeys } from '@/lib/queries/gifts.queries';
import { walletKeys } from '@/lib/queries/wallets.queries';
import { GiftListItem, GiftStatus } from '@/lib/api/gifts';
import { reclaimExpiredGift } from '@/lib/stellar/gifts';
import { TransferError } from '@/lib/stellar/transfers';
import { GIFT_CODE_REGEX } from '@/hooks/use-install-referrer';
import { useSound } from '@/hooks/use-sound';

interface MyGiftsModalProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<GiftStatus, { label: string; color: string }> = {
  CREATED: { label: 'Confirmando', color: Colors.mutedForeground },
  FUNDED: { label: 'Aguardando resgate', color: Accent.accent },
  CLAIMING: { label: 'Resgatando...', color: Accent.accent },
  CLAIMED: { label: 'Resgatado', color: Accent.success },
  EXPIRED: { label: 'Expirado', color: Accent.destructive },
  REFUNDED: { label: 'Devolvido', color: Colors.mutedForeground },
};

export function MyGiftsModal({ visible, onClose }: MyGiftsModalProps) {
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const { data: gifts, isLoading } = useGifts();

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isFeedbackError, setIsFeedbackError] = useState(false);
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  useEffect(() => {
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const handleRedeemCode = () => {
    playClick();
    const code = codeInput.trim();
    if (!GIFT_CODE_REGEX.test(code)) {
      setFeedback('Código inválido. Confira com quem enviou o presente.');
      setIsFeedbackError(true);
      playQuestaoErrada();
      return;
    }
    useGiftStore.getState().setPendingGiftCode(code);
    setCodeInput('');
    setFeedback('');
    onClose();
  };

  const handleReclaim = async (gift: GiftListItem) => {
    if (!walletAddress || !gift.balanceId || reclaimingId) return;
    playClick();
    setFeedback('');
    setReclaimingId(gift.id);
    try {
      await reclaimExpiredGift({ fromAddress: walletAddress, balanceId: gift.balanceId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: giftKeys.all(contractId ?? '') }),
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) }),
      ]);
      setFeedback('Valor recuperado para a sua carteira!');
      setIsFeedbackError(false);
      playInvestirConfirmacao();
    } catch (error) {
      setFeedback(
        error instanceof TransferError
          ? error.message
          : 'Não foi possível recuperar o presente agora. Tente novamente.',
      );
      setIsFeedbackError(true);
      playQuestaoErrada();
    } finally {
      setReclaimingId(null);
    }
  };

  const handleClose = () => {
    setCodeInput('');
    setFeedback('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <View style={{ paddingBottom: keyboardHeight }}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="card-giftcard" size={18} color="#F472B6" />
            </View>
            <Text style={styles.headerTitle}>Meus presentes</Text>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <MaterialIcons name="close" size={16} color={Colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.body}>
              {/* Manual code entry — the universal fallback while the app is
                  sideloaded (no install referrer) */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Tenho um código de presente</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="Cole o código aqui"
                    placeholderTextColor={Colors.mutedForeground}
                    value={codeInput}
                    onChangeText={setCodeInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    cursorColor={Accent.secondary}
                  />
                  <Pressable
                    onPress={handleRedeemCode}
                    disabled={!codeInput.trim()}
                    style={[styles.redeemBtn, !codeInput.trim() && styles.btnDisabled]}
                  >
                    <Text style={styles.redeemBtnText}>Resgatar</Text>
                  </Pressable>
                </View>
              </View>

              {feedback ? (
                <View style={[styles.feedbackCard, isFeedbackError && styles.feedbackError]}>
                  <MaterialIcons
                    name={isFeedbackError ? 'error-outline' : 'check-circle-outline'}
                    size={16}
                    color={isFeedbackError ? Accent.destructive : Accent.success}
                  />
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ) : null}

              <View style={styles.divider} />

              {isLoading ? (
                <ActivityIndicator color={Accent.secondary} style={{ paddingVertical: 20 }} />
              ) : !gifts || gifts.length === 0 ? (
                <Text style={styles.emptyText}>
                  Você ainda não enviou nem recebeu presentes.
                </Text>
              ) : (
                gifts.map((gift) => {
                  const status = STATUS_LABELS[gift.status];
                  const isSent = gift.direction === 'sent';
                  const canReclaim =
                    isSent && gift.status === 'EXPIRED' && Boolean(gift.balanceId);
                  return (
                    <View key={gift.id} style={styles.giftRow}>
                      <View style={styles.giftIconWrap}>
                        <MaterialIcons
                          name={isSent ? 'arrow-upward' : 'arrow-downward'}
                          size={16}
                          color={isSent ? '#F472B6' : Accent.success}
                        />
                      </View>
                      <View style={styles.giftInfo}>
                        <Text style={styles.giftTitle}>
                          {isSent ? 'Presente enviado' : 'Presente recebido'}
                        </Text>
                        <Text style={styles.giftDate}>
                          {new Date(gift.createdAt).toLocaleDateString('pt-BR')}
                          {'  ·  '}
                          <Text style={{ color: status.color }}>{status.label}</Text>
                        </Text>
                      </View>
                      <View style={styles.giftRight}>
                        <Text style={styles.giftAmount}>${gift.amount}</Text>
                        {canReclaim && (
                          <Pressable
                            onPress={() => handleReclaim(gift)}
                            disabled={reclaimingId !== null}
                            style={[styles.reclaimBtn, reclaimingId !== null && styles.btnDisabled]}
                          >
                            {reclaimingId === gift.id ? (
                              <ActivityIndicator size="small" color={Colors.foreground} />
                            ) : (
                              <Text style={styles.reclaimBtnText}>Recuperar</Text>
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '92%',
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
    marginBottom: 16,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(244,114,182,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.body,
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
  body: { gap: Spacing[4] },
  fieldBlock: { gap: 6 },
  fieldLabel: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.foreground,
  },
  redeemBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(244,114,182,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.25)',
  },
  redeemBtnText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: '#F472B6',
  },
  btnDisabled: { opacity: 0.35 },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  feedbackError: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderColor: 'rgba(220,38,38,0.2)',
  },
  feedbackText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  emptyText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 20,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftInfo: { flex: 1, gap: 2 },
  giftTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  giftDate: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  giftRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  giftAmount: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  reclaimBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reclaimBtnText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
});
