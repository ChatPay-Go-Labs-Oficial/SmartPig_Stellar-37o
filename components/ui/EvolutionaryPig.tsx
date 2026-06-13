import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface PigLevel {
  label: string;
  minBalance: number;
  bodyColor: string;
  snoutColor: string;
  cheekColor: string;
  eyeColor: string;
  size: number;
}

const PIG_LEVELS: PigLevel[] = [
  { label: 'Porquinho Bebê', minBalance: 0, bodyColor: '#FFB6C8', snoutColor: '#FF8FAB', cheekColor: '#FF6B8A', eyeColor: '#2D1B30', size: 140 },
  { label: 'Porquinho Esperto', minBalance: 100, bodyColor: '#FFA0BB', snoutColor: '#FF7BAA', cheekColor: '#FF5C8A', eyeColor: '#2D1B30', size: 145 },
  { label: 'Porquinho Forte', minBalance: 500, bodyColor: '#E84393', snoutColor: '#D63384', cheekColor: '#C2185B', eyeColor: '#2D1B30', size: 150 },
  { label: 'Porquinho Dourado', minBalance: 1000, bodyColor: '#FFD700', snoutColor: '#F0C000', cheekColor: '#FFB300', eyeColor: '#5D3A00', size: 155 },
  { label: 'Porquinho Rei', minBalance: 5000, bodyColor: '#FFD700', snoutColor: '#F0C000', cheekColor: '#FFB300', eyeColor: '#5D3A00', size: 160 },
];

export function getPigLevel(balance: number): PigLevel {
  return [...PIG_LEVELS].reverse().find((l) => balance >= l.minBalance) || PIG_LEVELS[0];
}

export function getProgress(balance: number, level: PigLevel): number {
  const idx = PIG_LEVELS.indexOf(level);
  const next = PIG_LEVELS[Math.min(idx + 1, PIG_LEVELS.length - 1)];
  if (next.minBalance <= level.minBalance) return 100;
  return Math.min(100, ((balance - level.minBalance) / (next.minBalance - level.minBalance)) * 100);
}

function FloatingParticle({ color, size, index }: { color: string; size: number; index: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-15 - Math.random() * 15, { duration: 1800 + Math.random() * 1000 }),
        withTiming(0, { duration: 1800 + Math.random() * 1000 })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1200 + Math.random() * 800 }),
        withTiming(0.3, { duration: 1200 + Math.random() * 800 })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500 + Math.random() * 800 }),
        withTiming(0.8, { duration: 1500 + Math.random() * 800 })
      ),
      -1,
      true
    );
  }, []);

  const angle = (index * 2 * Math.PI) / 8;
  const radius = size * 0.46;

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    opacity: opacity.value,
    left: size / 2 + radius * Math.cos(angle) - 3,
    top: size / 2 + radius * Math.sin(angle) - 3,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return <Animated.View style={style} />;
}

export function FloatingParticles({ count = 8, color, size }: { count?: number; color: string; size: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <FloatingParticle key={i} color={color} size={size} index={i} />
      ))}
    </View>
  );
}

export function PigSVG({ level }: { level: PigLevel }) {
  const s = level.size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.38;

  // Animation values
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  const isCute = level.label === 'Porquinho Bebê' || level.label === 'Porquinho Esperto';
  const isFierce = level.label === 'Porquinho Forte';
  const isRoyal = level.label === 'Porquinho Dourado' || level.label === 'Porquinho Rei';

  useEffect(() => {
    const floatDist = isCute ? -6 : isFierce ? -4 : isRoyal ? -10 : -8;
    const floatDuration = isRoyal ? 3000 : 2500;

    // 1. Floating Animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(floatDist, { duration: floatDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: floatDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 2. Wiggle/Scale Pulsing based on level
    if (isCute) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(2, { duration: floatDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: floatDuration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      scale.value = 1;
    } else if (isFierce) {
      rotation.value = 0;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: floatDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: floatDuration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (isRoyal) {
      rotation.value = 0;
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: floatDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: floatDuration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow pulsing
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      rotation.value = 0;
      scale.value = 1;
    }
  }, [level, isCute, isFierce, isRoyal]);

  const animatedStyle = useAnimatedStyle(() => {
    const transforms: any[] = [{ translateY: translateY.value }];
    if (isCute) {
      transforms.push({ rotate: `${rotation.value}deg` });
    }
    if (isFierce || isRoyal) {
      transforms.push({ scale: scale.value });
    }
    return {
      transform: transforms,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { width: s, height: s }, animatedStyle]}>
      {level.minBalance >= 1000 && (
        <Animated.View
          style={[
            styles.glowRing,
            glowStyle,
            {
              width: s * 1.2,
              height: s * 1.2,
              borderRadius: (s * 1.2) / 2,
              backgroundColor: 'rgba(255, 215, 0, 0.12)',
              top: -s * 0.1,
              left: -s * 0.1,
            },
          ]}
        />
      )}

      {level.minBalance >= 1000 && (
        <FloatingParticles color="#FFD700" size={s} />
      )}

      <View
        style={{
          width: s * 0.9,
          height: s * 0.9,
          borderRadius: (s * 0.9) / 2,
          backgroundColor: 'rgba(255,255,255,0.22)',
          position: 'absolute',
          top: s * 0.05,
          left: s * 0.05,
        }}
      />

      {/* Ears */}
      <View
        style={[
          styles.ear,
          {
            width: r * 0.6,
            height: r * 0.45,
            borderRadius: r * 0.3,
            backgroundColor: level.bodyColor,
            top: cy - r * 0.65,
            left: cx - r * 0.75,
            transform: [{ rotate: '-15deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.ear,
          {
            width: r * 0.6,
            height: r * 0.45,
            borderRadius: r * 0.3,
            backgroundColor: level.bodyColor,
            top: cy - r * 0.65,
            right: cx - r * 0.75,
            transform: [{ rotate: '15deg' }],
          },
        ]}
      />
      {/* Inner ears */}
      <View
        style={{
          width: r * 0.3,
          height: r * 0.22,
          borderRadius: r * 0.15,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy - r * 0.6,
          left: cx - r * 0.7,
          opacity: 0.6,
          transform: [{ rotate: '-15deg' }],
        }}
      />
      <View
        style={{
          width: r * 0.3,
          height: r * 0.22,
          borderRadius: r * 0.15,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy - r * 0.6,
          right: cx - r * 0.7,
          opacity: 0.6,
          transform: [{ rotate: '15deg' }],
        }}
      />

      {/* Body */}
      <View
        style={{
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: level.bodyColor,
          position: 'absolute',
          top: cy - r,
          left: cx - r,
          borderWidth: 2.5,
          borderColor: 'rgba(255,255,255,0.35)',
        }}
      />

      {/* Cheeks */}
      <View
        style={{
          width: r * 0.4,
          height: r * 0.4,
          borderRadius: r * 0.2,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy - r * 0.08,
          left: cx - r * 0.7,
          opacity: 0.45,
        }}
      />
      <View
        style={{
          width: r * 0.4,
          height: r * 0.4,
          borderRadius: r * 0.2,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy - r * 0.08,
          right: cx - r * 0.7,
          opacity: 0.45,
        }}
      />

      {/* Body shine */}
      <View
        style={{
          width: r * 0.4,
          height: r * 0.2,
          borderRadius: r * 0.1,
          backgroundColor: 'rgba(255,255,255,0.18)',
          position: 'absolute',
          top: cy - r * 0.35,
          left: cx - r * 0.5,
          transform: [{ rotate: '-20deg' }],
        }}
      />

      {/* Snout */}
      <View
        style={{
          width: r * 0.8,
          height: r * 0.55,
          borderRadius: r * 0.4,
          backgroundColor: level.snoutColor,
          position: 'absolute',
          top: cy + r * 0.02,
          left: cx - r * 0.4,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />
      {/* Nostrils */}
      <View
        style={{
          width: r * 0.18,
          height: r * 0.2,
          borderRadius: r * 0.09,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy + r * 0.12,
          left: cx - r * 0.22,
        }}
      />
      <View
        style={{
          width: r * 0.18,
          height: r * 0.2,
          borderRadius: r * 0.09,
          backgroundColor: level.cheekColor,
          position: 'absolute',
          top: cy + r * 0.12,
          right: cx - r * 0.22,
        }}
      />

      {/* Eyes */}
      <View
        style={{
          width: r * 0.3,
          height: r * 0.3,
          borderRadius: r * 0.15,
          backgroundColor: level.eyeColor,
          position: 'absolute',
          top: cy - r * 0.32,
          left: cx - r * 0.45,
        }}
      />
      <View
        style={{
          width: r * 0.3,
          height: r * 0.3,
          borderRadius: r * 0.15,
          backgroundColor: level.eyeColor,
          position: 'absolute',
          top: cy - r * 0.32,
          right: cx - r * 0.45,
        }}
      />
      {/* Eye shine */}
      <View
        style={{
          width: r * 0.12,
          height: r * 0.12,
          borderRadius: r * 0.06,
          backgroundColor: '#fff',
          position: 'absolute',
          top: cy - r * 0.38,
          left: cx - r * 0.38,
        }}
      />
      <View
        style={{
          width: r * 0.12,
          height: r * 0.12,
          borderRadius: r * 0.06,
          backgroundColor: '#fff',
          position: 'absolute',
          top: cy - r * 0.38,
          right: cx - r * 0.38,
        }}
      />

      {/* Smile */}
      <View
        style={{
          width: r * 0.35,
          height: r * 0.25,
          borderRadius: r * 0.15,
          borderWidth: 0,
          position: 'absolute',
          top: cy + r * 0.25,
          left: cx - r * 0.18,
          borderBottomWidth: 2.5,
          borderBottomColor: level.eyeColor,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderTopWidth: 0,
        }}
      />

      {/* Feet */}
      <View
        style={{
          width: r * 0.4,
          height: r * 0.18,
          borderRadius: r * 0.1,
          backgroundColor: level.snoutColor,
          position: 'absolute',
          top: cy + r * 0.85,
          left: cx - r * 0.5,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />
      <View
        style={{
          width: r * 0.4,
          height: r * 0.18,
          borderRadius: r * 0.1,
          backgroundColor: level.snoutColor,
          position: 'absolute',
          top: cy + r * 0.85,
          right: cx - r * 0.5,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  ear: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glowRing: {
    position: 'absolute',
  },
});
