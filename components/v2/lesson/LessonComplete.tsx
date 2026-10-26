import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { journeyTier, levelFraction } from '@/constants/experience-tiers';
import { V2Colors, V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceLevel } from '@/lib/api/experience';
import { AssetIcon, type AssetLogoId } from '../AssetIcon';
import { Button3D } from '../Button3D';
import { CircleGlow } from '../CircleGlow';
import { ProgressRing } from '../ProgressRing';
import { V2Icon, type V2IconName } from '../V2Icon';
import { XpBar } from '../experience/XpBar';
import { FinishNode } from '../trail/TrailNode';
import { LessonXpPill } from './LessonSheet';
import { LessonStepBody } from './LessonText';

const HALO = require('@/assets/images/v2/licao-halo.png');

/** Conteúdo v1.1.1, seção 5: módulo concluído. */
const MODULE_TEXT =
  'Você concluiu a introdução ao PigFi. Agora você conhece as perguntas que ajudam a escolher: qual moeda vou ter, de onde vem o ganho e como eu tiro. Continue no seu ritmo.';

/** Brilhos em volta do selo (35g), em coordenadas da ilustração de 170 × 150. */
const SPARKLES = [
  { x: 8, y: 30, size: 18 },
  { x: 150, y: 46, size: 14 },
  { x: 138, y: 4, size: 11 },
  { x: 22, y: 112, size: 10 },
] as const;

export interface LessonUnlock {
  asset: AssetLogoId;
  /** "euro" em "O porquinho em euro foi liberado". */
  name: string;
}

interface LessonCompleteProps {
  /** Ícone da lição no selo (o mesmo do nó da Trilha). */
  icon: V2IconName;
  /** XP desta conclusão; 0 ao refazer uma lição já concluída. */
  lessonXp: number;
  /** XP do módulo quando a lição fecha as cinco (35j); 0 nas outras. */
  moduleXp: number;
  /** Nível depois da lição, para o card (35g e 35p). */
  level: ExperienceLevel | null;
  /** Porquinhos liberados agora (só no Lite). */
  unlocks: readonly LessonUnlock[];
  onBackToTrail: () => void;
  /** "Ver o porquinho em euro" (35g). */
  onOpenPiggy: (asset: AssetLogoId) => void;
  /** O card do nível abre o Seu nível. */
  onOpenLevel: () => void;
}

/**
 * Conclusão da lição, sem mascote (Figma 35p, 35g e 35j): o selo da lição com
 * o check e o XP, o nível, a liberação de porquinho e os botões, que só
 * navegam. Quando a lição fecha o módulo, a medalha do fim da Trilha, o XP do
 * módulo e a mensagem do conteúdo.
 */
function LessonCompleteView({
  icon,
  lessonXp,
  moduleXp,
  level,
  unlocks,
  onBackToTrail,
  onOpenPiggy,
  onOpenLevel,
}: LessonCompleteProps) {
  const moduleDone = moduleXp > 0;
  const piggy = !moduleDone ? unlocks[0] : undefined;

  return (
    <LessonStepBody
      gap={12}
      actions={
        <>
          <Button3D label="Voltar para a trilha" onPress={onBackToTrail} />
          {piggy ? (
            <Button3D
              label={`Ver o porquinho em ${piggy.name}`}
              variant="glass"
              onPress={() => onOpenPiggy(piggy.asset)}
            />
          ) : null}
        </>
      }
    >
      <View style={[styles.celebration, moduleDone && styles.celebrationModule]}>
        {moduleDone ? (
          <View style={styles.medal}>
            <View style={styles.medalNode}>
              <FinishNode done />
            </View>
          </View>
        ) : (
          <LessonSeal icon={icon} />
        )}
        <Text style={styles.heading} accessibilityRole="header">
          {moduleDone ? 'Módulo concluído!' : 'Lição concluída!'}
        </Text>
        {lessonXp > 0 || moduleDone ? (
          <View style={styles.gains}>
            {lessonXp > 0 ? <LessonXpPill label={`+${lessonXp} XP`} /> : null}
            {moduleDone ? <LessonXpPill label={`+${moduleXp} XP do módulo`} /> : null}
          </View>
        ) : null}
      </View>

      {moduleDone ? (
        <Text style={styles.moduleText}>{MODULE_TEXT}</Text>
      ) : level ? (
        <LevelRow level={level} onPress={onOpenLevel} />
      ) : null}

      {unlocks.map((unlock) => (
        <View key={unlock.asset} style={styles.unlock}>
          <AssetIcon asset={unlock.asset} size={34} round />
          <View style={styles.unlockTexts}>
            <Text style={styles.unlockTitle}>O porquinho em {unlock.name} foi liberado</Text>
            <Text style={styles.unlockText}>
              Antes de guardar pela primeira vez, leia os riscos deste porquinho.
            </Text>
          </View>
        </View>
      ))}
    </LessonStepBody>
  );
}

export const LessonComplete = memo(LessonCompleteView);

/** Selo 3D da lição com o check (35g "ilustração"): disco de 100 sobre a base. */
function LessonSeal({ icon }: { icon: V2IconName }) {
  const accent = useAccent();
  return (
    <View style={styles.seal}>
      <CircleGlow size={240} opacity={0.9} style={styles.sealGlow} />
      <Image source={HALO} tintColor={accent.base} style={styles.sealHalo} />
      <View style={[styles.sealDisc, styles.sealBase, { backgroundColor: accent.dark }]} />
      <View style={[styles.sealDisc, { backgroundColor: accent.base }]} />
      <View style={styles.sealShine} />
      <View style={styles.sealIcon}>
        <V2Icon name={icon} size={44} color={V2Colors.onPrimary} />
      </View>
      <View style={styles.sealCheck}>
        <V2Icon name="check" size={16} color={V2Colors.background} />
      </View>
      {SPARKLES.map((sparkle) => (
        <View key={`${sparkle.x}-${sparkle.y}`} style={{ position: 'absolute', left: sparkle.x, top: sparkle.y }}>
          <V2Icon name="sparkles" size={sparkle.size} color={accent.light} />
        </View>
      ))}
    </View>
  );
}

/** Card do nível (35g "card do nível"): anel, nível, XP que falta e barra. */
function LevelRow({ level, onPress }: { level: ExperienceLevel; onPress: () => void }) {
  const accent = useAccent();
  const tier = journeyTier(level.tier);
  const next =
    level.xpToNextLevel === null
      ? 'Nível máximo atingido'
      : `${level.xpToNextLevel} XP para o Nível ${level.level + 1}`;
  return (
    <Pressable
      onPress={onPress}
      style={styles.level}
      accessibilityRole="button"
      accessibilityLabel={`Nível ${level.level}, ${tier.label}. ${next}. Ver seu nível`}
    >
      <View style={styles.ring}>
        <ProgressRing
          size={44}
          thickness={4}
          progress={levelFraction(level)}
          color={accent.base}
          trackColor="rgba(255,255,255,0.1)"
        />
        <Text style={styles.ringLabel}>{level.level}</Text>
      </View>
      <View style={styles.levelTexts}>
        <View style={styles.levelLines}>
          <Text style={styles.levelTitle} numberOfLines={1}>
            Nível {level.level} · {tier.label}
          </Text>
          <Text style={styles.levelNext}>{next}</Text>
        </View>
        <XpBar fraction={levelFraction(level)} size="small" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  celebration: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  // 35j: a medalha é menor que o selo e desce 12 para o título ficar na mesma altura.
  celebrationModule: {
    paddingTop: 18,
  },
  heading: {
    fontFamily: V2Font.black,
    fontSize: 26,
    textAlign: 'center',
    color: V2Colors.text,
  },
  gains: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  seal: {
    width: 170,
    height: 150,
  },
  sealGlow: {
    position: 'absolute',
    left: -35,
    top: -48,
  },
  // Figma "halo": anel tracejado de 132, na cor do app a 40%.
  sealHalo: {
    position: 'absolute',
    left: 19,
    top: 6,
    width: 132,
    height: 132,
    opacity: 0.4,
  },
  sealDisc: {
    position: 'absolute',
    left: 35,
    top: 22,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  sealBase: {
    top: 29,
  },
  // Figma "reflexo": elipse 72 × 36, branca a 12%.
  sealShine: {
    position: 'absolute',
    left: 49,
    top: 29 - (72 - 36) / 2,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ scaleY: 36 / 72 }],
  },
  sealIcon: {
    position: 'absolute',
    left: 63,
    top: 50,
  },
  sealCheck: {
    position: 'absolute',
    left: 112,
    top: 22,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: V2Colors.background,
    backgroundColor: V2Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 35j "ilustração": 120 × 136, com a medalha de 92 em (14, 6).
  medal: {
    width: 120,
    height: 136,
  },
  medalNode: {
    position: 'absolute',
    left: 14,
    top: 6,
  },
  moduleText: {
    fontFamily: V2Font.medium,
    fontSize: 15,
    lineHeight: 15 * 1.48,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.86)',
  },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ring: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    fontFamily: V2Font.black,
    fontSize: 15,
    letterSpacing: -0.3,
    color: V2Colors.onPrimary,
  },
  levelTexts: {
    flex: 1,
    gap: 8,
  },
  levelLines: {
    gap: 3,
  },
  levelTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 14.5,
    letterSpacing: -0.145,
    color: V2Colors.onPrimary,
  },
  levelNext: {
    fontFamily: V2Font.semiBold,
    fontSize: 12,
    color: V2Colors.textSecondary,
  },
  unlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(61,224,138,0.3)',
    backgroundColor: 'rgba(61,224,138,0.1)',
  },
  unlockTexts: {
    flex: 1,
    gap: 3,
  },
  unlockTitle: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  unlockText: {
    fontFamily: V2Font.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: V2Colors.textSecondary,
  },
});
