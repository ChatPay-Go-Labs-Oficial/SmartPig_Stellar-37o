import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button3D, V2Icon, V2Sheet, V2Spinner, type V2IconName } from '@/components/v2';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { hasApiErrorCode } from '@/lib/api/errors';
import { isValidUsername } from '@/lib/api/usernames';
import { useCreateUsername, useUsernameAvailability } from '@/lib/queries/usernames.queries';

/** Espera de digitação antes de perguntar a disponibilidade (plano, E7). */
const AVAILABILITY_DELAY_MS = 400;

type FieldState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'invalid'; message: string }
  | { kind: 'error' };

/**
 * Por que o nome não vale (Figma 38f). Curto demais, mas no caminho certo,
 * não é erro: a pessoa ainda está digitando.
 */
function formatProblem(name: string): string | null {
  if (/[\sA-Z]/.test(name)) return 'Sem espaços nem letras maiúsculas.';
  if (!/^[a-z]/.test(name)) return 'Comece com uma letra.';
  if (/[^a-z0-9._]/.test(name)) return 'Use só letras minúsculas, números, ponto ou sublinhado.';
  return null;
}

/** O "@" digitado não faz parte do nome; o campo já mostra o prefixo. */
function withoutAt(raw: string): string {
  return raw.replace(/^@+/, '');
}

interface UsernameSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Nome que a conta já tem: o sheet só o mostra (o @ é permanente). */
  current: string | null;
}

/**
 * Nome de usuário (Figma 38b a 38h): escolher o @, ver se está livre e criar.
 * Com o @ já criado, mostra o nome, sem edição.
 */
export function UsernameSheet({ visible, onClose, current }: UsernameSheetProps) {
  const [name, setName] = useState('');
  const [debounced, setDebounced] = useState('');
  // Recusado pelo backend no criar, mesmo com a consulta dizendo que estava livre.
  const [takenOnCreate, setTakenOnCreate] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const create = useCreateUsername();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(name), AVAILABILITY_DELAY_MS);
    return () => clearTimeout(id);
  }, [name]);

  // Fechou: a próxima abertura começa do zero.
  useEffect(() => {
    if (visible) return;
    setName('');
    setDebounced('');
    setTakenOnCreate(null);
    setFailed(false);
    create.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const valid = isValidUsername(name);
  const availability = useUsernameAvailability(valid && debounced === name ? name : '');

  const field = fieldState();
  function fieldState(): FieldState {
    if (!name) return { kind: 'idle' };
    const problem = formatProblem(name);
    if (problem) return { kind: 'invalid', message: problem };
    if (name.length > 20) return { kind: 'invalid', message: 'Use no máximo 20 caracteres.' };
    if (!valid) return { kind: 'idle' };
    if (takenOnCreate === name) return { kind: 'taken' };
    if (debounced !== name || availability.isFetching) return { kind: 'checking' };
    if (availability.isError) return { kind: 'error' };
    const result = availability.data;
    if (!result) return { kind: 'checking' };
    if (result.available) return { kind: 'available' };
    return result.reason === 'TAKEN'
      ? { kind: 'taken' }
      : { kind: 'invalid', message: 'Use só letras minúsculas, números, ponto ou sublinhado.' };
  }

  function handleCreate() {
    if (field.kind !== 'available' || create.isPending) return;
    setFailed(false);
    create.mutate(name, {
      onError: (error) => {
        if (hasApiErrorCode(error, 'USERNAME_TAKEN')) setTakenOnCreate(name);
        // Criado em outro aparelho: o perfil foi relido e o Perfil mostra o @.
        else if (hasApiErrorCode(error, 'USERNAME_ALREADY_SET')) onClose();
        else if (hasApiErrorCode(error, 'USERNAME_INVALID')) setTakenOnCreate(null);
        else setFailed(true);
      },
    });
  }

  const created = create.data?.username ?? null;
  const shown = created ?? current;

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title="Nome de usuário"
      icon="at"
      closable={!create.isPending}
    >
      {shown ? (
        <UsernameDone username={shown} justCreated={!!created} />
      ) : (
        <View style={styles.body}>
          <Text style={styles.intro}>
            Com um nome de usuário, seus amigos do PigFi encontram você para enviar dinheiro.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Escolha seu nome de usuário</Text>
            <UsernameField
              value={name}
              state={field}
              onChange={(text) => {
                setFailed(false);
                setName(withoutAt(text));
              }}
              onClear={() => setName('')}
              editable={!create.isPending}
            />
            <FieldMessage name={name} state={field} />
            <Text style={styles.rule}>
              De 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado. Comece com uma
              letra.
            </Text>
          </View>

          <View style={styles.notice}>
            <V2Icon name="info" size={14} color={V2Colors.textSecondary} />
            <Text style={styles.noticeText}>
              Depois de criado, o nome de usuário não pode ser trocado.
            </Text>
          </View>

          {failed ? (
            <Text style={styles.failure}>Não foi possível criar agora. Tente de novo.</Text>
          ) : null}

          <Button3D
            label="Criar nome de usuário"
            onPress={handleCreate}
            disabled={field.kind !== 'available'}
            loading={create.isPending}
            loadingLabel="Criar nome de usuário"
          />
        </View>
      )}
    </V2Sheet>
  );
}

interface UsernameFieldProps {
  value: string;
  state: FieldState;
  onChange: (text: string) => void;
  onClear: () => void;
  editable: boolean;
}

/** Campo com o prefixo "@" e o status à direita (Figma "campo do @"). */
function UsernameField({ value, state, onChange, onClear, editable }: UsernameFieldProps) {
  const accent = useAccent();
  const [focused, setFocused] = useState(false);

  const borderColor =
    state.kind === 'available'
      ? V2Colors.success
      : state.kind === 'taken' || state.kind === 'error'
        ? V2Colors.error
        : state.kind === 'invalid'
          ? V2Colors.warning
          : focused || state.kind === 'checking'
            ? accent.base
            : V2Colors.surfaceBorderStrong;

  return (
    <View style={[styles.field, { borderColor }]}>
      <Text style={styles.at}>@</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={24}
        placeholder="seu.nome"
        placeholderTextColor={V2Colors.textTertiary}
        selectionColor={accent.base}
        style={styles.input}
        accessibilityLabel="Nome de usuário"
      />
      <View style={styles.status}>
        {state.kind === 'checking' ? (
          <V2Spinner size={18} color={V2Colors.textSecondary} />
        ) : state.kind === 'available' ? (
          <V2Icon name="check" size={18} color={V2Colors.success} />
        ) : state.kind === 'invalid' ? (
          <V2Icon name="alert" size={18} color={V2Colors.warning} />
        ) : state.kind === 'taken' ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar">
            <V2Icon name="x" size={18} color={V2Colors.error} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Linha abaixo do campo (Figma "mensagem"), por estado. */
function FieldMessage({ name, state }: { name: string; state: FieldState }) {
  let line: { icon?: V2IconName; color: string; text: string } | null = null;
  switch (state.kind) {
    case 'checking':
      line = { color: V2Colors.textTertiary, text: 'Verificando se está disponível...' };
      break;
    case 'available':
      line = { icon: 'check', color: V2Colors.success, text: `@${name} está disponível` };
      break;
    case 'taken':
      // Figma 38e traz sugestões; o backend não as devolve (ponto 3 do plano).
      line = { icon: 'alert', color: V2Colors.error, text: 'Já está em uso.' };
      break;
    case 'invalid':
      line = { icon: 'alert', color: V2Colors.warning, text: state.message };
      break;
    case 'error':
      line = {
        icon: 'alert',
        color: V2Colors.error,
        text: 'Não foi possível verificar. Confira sua conexão e tente de novo.',
      };
      break;
  }
  if (!line) return null;
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      {line.icon ? <V2Icon name={line.icon} size={14} color={line.color} /> : null}
      <Text style={[styles.messageText, { color: line.color }]}>{line.text}</Text>
    </View>
  );
}

/** Figma 38h: @ criado. Aberto de novo pelo Perfil, mostra o @ que a conta tem. */
function UsernameDone({ username, justCreated }: { username: string; justCreated: boolean }) {
  return (
    <View style={styles.done}>
      <View style={styles.doneSeal}>
        <V2Icon name="check" size={30} color={V2Colors.success} />
      </View>
      <Text style={styles.doneTitle}>
        {justCreated ? 'Nome de usuário criado' : `@${username}`}
      </Text>
      <Text style={styles.doneText}>
        {justCreated
          ? `Agora seus amigos do PigFi encontram você por @${username}.`
          : 'Seus amigos do PigFi encontram você por este nome. Ele não pode ser trocado.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
  },
  intro: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontFamily: V2Font.bold,
    fontSize: 13,
    color: V2Colors.text,
  },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  at: {
    fontFamily: V2Font.black,
    fontSize: 22,
    color: V2Colors.textTertiary,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: V2Font.bold,
    fontSize: 20,
    color: V2Colors.text,
  },
  status: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    flexShrink: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
  },
  rule: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: V2Colors.textTertiary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  failure: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.error,
  },
  done: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 18,
    paddingBottom: 12,
  },
  doneSeal: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.success, 0.35),
    backgroundColor: withAlpha(V2Colors.success, 0.14),
    marginBottom: 10,
  },
  doneTitle: {
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  doneText: {
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
});
