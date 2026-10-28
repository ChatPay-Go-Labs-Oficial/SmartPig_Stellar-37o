import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon } from '../V2Icon';

interface LessonSheetProps {
  /** X da barra da lição. */
  onClose: () => void;
  /** Avanço pelos passos, de 0 a 1. null esconde a barra (boas-vindas, 35o). */
  progress: number | null;
  /** XP da lição na pílula do topo. null esconde (boas-vindas, conclusão e estados). */
  xp: number | null;
  children: ReactNode;
}

/**
 * Moldura da lição (Figma "Trilha · Lição", 35a a 35p): o sheet sobre a
 * Trilha escurecida, com a alça, a barra da lição (fechar, avanço e XP) e o
 * corpo do passo. O sheet começa 2 acima do fim da barra de status e vai até
 * embaixo; o corpo termina 10 acima do indicador de início (44 no iPhone).
 */
function LessonSheetView({ onClose, progress, xp, children }: LessonSheetProps) {
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const fill = progress === null ? 0 : Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.root}>
      <View style={[styles.column, { marginTop: Math.max(insets.top - 2, 0) }]}>
        <LinearGradient
          colors={[V2Colors.sheetTop, V2Colors.sheetBase]}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.bar}>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Sair da lição"
              hitSlop={8}
            >
              <V2Icon name="x" size={18} color={V2Colors.text} />
            </Pressable>
            {progress !== null ? (
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityLabel="Avanço na lição"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(fill * 100) }}
              >
                {fill > 0 ? (
                  <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: accent.base }]} />
                ) : null}
              </View>
            ) : (
              <View style={styles.spacer} />
            )}
            {xp !== null ? <LessonXpPill label={`+${xp} XP`} /> : null}
          </View>

          <View style={styles.body}>{children}</View>
        </LinearGradient>
      </View>
    </View>
  );
}

export const LessonSheet = memo(LessonSheetView);

/** Pílula de XP (Figma "xp"): na barra da lição e na conclusão (35g, 35j). */
export function LessonXpPill({ label }: { label: string }) {
  const accent = useAccent();
  return (
    <View
      style={[styles.pill, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}
      accessibilityLabel={label.replace('+', 'Mais ')}
    >
      <V2Icon name="star" size={13} color={accent.light} />
      <Text style={[styles.pillText, { color: accent.light }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma "overlay": a Trilha continua embaixo, escurecida.
  root: {
    flex: 1,
    backgroundColor: V2Colors.overlay,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 24,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: V2Radius.sheet,
    borderTopRightRadius: V2Radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
    paddingHorizontal: 22,
  },
  handleRow: {
    alignItems: 'center',
    paddingBottom: 14,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: V2Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: V2Colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: V2Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: V2Radius.full,
  },
  spacer: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 10,
    paddingRight: 11,
    paddingVertical: 6,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
  },
  body: {
    flex: 1,
  },
});
