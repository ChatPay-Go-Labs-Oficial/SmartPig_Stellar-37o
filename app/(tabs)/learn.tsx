import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accent, Colors, Font, FontSize, Glow, Gradients, Radius, Spacing } from '@/constants/theme';
import { TRILHA_LESSONS } from '@/constants/trilha';
import { LessonPlayer } from '@/components/ui/LessonPlayer';
import type { TrilhaLesson } from '@/constants/trilha';

export default function TrilhaScreen() {
  const insets = useSafeAreaInsets();
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [openLesson, setOpenLesson] = useState<TrilhaLesson | null>(null);

  const trailDone = completedIds.length === TRILHA_LESSONS.length;
  const currentId = trailDone
    ? null
    : TRILHA_LESSONS.find((l) => !completedIds.includes(l.id))?.id ?? null;

  const getLessonState = (id: number): 'completed' | 'current' | 'locked' => {
    if (completedIds.includes(id)) return 'completed';
    if (id === currentId) return 'current';
    return 'locked';
  };

  const handleComplete = (xp: number) => {
    if (!openLesson) return;
    setCompletedIds((prev) => [...prev, openLesson.id]);
    setTotalXp((prev) => prev + xp);
    setOpenLesson(null);
  };

  const progressPct = completedIds.length / TRILHA_LESSONS.length;

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={Gradients.primary as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerEyebrow}>Primeiros Passos</Text>
            <Text style={styles.headerTitle}>Trilha de Aprendizado</Text>
          </View>
          <View style={styles.xpPill}>
            <MaterialIcons name="star" size={14} color={Accent.gold} />
            <Text style={styles.xpPillText}>{totalXp} XP</Text>
          </View>
        </View>

        <View style={styles.headerProgress}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {trailDone ? 'Trilha concluída!' : `${completedIds.length} de ${TRILHA_LESSONS.length} lições`}
            </Text>
            <Text style={styles.progressPct}>{Math.round(progressPct * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Trail nodes ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {trailDone && (
          <View style={styles.trailCompleteBanner}>
            <MaterialIcons name="workspace-premium" size={24} color={Accent.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Trilha concluída!</Text>
              <Text style={styles.bannerSub}>Badge "Porquinho Iniciante" desbloqueado</Text>
            </View>
          </View>
        )}

        {TRILHA_LESSONS.map((lesson, index) => {
          const state = getLessonState(lesson.id);
          const isLast = index === TRILHA_LESSONS.length - 1;
          return (
            <TrailNode
              key={lesson.id}
              lesson={lesson}
              state={state}
              isLast={isLast}
              onPress={() => {
                if (state !== 'locked') setOpenLesson(lesson);
              }}
            />
          );
        })}
      </ScrollView>

      {/* ── Lesson player modal ── */}
      {openLesson && (
        <LessonPlayer
          lesson={openLesson}
          onComplete={handleComplete}
          onClose={() => setOpenLesson(null)}
        />
      )}
    </View>
  );
}

// ─── Trail node ───────────────────────────────────────────────────────────────
function TrailNode({
  lesson,
  state,
  isLast,
  onPress,
}: {
  lesson: TrilhaLesson;
  state: 'completed' | 'current' | 'locked';
  isLast: boolean;
  onPress: () => void;
}) {
  const isCompleted = state === 'completed';
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';

  return (
    <View style={nodeStyles.wrapper}>
      {/* COMEÇAR chip */}
      {isCurrent && (
        <Pressable onPress={onPress} style={nodeStyles.startChipWrap}>
          <LinearGradient
            colors={Gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={nodeStyles.startChip}
          >
            <MaterialIcons name="play-arrow" size={14} color="#fff" />
            <Text style={nodeStyles.startChipText}>COMEÇAR</Text>
          </LinearGradient>
        </Pressable>
      )}
      {isCompleted && (
        <View style={nodeStyles.doneChipWrap}>
          <View style={nodeStyles.doneChip}>
            <MaterialIcons name="check-circle" size={14} color={Accent.success} />
            <Text style={nodeStyles.doneChipText}>CONCLUÍDA</Text>
          </View>
        </View>
      )}

      {/* Node circle */}
      <Pressable onPress={isLocked ? undefined : onPress} style={nodeStyles.circleWrap}>
        {isCompleted || isCurrent ? (
          <LinearGradient
            colors={Gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[nodeStyles.circle, isCurrent && Glow.pink]}
          >
            <MaterialIcons
              name={isCompleted ? 'check' : (lesson.icon as any)}
              size={40}
              color="#fff"
            />
          </LinearGradient>
        ) : (
          <View style={nodeStyles.circleLocked}>
            <MaterialIcons name={lesson.icon as any} size={36} color={Colors.mutedForeground} style={{ opacity: 0.4 }} />
            <View style={nodeStyles.lockBadge}>
              <MaterialIcons name="lock" size={12} color={Colors.mutedForeground} />
            </View>
          </View>
        )}
      </Pressable>

      {/* Info */}
      <Text style={[nodeStyles.title, isLocked && nodeStyles.titleLocked]}>
        {lesson.title}
      </Text>

      <View style={nodeStyles.metaRow}>
        <View style={nodeStyles.metaChip}>
          <MaterialIcons name="star" size={12} color={isLocked ? Colors.mutedForeground : Accent.gold} />
          <Text style={[nodeStyles.metaText, isLocked && nodeStyles.metaTextLocked]}>
            {lesson.xp} XP
          </Text>
        </View>
        <View style={nodeStyles.metaChip}>
          <MaterialIcons name="schedule" size={12} color={Colors.mutedForeground} />
          <Text style={[nodeStyles.metaText, nodeStyles.metaTextLocked]}>
            {lesson.duration}
          </Text>
        </View>
      </View>

      {/* Connector */}
      {!isLast && (
        <View style={nodeStyles.connector}>
          {isCompleted ? (
            <LinearGradient
              colors={Gradients.primary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={nodeStyles.connectorLine}
            />
          ) : (
            <View style={[nodeStyles.connectorLine, nodeStyles.connectorLineLocked]} />
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[6],
    gap: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerEyebrow: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSize.subheading,
    fontFamily: Font.black,
    color: '#fff',
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  xpPillText: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: '#fff',
  },
  headerProgress: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: 'rgba(255,255,255,0.8)',
  },
  progressPct: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: '#fff',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: Spacing[8],
    alignItems: 'center',
  },
  trailCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,196,0,0.12)',
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[6],
    marginBottom: Spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.3)',
    alignSelf: 'stretch',
  },
  bannerTitle: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.black,
    color: Accent.gold,
  },
  bannerSub: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
});

const nodeStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
  },

  // Chips
  startChipWrap: { marginBottom: 12 },
  startChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startChipText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: '#fff',
    letterSpacing: 0.5,
  },
  doneChipWrap: { marginBottom: 12 },
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(72,207,120,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(72,207,120,0.3)',
  },
  doneChipText: {
    fontSize: FontSize.label,
    fontFamily: Font.black,
    color: Accent.success,
    letterSpacing: 0.5,
  },

  // Circle
  circleWrap: {},
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLocked: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.muted,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info
  title: {
    marginTop: 12,
    fontSize: FontSize.body,
    fontFamily: Font.black,
    color: Colors.foreground,
    textAlign: 'center',
  },
  titleLocked: {
    color: Colors.mutedForeground,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 0,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.label,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  metaTextLocked: {
    color: Colors.mutedForeground,
  },

  // Connector
  connector: {
    height: 52,
    width: 44,
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 12,
  },
  connectorLine: {
    flex: 1,
    width: 3,
    borderRadius: 2,
  },
  connectorLineLocked: {
    backgroundColor: Colors.border,
  },
});
