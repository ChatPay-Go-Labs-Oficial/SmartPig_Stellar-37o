import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Confetti, type ConfettiPiece } from '@/components/home/Confetti';
import { levelFraction } from '@/constants/experience-tiers';
import { levelProgress, type PigLevel } from '@/constants/pig-levels';
import { V2Colors, V2Font, V2Layout, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { useInvestedTotal } from '@/hooks/use-invested-total';
import { useSound } from '@/hooks/use-sound';
import type { ExperienceLevel } from '@/lib/api/experience';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useLevelUpStore } from '@/lib/stores/level-up.store';
import { Button3D } from '../Button3D';
import { ScreenGlow } from '../ScreenGlow';
import { V2Icon } from '../V2Icon';
import { LevelAvatar } from './LevelAvatar';
import { NEW_DOT_DELAY } from './LevelDots';

/** Figma 37a "confete (animação)": os papéis em volta da cena (giro já no sentido do RN). */
const PIECES: readonly ConfettiPiece[] = [
  { x: 305, y: 397, big: false, rotate: -37, tone: 1 },
  { x: 326, y: 407, big: false, rotate: -74, tone: 2 },
  { x: 63, y: 362, big: true, rotate: -153, tone: 1 },
  { x: 42, y: 370, big: false, rotate: -10, tone: 2 },
  { x: 20, y: 282, big: false, rotate: -47, tone: 0 },
  { x: 107, y: 238, big: false, rotate: -121, tone: 1 },
  { x: 90, y: 223, big: false, rotate: -158, tone: 2 },
  { x: 348, y: 243, big: false, rotate: -163, tone: 0 },
  { x: 326, y: 332, big: true, rotate: -57, tone: 1 },
  { x: 40, y: 92, big: true, rotate: -18, tone: 0 },
  { x: 96, y: 120, big: false, rotate: 30, tone: 1 },
  { x: 168, y: 78, big: false, rotate: -40, tone: 2 },
  { x: 228, y: 112, big: true, rotate: 15, tone: 0 },
  { x: 300, y: 86, big: false, rotate: -25, tone: 1 },
  { x: 352, y: 128, big: false, rotate: 40, tone: 2 },
  { x: 22, y: 262, big: true, rotate: -30, tone: 0 },
  { x: 46, y: 330, big: false, rotate: 20, tone: 1 },
  { x: 18, y: 398, big: false, rotate: -55, tone: 2 },
  { x: 366, y: 250, big: true, rotate: 35, tone: 0 },
  { x: 342, y: 318, big: false, rotate: -20, tone: 1 },
  { x: 372, y: 392, big: false, rotate: 50, tone: 2 },
  { x: 60, y: 196, big: true, rotate: -15, tone: 0 },
  { x: 330, y: 196, big: false, rotate: 25, tone: 1 },
];

/** O cartão da mensagem entra depois de o ponto acender. */
const CARD_DELAY = 850;

interface LevelUpSceneProps {
  /** Nível depois da subida (backend). */
  level: ExperienceLevel;
  /** O porquinho atual na foto, como no Seu nível. */
  pig: PigLevel;
  onContinue: () => void;
  onSeeLevel: () => void;
}

/**
 * Subida do Nível de Usuário (Figma 37a), no padrão da Evolução! do porquinho:
 * "Novo nível", a moldura do Seu nível com o ponto novo acendendo, o confete e
 * o som de subida. No silencioso do app, nem som nem vibração. "Continuar"
 * volta para onde a pessoa estava (a Trilha, ao sair da lição); "Ver meu
 * nível" abre o Seu nível.
 */
function LevelUpSceneView({ level, pig, onContinue, onSeeLevel }: LevelUpSceneProps) {
  const accent = useAccent();
  const { playLevelUp, muted } = useSound();
  const cardIn = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const lit = setTimeout(() => {
      // O playLevelUp vibra mesmo no silencioso; aqui a vibração também cala.
      if (!muted) playLevelUp();
      setCelebrate(true);
    }, NEW_DOT_DELAY);
    const card = setTimeout(
      () => Animated.timing(cardIn, { toValue: 1, duration: 260, useNativeDriver: true }).start(),
      CARD_DELAY,
    );
    return () => {
      clearTimeout(lit);
      clearTimeout(card);
    };
    // A sequência roda uma vez por cena, com o silencioso de quando ela abriu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onContinue}
    >
      {/* No Android o Modal abre com uma altura provisória, menor que a da
          tela, e só depois recebe a real: a cena, centralizada, descia 16 no
          meio da entrada. Com a altura da tela desde o início, ela fica parada. */}
      <View
        style={[styles.screen, { minHeight: Dimensions.get('screen').height }]}
        accessibilityViewIsModal
      >
        <ScreenGlow peak={0.4} height={596} />
        <Confetti play={celebrate} pieces={PIECES} />

        <View style={styles.scene}>
          <View style={[styles.seal, { backgroundColor: accent.alpha(0.14), borderColor: accent.alpha(0.32) }]}>
            <V2Icon name="sparkles" size={12} color={accent.base} />
            <Text style={[styles.sealText, { color: accent.base }]}>Novo nível</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Nível {level.level}!
          </Text>
          <LevelAvatar
            level={level.level}
            tier={level.tier}
            max={level.nextLevelXp === null}
            fraction={levelFraction(level)}
            pig={pig}
            celebrate
          />

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardIn,
                transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <Text style={styles.message}>
              {'Você chegou ao '}
              <Text style={styles.messageStrong}>Nível {level.level}</Text>
              {' e sua moldura ganhou um ponto de luz.'}
            </Text>
            {level.xpToNextLevel !== null ? (
              <Text style={styles.remaining}>
                Faltam {level.xpToNextLevel} XP para o Nível {level.level + 1}.
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button3D label="Continuar" size="card" icon="sparkles" onPress={onContinue} />
              <Button3D label="Ver meu nível" size="card" variant="glass" onPress={onSeeLevel} />
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

export const LevelUpScene = memo(LevelUpSceneView);

/**
 * Mostra a cena quando alguém pede (lib/stores/level-up.store.ts). Fica no
 * layout das abas: a cena aparece por cima de tudo, inclusive da lição que
 * está fechando. Sem sessão, nada aparece.
 */
export function LevelUpGate() {
  const pending = useLevelUpStore((s) => s.pending);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!pending || !isAuthenticated) return null;
  return <ConnectedScene level={pending} />;
}

function ConnectedScene({ level }: { level: ExperienceLevel }) {
  const dismiss = useLevelUpStore((s) => s.dismiss);
  const invested = useInvestedTotal();
  const pig = levelProgress(invested.totalUsd).current;
  return (
    <LevelUpScene
      level={level}
      pig={pig}
      onContinue={dismiss}
      onSeeLevel={() => {
        dismiss();
        // O Seu nível mora na pilha da Trilha (ver a Home): com o anchor, o
        // voltar dele leva à Trilha.
        router.navigate('/learn/level', { withAnchor: true });
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
    justifyContent: 'center',
  },
  // Figma "cena": 24 de margem; o cartão tem a largura da coluna.
  scene: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: V2Layout.maxWidth,
    alignSelf: 'center',
  },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: V2Radius.full,
    borderWidth: 1,
  },
  sealText: {
    fontFamily: V2Font.extraBold,
    fontSize: 11.5,
  },
  title: {
    paddingTop: 12,
    fontFamily: V2Font.black,
    fontSize: 36,
    letterSpacing: -1.08,
    color: V2Colors.onPrimary,
  },
  card: {
    alignSelf: 'stretch',
    gap: 10,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  message: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 15.5,
    lineHeight: 15.5 * 1.45,
    color: V2Colors.textSecondary,
  },
  messageStrong: {
    fontFamily: V2Font.extraBold,
  },
  remaining: {
    textAlign: 'center',
    fontFamily: V2Font.medium,
    fontSize: 13,
    color: V2Colors.textTertiary,
  },
  // Figma: um espaço de 2 entre os textos e os botões, com o vão de 10 dos
  // dois lados (22 ao todo); 10 entre os botões.
  actions: {
    gap: 10,
    marginTop: 12,
  },
});
