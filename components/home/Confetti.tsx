import { memo, useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAccent } from '@/hooks/use-accent';

// Figma 04c "confete (animação)": 22 papéis em volta da cena, em três cores
// (destaque, destaque claro e branco 70%), dois tamanhos e giros variados.
// Posições do quadro de 393 × 852; aqui elas viram fração da tela.
const PIECES: readonly { x: number; y: number; big: boolean; rotate: number; tone: 0 | 1 | 2 }[] = [
  { x: 302, y: 330, big: true, rotate: 0, tone: 0 },
  { x: 305, y: 394, big: false, rotate: -37, tone: 1 },
  { x: 326, y: 402, big: false, rotate: -74, tone: 2 },
  { x: 262, y: 468, big: true, rotate: -111, tone: 0 },
  { x: 235, y: 411, big: false, rotate: -148, tone: 0 },
  { x: 173, y: 449, big: false, rotate: -5, tone: 1 },
  { x: 170, y: 465, big: true, rotate: -42, tone: 2 },
  { x: 72, y: 447, big: false, rotate: -79, tone: 0 },
  { x: 119, y: 397, big: false, rotate: -116, tone: 0 },
  { x: 56, y: 347, big: true, rotate: -153, tone: 1 },
  { x: 42, y: 369, big: false, rotate: -10, tone: 2 },
  { x: 20, y: 278, big: false, rotate: -47, tone: 0 },
  { x: 86, y: 294, big: true, rotate: -84, tone: 0 },
  { x: 105, y: 229, big: false, rotate: -121, tone: 1 },
  { x: 85, y: 213, big: false, rotate: -158, tone: 2 },
  { x: 169, y: 165, big: true, rotate: -15, tone: 0 },
  { x: 178, y: 228, big: false, rotate: -52, tone: 0 },
  { x: 251, y: 216, big: false, rotate: -89, tone: 1 },
  { x: 253, y: 187, big: true, rotate: -126, tone: 2 },
  { x: 343, y: 234, big: false, rotate: -163, tone: 0 },
  { x: 286, y: 275, big: false, rotate: -20, tone: 0 },
  { x: 326, y: 325, big: true, rotate: -57, tone: 1 },
];

const FALL_MS = 1100;
const DRIFT_MS = 2600;

/**
 * Confete da evolução: os papéis caem do alto até as posições do Figma, em
 * cascata, e seguem descendo devagar até sumir. Só Animated nativo (sem
 * re-render por quadro).
 */
function ConfettiView({ play }: { play: boolean }) {
  const accent = useAccent();
  const { width, height } = useWindowDimensions();
  const tones = [accent.base, accent.light, 'rgba(255,255,255,0.7)'];
  const progress = useMemo(() => PIECES.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (!play) {
      progress.forEach((value) => value.setValue(0));
      return;
    }
    const animations = progress.map((value, index) =>
      Animated.sequence([
        Animated.delay(index * 35),
        Animated.timing(value, {
          toValue: 1,
          duration: FALL_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 2,
          duration: DRIFT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const all = Animated.parallel(animations);
    all.start();
    return () => all.stop();
  }, [play, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((piece, index) => {
        const value = progress[index];
        return (
          <Animated.View
            key={index}
            style={[
              styles.piece,
              piece.big ? styles.big : styles.small,
              {
                left: (piece.x / 393) * width,
                top: (piece.y / 852) * height,
                backgroundColor: tones[piece.tone],
                opacity: value.interpolate({ inputRange: [0, 0.15, 1.4, 2], outputRange: [0, 1, 1, 0] }),
                transform: [
                  {
                    translateY: value.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [-height * 0.45, 0, 140],
                    }),
                  },
                  {
                    rotate: value.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [`${piece.rotate - 180}deg`, `${piece.rotate}deg`, `${piece.rotate + 90}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export const Confetti = memo(ConfettiView);

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
  big: {
    width: 8,
    height: 12.8,
  },
  small: {
    width: 5,
    height: 8,
  },
});
