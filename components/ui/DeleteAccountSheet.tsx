import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { usePrivy } from '@privy-io/expo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Card } from './Card';
import { DeletionStepper } from './DeletionStepper';
import { Input } from './Input';
import { PressableScale } from './PressableScale';
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Gradients,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTerms } from '@/hooks/use-terms';
import { blockerCopy } from '@/lib/copy/blockers';
import {
  formatBlockingAmount,
  formatResidualAmount,
} from '@/lib/utils/format';
import { signXdr } from '@/lib/stellar/kit';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import { wipeLocalState } from '@/lib/security/wipe-local-state';
import { blockSessionRestore } from '@/lib/security/session-restore-guard';
import type { Blocker, EligibilityResult } from '@/lib/api/account-deletion';
import {
  useAccountDeletionEligibility,
  useConfirmAccountDeletion,
  useRequestAccountDeletion,
} from '@/lib/queries/account-deletion.queries';

type Step = 'check' | 'consent' | 'confirm' | 'running' | 'done';
type AckKey = 'dataRetention' | 'onchainHistoryPublic' | 'irreversible';

const CONFIRM_WORD = 'EXCLUIR';

const STEP_POSITION: Record<'check' | 'consent' | 'confirm', 1 | 2 | 3> = {
  check: 1,
  consent: 2,
  confirm: 3,
};

/**
 * O título afirma a consequência por extenso de propósito: mesmo com o detalhe
 * fechado, quem marca a caixa leu o que está confirmando.
 */
const CONSENTS: { key: AckKey; title: string; detail: string }[] = [
  {
    key: 'dataRetention',
    title: 'Seus registros de operações continuam guardados por cinco anos',
    detail:
      'Valores, datas e comprovantes ficam sem nenhum vínculo com você. A lei obriga a guardar por esse prazo, e nosso parceiro de pagamentos mantém os registros da verificação de identidade pelo mesmo motivo.',
  },
  {
    key: 'onchainHistoryPublic',
    title: 'Seu histórico na rede é público e permanente',
    detail:
      'Suas transações continuam visíveis na rede, que é pública e não depende do PigFi. A carteira é arquivada pelo provedor e desvinculada de você.',
  },
  {
    key: 'irreversible',
    title: 'A exclusão é imediata e não pode ser desfeita',
    detail:
      'Assim que você confirmar, a conta é encerrada na rede e seus dados são apagados. Não existe forma de voltar atrás nem de recuperar o que foi apagado.',
  },
];

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function DeleteAccountSheet({
  visible,
  onClose,
}: DeleteAccountSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { mode } = useTerms();
  const { logout } = usePrivy();

  const [step, setStep] = useState<Step>('check');
  const [acks, setAcks] = useState<Record<AckKey, boolean>>({
    dataRetention: false,
    onchainHistoryPublic: false,
    irreversible: false,
  });
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [request, setRequest] = useState<{
    requestId: string;
    closureXdr: string | null;
  } | null>(null);

  const eligibility = useAccountDeletionEligibility(visible && step === 'check');
  const openRequest = useRequestAccountDeletion();
  const confirmRequest = useConfirmAccountDeletion();

  const data = eligibility.data;
  const blockers = data?.blockers ?? [];
  const eligible = data?.eligible === true;
  useEffect(() => {
    if (!data) return;
  }, [data]);

  const ackedCount = Object.values(acks).filter(Boolean).length;
  const allAcked = ackedCount === CONSENTS.length;
  const isRunning = step === 'running' || step === 'done';

  // Em pixels, não em porcentagem: porcentagem só resolve contra um pai de
  // altura definida, e o teclado muda essa altura no meio do uso.
  const sheetMaxHeight = Math.max(
    240,
    screenHeight - insets.top - keyboardHeight - Spacing[12],
  );

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

  // Não desmonta ao fechar, então o estado é zerado à mão. Reabrir recomeça na
  // verificação: o saldo pode ter mudado no intervalo.
  useEffect(() => {
    if (visible) {
      void eligibility.refetch();
      return;
    }
    setStep('check');
    setAcks({
      dataRetention: false,
      onchainHistoryPublic: false,
      irreversible: false,
    });
    setTyped('');
    setError(null);
    setRequest(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Resolver um bloqueio é sair da exclusão e ir onde a coisa mora. O usuário
  // volta por conta própria quando quiser — trazê-lo de volta sozinho seria
  // decidir por ele que a exclusão continua sendo o que ele quer.
  function handleAction(blocker: Blocker) {
    const action = blocker.action;
    if (!action) return;
    onClose();

    switch (action.type) {
      case 'WITHDRAW_VAULT':
        if (action.vaultId) router.push(`/vault/${action.vaultId}/withdraw`);
        return;
      case 'WITHDRAW_WALLET':
      case 'OPEN_RAMP':
        router.push('/(tabs)?sacar=1');
        return;
      case 'OPEN_GIFTS':
        router.push('/(tabs)/profile');
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
    } catch {
      // Só aqui a mensagem é verdadeira: a exclusão não chegou a acontecer.
      setStep('confirm');
      setError(
        'Não foi possível concluir a exclusão. Nada foi apagado — tente de novo.',
      );
      return;
    }

    // Daqui para baixo a conta já não existe. Nada nesta faixa pode voltar para
    // a confirmação nem dizer que nada foi apagado.
    blockSessionRestore();
    await wipeLocalState();
    try {
      await logout();
    } catch {
      // Esperado: o token que o logout usaria morreu junto com a identidade.
    }

    setStep('done');
    router.replace('/(auth)');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      // A saga em andamento não tem cancelamento.
      onRequestClose={isRunning ? undefined : onClose}
    >
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        {/* Irmã da folha, não ancestral: um Pressable em volta disputa o
            responder com a ScrollView e trava a rolagem. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isRunning ? undefined : onClose}
        />

        {/* Filha direta do backdrop: um nível sem altura definida quebra o
            limite e o conteúdo vaza da tela. */}
        <View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom:
                keyboardHeight > 0 ? Spacing[4] : Spacing[6] + insets.bottom,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <LinearGradient
              colors={Gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <MaterialIcons name="delete-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.headerTitle}>Excluir minha conta</Text>
            {!isRunning && (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <MaterialIcons
                  name="close"
                  size={16}
                  color={Colors.mutedForeground}
                />
              </Pressable>
            )}
          </View>

          {!isRunning && <DeletionStepper step={STEP_POSITION[step]} />}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <Card style={[styles.card, styles.cardError]}>
                <Text style={styles.cardDetail}>{error}</Text>
              </Card>
            )}

            {step === 'check' && (
              <>
                {eligibility.isPending && (
                  <View style={styles.centered}>
                    <ActivityIndicator color={Accent.primary} size="large" />
                    <Text style={styles.muted}>Verificando sua conta...</Text>
                  </View>
                )}

                {eligibility.isError && (
                  <Card style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Não conseguimos verificar sua conta
                    </Text>
                    <Text style={styles.cardDetail}>
                      Tente de novo em alguns instantes.
                    </Text>
                  </Card>
                )}

                {!eligibility.isPending &&
                  !eligibility.isError &&
                  blockers.length > 0 && (
                    <>
                      <Text style={styles.sectionSub}>
                        Resolva os pontos abaixo primeiro. Eles existem para o
                        seu dinheiro não se perder.
                      </Text>

                      {blockers.map((blocker, index) => {
                        const copy = blockerCopy(blocker, mode);
                        return (
                          <Card
                            key={`${blocker.code}-${index}`}
                            style={styles.card}
                          >
                            <View style={styles.cardHead}>
                              <View
                                style={[
                                  styles.cardIconWrap,
                                  blocker.resolvable
                                    ? styles.cardIconWarn
                                    : styles.cardIconMuted,
                                ]}
                              >
                                <MaterialIcons
                                  name={
                                    blocker.resolvable
                                      ? 'error-outline'
                                      : 'schedule'
                                  }
                                  size={18}
                                  color={
                                    blocker.resolvable
                                      ? Accent.accent
                                      : Colors.mutedForeground
                                  }
                                />
                              </View>
                              <Text style={styles.cardTitle}>{copy.title}</Text>
                            </View>
                            <Text style={styles.cardDetail}>{copy.detail}</Text>
                            {copy.cta && (
                              <SecondaryAction
                                label={copy.cta}
                                onPress={() => handleAction(blocker)}
                              />
                            )}
                          </Card>
                        );
                      })}
                    </>
                  )}

                {eligible && (
                  <Card style={styles.card}>
                    <View style={styles.cardHead}>
                      <View style={[styles.cardIconWrap, styles.cardIconOk]}>
                        <MaterialIcons
                          name="check-circle-outline"
                          size={18}
                          color={Accent.success}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        Sua conta pode ser excluída
                      </Text>
                    </View>
                    <Text style={styles.cardDetail}>
                      Não encontramos dinheiro parado nem operação em andamento.
                    </Text>
                  </Card>
                )}
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

            {step === 'confirm' && (
              <>
                <Text style={styles.sectionSub}>
                  Digite {CONFIRM_WORD} para confirmar. Depois disso não há
                  volta.
                </Text>
                <Input
                  value={typed}
                  onChangeText={setTyped}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={CONFIRM_WORD}
                />
              </>
            )}

            {isRunning && (
              <View style={styles.centered}>
                <ActivityIndicator color={Accent.primary} size="large" />
                <Text style={styles.muted}>
                  {step === 'done'
                    ? 'Conta excluída. Até uma próxima.'
                    : 'Encerrando sua conta e removendo seus dados...'}
                </Text>
              </View>
            )}
          </ScrollView>

          {!isRunning && (
            <View style={styles.footer}>
              {step === 'check' &&
                (eligible ? (
                  <PrimaryAction
                    label="Continuar"
                    onPress={() => setStep('consent')}
                  />
                ) : (
                  // Sem "Continuar" desabilitado ao lado das ações dos
                  // bloqueios: duas formas iguais, uma delas morta, só disputam
                  // a leitura. Enquanto há bloqueio, reverificar é a ação.
                  <PrimaryAction
                    label="Verificar de novo"
                    onPress={() => void eligibility.refetch()}
                  />
                ))}

              {step === 'consent' && (
                <>
                  <Text style={styles.footerCounter}>
                    {ackedCount} de {CONSENTS.length} confirmados
                  </Text>
                  <PrimaryAction
                    label={openRequest.isPending ? 'Preparando...' : 'Continuar'}
                    disabled={!allAcked || openRequest.isPending}
                    onPress={() => void handleOpenRequest()}
                  />
                </>
              )}

              {step === 'confirm' && (
                <>
                  <DangerAction
                    label="Excluir minha conta"
                    disabled={typed.trim() !== CONFIRM_WORD}
                    onPress={() => void handleConfirm()}
                  />
                  <LinkAction
                    label="Voltar"
                    onPress={() => setStep('check')}
                  />
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ConsentStep({
  data,
  mode,
  acks,
  onToggle,
}: {
  data: EligibilityResult;
  mode: 'lite' | 'pro';
  acks: Record<AckKey, boolean>;
  onToggle: (key: AckKey) => void;
}) {
  const swept = formatResidualAmount(data.residuals.sweptToTreasuryUsd, mode);
  const lost = formatResidualAmount(data.residuals.permanentlyLostUsd, mode);
  const dust = formatBlockingAmount(data.dustThresholdUsd, mode);
  const hasResiduals =
    Number(data.residuals.sweptToTreasuryUsd) > 0 ||
    Number(data.residuals.permanentlyLostUsd) > 0;

  return (
    <>
      <Text style={styles.sectionSub}>
        Serão apagados seu nome, e-mail, CPF, documentos, chave Pix e os dados
        da sua verificação de identidade.
      </Text>

      {/* Aviso de dinheiro fica sempre aberto: esconder valor a perder atrás de
          um toque seria esconder o que mais importa. */}
      {hasResiduals && (
        <Card style={[styles.card, styles.cardWarn]}>
          <View style={styles.cardHead}>
            <View style={[styles.cardIconWrap, styles.cardIconWarn]}>
              <MaterialIcons
                name="error-outline"
                size={18}
                color={Accent.accent}
              />
            </View>
            <Text style={styles.cardTitle}>Valores residuais</Text>
          </View>
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
        </Card>
      )}

      {CONSENTS.map((consent) => (
        <ConsentItem
          key={consent.key}
          checked={acks[consent.key]}
          onToggle={() => onToggle(consent.key)}
          title={consent.title}
          detail={consent.detail}
        />
      ))}
    </>
  );
}

function ConsentItem({
  checked,
  onToggle,
  title,
  detail,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  detail: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.consentItem, checked && styles.consentItemOn]}>
      <Pressable style={styles.consentHead} onPress={onToggle}>
        <MaterialIcons
          name={checked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={checked ? Accent.success : Colors.mutedForeground}
        />
        <Text style={styles.consentTitle}>{title}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={12}>
          <MaterialIcons
            name={open ? 'expand-less' : 'expand-more'}
            size={22}
            color={Colors.mutedForeground}
          />
        </Pressable>
      </Pressable>

      {open && <Text style={styles.consentDetail}>{detail}</Text>}
    </View>
  );
}

function PrimaryAction({
  label,
  onPress,
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <PressableScale onPress={disabled ? () => undefined : onPress}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.actionBtn,
          compact && styles.actionBtnCompact,
          disabled && styles.btnDisabled,
        ]}
      >
        <Text style={[styles.actionBtnText, compact && styles.actionBtnTextSm]}>
          {label}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}

/** Ação dentro de um card: presente, sem competir com o rosa do rodapé. */
function SecondaryAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress}>
      <View style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function LinkAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress}>
      <Text style={styles.linkAction}>{label}</Text>
    </PressableScale>
  );
}

function DangerAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <PressableScale onPress={disabled ? () => undefined : onPress}>
      <View style={[styles.dangerBtn, disabled && styles.btnDisabled]}>
        <Text style={styles.dangerBtnText}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // ── Casca do sheet ──
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[3],
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
    marginBottom: Spacing[4],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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

  // Sem `flexShrink` a ScrollView cresce até o conteúdo e empurra o rodapé para
  // fora da tela.
  scroll: {
    flexShrink: 1,
  },
  body: {
    paddingBottom: Spacing[3],
    gap: Spacing[3],
  },

  footer: {
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing[1],
  },
  footerCounter: {
    paddingBottom: Spacing[1],
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },

  sectionSub: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },

  // ── Itens de consentimento ──
  consentItem: {
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  consentItemOn: {
    borderColor: Accent.success,
  },
  consentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  consentTitle: {
    flex: 1,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
    lineHeight: 19,
  },
  consentDetail: {
    marginTop: Spacing[2],
    paddingLeft: 32,
    fontSize: FontSize.label,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },

  // ── Cards ──
  card: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardError: {
    borderColor: Accent.destructive,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  cardWarn: {
    borderColor: Accent.accent,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardIconWarn: {
    backgroundColor: 'rgba(255,159,10,0.12)',
  },
  cardIconMuted: {
    backgroundColor: Colors.muted,
  },
  cardIconOk: {
    backgroundColor: 'rgba(45,212,132,0.12)',
  },
  cardTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  cardDetail: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  residual: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },

  // ── Ações ──
  actionBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnCompact: {
    paddingVertical: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },
  actionBtnTextSm: {
    fontSize: FontSize.bodySmall,
  },
  secondaryBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  secondaryBtnText: {
    color: Colors.foreground,
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
  },
  linkAction: {
    paddingVertical: Spacing[2],
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Accent.primary,
    textAlign: 'center',
  },
  dangerBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Accent.destructive,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  dangerBtnText: {
    color: Accent.destructive,
    fontSize: FontSize.body,
    fontFamily: Font.bold,
  },

  centered: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[8],
  },
  muted: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
