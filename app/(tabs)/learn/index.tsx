import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenGlow, V2Spinner } from '@/components/v2';
import {
  DictionarySheet,
  DictionaryShortcut,
  TrailLevelCard,
  TrailModuleCard,
  TrailPath,
  type TrailLesson,
  type TrailMilestoneState,
} from '@/components/v2/trail';
import { TRAIL_MILESTONES } from '@/constants/learning-trail';
import { levelProgress } from '@/constants/pig-levels';
import { V2Colors, V2Font, V2Layout } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useInvestedTotal } from '@/hooks/use-invested-total';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import type { LearningGlossaryItem, LearningWelcomeItem } from '@/lib/api/learning';
import { useExperienceProfile } from '@/lib/queries/experience.queries';
import { useLearningContent, useLearningModules } from '@/lib/queries/learning.queries';

/** Figma: 18 de margem e 18 entre os blocos (34a). */
const GUTTER = 18;
/** Constelação do topo (Figma 34j), em coordenadas da tela de 393. */
const SKY = [
  { x: 196, y: 30, size: 3 },
  { x: 240, y: 50, size: 2 },
  { x: 292, y: 34, size: 2 },
  { x: 352, y: 46, size: 3 },
  { x: 226, y: 122, size: 2 },
  { x: 304, y: 124, size: 2 },
  { x: 372, y: 118, size: 2 },
  { x: 160, y: 20, size: 2 },
] as const;
const FIGMA_WIDTH = 393;

/**
 * Trilha (Figma "Trilha · Tela", 34a a 34j, sem a Chama): o nível, o módulo
 * "Introdução ao PigFi" com as cinco lições e o Dicionário. Lições, títulos,
 * XP e progresso vêm do backend; o app só desenha o caminho.
 *
 * A lição em si (e as boas-vindas do módulo, 35o, que abrem nela) é a E4 do
 * PigFi Experience: até lá, os nós não abrem nada.
 */
export default function TrailScreen() {
  const accent = useAccent();
  const screenInsets = useScreenInsets();
  const { width: windowWidth } = useWindowDimensions();
  const modules = useLearningModules();
  const content = useLearningContent();
  const experience = useExperienceProfile();
  const invested = useInvestedTotal();
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const columnWidth = Math.min(windowWidth, V2Layout.maxWidth) - GUTTER * 2;
  const pig = levelProgress(invested.totalUsd).current;

  // A lição atual é a primeira não concluída; as seguintes ficam bloqueadas.
  const lessons = useMemo<TrailLesson[]>(() => {
    const ordered = [...(modules.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const firstOpen = ordered.findIndex((lesson) => !lesson.completedAt);
    return ordered.map((lesson, index) => ({
      key: lesson.key,
      title: lesson.title,
      number: index + 1,
      xp: lesson.completionXp,
      status: lesson.completedAt ? 'done' : index === firstOpen ? 'current' : 'locked',
    }));
  }, [modules.data]);

  const lite = content.data?.presentationMode === 'LITE';
  const milestones = useMemo<TrailMilestoneState[]>(
    () =>
      lite
        ? TRAIL_MILESTONES.flatMap((milestone) => {
            const lesson = lessons.find((item) => item.key === milestone.afterLesson);
            return lesson ? [{ ...milestone, unlocked: lesson.status === 'done' }] : [];
          })
        : [],
    [lite, lessons],
  );

  const items = content.data?.items ?? [];
  const welcome = items.find((item): item is LearningWelcomeItem => item.type === 'INTRODUCTION');
  const glossary = items.find((item): item is LearningGlossaryItem => item.type === 'GLOSSARY');
  const glossaryEntries = glossary
    ? [...glossary.content.lite, ...(lite ? [] : glossary.content.proAdditional)]
    : [];
  const done = lessons.filter((lesson) => lesson.status === 'done').length;

  const queries = [modules, content, experience];
  const ready = !!modules.data && !!content.data && !!experience.data;
  const failed = queries.some((query) => !query.data && query.isError);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled(queries.map((query) => query.refetch()));
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {SKY.map((star) => (
          <View
            key={`${star.x}-${star.y}`}
            style={[
              styles.star,
              {
                left: (star.x / FIGMA_WIDTH) * windowWidth,
                top: screenInsets.top + star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={{ marginTop: screenInsets.top }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenInsets.topGap, paddingBottom: screenInsets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accent.base}
            colors={[accent.base]}
            progressBackgroundColor={V2Colors.sheetTop}
          />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Sua trilha</Text>
        </View>

        {ready && experience.data ? (
          <>
            <TrailLevelCard
              profile={experience.data}
              pig={pig}
              onPress={() => router.push('/learn/level')}
            />
            <TrailModuleCard title={welcome?.title ?? null} done={done} total={lessons.length} />
            {/* Consulta opcional: só depois da primeira lição (34j e 34k). */}
            {glossary?.title && done > 0 ? (
              <DictionaryShortcut title={glossary.title} onPress={() => setDictionaryOpen(true)} />
            ) : null}
            <TrailPath
              width={columnWidth}
              lessons={lessons}
              milestones={milestones}
              moduleTitle={welcome?.title ?? null}
              moduleXp={content.data?.introModuleCompletionXp ?? null}
              pig={pig}
            />
          </>
        ) : failed ? (
          <View style={[styles.state, styles.errorState]}>
            <Text style={styles.errorText}>Não foi possível carregar a trilha.</Text>
            <Pressable
              onPress={() => queries.forEach((query) => !query.data && query.refetch())}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.retry, { color: accent.base }]}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.state}>
            <V2Spinner size={32} />
          </View>
        )}
      </ScrollView>

      {glossary?.title ? (
        <DictionarySheet
          visible={dictionaryOpen}
          onClose={() => setDictionaryOpen(false)}
          title={glossary.title}
          entries={glossaryEntries}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
  },
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: V2Layout.sectionGap,
  },
  titleRow: {
    minHeight: V2Layout.headerHeight,
    justifyContent: 'center',
  },
  title: {
    fontFamily: V2Font.black,
    fontSize: 28,
    letterSpacing: -0.84,
    color: V2Colors.text,
  },
  // Figma 34e e 34f: o estado ocupa o resto da tela, centrado.
  state: {
    flex: 1,
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    gap: 14,
  },
  errorText: {
    fontFamily: V2Font.semiBold,
    fontSize: 15,
    textAlign: 'center',
    color: V2Colors.textSecondary,
  },
  retry: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
  },
});
