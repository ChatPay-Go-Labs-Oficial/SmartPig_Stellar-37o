import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button3D, SheetLink, V2Icon, V2Sheet, V2Spinner } from '@/components/v2';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useSound } from '@/hooks/use-sound';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWalletBalance, walletKeys } from '@/lib/queries/wallets.queries';
import { findUsdcBalance } from '@/lib/api/wallets';
import { useCreateGift, giftKeys } from '@/lib/queries/gifts.queries';
import type { CreatedGift } from '@/lib/api/gifts';
import { normalizeUsdcAmount, TransferError } from '@/lib/stellar/transfers';
import { signAndSubmitGiftFunding } from '@/lib/stellar/gifts';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';

interface GiftSendSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'input' | 'creating' | 'signing' | 'success';

const GIFT_MIN_USD = 1;
const GIFT_MAX_USD = 100;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pigfi.app';

function buildShareMessage(code: string, amount: string): string {
  const referrer = encodeURIComponent(`utm_source=gift&gift_code=${code}`);
  const storeUrl = `${PLAY_STORE_URL}&referrer=${referrer}`;
  return (
    `Te dei um cofrinho com $${amount} em dólar no PigFi! 🐷💸\n\n` +
    `Baixe o app para resgatar: ${storeUrl}\n\n` +
    `Se o app pedir, use o código: ${code}`
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof TransferError) return error.message;
  const status = (error as { response?: { status?: number } }).response?.status;
  const apiMessage = (error as { response?: { data?: { message?: string } } }).response?.data
    ?.message;
  if (status === 409 && apiMessage?.includes('pending')) {
    return 'Você já tem presentes pendentes demais. Aguarde o resgate ou a expiração.';
  }
  if (status === 503) {
    return 'O serviço de presentes está indisponível no momento. Tente mais tarde.';
  }
  const raw = ((error as { message?: string }).message ?? '').toLowerCase();
  if (raw.includes('network') || raw.includes('timeout')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível criar o presente. Tente novamente.';
}

/**
 * Presentear alguém (Figma 04g–04l): valor, preparo, embrulho e o presente
 * pronto para compartilhar. O fluxo é o mesmo do GiftModal de antes; mudou o
 * desenho.
 */
export function GiftSendSheet({ visible, onClose }: GiftSendSheetProps) {
  const accent = useAccent();
  const { t, p } = useTerms();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const contractId = useAuthStore((s) => s.contractId);
  const { data: balances } = useWalletBalance(walletAddress);
  const usdcBalance = balances ? findUsdcBalance(balances) : '0';
  const createGift = useCreateGift();
  const { playClick, playInvestirConfirmacao, playQuestaoErrada } = useSound();

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [gift, setGift] = useState<CreatedGift | null>(null);

  async function handleSend() {
    if (!walletAddress) return;
    setErrorMsg('');

    let normalized: string;
    try {
      normalized = normalizeUsdcAmount(amount);
      const value = Number(normalized);
      if (value < GIFT_MIN_USD || value > GIFT_MAX_USD) {
        throw new TransferError(
          'INVALID_AMOUNT',
          `O presente deve ser entre $${GIFT_MIN_USD} e $${GIFT_MAX_USD}.`,
        );
      }
      if (value > Number(usdcBalance)) {
        throw new TransferError('INSUFFICIENT_BALANCE', 'Saldo USDC insuficiente.');
      }
    } catch (error) {
      setErrorMsg(errorMessage(error));
      playQuestaoErrada();
      return;
    }

    const auth = await authenticateWithDeviceBiometrics({
      promptMessage: 'Confirme para presentear',
      promptDescription: `Enviar $${normalized} USDC como presente`,
    });
    if (!auth.success) {
      setErrorMsg(auth.message ?? 'Não foi possível confirmar sua identidade.');
      playQuestaoErrada();
      return;
    }

    try {
      // Reaproveita o presente se a etapa na rede falhou numa tentativa
      // anterior: evita criar um segundo presente na mesma abertura do sheet.
      let created = gift;
      if (!created || created.amount !== normalized) {
        setStep('creating');
        created = await createGift.mutateAsync({ amount: normalized });
        setGift(created);
      }

      setStep('signing');
      await signAndSubmitGiftFunding({
        fromAddress: walletAddress,
        claimAgentAddress: created.claimAgentAddress,
        amount: created.amount,
        memo: created.memo,
        expiresAt: created.expiresAt,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: walletKeys.balance(walletAddress) }),
        queryClient.invalidateQueries({ queryKey: giftKeys.all(contractId ?? '') }),
      ]);
      setStep('success');
      playInvestirConfirmacao();
    } catch (error) {
      setErrorMsg(errorMessage(error));
      setStep('input');
      playQuestaoErrada();
    }
  }

  async function handleShare() {
    if (!gift) return;
    playClick();
    await Share.share({ message: buildShareMessage(gift.code, gift.amount) });
  }

  function handleClose() {
    setAmount('');
    setStep('input');
    setErrorMsg('');
    setGift(null);
    onClose();
  }

  let amountNum = 0;
  try {
    amountNum = Number(normalizeUsdcAmount(amount));
  } catch {}
  const canSend =
    amountNum >= GIFT_MIN_USD && amountNum <= GIFT_MAX_USD && amountNum <= Number(usdcBalance);
  const isBusy = step === 'creating' || step === 'signing';
  const filled = amount.length > 0;

  return (
    <V2Sheet
      visible={visible}
      onClose={handleClose}
      title="Presentear alguém"
      icon="gift"
      pill={{ label: t('network.badge'), dotColor: accent.base }}
      // Com o presente sendo criado ou embrulhado, nada fecha o sheet.
      closable={!isBusy}
    >
      {step === 'input' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.balance}>
            <V2Icon name="wallet" size={15} color={V2Colors.text} />
            <Text style={styles.balanceLabel}>
              Disponível: <Text style={styles.balanceValue}>${usdcBalance} USDC</Text>
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={[styles.dollar, !filled && styles.dollarEmpty]}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="decimal-pad"
              autoFocus
              // Campo centrado e sempre focado: o cursor piscando no meio do
              // valor não diz nada que o teclado aberto já não diga.
              caretHidden
              style={styles.amountInput}
            />
            <Text style={styles.asset}>{t('asset.symbol')}</Text>
          </View>

          <View style={styles.info}>
            <V2Icon name="info" size={16} color={V2Colors.text} />
            <Text style={styles.infoText}>
              O presente vale para <Text style={styles.infoBold}>quem ainda não tem o PigFi</Text>.
              Quem receber tem <Text style={styles.infoBold}>7 dias</Text> para resgatar — depois
              disso o valor volta para você. Valor entre ${GIFT_MIN_USD} e ${GIFT_MAX_USD}.
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.error}>
              <V2Icon name="alert" size={18} color={V2Colors.error} />
              <View style={styles.errorTexts}>
                <Text style={styles.errorTitle}>Presente não criado</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            </View>
          ) : null}

          <Button3D
            label="Presentear"
            disabled={!canSend}
            onPress={() => {
              playClick();
              void handleSend();
            }}
          />
        </ScrollView>
      )}

      {isBusy && (
        <View style={styles.status}>
          <V2Spinner size={32} />
          <Text style={styles.statusTitle}>
            {step === 'creating' ? 'Preparando o presente...' : 'Embrulhando o presente...'}
          </Text>
          <Text style={styles.statusText}>
            {step === 'creating'
              ? 'Criando o cofrinho de presente no PigFi'
              : p('gift.reserving', { amount: String(gift?.amount ?? amount) })}
          </Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.body}>
          <View style={styles.success}>
            <View
              style={[
                styles.successSeal,
                { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
              ]}
            >
              <V2Icon name="gift" size={37} color={accent.light} />
            </View>
            <Text style={styles.successTitle}>Presente pronto!</Text>
            <Text style={styles.successText}>
              ${gift?.amount} USDC embrulhados com sucesso.{'\n'}
              Agora é só enviar o link para a pessoa presenteada.
            </Text>
          </View>
          <Button3D label="Compartilhar presente" onPress={() => void handleShare()} />
          <SheetLink label="Fechar" onPress={handleClose} />
        </View>
      )}
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
  body: {
    gap: 16,
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  balanceValue: {
    fontFamily: V2Font.extraBold,
    color: V2Colors.onPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  dollar: {
    fontFamily: V2Font.black,
    fontSize: 30,
    color: V2Colors.onPrimary,
  },
  dollarEmpty: {
    color: 'rgba(255,255,255,0.35)',
  },
  amountInput: {
    minWidth: 60,
    padding: 0,
    fontFamily: V2Font.black,
    fontSize: 46,
    letterSpacing: -1.38,
    color: V2Colors.onPrimary,
  },
  asset: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.textTertiary,
  },
  info: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  infoText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  infoBold: {
    fontFamily: V2Font.bold,
    color: V2Colors.onPrimary,
  },
  error: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.error, 0.3),
    backgroundColor: withAlpha(V2Colors.error, 0.1),
  },
  errorTexts: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 13.5,
    color: V2Colors.error,
  },
  errorText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.textSecondary,
  },
  status: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 34,
  },
  statusTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 17,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  success: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 18,
  },
  successSeal: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    paddingTop: 6,
    fontFamily: V2Font.black,
    fontSize: 24,
    letterSpacing: -0.48,
    color: V2Colors.onPrimary,
  },
  successText: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
});
