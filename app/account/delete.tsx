import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { usePrivy } from '@privy-io/expo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import {
  IconSymbol,
  Input,
  MyGiftsModal,
  PressableScale,
  TransferModal,
} from '@/components/ui';
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTerms } from '@/hooks/use-terms';
import { blockerCopy } from '@/lib/copy/blockers';
import { formatAmountForMode } from '@/lib/utils/format';
import { signXdr } from '@/lib/stellar/kit';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import { wipeLocalState } from '@/lib/security/wipe-local-state';
import type { Blocker, EligibilityResult } from '@/lib/api/account-deletion';
import {
  useAccountDeletionEligibility,
  useConfirmAccountDeletion,
  useRequestAccountDeletion,
} from '@/lib/queries/account-deletion.queries';

type Step = 'check' | 'consent' | 'confirm' | 'running' | 'done';

const CONFIRM_WORD = 'EXCLUIR';

export default function DeleteAccountScreen() {
  const { mode } = useTerms();
  const { logout } = usePrivy();

  const [step, setStep] = useState<Step>('check');
  const [showTransfer, setShowTransfer] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [acks, setAcks] = useState({
    dataRetention: false,
    onchainHistoryPublic: false,
    irreversible: false,
  });
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    requestId: string;
    closureXdr: string | null;
  } | null>(null);

  const eligibility = useAccountDeletionEligibility(step === 'check');
  const openRequest = useRequestAccountDeletion();
  const confirmRequest = useConfirmAccountDeletion();

  const data = eligibility.data;
  const blockers = data?.blockers ?? [];
  const eligible = data?.eligible === true;
  const allAcked = Object.values(acks).every(Boolean);

  function handleAction(blocker: Blocker) {
    const action = blocker.action;
    if (!action) return;
    switch (action.type) {
      case 'WITHDRAW_VAULT':
        if (action.vaultId) router.push(`/vault/${action.vaultId}/withdraw`);
        return;
      case 'WITHDRAW_WALLET':
        setShowTransfer(true);
        return;
      case 'OPEN_GIFTS':
        setShowGifts(true);
        return;
      case 'OPEN_RAMP':
        router.push('/(tabs)');
        return;
    }
  }

  async function handleOpenRequest() {
    setError(null);
    try {
      const opened = await openRequest.mutateAsync(randomUUID());
      setRequest({
        requestId: opened.requestId,
        closureXdr: opened.closureXdr,
      });
      setStep('confirm');
    } catch {
      setError(
        'Não foi possível iniciar a exclusão agora. Tente de novo em alguns instantes.',
      );
    }
  }

  async function handleConfirm() {
    setError(null);

    const biometrics = await authenticateWithDeviceBiometrics({
      promptMessage: 'Confirmar exclusão da conta',
      promptSubtitle: 'Esta ação não pode ser desfeita',
    });
    if (!biometrics.success) {
      setError(biometrics.message ?? 'Confirmação cancelada.');
      return;
    }

    setStep('running');
    try {
      // Skipped when the wallet was never activated: there is no on-chain
      // account to close, so the server sent no transaction to sign.
      const signedXdr = request?.closureXdr
        ? await signXdr(request.closureXdr)
        : undefined;

      await confirmRequest.mutateAsync({
        requestId: request!.requestId,
        signedXdr,
        acknowledgements: acks,
      });

      await wipeLocalState();
      setStep('done');
      await logout();
      router.replace('/(auth)');
    } catch {
      setStep('confirm');
      setError(
        'Não foi possível concluir a exclusão. Nada foi apagado — tente de novo.',
      );
    }
  }

  return (
    <>
      <View style={styles.screen}>
        <LinearGradient
          colors={['hsl(0, 60%, 22%)', 'hsl(260, 20%, 8%)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            {/* The execution step has no way back: the saga is already running. */}
            {step !== 'running' && step !== 'done' && (
              <PressableScale
                onPress={() =>
                  step === 'check' ? router.back() : setStep('check')
                }
              >
                <View style={styles.backBtn}>
                  <IconSymbol
                    name="chevron.right"
                    size={24}
                    color={Colors.foreground}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </View>
              </PressableScale>
            )}
            <Text style={styles.headerTitle}>Excluir minha conta</Text>
          </View>
          <Text style={styles.headerSub}>{headerSubtitle(step)}</Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            step === 'check' ? (
              <RefreshControl
                refreshing={eligibility.isRefetching}
                onRefresh={() => void eligibility.refetch()}
                tintColor={Colors.mutedForeground}
              />
            ) : undefined
          }
        >
          {error && (
            <View style={[styles.card, styles.cardError]}>
              <Text style={styles.cardDetail}>{error}</Text>
            </View>
          )}

          {step === 'check' && (
            <>
              {eligibility.isPending && (
                <View style={styles.centered}>
                  <ActivityIndicator color={Accent.primary} />
                  <Text style={styles.muted}>Verificando sua conta...</Text>
                </View>
              )}

              {eligibility.isError && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Não conseguimos verificar sua conta
                  </Text>
                  <Text style={styles.cardDetail}>
                    Tente de novo em alguns instantes.
                  </Text>
                  <PressableScale onPress={() => void eligibility.refetch()}>
                    <View style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>
                        Tentar de novo
                      </Text>
                    </View>
                  </PressableScale>
                </View>
              )}

              {!eligibility.isPending &&
                !eligibility.isError &&
                blockers.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>
                      Ainda não dá para excluir
                    </Text>
                    <Text style={styles.sectionSub}>
                      Resolva os pontos abaixo primeiro. Eles existem para o seu
                      dinheiro não se perder.
                    </Text>

                    {blockers.map((blocker, index) => {
                      const copy = blockerCopy(blocker, mode);
                      return (
                        <View
                          key={`${blocker.code}-${index}`}
                          style={styles.card}
                        >
                          <View style={styles.cardHead}>
                            <MaterialIcons
                              name={
                                blocker.resolvable ? 'error-outline' : 'schedule'
                              }
                              size={20}
                              color={
                                blocker.resolvable
                                  ? Accent.accent
                                  : Colors.mutedForeground
                              }
                            />
                            <Text style={styles.cardTitle}>{copy.title}</Text>
                          </View>
                          <Text style={styles.cardDetail}>{copy.detail}</Text>
                          {copy.cta && (
                            <PressableScale
                              onPress={() => handleAction(blocker)}
                            >
                              <View style={styles.secondaryBtn}>
                                <Text style={styles.secondaryBtnText}>
                                  {copy.cta}
                                </Text>
                              </View>
                            </PressableScale>
                          )}
                        </View>
                      );
                    })}

                    <PressableScale onPress={() => void eligibility.refetch()}>
                      <View style={styles.ghostBtn}>
                        <Text style={styles.ghostBtnText}>
                          Verificar de novo
                        </Text>
                      </View>
                    </PressableScale>
                  </>
                )}

              {eligible && (
                <View style={styles.card}>
                  <View style={styles.cardHead}>
                    <MaterialIcons
                      name="check-circle-outline"
                      size={20}
                      color={Accent.success}
                    />
                    <Text style={styles.cardTitle}>
                      Sua conta pode ser excluída
                    </Text>
                  </View>
                  <Text style={styles.cardDetail}>
                    Não encontramos dinheiro parado nem operação em andamento.
                  </Text>
                </View>
              )}

              <PrimaryButton
                label="Continuar"
                disabled={!eligible}
                onPress={() => setStep('consent')}
              />
            </>
          )}

          {step === 'consent' && data && (
            <ConsentStep
              data={data}
              mode={mode}
              acks={acks}
              onToggle={(key) =>
                setAcks((prev) => ({ ...prev, [key]: !prev[key] }))
              }
            />
          )}

          {step === 'consent' && (
            <PrimaryButton
              label={openRequest.isPending ? 'Preparando...' : 'Continuar'}
              disabled={!allAcked || openRequest.isPending}
              onPress={() => void handleOpenRequest()}
            />
          )}

          {step === 'confirm' && (
            <>
              <Text style={styles.sectionTitle}>Confirmação final</Text>
              <Text style={styles.sectionSub}>
                Digite {CONFIRM_WORD} para confirmar. Depois disso não há volta.
              </Text>
              <Input
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={CONFIRM_WORD}
              />
              <PrimaryButton
                label="Excluir minha conta"
                disabled={typed.trim() !== CONFIRM_WORD}
                onPress={() => void handleConfirm()}
              />
            </>
          )}

          {(step === 'running' || step === 'done') && (
            <View style={styles.centered}>
              <ActivityIndicator color={Accent.primary} />
              <Text style={styles.muted}>
                {step === 'done'
                  ? 'Conta excluída. Até uma próxima.'
                  : 'Encerrando sua conta e removendo seus dados...'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <TransferModal
        visible={showTransfer}
        onClose={() => {
          setShowTransfer(false);
          void eligibility.refetch();
        }}
      />
      <MyGiftsModal
        visible={showGifts}
        onClose={() => {
          setShowGifts(false);
          void eligibility.refetch();
        }}
      />
    </>
  );
}

function headerSubtitle(step: Step): string {
  switch (step) {
    case 'check':
      return 'Antes de tudo, vamos conferir se você pode sair sem perder nada.';
    case 'consent':
      return 'Leia com atenção o que acontece com os seus dados.';
    case 'confirm':
      return 'Última etapa.';
    default:
      return 'Estamos concluindo. Não feche o aplicativo.';
  }
}

function ConsentStep({
  data,
  mode,
  acks,
  onToggle,
}: {
  data: EligibilityResult;
  mode: 'lite' | 'pro';
  acks: Record<string, boolean>;
  onToggle: (key: 'dataRetention' | 'onchainHistoryPublic' | 'irreversible') => void;
}) {
  const swept = formatAmountForMode(data.residuals.sweptToTreasuryUsd, mode);
  const lost = formatAmountForMode(data.residuals.permanentlyLostUsd, mode);
  const dust = formatAmountForMode(data.dustThresholdUsd, mode);
  const hasResiduals =
    Number(data.residuals.sweptToTreasuryUsd) > 0 ||
    Number(data.residuals.permanentlyLostUsd) > 0;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que é apagado</Text>
        <Text style={styles.cardDetail}>
          Seu nome, e-mail, CPF, documentos, chave Pix e os dados da sua
          verificação de identidade.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que continua guardado, e por quê</Text>
        <Text style={styles.cardDetail}>
          O registro das suas operações — valores, datas e comprovantes — sem
          nenhum vínculo com você. A lei obriga a guardar por cinco anos.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que é impossível apagar</Text>
        <Text style={styles.cardDetail}>
          Suas transações continuarão visíveis na rede, que é pública e não
          depende do PigFi. Nosso parceiro de pagamentos mantém os registros de
          verificação pelo prazo exigido por lei. E a carteira é arquivada pelo
          provedor e desvinculada de você.
        </Text>
      </View>

      {hasResiduals && (
        <View style={[styles.card, styles.cardWarn]}>
          <Text style={styles.cardTitle}>Valores residuais</Text>
          {/* The threshold comes from the server: a number written here would
              stop matching the rule the moment the configuration changes. */}
          <Text style={styles.cardDetail}>
            Valores abaixo de US$ {dust} serão perdidos ao excluir a conta.
          </Text>
          {Number(data.residuals.sweptToTreasuryUsd) > 0 && (
            <Text style={styles.residual}>US$ {swept} na sua conta</Text>
          )}
          {Number(data.residuals.permanentlyLostUsd) > 0 && (
            <Text style={styles.residual}>US$ {lost} em cotas guardadas</Text>
          )}
        </View>
      )}

      <Checkbox
        checked={acks.dataRetention}
        onPress={() => onToggle('dataRetention')}
        label="Entendi que os registros das minhas operações continuam guardados, sem vínculo comigo."
      />
      <Checkbox
        checked={acks.onchainHistoryPublic}
        onPress={() => onToggle('onchainHistoryPublic')}
        label="Entendi que meu histórico na rede é público e permanente."
      />
      <Checkbox
        checked={acks.irreversible}
        onPress={() => onToggle('irreversible')}
        label="Entendi que a exclusão é imediata e não pode ser desfeita."
      />
    </>
  );
}

function Checkbox({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <PressableScale onPress={onPress}>
      <View style={styles.checkboxRow}>
        <MaterialIcons
          name={checked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={checked ? Accent.success : Colors.mutedForeground}
        />
        <Text style={styles.checkboxLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={disabled ? () => undefined : onPress}>
      <View style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}>
        <Text
          style={[
            styles.primaryBtnText,
            disabled && styles.primaryBtnTextDisabled,
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontFamily: Font.bold,
    fontSize: FontSize.heading,
    color: Colors.foreground,
  },
  headerSub: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },

  body: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 120 },
  centered: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[8],
  },
  muted: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },

  sectionTitle: {
    fontFamily: Font.bold,
    fontSize: FontSize.subheading,
    color: Colors.foreground,
  },
  sectionSub: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing[2],
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardWarn: { borderColor: Accent.accent },
  cardError: { borderColor: Accent.destructive },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  cardTitle: {
    flex: 1,
    fontFamily: Font.semiBold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  cardDetail: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  residual: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.foreground,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingVertical: Spacing[2],
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.foreground,
    lineHeight: 20,
  },

  secondaryBtn: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.foreground,
  },

  ghostBtn: { paddingVertical: Spacing[3], alignItems: 'center' },
  ghostBtnText: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },

  primaryBtn: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[4],
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Accent.destructive,
  },
  primaryBtnDisabled: { backgroundColor: Colors.muted },
  primaryBtnText: {
    fontFamily: Font.bold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  primaryBtnTextDisabled: { color: Colors.mutedForeground },
});
