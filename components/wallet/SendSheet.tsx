import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AssetIcon, Button3D, ListCard, V2Icon, V2Sheet, V2Spinner } from '@/components/v2';
import {
  AmountField,
  FieldLabel,
  SheetError,
  SheetHint,
  SheetNote,
  SummaryCard,
  type SummaryRow,
} from '@/components/guardar/sheet/SheetParts';
import { V2Colors, V2Font, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useTerms } from '@/hooks/use-terms';
import { hasApiErrorCode } from '@/lib/api/errors';
import { isValidUsername, normalizeUsername, type ResolvedUsername } from '@/lib/api/usernames';
import { useResolveUsername } from '@/lib/queries/usernames.queries';
import { useCurrentUser } from '@/lib/queries/users.queries';
import { authenticateWithDeviceBiometrics } from '@/lib/security/biometrics';
import type { WalletAssetBalance } from '@/lib/stellar/balances';
import { getWalletAssetDefs, type WalletAssetId } from '@/lib/stellar/assets';
import {
  buildSignedPayment,
  submitSignedPayment,
  TransferError,
  type SignedPayment,
} from '@/lib/stellar/transfers';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useContactsStore, type SavedContact } from '@/lib/stores/contacts.store';
import type { LessonLock } from '@/lib/utils/vault-access';

/** Espera de digitação antes de procurar o @ (a mesma da criação do @). */
const SEARCH_DELAY_MS = 400;
/** Taxa de uma operação na rede, em XLM: o envio de XLM precisa deixá-la. */
const NETWORK_FEE_XLM = 0.00001;

type Step = 'who' | 'amount' | 'review' | 'done';

const NETWORK_ERROR = 'Erro de conexão. Verifique sua internet e tente novamente.';
const INSUFFICIENT = 'Saldo insuficiente para realizar o envio.';

interface SendSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Saldos da carteira (Horizon), para as moedas ativas e o saldo disponível. */
  assets: readonly WalletAssetBalance[];
  /** Moeda bloqueada pela trilha no Lite (a mesma regra da Carteira). */
  lockByAsset: ReadonlyMap<string, LessonLock | null>;
  /** Sem @ próprio (19m): abre a criação. */
  onNeedUsername: () => void;
  /** Pro: "Transferir para um endereço Stellar" (fluxo atual, só USDC). */
  onAddress: () => void;
}

/** "10", "10.5" → "10.00", "10.50"; até 7 casas, sem zeros sobrando. */
function amountText(value: string): string {
  const [integer = '0', fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${integer}.${trimmed.padEnd(2, '0')}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** "João Silva" → "João"; sem nome confirmado, o @. */
function shortName(contact: Pick<ResolvedUsername, 'displayName' | 'verified' | 'username'>) {
  return contact.verified ? contact.displayName.split(/\s+/)[0] : `@${contact.username}`;
}

/** "GA7KQ…2MXP" (Figma 19s). */
function shortAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}

/**
 * Enviar dinheiro por @ (Figma 19a a 19i, 19m a 19p; Pro 19q a 19t): para
 * quem, valor e moeda, revisão, biometria e o envio confirmado pela rede.
 */
export function SendSheet({
  visible,
  onClose,
  assets,
  lockByAsset,
  onNeedUsername,
  onAddress,
}: SendSheetProps) {
  const accent = useAccent();
  const { t, isPro } = useTerms();
  const queryClient = useQueryClient();
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const accountId = useAuthStore((s) => s.contractId) ?? '';
  const me = useCurrentUser();
  const myUsername = me.data?.username ?? null;

  const [step, setStep] = useState<Step>('who');
  const [recipient, setRecipient] = useState<ResolvedUsername | null>(null);
  const [asset, setAsset] = useState<WalletAssetId | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentHash, setSentHash] = useState<string | null>(null);
  // Assinado e sem confirmação da rede: o tentar de novo reenvia este mesmo.
  const signed = useRef<SignedPayment | null>(null);

  useEffect(() => {
    if (visible) return;
    setStep('who');
    setRecipient(null);
    setAsset(null);
    setAmount('');
    setSendError(null);
    setSentHash(null);
    signed.current = null;
  }, [visible]);

  // Moedas que a rede conhece, na ordem da Carteira.
  const options = useMemo(() => {
    return getWalletAssetDefs().map((def) => {
      const balance = assets.find((a) => a.id === def.id);
      const spendable = Number(balance?.spendable ?? 0);
      const locked = !isPro && !!lockByAsset.get(def.id);
      return { id: def.id, spendable, locked, enabled: !locked && spendable > 0 };
    });
  }, [assets, lockByAsset, isPro]);

  function chooseRecipient(found: ResolvedUsername) {
    setRecipient(found);
    setAsset((current) => current ?? options.find((o) => o.enabled)?.id ?? null);
    setStep('amount');
  }

  const title = isPro ? 'Transferir' : 'Enviar dinheiro';
  const assetName = (id: WalletAssetId) => t(`carteira.asset.${id}.name`);
  const amountLabel = (id: WalletAssetId, value: string) => {
    const text = amountText(value);
    if (isPro) return `${text} ${id}`;
    if (id === 'USDC') return `$${text}`;
    if (id === 'EURC') return `€${text}`;
    return `${text} de criptomoeda`;
  };

  async function confirm() {
    if (sending || !recipient || !asset || !walletAddress) return;
    setSending(true);
    setSendError(null);
    try {
      if (!signed.current) {
        const auth = await authenticateWithDeviceBiometrics({
          promptMessage: isPro ? 'Confirmar transferência' : 'Confirmar envio',
          requireDeviceLock: true,
        });
        if (!auth.success) {
          if (auth.reason !== 'cancelled' && auth.message) setSendError(auth.message);
          return;
        }
        signed.current = await buildSignedPayment({
          fromAddress: walletAddress,
          toAddress: recipient.stellarAddress,
          asset,
          amount,
        });
      }
      const result = await submitSignedPayment(signed.current);
      signed.current = null;
      setSentHash(result.hash);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', walletAddress] });
    } catch (error) {
      const code = error instanceof TransferError ? error.code : 'UNKNOWN';
      // Sem resposta da rede o envio pode ter chegado: guarda o assinado.
      if (code !== 'NETWORK_ERROR') signed.current = null;
      setSendError(sendErrorMessage(error, recipient, assetName(asset), isPro));
    } finally {
      setSending(false);
    }
  }

  return (
    <V2Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      icon="send"
      pill={{ label: 'Para contatos do PigFi', dotColor: accent.base }}
      closable={!sending}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {me.isSuccess && !myUsername ? (
          <NeedUsername onCreate={onNeedUsername} />
        ) : step === 'who' ? (
          <WhoStep
            accountId={accountId}
            myUsername={myUsername}
            isPro={isPro}
            onChoose={chooseRecipient}
            onAddress={onAddress}
          />
        ) : step === 'amount' && recipient ? (
          <AmountStep
            recipient={recipient}
            options={options}
            asset={asset}
            onAsset={setAsset}
            amount={amount}
            onAmount={setAmount}
            isPro={isPro}
            assetName={assetName}
            amountLabel={amountLabel}
            onChangeRecipient={() => setStep('who')}
            onReview={() => {
              setSendError(null);
              signed.current = null;
              setStep('review');
            }}
          />
        ) : step === 'review' && recipient && asset ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Revise antes de enviar</Text>
            <SummaryCard rows={reviewRows(recipient, asset, amount, isPro, assetName, amountLabel)} />
            <View style={styles.cautionRow}>
              <V2Icon name="info" size={14} color={V2Colors.warning} />
              <Text style={styles.cautionText}>
                {isPro
                  ? 'Confira o contato. Transferências não podem ser desfeitas.'
                  : 'Confira o nome antes de confirmar. Envios não podem ser desfeitos.'}
              </Text>
            </View>
            {sendError ? <SheetError message={sendError} /> : null}
            <View style={styles.actions}>
              <Button3D
                label="Editar"
                variant="glass"
                onPress={() => setStep('amount')}
                disabled={sending}
                style={styles.editButton}
              />
              <Button3D
                label={isPro ? 'Confirmar transferência' : 'Confirmar e enviar'}
                onPress={confirm}
                loading={sending}
                loadingLabel="Enviando..."
                style={styles.confirmButton}
              />
            </View>
          </View>
        ) : step === 'done' && recipient && asset ? (
          <View style={styles.done}>
            <View style={styles.doneSeal}>
              <V2Icon name="check" size={30} color={V2Colors.success} />
            </View>
            <Text style={styles.doneTitle}>
              {isPro ? 'Transferência confirmada' : 'Envio confirmado'}
            </Text>
            <Text style={styles.doneText}>
              {`${amountLabel(asset, amount)} enviados para ${
                recipient.verified ? `${recipient.displayName} (@${recipient.username})` : `@${recipient.username}`
              }.`}
            </Text>
            {isPro && sentHash ? (
              <Text style={styles.doneHash}>{`Tx ${sentHash.slice(0, 6)}…${sentHash.slice(-6)}`}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </V2Sheet>
  );
}

function sendErrorMessage(
  error: unknown,
  recipient: ResolvedUsername,
  assetName: string,
  isPro: boolean,
): string {
  const code = error instanceof TransferError ? error.code : 'UNKNOWN';
  switch (code) {
    case 'NETWORK_ERROR':
      return NETWORK_ERROR;
    case 'INSUFFICIENT_BALANCE':
      return INSUFFICIENT;
    case 'INSUFFICIENT_XLM':
      return 'Falta saldo para a taxa da rede.';
    case 'NO_TRUSTLINE':
    case 'TRUSTLINE_LIMIT':
    case 'ACCOUNT_NOT_FOUND':
      return receivesMessage(recipient, assetName, isPro);
    case 'SIGNING_CANCELLED':
      return 'Envio cancelado. Nada foi enviado.';
    default:
      return 'Não foi possível enviar agora. Tente de novo.';
  }
}

function receivesMessage(recipient: ResolvedUsername, assetName: string, isPro: boolean): string {
  return isPro
    ? `${shortName(recipient)} ainda não recebe ${assetName}. Use outro ativo.`
    : `${shortName(recipient)} ainda não recebe ${assetName.toLowerCase()}. Use outra moeda.`;
}

function reviewRows(
  recipient: ResolvedUsername,
  asset: WalletAssetId,
  amount: string,
  isPro: boolean,
  assetName: (id: WalletAssetId) => string,
  amountLabel: (id: WalletAssetId, value: string) => string,
): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'Valor', value: amountLabel(asset, amount) },
    { label: isPro ? 'Ativo' : 'Moeda', value: assetName(asset) },
    { label: 'Para', value: recipient.displayName },
    { label: 'Nome de usuário', value: `@${recipient.username}` },
  ];
  if (isPro) {
    rows.push({ label: 'Endereço', value: shortAddress(recipient.stellarAddress) });
    rows.push({ label: 'Rede', value: 'Stellar' });
  }
  return rows;
}

// ─── 19m · sem @ próprio ─────────────────────────────────────────────────────

function NeedUsername({ onCreate }: { onCreate: () => void }) {
  const accent = useAccent();
  return (
    <View style={styles.center}>
      <View style={[styles.atSeal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}>
        <V2Icon name="at" size={22} color={accent.light} />
      </View>
      <Text style={styles.centerTitle}>Crie seu nome de usuário</Text>
      <Text style={styles.centerText}>
        Para enviar e receber de contatos do PigFi, você precisa de um nome de usuário.
      </Text>
      <Button3D label="Criar nome de usuário" onPress={onCreate} style={styles.centerButton} />
    </View>
  );
}

// ─── 19a/19b/19g/19h/19i · para quem? ────────────────────────────────────────

interface WhoStepProps {
  accountId: string;
  myUsername: string | null;
  isPro: boolean;
  onChoose: (found: ResolvedUsername) => void;
  onAddress: () => void;
}

function WhoStep({ accountId, myUsername, isPro, onChoose, onAddress }: WhoStepProps) {
  const accent = useAccent();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const contacts = useContactsStore((s) => s.byAccount[accountId]) ?? EMPTY_CONTACTS;
  const saveContact = useContactsStore((s) => s.save);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), SEARCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [query]);

  const name = normalizeUsername(query);
  const settled = normalizeUsername(debounced) === name;
  const valid = isValidUsername(name);
  const resolve = useResolveUsername(valid && settled ? name : '');
  const found = valid && settled ? resolve.data : undefined;
  const notFound =
    name.length >= 3 &&
    settled &&
    (!valid || (resolve.isError && hasApiErrorCode(resolve.error, 'USERNAME_NOT_FOUND')));
  const failed = valid && settled && resolve.isError && !notFound;
  const searching = valid && (!settled || resolve.isFetching);
  const saved = !!found && contacts.some((c) => c.username === found.username);

  return (
    <View style={styles.section}>
      <View style={[styles.search, query ? { borderColor: accent.base } : null]}>
        {query ? <Text style={styles.searchAt}>@</Text> : null}
        <TextInput
          value={query}
          onChangeText={(text) => setQuery(text.replace(/^@+/, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar por nome de usuário"
          placeholderTextColor={V2Colors.textTertiary}
          selectionColor={accent.base}
          style={[styles.searchInput, query ? styles.searchInputFilled : null]}
          accessibilityLabel="Nome de usuário de quem vai receber"
          returnKeyType="search"
        />
        {searching ? <V2Spinner size={16} color={V2Colors.textSecondary} /> : null}
      </View>

      {!query ? (
        contacts.length > 0 ? (
          <>
            <Text style={styles.groupTitle}>Seus contatos</Text>
            <ListCard>
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.username}
                  contact={contact}
                  // O @ é resolvido de novo antes de seguir (plano, 12.2).
                  onPress={() => setQuery(contact.username)}
                />
              ))}
            </ListCard>
          </>
        ) : (
          <EmptyState
            title="Você ainda não tem contatos"
            text="Busque pelo nome de usuário de quem vai receber. Depois, é só salvar o contato."
          />
        )
      ) : found ? (
        found.username === myUsername ? (
          <EmptyState title="Esse é o seu nome de usuário" text="Busque o @ de quem vai receber." />
        ) : (
          <>
            <Text style={styles.groupTitle}>Resultado</Text>
            <ListCard>
              <ContactRow
                contact={found}
                action={
                  <Pressable
                    onPress={() => saveContact(accountId, toContact(found))}
                    disabled={saved}
                    style={styles.saveChip}
                    accessibilityRole="button"
                    hitSlop={6}
                  >
                    <Text style={styles.saveText}>{saved ? 'Salvo' : 'Salvar'}</Text>
                  </Pressable>
                }
              />
            </ListCard>
            {!found.verified ? (
              <SheetNote>
                Essa pessoa ainda não confirmou o nome no cadastro. Confira o nome de usuário antes de
                enviar.
              </SheetNote>
            ) : null}
            <Button3D
              label={`Enviar para ${found.verified ? found.displayName : `@${found.username}`}`}
              onPress={() => onChoose(found)}
            />
          </>
        )
      ) : notFound ? (
        <EmptyState
          title={`Ninguém usa @${name} no PigFi`}
          text="Confira se digitou certo. Por enquanto, dá para enviar só para quem usa o PigFi."
        />
      ) : failed ? (
        <SheetError message={NETWORK_ERROR} />
      ) : null}

      {isPro ? (
        <Pressable
          onPress={onAddress}
          style={({ pressed }) => [styles.addressRow, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <V2Icon name="send" size={16} color={V2Colors.textSecondary} />
          <Text style={styles.addressText}>Transferir para um endereço Stellar</Text>
          <V2Icon name="chevron-right" size={16} color={V2Colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const EMPTY_CONTACTS: SavedContact[] = [];

function toContact(found: ResolvedUsername): SavedContact {
  return { username: found.username, displayName: found.displayName, verified: found.verified };
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <V2Icon name="user" size={22} color={V2Colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/** Avatar com as iniciais do nome; sem nome confirmado, o "@". */
function Avatar({ contact }: { contact: Pick<SavedContact, 'displayName' | 'verified'> }) {
  const accent = useAccent();
  return (
    <View style={[styles.avatar, { backgroundColor: accent.alpha(0.16), borderColor: accent.alpha(0.32) }]}>
      {contact.verified ? (
        <Text style={[styles.avatarText, { color: accent.light }]}>{initials(contact.displayName)}</Text>
      ) : (
        <V2Icon name="at" size={18} color={accent.light} />
      )}
    </View>
  );
}

function ContactRow({
  contact,
  onPress,
  action,
}: {
  contact: SavedContact;
  onPress?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Avatar contact={contact} />
      <View style={styles.contactTexts}>
        <View style={styles.contactNameRow}>
          <Text style={[styles.contactName, !contact.verified && styles.contactNameMuted]} numberOfLines={1}>
            {contact.displayName}
          </Text>
          {contact.verified ? <V2Icon name="shield" size={14} color={V2Colors.success} /> : null}
        </View>
        <Text style={styles.contactUser} numberOfLines={1}>
          @{contact.username}
        </Text>
      </View>
      {action ?? (onPress ? <V2Icon name="chevron-right" size={18} color={V2Colors.textSecondary} /> : null)}
    </Pressable>
  );
}

// ─── 19c/19n/19o · valor e moeda ─────────────────────────────────────────────

interface AssetOption {
  id: WalletAssetId;
  spendable: number;
  locked: boolean;
  enabled: boolean;
}

interface AmountStepProps {
  recipient: ResolvedUsername;
  options: AssetOption[];
  asset: WalletAssetId | null;
  onAsset: (id: WalletAssetId) => void;
  amount: string;
  onAmount: (value: string) => void;
  isPro: boolean;
  assetName: (id: WalletAssetId) => string;
  amountLabel: (id: WalletAssetId, value: string) => string;
  onChangeRecipient: () => void;
  onReview: () => void;
}

function AmountStep({
  recipient,
  options,
  asset,
  onAsset,
  amount,
  onAmount,
  isPro,
  assetName,
  amountLabel,
  onChangeRecipient,
  onReview,
}: AmountStepProps) {
  const accent = useAccent();
  const option = options.find((o) => o.id === asset) ?? null;
  const value = Number(amount) || 0;
  const receives = asset ? recipient.receives[asset] : false;
  const fee = asset === 'XLM' ? NETWORK_FEE_XLM : 0;
  const insufficient = !!option && value > 0 && value + fee > option.spendable;
  const ready = !!option?.enabled && value > 0 && receives && !insufficient;

  return (
    <View style={styles.section}>
      <View style={styles.recipientCard}>
        <ContactRow
          contact={recipient}
          action={
            <Pressable onPress={onChangeRecipient} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.changeText, { color: accent.light }]}>Trocar</Text>
            </Pressable>
          }
        />
      </View>

      <FieldLabel>{isPro ? 'Ativo' : 'Moeda'}</FieldLabel>
      <View style={styles.assetChips}>
        {options.map((o) => {
          const active = o.id === asset;
          return (
            <Pressable
              key={o.id}
              onPress={() => onAsset(o.id)}
              disabled={!o.enabled}
              style={[
                styles.assetChip,
                active && { borderColor: accent.base, backgroundColor: accent.alpha(0.14) },
                !o.enabled && styles.assetChipDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !o.enabled }}
            >
              {o.locked ? (
                <V2Icon name="lock" size={14} color={V2Colors.textTertiary} />
              ) : (
                <AssetIcon asset={o.id} size={18} round />
              )}
              <Text style={[styles.assetChipText, active && styles.assetChipTextActive]}>
                {isPro ? o.id : assetName(o.id)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {asset ? (
        <>
          <FieldLabel>{`Valor em ${isPro ? asset : assetName(asset).toLowerCase()}`}</FieldLabel>
          <AmountField
            value={amount}
            onChangeText={onAmount}
            prefix={asset === 'USDC' ? '$' : asset === 'EURC' ? '€' : <AssetIcon asset="XLM" size={22} round />}
            accessibilityLabel="Valor do envio"
          />
          <SheetHint>{`Saldo disponível: ${amountLabel(asset, String(option?.spendable ?? 0))}`}</SheetHint>
          {!receives ? (
            <SheetError message={receivesMessage(recipient, assetName(asset), isPro)} />
          ) : insufficient ? (
            <SheetError message={INSUFFICIENT} />
          ) : (
            <SheetNote>
              {isPro
                ? 'Confira o contato. Transferências não podem ser desfeitas.'
                : 'Confira para quem está enviando. Envios não podem ser desfeitos.'}
            </SheetNote>
          )}
        </>
      ) : (
        <SheetError message="Você ainda não tem saldo para enviar." />
      )}

      <Button3D
        label={isPro ? 'Revisar transferência' : 'Revisar envio'}
        onPress={onReview}
        disabled={!ready}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingBottom: 4 },
  section: { gap: 12 },
  heading: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchAt: {
    fontFamily: V2Font.black,
    fontSize: 18,
    color: V2Colors.textTertiary,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: V2Font.medium,
    fontSize: 15,
    color: V2Colors.text,
  },
  searchInputFilled: {
    fontFamily: V2Font.bold,
    fontSize: 17,
  },
  groupTitle: {
    paddingLeft: 2,
    marginTop: 2,
    fontFamily: V2Font.extraBold,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: V2Colors.textTertiary,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: V2Font.black,
    fontSize: 14,
  },
  contactTexts: { flex: 1, minWidth: 0, gap: 2 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactName: {
    flexShrink: 1,
    fontFamily: V2Font.bold,
    fontSize: 15,
    color: V2Colors.onPrimary,
  },
  contactNameMuted: { color: V2Colors.textSecondary },
  contactUser: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  saveChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: V2Colors.chip,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
  },
  saveText: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    marginTop: 4,
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.4,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    backgroundColor: V2Colors.surface,
  },
  addressText: {
    flex: 1,
    fontFamily: V2Font.semiBold,
    fontSize: 13.5,
    color: V2Colors.text,
  },
  recipientCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorder,
    backgroundColor: V2Colors.surface,
    overflow: 'hidden',
  },
  changeText: {
    fontFamily: V2Font.bold,
    fontSize: 13.5,
  },
  assetChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.surface,
  },
  assetChipDisabled: { opacity: 0.45 },
  assetChipText: {
    fontFamily: V2Font.semiBold,
    fontSize: 13.5,
    color: V2Colors.textSecondary,
  },
  assetChipTextActive: {
    fontFamily: V2Font.extraBold,
    color: V2Colors.onPrimary,
  },
  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cautionText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  actions: { flexDirection: 'row', gap: 10 },
  editButton: { flex: 0.42 },
  confirmButton: { flex: 1 },
  center: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  atSeal: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerTitle: {
    fontFamily: V2Font.black,
    fontSize: 18,
    color: V2Colors.onPrimary,
    textAlign: 'center',
  },
  centerText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: V2Colors.textSecondary,
    textAlign: 'center',
  },
  centerButton: { alignSelf: 'stretch', marginTop: 10 },
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
  doneHash: {
    fontFamily: V2Font.medium,
    fontSize: 12,
    color: V2Colors.textTertiary,
  },
});
