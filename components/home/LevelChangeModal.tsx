import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { V2Colors, V2Font, V2Radius, withAlpha } from '@/constants/theme-v2';
import { mascotBox, type PigLevel } from '@/constants/pig-levels';
import { useAccent } from '@/hooks/use-accent';
import { useSound } from '@/hooks/use-sound';
import { Button3D, ScreenGlow, V2Icon } from '@/components/v2';
import { Confetti } from './Confetti';

interface LevelChangeModalProps {
  visible: boolean;
  from: PigLevel | null;
  to: PigLevel | null;
  direction: 'up' | 'down';
  onClose: () => void;
  /** "Depositar agora" do Ops… */
  onDeposit: () => void;
}

/**
 * Mudança de nível do porquinho (Figma "Home · Evolução do porquinho"):
 * "Evolução!" (04c) ao subir, com confete; "Ops…" (04d) ao voltar, com o
 * convite para depositar.
 *
 * Mesmo ritmo da animação anterior: o nível de antes aparece, depois a seta,
 * e o novo entra com o som; o cartão da mensagem vem por último.
 */
function LevelChangeModalView({ visible, from, to, direction, onClose, onDeposit }: LevelChangeModalProps) {
  const accent = useAccent();
  const { playLevelUp, playQuedaPersonagem } = useSound();
  const down = direction === 'down';
  const tone = down ? V2Colors.error : accent.base;

  const oldIn = useRef(new Animated.Value(0)).current;
  const arrowIn = useRef(new Animated.Value(0)).current;
  const newIn = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!visible || !from || !to) return;
    [oldIn, arrowIn, newIn, float, cardIn].forEach((value) => value.setValue(0));
    setCelebrate(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let floatLoop: Animated.CompositeAnimation | null = null;

    after(150, () =>
      Animated.spring(oldIn, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }).start(),
    );
    after(550, () =>
      Animated.spring(arrowIn, { toValue: 1, damping: 12, stiffness: 160, useNativeDriver: true }).start(),
    );
    after(950, () => {
      Animated.spring(newIn, { toValue: 1, damping: 7, mass: 0.7, stiffness: 130, useNativeDriver: true }).start();
      if (down) playQuedaPersonagem();
      else {
        playLevelUp();
        setCelebrate(true);
      }
      floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: -8, duration: 1400, useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
      );
      floatLoop.start();
    });
    after(1750, () =>
      Animated.timing(cardIn, { toValue: 1, duration: 260, useNativeDriver: true }).start(),
    );

    return () => {
      timers.forEach(clearTimeout);
      floatLoop?.stop();
    };
    // Os sons são estáveis; a sequência recomeça a cada abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, from, to, down]);

  const oldBox = useMemo(() => (from ? mascotBox(from, 80, 70 / 80) : null), [from]);
  const newBox = useMemo(() => (to ? mascotBox(to, 134) : null), [to]);

  if (!from || !to || !oldBox || !newBox) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Altura da tela desde o início: no Android o Modal abre com uma
          altura provisória e a cena, centralizada, descia no meio da entrada
          (mesma correção do LevelUpScene). */}
      <View style={[styles.screen, { minHeight: Dimensions.get('screen').height }]}>
        <ScreenGlow peak={0.4} height={596} />
        {!down && <Confetti play={celebrate} />}

        <View style={styles.scene}>
          <View
            style={[
              styles.seal,
              { backgroundColor: withAlpha(tone, 0.14), borderColor: withAlpha(tone, 0.32) },
            ]}
          >
            {!down && <V2Icon name="sparkles" size={12} color={tone} />}
            <Text style={[styles.sealText, { color: tone }]}>{down ? 'Nível anterior' : 'Novo nível'}</Text>
          </View>
          <Text style={styles.title}>{down ? 'Ops…' : 'Evolução!'}</Text>

          <View style={styles.stages}>
            <Animated.View style={[styles.stage, { opacity: oldIn, transform: [{ scale: oldIn }] }]}>
              <View style={styles.oldFrame}>
                <View style={styles.oldArt}>
                  <Image source={from.art} contentFit="contain" style={oldBox} />
                </View>
              </View>
              <Text style={styles.oldLabel} numberOfLines={1}>
                {from.label}
              </Text>
            </Animated.View>

            <Animated.View style={{ opacity: arrowIn, transform: [{ scale: arrowIn }] }}>
              <V2Icon name={down ? 'chevron-down' : 'chevron-right'} size={26} color={tone} />
            </Animated.View>

            <Animated.View style={[styles.stage, { opacity: newIn, transform: [{ scale: newIn }] }]}>
              <Animated.View
                style={[
                  styles.newFrame,
                  {
                    backgroundColor: withAlpha(tone, 0.14),
                    borderColor: withAlpha(tone, down ? 0.45 : 0.48),
                    transform: [{ translateY: float }],
                  },
                ]}
              >
                <Image source={to.art} contentFit="contain" style={newBox} />
              </Animated.View>
              <Text style={styles.newLabel} numberOfLines={1}>
                {to.label}
              </Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.card, { opacity: cardIn }]}>
            <Text style={styles.message}>
              {down ? (
                <>
                  {'Seu porquinho voltou de nível. '}
                  <Text style={styles.messageStrong}>Deposite</Text>
                  {' para evoluir de novo!'}
                </>
              ) : (
                <>
                  {'Seu porquinho evoluiu para '}
                  <Text style={styles.messageStrong}>{to.label}</Text>
                  {'! Continue poupando.'}
                </>
              )}
            </Text>
            {down ? (
              <>
                <Button3D
                  label="Depositar agora"
                  icon="plus"
                  size="card"
                  onPress={() => {
                    onClose();
                    onDeposit();
                  }}
                />
                <Pressable onPress={onClose} hitSlop={8} style={styles.later} accessibilityRole="button">
                  <Text style={styles.laterText}>Agora não</Text>
                </Pressable>
              </>
            ) : (
              <Button3D label="Que legal!" icon="sparkles" size="card" onPress={onClose} />
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}


// Memoizado: a Home re-renderiza a cada passo do rendimento ao vivo, e a
// animação não deve ser redesenhada por isso.
export const LevelChangeModal = memo(LevelChangeModalView);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: V2Colors.background,
    justifyContent: 'center',
  },
  scene: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
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
    color: V2Colors.text,
  },
  stages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 26,
    paddingBottom: 28,
  },
  stage: {
    alignItems: 'center',
    gap: 10,
  },
  oldFrame: {
    width: 92,
    height: 92,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // O nível que ficou para trás: apagado e sem cor. O `filter` só no Android:
  // no iOS ele desenhava a arte dentro de um retângulo; lá fica só a
  // transparência.
  oldArt: {
    opacity: 0.5,
    ...Platform.select({ android: { filter: [{ grayscale: 1 }] } }),
  },
  oldLabel: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.textTertiary,
  },
  newFrame: {
    width: 150,
    height: 150,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: {
    fontFamily: V2Font.extraBold,
    fontSize: 15,
    color: V2Colors.text,
  },
  card: {
    alignSelf: 'stretch',
    gap: 16,
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
    lineHeight: 22.5,
    color: V2Colors.textSecondary,
  },
  messageStrong: {
    fontFamily: V2Font.extraBold,
    color: V2Colors.text,
  },
  later: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  laterText: {
    fontFamily: V2Font.bold,
    fontSize: 14,
    color: V2Colors.textSecondary,
  },
});
