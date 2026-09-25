import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accent, Colors, Font, FontSize, Glow, Gradients, Radius, Spacing } from '@/constants/theme';
import { LearningLessonPlayer } from '@/components/ui/LearningLessonPlayer';
import type { LearningLesson } from '@/lib/api/learning';
import { useLearning } from '@/lib/queries/learning.queries';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function TrilhaScreen() {
  const insets = useSafeAreaInsets();
  const [openLesson, setOpenLesson] = useState<LearningLesson | null>(null);
  const userId = useAuthStore((state) => state.contractId);
  useEffect(() => { setOpenLesson(null); }, [userId]);
  const { lessons: lessonQuery, progress: progressQuery } = useLearning();
  const lessons = lessonQuery.data ?? [];
  const progress = progressQuery.data;
  const completedIds = progress?.completedLessonIds ?? [];
  const totalXp = progress?.points ?? 0;

  const trailDone = lessons.length > 0 && completedIds.length === lessons.length;
  const currentId = trailDone
    ? null
    : lessons.find((l) => !completedIds.includes(l.id))?.id ?? null;

  const getLessonState = (id: number): 'completed' | 'current' | 'locked' => {
    if (completedIds.includes(id)) return 'completed';
    if (id === currentId) return 'current';
    return 'locked';
  };

  const progressPct = lessons.length ? completedIds.length / lessons.length : 0;
  const loading = lessonQuery.isPending || progressQuery.isPending;
  const failed = lessonQuery.isError || progressQuery.isError;

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
            <Text style={styles.xpPillText}>{totalXp} pontos</Text>
          </View>
        </View>

        <View style={styles.headerProgress}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {trailDone ? 'Trilha concluída!' : `${completedIds.length} de ${lessons.length} lições`}
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
        {!userId && <Text style={styles.progressLabel}>Entre na sua conta para salvar seu progresso.</Text>}
        {userId && loading && <ActivityIndicator color={Accent.primary} />}
        {userId && failed && <Pressable onPress={() => { void lessonQuery.refetch(); void progressQuery.refetch(); }}><Text style={styles.bannerSub}>Não foi possível carregar seu progresso. Toque para tentar novamente.</Text></Pressable>}
        {progress && <View style={styles.trailCompleteBanner}><View style={{ flex: 1 }}><Text style={styles.bannerTitle}>USDC liberado desde o início</Text>{['EURC', 'XLM'].map((symbol) => <Text key={symbol} style={styles.bannerSub}>{symbol}: {progress.vaultAccess[symbol]?.unlocked ? 'liberado' : `faltam ${progress.vaultAccess[symbol]?.pointsRemaining ?? '—'} pontos`}</Text>)}</View></View>}
        {trailDone && (
          <View style={styles.trailCompleteBanner}>
            <MaterialIcons name="workspace-premium" size={24} color={Accent.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Trilha concluída!</Text>
              <Text style={styles.bannerSub}>Continue escolhendo seus investimentos com consciência dos riscos.</Text>
            </View>
          </View>
        )}

        {!failed && !loading && lessons.map((lesson, index) => {
          const state = getLessonState(lesson.id);
          const isLast = index === lessons.length - 1;
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
        <LearningLessonPlayer
          key={`${userId}-${openLesson.id}`}
          lesson={openLesson}
          completedQuestionIds={progress?.completedQuestionIds ?? []}
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
  lesson: LearningLesson;
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
            {lesson.xp} pontos
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
