import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Accent, Font, FontSize, Radius, Spacing, scaleFont } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTerms } from '@/hooks/use-terms';
import { useGiftStore } from '@/lib/stores/gift.store';
import { useGiftPreview, useClaimGift } from '@/lib/queries/gifts.queries';
import { walletKeys } from '@/lib/queries/wallets.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import { useInstallReferrer } from '@/hooks/use-install-referrer';
import { GiftStatus } from '@/lib/api/gifts';
import { Confetti } from './Confetti';
import { DepositModal } from './DepositModal';
import { useSound } from '@/hooks/use-sound';

const giftGradient = ['hsl(330, 85%, 58%)', 'hsl(270, 80%, 60%)'] as const;

const TERMINAL_MESSAGES: Partial<Record<GiftStatus, string>> = {
  CLAIMED: 'Este presente já foi resgatado.',
  EXPIRED: 'Este presente expirou e o valor voltou para quem enviou.',
  REFUNDED: 'Este presente foi devolvido para quem enviou.',
};

function claimErrorMessage(error: unknown): { message: string; terminal: boolean } {
  const status = (error as { response?: { status?: number } }).response?.status;
  const apiMessage =
    (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? '';
  if (status === 403 && apiMessage.toLowerCase().includes('own gift')) {
    return { message: 'Você não pode resgatar o próprio presente.', terminal: true };
  }
  if (status === 403) {
    return {
      message: 'Este presente é válido apenas para quem criou a conta no PigFi depois de recebê-lo.',
      terminal: true,
    };
  }
  if (status === 410) {
    return { message: 'Este presente expirou.', terminal: true };
  }
  if (status === 404) {
    return { message: 'Presente não encontrado. Confira o código.', terminal: true };
  }
  if (status === 409) {
    return {
      message: 'O presente ainda está sendo confirmado na rede. Tente novamente em instantes.',
      terminal: false,
    };
  }
  return {
    message: 'Não foi possível resgatar o presente agora. Tente novamente.',
    terminal: false,
  };
}

/**
 * Mounted once in the root layout. Watches for a pending gift code
 * (install referrer or manual entry) and shows the claim sheet as soon
 * as the user is authenticated (wallet + USDC trustline come from the
 * standard onboarding).
 */
export function GiftClaimGate() {
  useInstallReferrer();
  const pendingGiftCode = useGiftStore((s) => s.pendingGiftCode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: vaults } = useVaults();
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  // After a successful claim we chain straight into the deposit so the gift
  // becomes an investment, not idle cash the user might just spend.
  const [investAmount, setInvestAmount] = useState<string | null>(null);

  const defaultVault = vaults?.[0];

  const clearPending = () => useGiftStore.getState().setPendingGiftCode(null);

  const handleInvest = (amount: string) => {
    clearPending();
    setInvestAmount(amount);
  };

  const showSheet =
    isAuthenticated && pendingGiftCode && pendingGiftCode !== dismissedCode;

  return (
    <>
      {showSheet && (
        <GiftClaimSheet
          code={pendingGiftCode}
          canInvest={Boolean(defaultVault)}
          onInvest={handleInvest}
          onKeep={clearPending}
          onDismiss={() => setDismissedCode(pendingGiftCode)}
        />
      )}
      {defaultVault && (
        <DepositModal
          visible={investAmount !== null}
          vaultId={defaultVault.id}
          assetSymbol={defaultVault.assetSymbol}
          apyValue={defaultVault.apy ? parseFloat(defaultVault.apy) : 0}
          initialAmount={investAmount ?? undefined}
          onClose={() => setInvestAmount(null)}
        />
      )}
    </>
  );
}

interface GiftClaimSheetProps {
  code: string;
  canInvest: boolean;
  onInvest: (amount: string) => void;
  onKeep: () => void;
  onDismiss: () => void;
}

function GiftClaimSheet({ code, canInvest, onInvest, onKeep, onDismiss }: GiftClaimSheetProps) {
  const { t } = useTerms();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const preview = useGiftPreview(code);
  const claim = useClaimGift();
  const [claimed, setClaimed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorTerminal, setErrorTerminal] = useState(false);
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const clearCode = () => useGiftStore.getState().setPendingGiftCode(null);

  const handleClaim = async () => {
    setErrorMsg('');
    try {
      await claim.mutateAsync({ code });
      await queryClient.invalidateQueries({
        queryKey: walletKeys.balance(walletAddress ?? ''),
      });
      setClaimed(true);
      playInvestirConfirmacao();
    } catch (error) {
      const { message, terminal } = claimErrorMessage(error);
      setErrorMsg(message);
      setErrorTerminal(terminal);
      playQuestaoErrada();
    }
  };

  const previewNotFound =
    (preview.error as { response?: { status?: number } } | null)?.response?.status === 404;
  const terminalPreview = preview.data ? TERMINAL_MESSAGES[preview.data.status] : undefined;
  const isFunded = preview.data?.status === 'FUNDED';
  const isConfirming =
    preview.data?.status === 'CREATED' || preview.data?.status === 'CLAIMING';
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Spacing[8] + insets.bottom }]}>
          {claimed && <Confetti active duration={3500} />}
          <View style={styles.handle} />

          {claimed ? (
            <View style={styles.centerBody}>
              <LinearGradient
                colors={giftGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bigIcon}
              >
                <MaterialIcons name="celebration" size={36} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>Presente resgatado! 🎉</Text>
              <Text style={styles.subtitle}>
                Agora vamos guardar seus ${preview.data?.amount} no cofrinho{'\n'}
                para começar a render todo dia. 🐷
              </Text>
              {canInvest ? (
                <>
                  <Pressable
                    onPress={() => {
                      playClick();
                      onInvest(preview.data?.amount ?? '');
                    }}
                    style={{ alignSelf: 'stretch' }}
                  >
                    <LinearGradient
                      colors={giftGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtn}
                    >
                      <MaterialIcons name="savings" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Guardar no cofrinho</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => { playClick(); onKeep(); }} hitSlop={8}>
                    <Text style={styles.laterText}>Deixar na carteira por enquanto</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => { playClick(); onKeep(); }}
                  style={{ alignSelf: 'stretch' }}
                >
                  <LinearGradient
                    colors={giftGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Aproveitar</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          ) : preview.isLoading ? (
            <View style={styles.centerBody}>
              <ActivityIndicator color={Accent.secondary} size="large" />
              <Text style={styles.title}>Encontramos um presente para você...</Text>
            </View>
          ) : previewNotFound || terminalPreview ? (
            <View style={styles.centerBody}>
              <View style={styles.mutedIcon}>
                <MaterialIcons name="card-giftcard" size={30} color={Colors.mutedForeground} />
              </View>
              <Text style={styles.title}>
                {previewNotFound ? 'Presente não encontrado' : 'Presente indisponível'}
              </Text>
              <Text style={styles.subtitle}>
                {previewNotFound
                  ? 'O código não corresponde a nenhum presente. Confira com quem enviou.'
                  : terminalPreview}
              </Text>
              <Pressable
                onPress={() => {
                  playClick();
                  clearCode();
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Entendi</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerBody}>
              <LinearGradient
                colors={giftGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bigIcon}
              >
                <MaterialIcons name="card-giftcard" size={36} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>
                {preview.data?.senderName
                  ? `${preview.data.senderName} te mandou um presente!`
                  : 'Você recebeu um presente!'}
              </Text>
              <Text style={styles.amount}>${preview.data?.amount}</Text>
              <Text style={styles.subtitle}>em dólar, direto para o seu cofrinho</Text>

              {isConfirming && (
                <View style={styles.confirmingRow}>
                  <ActivityIndicator size="small" color={Accent.secondary} />
                  <Text style={styles.confirmingText}>{t('gift.claim.confirming')}</Text>
                </View>
              )}

              {errorMsg ? (
                <View style={styles.errorCard}>
                  <MaterialIcons name="error-outline" size={18} color={Accent.destructive} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {errorTerminal ? (
                <Pressable
                  onPress={() => {
                    playClick();
                    clearCode();
                  }}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Entendi</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      playClick();
                      handleClaim();
                    }}
                    disabled={!isFunded || claim.isPending}
                    style={{ alignSelf: 'stretch' }}
                  >
                    <LinearGradient
                      colors={giftGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.primaryBtn,
                        (!isFunded || claim.isPending) && styles.btnDisabled,
                      ]}
                    >
                      {claim.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="redeem" size={16} color="#fff" />
                      )}
                      <Text style={styles.primaryBtnText}>
                        {claim.isPending ? 'Resgatando...' : 'Resgatar presente'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      playClick();
                      onDismiss();
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.laterText}>Ver depois</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </View>
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
  centerBody: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: Spacing[6],
  },
  bigIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  amount: {
    fontSize: scaleFont(46),
    fontFamily: Font.black,
    color: Colors.foreground,
    lineHeight: 54,
  },
  subtitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmingText: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    alignSelf: 'stretch',
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  primaryBtn: {
    height: 54,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.black,
  },
  secondaryBtn: {
    height: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.muted,
  },
  secondaryBtnText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Colors.foreground,
  },
  laterText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
  },
});
