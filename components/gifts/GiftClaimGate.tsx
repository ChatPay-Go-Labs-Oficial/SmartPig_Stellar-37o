import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button3D, SheetLink, V2Icon, V2Sheet, V2Spinner, type V2IconName } from '@/components/v2';
import { Confetti } from '@/components/ui/Confetti';
import { DepositModal } from '@/components/ui/DepositModal';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { useSound } from '@/hooks/use-sound';
import { useInstallReferrer } from '@/hooks/use-install-referrer';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useGiftStore } from '@/lib/stores/gift.store';
import { useGiftPreview, useClaimGift } from '@/lib/queries/gifts.queries';
import { walletKeys } from '@/lib/queries/wallets.queries';
import { useVaults } from '@/lib/queries/vaults.queries';
import type { GiftStatus } from '@/lib/api/gifts';

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
      message:
        'Este presente é válido apenas para quem criou a conta no PigFi depois de recebê-lo.',
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
 * Montado uma vez no root layout. Observa o código de presente pendente
 * (referência da instalação ou digitado em Meus presentes) e abre o resgate
 * assim que a pessoa está autenticada.
 */
export function GiftClaimGate() {
  useInstallReferrer();
  const pendingGiftCode = useGiftStore((s) => s.pendingGiftCode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: vaults } = useVaults();
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  // Depois do resgate, o depósito vem em seguida: o presente vira dinheiro
  // guardado, e não saldo parado que a pessoa acaba gastando.
  const [investAmount, setInvestAmount] = useState<string | null>(null);

  const defaultVault = vaults?.[0];

  const clearPending = () => useGiftStore.getState().setPendingGiftCode(null);

  const handleInvest = (amount: string) => {
    clearPending();
    setInvestAmount(amount);
  };

  const showSheet = Boolean(isAuthenticated && pendingGiftCode && pendingGiftCode !== dismissedCode);

  return (
    <>
      {showSheet && pendingGiftCode && (
        <GiftClaimSheet
          code={pendingGiftCode}
          canInvest={Boolean(defaultVault)}
          onInvest={handleInvest}
          onKeep={clearPending}
          onDismiss={() => setDismissedCode(pendingGiftCode)}
        />
      )}
      {/* Ainda o depósito do V1: o "Guardar" do V2 vive na aba Guardar. */}
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

/** Resgate de presente (Figma 14–14i): sem cabeçalho, tudo centrado. */
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

  async function handleClaim() {
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
  }

  const previewNotFound =
    (preview.error as { response?: { status?: number } } | null)?.response?.status === 404;
  const terminalPreview = preview.data ? TERMINAL_MESSAGES[preview.data.status] : undefined;
  const isFunded = preview.data?.status === 'FUNDED';
  const isConfirming = preview.data?.status === 'CREATED' || preview.data?.status === 'CLAIMING';
  const amount = preview.data?.amount;

  function understood() {
    playClick();
    clearCode();
  }

  return (
    // Como antes, sem toque fora nem voltar: o sheet sai pelas ações.
    <V2Sheet visible onClose={() => {}} closable={false}>
      {claimed && <Confetti active duration={3500} />}

      {claimed ? (
        <View style={styles.body}>
          <Seal icon="celebration" />
          <Text style={styles.title}>Presente resgatado!</Text>
          <Text style={styles.text}>
            Agora vamos guardar seus ${amount} no cofrinho{'\n'}para começar a crescer todo dia.
          </Text>
          {canInvest ? (
            <View style={styles.actions}>
              <Button3D
                label="Guardar no cofrinho"
                onPress={() => {
                  playClick();
                  onInvest(amount ?? '');
                }}
              />
              <SheetLink
                label="Deixar na carteira por enquanto"
                onPress={() => {
                  playClick();
                  onKeep();
                }}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button3D
                label="Aproveitar"
                onPress={() => {
                  playClick();
                  onKeep();
                }}
              />
            </View>
          )}
        </View>
      ) : preview.isLoading ? (
        <View style={styles.body}>
          <V2Spinner size={32} />
          <Text style={[styles.title, styles.searching]}>Encontramos um presente para você...</Text>
        </View>
      ) : previewNotFound || terminalPreview ? (
        <View style={styles.body}>
          <Seal icon="gift" muted />
          <Text style={styles.title}>
            {previewNotFound ? 'Presente não encontrado' : 'Presente indisponível'}
          </Text>
          <Text style={styles.text}>
            {previewNotFound
              ? 'O código não corresponde a nenhum presente. Confira com quem enviou.'
              : terminalPreview}
          </Text>
          <View style={styles.actions}>
            <Button3D label="Entendi" variant="glass" onPress={understood} />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <Seal icon="gift" />
          <Text style={styles.title}>
            {preview.data?.senderName
              ? `${preview.data.senderName} te mandou um presente!`
              : 'Você recebeu um presente!'}
          </Text>
          <View style={styles.value}>
            <Text style={styles.amount}>${amount}</Text>
            <Text style={styles.valueText}>em dólar, direto para o seu cofrinho</Text>
          </View>

          {isConfirming && (
            <View style={styles.confirming}>
              <V2Spinner size={16} />
              <Text style={styles.confirmingText}>{t('gift.claim.confirming')}</Text>
            </View>
          )}

          {errorMsg ? (
            <View style={styles.error}>
              <V2Icon name="alert" size={18} color={V2Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {errorTerminal ? (
              <Button3D label="Entendi" variant="glass" onPress={understood} />
            ) : (
              <>
                <Button3D
                  label="Resgatar presente"
                  loading={claim.isPending}
                  loadingLabel="Resgatando..."
                  disabled={!isFunded}
                  onPress={() => {
                    playClick();
                    void handleClaim();
                  }}
                />
                {/* Fora do Figma: sem ele, quem não quer resgatar agora não
                    teria como sair (o sheet não fecha por toque fora). */}
                <SheetLink
                  label="Ver depois"
                  disabled={claim.isPending}
                  onPress={() => {
                    playClick();
                    onDismiss();
                  }}
                />
              </>
            )}
          </View>
        </View>
      )}
    </V2Sheet>
  );
}

/** Figma "selo": no tema (76) ou neutro (64) nos estados sem presente. */
function Seal({ icon, muted = false }: { icon: V2IconName; muted?: boolean }) {
  const accent = useAccent();
  return (
    <View
      style={[
        muted ? styles.sealMuted : styles.seal,
        muted
          ? null
          : { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) },
      ]}
    >
      <V2Icon name={icon} size={muted ? 29 : 35} color={muted ? V2Colors.text : accent.light} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma "corpo": tudo centrado, 12 entre os itens e folgas extras ("espaço")
  // acima do título e das ações.
  body: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  seal: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sealMuted: {
    width: 64,
    height: 64,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 22,
    letterSpacing: -0.44,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  searching: {
    marginTop: 4,
    marginBottom: 12,
  },
  text: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  value: {
    alignItems: 'center',
    gap: 2,
  },
  amount: {
    fontFamily: V2Font.black,
    fontSize: 46,
    letterSpacing: -1.38,
    color: V2Colors.onPrimary,
  },
  valueText: {
    fontFamily: V2Font.medium,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  confirming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmingText: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textSecondary,
  },
  error: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.error, 0.3),
    backgroundColor: withAlpha(V2Colors.error, 0.1),
  },
  errorText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 6,
  },
});
