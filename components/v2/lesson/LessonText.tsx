import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon } from '../V2Icon';

// Peças de texto e o corpo dos passos da lição (Figma 35a a 35h): o corpo
// empilha de 14 em 14, e as ações ficam no pé do sheet.

/** Aviso do chip "Valores de exemplo" (conteúdo v1.1.1, seção 3). */
const VALUES_NOTICE =
  'Vamos usar valores inventados para aprender. Os preços reais podem ser diferentes.';

/** Texto corrido da lição (guia e explicação): Medium 16, entrelinha 1,45. */
const BODY_SIZE = 16;

interface LessonStepBodyProps {
  children: ReactNode;
  /** Botão e link do pé (Figma "ações"). */
  actions?: ReactNode;
  /** Por cima do corpo, preso embaixo: o retorno da pergunta (35e e 35h). */
  overlay?: ReactNode;
  /** Espaço entre os blocos: 14 nos passos, 12 na conclusão (35g). */
  gap?: number;
}

/**
 * Corpo de um passo: um passo por tela, sem rolagem. Se a fonte do aparelho
 * estiver grande e o passo não couber, o conteúdo rola, as ações ficam fixas
 * e um esmaecimento embaixo avisa que há mais texto.
 */
export function LessonStepBody({ children, actions, overlay, gap = 14 }: LessonStepBodyProps) {
  const [frame, setFrame] = useState(0);
  const [content, setContent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const overflows = content - frame > 1;

  return (
    <View style={styles.stepBody}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.stepContent, { gap }]}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          onLayout={(event) => setFrame(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContent(height)}
          scrollEventThrottle={64}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 4);
          }}
        >
          {children}
        </ScrollView>
        {overflows && !atEnd ? (
          <LinearGradient
            colors={['rgba(18,12,30,0)', V2Colors.sheetBase]}
            style={styles.fade}
            pointerEvents="none"
          />
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {overlay}
    </View>
  );
}

/** Linha acima do título: a lição (rosa) ou "Para pensar · opcional" (apagada). */
export function LessonEyebrow({ children, muted = false }: { children: string; muted?: boolean }) {
  const accent = useAccent();
  return (
    <Text style={[styles.eyebrow, { color: muted ? V2Colors.textTertiary : accent.light }]}>
      {children}
    </Text>
  );
}

/** Título do passo: 24 nas telas, 22 nas perguntas e na reflexão. */
export function LessonTitle({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/**
 * Guia e explicação. O termo novo, quando aparece no texto, vem em destaque
 * (Figma 35b: "câmbio" em ExtraBold branco).
 */
export function LessonBody({ text, highlight }: { text: string; highlight?: string | null }) {
  const at = highlight ? text.toLocaleLowerCase('pt-BR').indexOf(highlight.toLocaleLowerCase('pt-BR')) : -1;
  if (!highlight || at < 0) return <Text style={styles.body}>{text}</Text>;
  return (
    <Text style={styles.body}>
      {text.slice(0, at)}
      <Text style={styles.bodyStrong}>{text.slice(at, at + highlight.length)}</Text>
      {text.slice(at + highlight.length)}
    </Text>
  );
}

/**
 * Chip "Valores de exemplo" (35b): o toque mostra o aviso do conteúdo num
 * balão logo abaixo, por cima do que vem depois.
 */
export function ValuesExampleChip() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.chipAnchor}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={[styles.chip, styles.valuesChip]}
        accessibilityRole="button"
        accessibilityLabel="Valores de exemplo"
        accessibilityHint={open ? 'Esconde o aviso' : 'Mostra o aviso sobre os valores'}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
      >
        <V2Icon name="info" size={13} color={V2Colors.textSecondary} />
        <Text style={[styles.chipText, { color: V2Colors.textSecondary }]}>Valores de exemplo</Text>
      </Pressable>
      {open ? (
        <Pressable
          onPress={() => setOpen(false)}
          style={styles.notice}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          <Text style={styles.noticeText}>{VALUES_NOTICE}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Chip "Termo novo: ___" no fim da tela (35b). */
export function NewTermChip({ term }: { term: string }) {
  const accent = useAccent();
  return (
    <View
      style={[styles.chip, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
    >
      <V2Icon name="sparkles" size={13} color={accent.light} />
      <Text style={[styles.chipText, { color: accent.light }]}>Termo novo: {term}</Text>
    </View>
  );
}

/** Link de texto do pé: "Voltar" (35b) e "Rever explicação" (35h). */
export function LessonLink({ label, onPress }: { label: string; onPress: () => void }) {
  const accent = useAccent();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.link, { color: accent.light }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stepBody: {
    flex: 1,
  },
  stepContent: {
    flexGrow: 1,
    paddingBottom: 14,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
  },
  actions: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
  },
  eyebrow: {
    fontFamily: V2Font.bold,
    fontSize: 12.5,
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 24,
    color: V2Colors.text,
  },
  titleCompact: {
    fontSize: 22,
  },
  body: {
    fontFamily: V2Font.medium,
    fontSize: BODY_SIZE,
    lineHeight: BODY_SIZE * 1.45,
    color: 'rgba(255,255,255,0.9)',
  },
  bodyStrong: {
    fontFamily: V2Font.extraBold,
    color: V2Colors.onPrimary,
  },
  // O balão do aviso fica por cima do visual que vem depois do chip.
  chipAnchor: {
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  valuesChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    fontFamily: V2Font.bold,
    fontSize: 12,
  },
  notice: {
    position: 'absolute',
    top: 36,
    left: 0,
    width: 260,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V2Colors.chipBorder,
    backgroundColor: V2Colors.sheetTop,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  noticeText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  link: {
    fontFamily: V2Font.bold,
    fontSize: 14,
  },
});
