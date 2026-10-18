import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button3D, V2Icon, V2Sheet, V2Spinner } from '@/components/v2';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useSound } from '@/hooks/use-sound';
import { GIFT_CODE_REGEX } from '@/hooks/use-install-referrer';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useGiftStore } from '@/lib/stores/gift.store';
import { useGifts, giftKeys } from '@/lib/queries/gifts.queries';
import { walletKeys } from '@/lib/queries/wallets.queries';
import type { GiftListItem, GiftStatus } from '@/lib/api/gifts';
import { reclaimExpiredGift } from '@/lib/stellar/gifts';
import { TransferError } from '@/lib/stellar/transfers';

const STATUS_LABELS: Record<GiftStatus, string> = {
  CREATED: 'Confirmando',
  FUNDED: 'Aguardando resgate',
  CLAIMING: 'Resgatando...',
  CLAIMED: 'Resgatado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Devolvido',
};

interface MyGiftsSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Presentear alguém. Só para quem pode presentear (lista liberada no
   * backend); fora do Figma, que não tem outra entrada para o envio no V2.
   */
  onSendGift?: () => void;
}

/**
 * Meus presentes (Figma 27a–27g): resgatar por código, a lista de presentes
 * enviados e recebidos e o "Recuperar" dos enviados que expiraram. O fluxo é o
 * mesmo de antes; mudou o desenho e o lugar (saiu do Perfil para a Carteira).
 */
export function MyGiftsSheet({ visible, onClose, onSendGift }: MyGiftsSheetProps) {
  const queryClient = useQueryClient();
  const accent = useAccent();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const { data: gifts, isLoading } = useGifts();
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const [codeInput, setCodeInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);

  const code = codeInput.trim();

  // O sheet não desmonta ao fechar: o estado é zerado à mão.
  function handleClose() {
    setCodeInput('');
    setFocused(false);
    setFeedback(null);
    onClose();
  }

  // "Resgatar" fecha o sheet e abre o mesmo resgate de quem chega pelo link
  // (o código pendente no store abre o GiftClaimGate).
  function handleRedeemCode() {
    playClick();
    if (!GIFT_CODE_REGEX.test(code)) {
      setFeedback({ text: 'Código inválido. Confira com quem enviou o presente.', error: true });
      playQuestaoErrada();
      return;
    }
    useGiftStore.getState().setPendingGiftCode(code);
    handleClose();
  }

  async function handleReclaim(gift: GiftListItem) {
    if (!walletAddress || !gift.balanceId || reclaimingId) return;
    playClick();
    setFeedback(null);
    setReclaimingId(gift.id);
    try {
      await reclaimExpiredGift({ fromAddress: walletAddress, balanceId: gift.balanceId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: giftKeys.all(contractId ?? '') }),
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) }),
      ]);
      setFeedback({ text: 'Valor recuperado para a sua carteira!', error: false });
      playInvestirConfirmacao();
    } catch (error) {
      setFeedback({
        text:
          error instanceof TransferError
            ? error.message
            : 'Não foi possível recuperar o presente agora. Tente novamente.',
        error: true,
      });
      playQuestaoErrada();
    } finally {
      setReclaimingId(null);
    }
  }

  return (
    <V2Sheet visible={visible} onClose={handleClose} title="Meus presentes" icon="gift">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.codeBlock}>
          <Text style={styles.codeLabel}>Tenho um código de presente</Text>
          <View style={styles.codeRow}>
            <TextInput
              value={codeInput}
              onChangeText={setCodeInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Cole o código aqui"
              placeholderTextColor={V2Colors.textTertiary}
              selectionColor={accent.base}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.codeInput,
                codeInput ? styles.codeInputFilled : null,
                (focused || codeInput) && { borderColor: accent.base },
              ]}
            />
            <Button3D
              label="Resgatar"
              onPress={handleRedeemCode}
              disabled={!code}
              style={styles.redeem}
            />
          </View>
        </View>

        {feedback ? (
          <View
            style={[
              styles.feedback,
              {
                borderColor: withAlpha(feedback.error ? V2Colors.error : V2Colors.success, 0.3),
                backgroundColor: withAlpha(feedback.error ? V2Colors.error : V2Colors.success, 0.1),
              },
            ]}
          >
            <V2Icon
              name={feedback.error ? 'alert' : 'check'}
              size={18}
              color={feedback.error ? V2Colors.error : V2Colors.success}
            />
            <Text style={styles.feedbackText}>{feedback.text}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loading}>
            <V2Spinner size={32} />
          </View>
        ) : !gifts || gifts.length === 0 ? (
          <Text style={styles.empty}>Você ainda não enviou nem recebeu presentes.</Text>
        ) : (
          <View style={styles.list}>
            {gifts.map((gift, index) => (
              <View key={gift.id}>
                {index > 0 && <View style={styles.divider} />}
                <GiftRow
                  gift={gift}
                  reclaiming={reclaimingId === gift.id}
                  reclaimDisabled={reclaimingId !== null}
                  onReclaim={() => void handleReclaim(gift)}
                />
              </View>
            ))}
          </View>
        )}

        {onSendGift ? (
          <Button3D
            label="Presentear alguém"
            variant="glass"
            icon="gift"
            onPress={() => {
              handleClose();
              onSendGift();
            }}
          />
        ) : null}
      </ScrollView>
    </V2Sheet>
  );
}

/** Figma "presente": selo com a direção, título, data e status, e o valor. */
function GiftRow({
  gift,
  reclaiming,
  reclaimDisabled,
  onReclaim,
}: {
  gift: GiftListItem;
  reclaiming: boolean;
  reclaimDisabled: boolean;
  onReclaim: () => void;
}) {
  const accent = useAccent();
  const isSent = gift.direction === 'sent';
  // "Recuperar" só nos enviados que expiraram e ainda estão na rede.
  const canReclaim = isSent && gift.status === 'EXPIRED' && Boolean(gift.balanceId);
  const tone = isSent ? accent.base : V2Colors.success;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.seal,
          { backgroundColor: withAlpha(tone, 0.14), borderColor: withAlpha(tone, isSent ? 0.32 : 0.3) },
        ]}
      >
        <V2Icon
          name={isSent ? 'arrow-up' : 'arrow-down'}
          size={20}
          color={isSent ? accent.light : V2Colors.success}
        />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {isSent ? 'Presente enviado' : 'Presente recebido'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {new Date(gift.createdAt).toLocaleDateString('pt-BR')} · {STATUS_LABELS[gift.status]}
        </Text>
      </View>
      <View style={styles.value}>
        <Text style={styles.amount}>${gift.amount}</Text>
        {canReclaim && (
          <Pressable
            onPress={onReclaim}
            disabled={reclaimDisabled}
            hitSlop={8}
            accessibilityRole="button"
            style={[
              styles.reclaim,
              {
                backgroundColor: accent.alpha(reclaiming ? 0.06 : 0.14),
                borderColor: accent.alpha(reclaiming ? 0.24 : 0.4),
              },
              reclaimDisabled && !reclaiming && styles.reclaimDisabled,
            ]}
          >
            <Text style={[styles.reclaimText, { color: accent.light }, reclaiming && styles.reclaimingText]}>
              {reclaiming ? 'Recuperando...' : 'Recuperar'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
  body: {
    gap: 14,
  },
  codeBlock: {
    gap: 6,
  },
  codeLabel: {
    fontFamily: V2Font.bold,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Mesma altura do botão 3D ao lado (face de 57 + degrau de 4).
  codeInput: {
    flex: 1,
    height: 61,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontFamily: V2Font.medium,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  codeInputFilled: {
    fontFamily: V2Font.semiBold,
  },
  redeem: {
    width: 118,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedbackText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.textSecondary,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  empty: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  seal: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  subtitle: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  value: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontFamily: V2Font.black,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  reclaim: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  reclaimDisabled: {
    opacity: 0.5,
  },
  reclaimText: {
    fontFamily: V2Font.extraBold,
    fontSize: 11.5,
  },
  reclaimingText: {
    opacity: 0.5,
  },
});
