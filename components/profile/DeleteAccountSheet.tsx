import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { usePrivy } from '@privy-io/expo';

import { Button3D, SheetLink, V2Icon, V2Sheet, V2Spinner, type V2IconName } from '@/components/v2';
import { V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { blockerCopy } from '@/lib/copy/blockers';
import { formatBlockingAmount, formatResidualAmount } from '@/lib/utils/format';
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

const STEPS: Record<'check' | 'consent' | 'confirm', { position: number; label: string }> = {
  check: { position: 1, label: 'Verificação' },
  consent: { position: 2, label: 'O que acontece' },
  confirm: { position: 3, label: 'Confirmar' },
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

const NO_ACKS: Record<AckKey, boolean> = {
  dataRetention: false,
  onchainHistoryPublic: false,
  irreversible: false,
};

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Exclusão de conta no visual V2 (Figma 29a–29u): verificação, o que
 * acontece, confirmar e o encerramento. O fluxo é o mesmo de antes; mudou só
 * o desenho e alguns textos.
 */
export function DeleteAccountSheet({ visible, onClose }: DeleteAccountSheetProps) {
  const { mode } = useTerms();
  const { logout } = usePrivy();

  const [step, setStep] = useState<Step>('check');
  const [acks, setAcks] = useState<Record<AckKey, boolean>>(NO_ACKS);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const ackedCount = Object.values(acks).filter(Boolean).length;
  const allAcked = ackedCount === CONSENTS.length;
  const isRunning = step === 'running' || step === 'done';

  // Não desmonta ao fechar, então o estado é zerado à mão. Reabrir recomeça na
  // verificação: o saldo pode ter mudado no intervalo.
  useEffect(() => {
    if (visible) {
      void eligibility.refetch();
      return;
    }
    setStep('check');
    setAcks(NO_ACKS);
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
      // A aba Guardar abre já no porquinho (Figma 29d). A rota antiga,
      // /vault/[id]/withdraw, era um placeholder sem saída.
      case 'WITHDRAW_VAULT':
        router.navigate({ pathname: '/(tabs)/vaults', params: { vault: action.vaultId } });
        return;
      case 'WITHDRAW_WALLET':
      case 'OPEN_RAMP':
        router.push('/(tabs)?sacar=1');
        return;
      // Meus presentes mora na Carteira e abre direto (Figma 29i).
      case 'OPEN_GIFTS':
        router.navigate({ pathname: '/(tabs)/wallet', params: { gifts: '1' } });
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
      setError('Não foi possível iniciar a exclusão agora. Tente de novo em alguns instantes.');
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
      // Sem conta ativada na rede não há o que encerrar, e o servidor não manda
      // transação para assinar.
      const signedXdr = request?.closureXdr ? await signXdr(request.closureXdr) : undefined;

      await confirmRequest.mutateAsync({
        requestId: request!.requestId,
        signedXdr,
        acknowledgements: acks,
      });
    } catch {
      // Só aqui a mensagem é verdadeira: a exclusão não chegou a acontecer.
      setStep('confirm');
      setError('Não foi possível concluir a exclusão. Nada foi apagado — tente de novo.');
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
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title="Excluir minha conta"
      icon="alert"
      // A saga em andamento não tem cancelamento (Figma 29s/29t, sem X).
      closable={!isRunning}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isRunning && <Steps step={step as keyof typeof STEPS} />}

        {error && (
          <View style={styles.errorCard}>
            <V2Icon name="alert" size={18} color={V2Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 'check' && (
          <>
            {eligibility.isPending && <Status spinner title="Verificando sua conta..." />}

            {eligibility.isError && (
              <Status
                icon="alert"
                color={V2Colors.error}
                title="Não conseguimos verificar sua conta"
                text="Tente de novo em alguns instantes."
              />
            )}

            {!eligibility.isPending && !eligibility.isError && blockers.length > 0 && (
              <>
                <Text style={styles.intro}>
                  Resolva os pontos abaixo primeiro. Eles existem para o seu dinheiro não se
                  perder.
                </Text>
                {blockers.map((blocker, index) => (
                  <BlockerCard
                    key={`${blocker.code}-${index}`}
                    blocker={blocker}
                    mode={mode}
                    onAction={() => handleAction(blocker)}
                  />
                ))}
              </>
            )}

            {eligible && (
              <Status
                icon="check"
                color={V2Colors.success}
                title="Sua conta pode ser excluída"
                text="Não encontramos dinheiro parado nem operação em andamento."
              />
            )}

            {!eligibility.isPending &&
              (eligible ? (
                <Button3D label="Continuar" onPress={() => setStep('consent')} />
              ) : (
                // Sem "Continuar" desabilitado ao lado das ações dos bloqueios:
                // duas formas iguais, uma delas morta, só disputam a leitura.
                // Enquanto há bloqueio, verificar de novo é a ação.
                <Button3D label="Verificar de novo" onPress={() => void eligibility.refetch()} />
              ))}
          </>
        )}

        {step === 'consent' && data && (
          <>
            <ConsentStep
              data={data}
              mode={mode}
              acks={acks}
              onToggle={(key) => setAcks((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
            <Text style={styles.counter}>
              {ackedCount} de {CONSENTS.length} confirmados
            </Text>
            <Button3D
              label="Continuar"
              loading={openRequest.isPending}
              loadingLabel="Preparando..."
              disabled={!allAcked}
              onPress={() => void handleOpenRequest()}
            />
          </>
        )}

        {step === 'confirm' && (
          <ConfirmStep
            typed={typed}
            onChangeTyped={setTyped}
            onConfirm={() => void handleConfirm()}
            onBack={() => setStep('check')}
          />
        )}

        {step === 'running' && (
          <Status spinner title="Encerrando sua conta..." text="Removendo seus dados." />
        )}
        {step === 'done' && (
          <Status
            icon="check"
            color={V2Colors.success}
            title="Conta excluída"
            text="Até uma próxima."
          />
        )}
      </ScrollView>
    </V2Sheet>
  );
}

/** Figma "passos": três trilhos e "Passo N de 3 · nome". */
function Steps({ step }: { step: keyof typeof STEPS }) {
  const accent = useAccent();
  const { position, label } = STEPS[step];
  return (
    <View style={styles.steps}>
      <View style={styles.track}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[styles.trackBar, n <= position && { backgroundColor: accent.base }]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Passo {position} de 3 · {label}
      </Text>
    </View>
  );
}

/** Figma "status": selo grande (ou spinner), título e texto, centrados. */
function Status({
  spinner = false,
  icon,
  color,
  title,
  text,
}: {
  spinner?: boolean;
  icon?: V2IconName;
  color?: string;
  title: string;
  text?: string;
}) {
  return (
    <View style={styles.status}>
      {spinner ? (
        <V2Spinner size={32} />
      ) : icon && color ? (
        <View
          style={[
            styles.statusSeal,
            { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) },
          ]}
        >
          <V2Icon name={icon} size={35} color={color} />
        </View>
      ) : null}
      <Text style={styles.statusTitle}>{title}</Text>
      {text ? <Text style={styles.statusText}>{text}</Text> : null}
    </View>
  );
}

/**
 * Figma "bloqueio". Com ação, selo de alerta e o botão que leva aonde o
 * dinheiro está; sem ação (só esperar), selo de relógio e nenhum botão.
 */
function BlockerCard({
  blocker,
  mode,
  onAction,
}: {
  blocker: Blocker;
  mode: 'lite' | 'pro';
  onAction: () => void;
}) {
  const copy = blockerCopy(blocker, mode);
  return (
    <View style={styles.blocker}>
      <View style={styles.blockerRow}>
        <View
          style={[
            styles.blockerSeal,
            {
              backgroundColor: blocker.resolvable
                ? withAlpha(V2Colors.warning, 0.14)
                : 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <V2Icon
            name={blocker.resolvable ? 'alert' : 'clock'}
            size={19}
            color={blocker.resolvable ? V2Colors.warning : V2Colors.text}
          />
        </View>
        <View style={styles.blockerTexts}>
          <Text style={styles.blockerTitle}>{copy.title}</Text>
          <Text style={styles.detail}>{copy.detail}</Text>
        </View>
      </View>
      {copy.cta && <Button3D label={copy.cta} variant="glass" onPress={onAction} />}
    </View>
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
  const swept = Number(data.residuals.sweptToTreasuryUsd) > 0;
  const lost = Number(data.residuals.permanentlyLostUsd) > 0;

  return (
    <>
      <Text style={styles.intro}>
        Serão apagados seu nome, e-mail, CPF, documentos, chave Pix e os dados da sua
        verificação de identidade.
      </Text>

      {/* Aviso de dinheiro fica sempre aberto: esconder valor a perder atrás de
          um toque seria esconder o que mais importa. Só as linhas com valor. */}
      {(swept || lost) && (
        <View style={styles.residuals}>
          <View style={styles.residualsHead}>
            <V2Icon name="alert" size={18} color={V2Colors.warning} />
            <Text style={styles.residualsTitle}>Valores residuais</Text>
          </View>
          {/* O limite vem do servidor: um número escrito aqui deixaria de bater
              com a regra assim que a configuração mudasse. */}
          <Text style={styles.detail}>
            Valores abaixo de ${formatBlockingAmount(data.dustThresholdUsd, mode)} serão
            perdidos ao excluir a conta.
          </Text>
          {swept && (
            <Text style={styles.residualLine}>
              ${formatResidualAmount(data.residuals.sweptToTreasuryUsd)} na sua conta
            </Text>
          )}
          {lost && (
            <Text style={styles.residualLine}>
              ${formatResidualAmount(data.residuals.permanentlyLostUsd)} guardados nos{' '}
              {mode === 'pro' ? 'vaults' : 'porquinhos'}
            </Text>
          )}
        </View>
      )}

      <View style={styles.consents}>
        {CONSENTS.map((consent, index) => (
          <View key={consent.key}>
            {index > 0 && <View style={styles.divider} />}
            <ConsentItem
              checked={acks[consent.key]}
              onToggle={() => onToggle(consent.key)}
              title={consent.title}
              detail={consent.detail}
            />
          </View>
        ))}
      </View>
    </>
  );
}

/** Figma "confirmação": a caixa e o título marcam; a seta abre o detalhe. */
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
  const accent = useAccent();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.consent}>
      <View style={styles.consentRow}>
        <Pressable
          onPress={onToggle}
          style={styles.consentCheck}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={title}
        >
          <View
            style={[
              styles.box,
              checked ? { backgroundColor: accent.base, borderColor: accent.base } : styles.boxIdle,
            ]}
          >
            {checked && <V2Icon name="check" size={14} color={V2Colors.onPrimary} />}
          </View>
          <Text style={styles.consentTitle}>{title}</Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Esconder detalhe' : 'Ver detalhe'}
        >
          <V2Icon
            name="chevron-down"
            size={18}
            color={V2Colors.text}
            style={open ? styles.chevronOpen : undefined}
          />
        </Pressable>
      </View>
      {open && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

function ConfirmStep({
  typed,
  onChangeTyped,
  onConfirm,
  onBack,
}: {
  typed: string;
  onChangeTyped: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const accent = useAccent();
  const [focused, setFocused] = useState(false);
  const ready = typed.trim() === CONFIRM_WORD;

  return (
    <>
      <Text style={styles.intro}>
        Digite {CONFIRM_WORD} para confirmar. Depois disso não há volta.
      </Text>
      <TextInput
        value={typed}
        onChangeText={onChangeTyped}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={CONFIRM_WORD}
        placeholderTextColor={V2Colors.textTertiary}
        selectionColor={accent.base}
        style={[
          styles.input,
          typed ? styles.inputFilled : null,
          (focused || typed) && { borderColor: accent.base },
        ]}
      />
      {/* Figma "excluir": fica apagado até a palavra estar certa. */}
      <Pressable
        onPress={onConfirm}
        disabled={!ready}
        style={({ pressed }) => [
          styles.danger,
          !ready && styles.dangerDisabled,
          pressed && styles.dangerPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
      >
        <Text style={styles.dangerText}>Excluir minha conta</Text>
      </Pressable>
      <SheetLink label="Voltar" onPress={onBack} />
    </>
  );
}

const styles = StyleSheet.create({
  // Sem flexShrink a rolagem cresce até o conteúdo e passa da altura da tela.
  scroll: {
    flexShrink: 1,
  },
  body: {
    gap: 14,
  },
  steps: {
    gap: 8,
    paddingBottom: 4,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  trackBar: {
    flex: 1,
    height: 4,
    borderRadius: V2Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
  detail: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.textSecondary,
  },
  status: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 26,
  },
  statusSeal: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  blocker: {
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  blockerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  blockerSeal: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockerTexts: {
    flex: 1,
    gap: 3,
  },
  blockerTitle: {
    fontFamily: V2Font.bold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 12.5,
    lineHeight: 18,
    color: V2Colors.textSecondary,
  },
  residuals: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.warning, 0.3),
    backgroundColor: withAlpha(V2Colors.warning, 0.1),
  },
  residualsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  residualsTitle: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.onPrimary,
  },
  residualLine: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 19,
    color: V2Colors.textSecondary,
  },
  consents: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  consent: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  consentCheck: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxIdle: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  consentTitle: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: V2Colors.onPrimary,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  counter: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
    textAlign: 'center',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontFamily: V2Font.medium,
    fontSize: 16,
    color: V2Colors.onPrimary,
  },
  inputFilled: {
    fontFamily: V2Font.black,
    letterSpacing: 6,
  },
  danger: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.error, 0.4),
    backgroundColor: withAlpha(V2Colors.error, 0.12),
  },
  dangerDisabled: {
    opacity: 0.4,
  },
  dangerPressed: {
    backgroundColor: withAlpha(V2Colors.error, 0.2),
  },
  dangerText: {
    fontFamily: V2Font.black,
    fontSize: 15,
    color: V2Colors.error,
  },
});
