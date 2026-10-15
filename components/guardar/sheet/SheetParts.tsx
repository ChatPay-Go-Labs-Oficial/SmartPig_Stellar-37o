import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { Button3D, V2Icon, V2Spinner } from '@/components/v2';
import { PENDING_CHECKING } from './operation-copy';

// Peças comuns dos sheets de Guardar e Tirar (Figma "Guardar · Guardar",
// "Tirar USDC" e "Tirar euro/cripto").

/**
 * No Android a região viva (`accessibilityLiveRegion`) já lê a mudança; no
 * iOS ela não existe, então o resultado é anunciado ao VoiceOver.
 */
function useAnnounce(message: string, everywhere = false) {
  useEffect(() => {
    if (everywhere || Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message, everywhere]);
}

// ─── Campo de valor ──────────────────────────────────────────────────────────

interface AmountFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Símbolo à esquerda ("$", "€") ou um ícone (logo do XLM). */
  prefix: React.ReactNode;
  /** Casas aceitas na digitação (7 na Stellar). */
  decimals?: number;
  editable?: boolean;
  accessibilityLabel: string;
}

/** Duração da subida do sheet (animação "slide" do Modal). */
const FOCUS_DELAY_MS = 350;

/**
 * Campo do valor com o teclado numérico do sistema. Aceita vírgula ou ponto
 * e devolve sempre com ponto; corta o que passar das casas do ativo.
 */
export function AmountField({
  value,
  onChangeText,
  prefix,
  decimals = 7,
  editable = true,
  accessibilityLabel,
}: AmountFieldProps) {
  const accent = useAccent();

  // O teclado abre depois que o sheet termina de subir: aberto junto, ele
  // disputava a animação com o ajuste do layout e o modal abria travando.
  const input = useRef<TextInput>(null);
  useEffect(() => {
    const timer = setTimeout(() => input.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Figma 09a/09b: a borda rosa marca o campo preenchido (não o foco).
  return (
    <View style={[styles.field, { borderColor: value ? accent.base : V2Colors.chipBorder }]}>
      {typeof prefix === 'string' ? <Text style={styles.prefix}>{prefix}</Text> : prefix}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChangeText(sanitizeAmount(text, decimals))}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor="rgba(255,255,255,0.2)"
        selectionColor={accent.base}
        editable={editable}
        style={styles.input}
        accessibilityLabel={accessibilityLabel}
        maxFontSizeMultiplier={1.15}
        keyboardAppearance="dark"
      />
    </View>
  );
}

/** Só dígitos e um separador (vírgula vira ponto), com no máximo `decimals` casas. */
export function sanitizeAmount(text: string, decimals: number): string {
  let normalized = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  // Separador repetido no fim (tecla a mais) não conta: "1.2." fica "1.2".
  normalized = normalized.replace(/(\..*)\.$/, '$1');
  // Colado com milhar ("1.234,56"): só o último separador é o decimal.
  const last = normalized.lastIndexOf('.');
  if (normalized.indexOf('.') !== last) {
    normalized = normalized.slice(0, last).replace(/\./g, '') + normalized.slice(last);
  }
  const [integer = '', ...rest] = normalized.split('.');
  const cleanInteger = integer.replace(/^0+(?=\d)/, '');
  if (rest.length === 0) return cleanInteger;
  const fraction = rest.join('').slice(0, decimals);
  return `${cleanInteger || '0'}.${fraction}`;
}

// ─── Atalhos ─────────────────────────────────────────────────────────────────

export interface QuickOption {
  key: string;
  label: string;
}

interface QuickChipsProps {
  options: readonly QuickOption[];
  selected: string | null;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

/** Atalhos de valor ("$10", "25%", "Tudo"). O escolhido fica no destaque. */
export function QuickChips({ options, selected, onSelect, disabled = false }: QuickChipsProps) {
  const accent = useAccent();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              active ? { backgroundColor: accent.base, borderColor: accent.base } : styles.chipIdle,
              pressed && !active && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Linhas de apoio ─────────────────────────────────────────────────────────

/** "Saldo disponível: $12.40" — linha centralizada, discreta. */
export function SheetHint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

/** Frase de apoio centralizada ("O valor volta para a sua carteira."). */
export function SheetCaption({ children }: { children: React.ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

/** "Cerca de $0.71 por ano": o valor em verde no meio da frase. */
export function YieldHint({ value }: { value: string }) {
  return (
    <View style={styles.yieldRow}>
      <Text style={styles.yieldText}>Cerca de</Text>
      <Text style={styles.yieldValue}>{value}</Text>
      <Text style={styles.yieldText}>por ano</Text>
    </View>
  );
}

// ─── Avisos ──────────────────────────────────────────────────────────────────

/** Erro inline do sheet (Figma 08h–08j): cartão vermelho com o motivo. */
export function SheetError({ message }: { message: string }) {
  // O erro não tem região viva (o papel "alert" não lê nada no Android):
  // anuncia nas duas plataformas.
  useAnnounce(message, true);
  return (
    <View style={[styles.notice, styles.noticeError]} accessibilityRole="alert">
      <V2Icon name="alert" size={18} color={V2Colors.error} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

/** Aviso âmbar do sheet (pausa, liquidez, reserva de taxa). */
export function SheetWarning({ message, icon = 'alert' }: { message: string; icon?: 'alert' | 'info' }) {
  return (
    <View style={[styles.notice, styles.noticeWarning]} accessibilityRole="alert">
      <V2Icon name={icon} size={18} color={V2Colors.warning} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

// ─── Status ──────────────────────────────────────────────────────────────────

/** Etapa em andamento (Figma 08c–08e): spinner, título e explicação. */
export function SheetProgress({ title, caption }: { title: string; caption: string }) {
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      <V2Spinner size={32} />
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusCaption}>{caption}</Text>
    </View>
  );
}

/** Concluído (Figma 08f): selo verde com check. */
// O mascote do fim da operação, como no V1 (DepositModal e WithdrawModal):
// feliz ao guardar, triste ao tirar. Cópias de 600 px (200 pt em tela 3x);
// os originais de 1254 px seguem no V1.
const MASCOT = {
  happy: require('@/assets/images/v2/mascote-feliz.png'),
  sad: require('@/assets/images/v2/mascote-triste.png'),
} as const;

interface SheetSuccessProps {
  title: string;
  caption: string;
  /** Mascote no lugar do selo com check (pedido do produto, fora do Figma). */
  mascot?: keyof typeof MASCOT;
  /** Botão para seguir depois do sucesso. */
  action?: { label: string; onPress: () => void };
}

/** Concluído (Figma 08f: selo verde com check), ou o mascote do V1. */
export function SheetSuccess({ title, caption, mascot, action }: SheetSuccessProps) {
  useAnnounce(`${title}. ${caption}`);
  return (
    <View style={styles.successWrap}>
      <View style={[styles.status, styles.statusSuccess]} accessibilityLiveRegion="polite">
        {mascot ? (
          <SuccessMascot source={MASCOT[mascot]} />
        ) : (
          <View style={styles.successBadge}>
            <V2Icon name="check" size={35} color={V2Colors.success} />
          </View>
        )}
        <Text style={[styles.statusTitle, styles.successTitle]}>{title}</Text>
        <Text style={styles.statusCaption}>{caption}</Text>
      </View>
      {action && <Button3D label={action.label} onPress={action.onPress} />}
    </View>
  );
}

/**
 * Entrada em mola e flutuação lenta, os mesmos valores do V1 (mola com
 * amortecimento 7 e massa 0,7; sobe 12 e volta em 1,4 s). Com "reduzir
 * movimento" ligado, a imagem só aparece parada.
 */
function SuccessMascot({ source }: { source: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withSpring(1, { damping: 7, mass: 0.7 });
    const ease = Easing.inOut(Easing.quad);
    float.value = withRepeat(
      withSequence(withTiming(-12, { duration: 1400, easing: ease }), withTiming(0, { duration: 1400, easing: ease })),
      -1,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(float);
    };
  }, [reduceMotion, scale, float]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: float.value }],
  }));

  return (
    <Animated.View style={[styles.mascotBox, animated]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={source} style={styles.mascot} contentFit="contain" />
    </Animated.View>
  );
}

/**
 * Enviado, mas sem confirmação no prazo: nem sucesso nem erro. O ícone de
 * histórico aponta para onde o resultado vai aparecer.
 */
export function SheetPending({
  title,
  caption,
  checking = false,
  note,
}: {
  title: string;
  caption: string;
  /** O app segue verificando: spinner pequeno com a linha de estado. */
  checking?: boolean;
  /** Fim do acompanhamento sem resposta. */
  note?: string;
}) {
  // A nota final (desistiu de verificar) é a instrução do que fazer: no iOS,
  // sem região viva, ela precisa ser anunciada quando aparece.
  useAnnounce(note ? `${title}. ${note}` : `${title}. ${caption}`);
  return (
    <View style={[styles.status, styles.statusSuccess]} accessibilityLiveRegion="polite">
      <View style={[styles.successBadge, styles.pendingBadge]}>
        <V2Icon name="history" size={35} color={V2Colors.warning} />
      </View>
      <Text style={[styles.statusTitle, styles.successTitle]}>{title}</Text>
      <Text style={styles.statusCaption}>{caption}</Text>
      {checking ? (
        <View style={styles.checkingRow}>
          <V2Spinner size={16} />
          <Text style={styles.checkingText}>{PENDING_CHECKING}</Text>
        </View>
      ) : note ? (
        <Text style={styles.pendingNote}>{note}</Text>
      ) : null}
    </View>
  );
}

/** Rótulo acima do campo ("Valor em dólar"). */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Nota de apoio sem cartão (Figma 08p: "Deixamos 1.5 na carteira…"). */
export function SheetNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <V2Icon name="info" size={14} color={V2Colors.text} style={styles.noteIcon} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

// ─── Passo de revisão (Tirar euro/cripto, Figma 16a–16o) ────────────────────

/** Trilho "Passo 1 de 2 · Valor". */
export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  const accent = useAccent();
  return (
    <View style={styles.steps}>
      <View style={styles.stepsTrack}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.stepsBar, { backgroundColor: i < step ? accent.base : 'rgba(255,255,255,0.1)' }]}
          />
        ))}
      </View>
      <Text style={styles.stepsLabel}>{`Passo ${step} de ${total} · ${label}`}</Text>
    </View>
  );
}

export interface SummaryRow {
  label: string;
  value: string;
  highlight?: boolean;
}

/** Resumo em linhas ("Você recebe  1.0000000 XLM"). */
export function SummaryCard({ rows }: { rows: readonly SummaryRow[] }) {
  return (
    <View style={styles.summaryCard}>
      {rows.map((row, i) => (
        <View key={row.label}>
          {i > 0 && <View style={styles.summaryDivider} />}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} numberOfLines={2}>
              {row.label}
            </Text>
            <Text
              style={[styles.summaryValue, row.highlight && styles.summaryValueHighlight]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Link de texto centralizado ("Voltar"). */
export function SheetLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
      accessibilityRole="button"
      hitSlop={8}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: V2Font.bold,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  field: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: V2Radius.key,
    borderWidth: 1,
    backgroundColor: V2Colors.surface,
  },
  // Figma: o número centraliza no espaço depois do prefixo, sem espaçador.
  prefix: {
    fontFamily: V2Font.black,
    fontSize: 22,
    color: V2Colors.textTertiary,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    textAlign: 'center',
    fontFamily: V2Font.black,
    fontSize: 30,
    letterSpacing: -0.6,
    color: V2Colors.onPrimary,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: V2Colors.surface,
    borderColor: V2Colors.chipBorder,
  },
  chipPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    fontFamily: V2Font.extraBold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  chipTextActive: {
    color: V2Colors.onPrimary,
  },
  hint: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  caption: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  yieldRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  yieldText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textSecondary,
  },
  yieldValue: {
    fontFamily: V2Font.extraBold,
    fontSize: 13,
    color: V2Colors.success,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: withAlpha(V2Colors.error, 0.1),
    borderColor: withAlpha(V2Colors.error, 0.3),
  },
  noticeWarning: {
    backgroundColor: withAlpha(V2Colors.warning, 0.1),
    borderColor: withAlpha(V2Colors.warning, 0.3),
  },
  noticeText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // Alinha o ícone de 14 à primeira linha (altura de linha ≈ 18).
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontFamily: V2Font.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  steps: {
    gap: 8,
    paddingBottom: 4,
  },
  stepsTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  stepsBar: {
    flex: 1,
    height: 4,
    borderRadius: V2Radius.full,
  },
  stepsLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  summaryCard: {
    borderRadius: V2Radius.key,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.surface,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: V2Colors.divider,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: {
    flexShrink: 1,
    fontFamily: V2Font.medium,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  summaryValue: {
    flexShrink: 0,
    maxWidth: '60%',
    fontFamily: V2Font.black,
    fontSize: 16,
    color: V2Colors.onPrimary,
  },
  summaryValueHighlight: {
    color: V2Colors.success,
  },
  link: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
  status: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
  statusSuccess: {
    paddingTop: 26,
  },
  successWrap: {
    gap: 4,
  },
  mascotBox: {
    width: 200,
    height: 200,
    // A flutuação sobe 12: a folga evita cortar o topo no sheet.
    marginTop: 4,
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  successBadge: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: withAlpha(V2Colors.success, 0.32),
    backgroundColor: withAlpha(V2Colors.success, 0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  checkingText: {
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    color: V2Colors.textTertiary,
  },
  pendingNote: {
    textAlign: 'center',
    fontFamily: V2Font.semiBold,
    fontSize: 13,
    lineHeight: 19,
    color: V2Colors.warning,
  },
  pendingBadge: {
    borderColor: withAlpha(V2Colors.warning, 0.32),
    backgroundColor: withAlpha(V2Colors.warning, 0.14),
  },
  statusTitle: {
    textAlign: 'center',
    fontFamily: V2Font.black,
    fontSize: 20,
    letterSpacing: -0.4,
    color: V2Colors.onPrimary,
  },
  // No sucesso o título fica sem tracking (Figma 08f / 09g).
  successTitle: {
    letterSpacing: 0,
  },
  statusCaption: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: V2Colors.textSecondary,
  },
});
