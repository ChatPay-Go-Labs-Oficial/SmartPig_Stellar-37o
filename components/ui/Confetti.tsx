import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EMOJIS = ['🪙', '💰', '✨', '⭐', '💎', '🔥'];

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  size: number;
  spin: number;
  duration: number;
}

function ConfettiItem({ particle, onComplete }: { particle: Particle; onComplete: () => void }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, {
        duration: particle.duration,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [particle, progress, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = progress.value * (SCREEN_HEIGHT + 100) - 50;
    const rotate = `${progress.value * particle.spin}deg`;
    const scale = progress.value < 0.2 
      ? (progress.value / 0.2) * 1.2 
      : 1.2 - (progress.value - 0.2) * 0.4;
    const opacity = progress.value > 0.8
      ? 1 - (progress.value - 0.8) / 0.2
      : 1;

    // Drifting horizontally
    const drift = Math.sin(progress.value * Math.PI) * 40;
    const translateX = particle.x + drift;

    return {
      position: 'absolute',
      left: translateX,
      top: translateY,
      fontSize: particle.size,
      opacity: opacity,
      transform: [
        { rotate },
        { scale: scale },
      ],
    };
  });

  return (
    <Animated.Text style={animatedStyle}>
      {particle.emoji}
    </Animated.Text>
  );
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const p = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: Math.random() * (SCREEN_WIDTH - 40) + 10,
        delay: Math.random() * 800,
        size: 16 + Math.random() * 20,
        spin: Math.random() * 720 - 360,
        duration: 1800 + Math.random() * 800,
      }));
      setParticles(p);
      const timer = setTimeout(() => setParticles([]), duration + 1000);
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, duration]);

  if (particles.length === 0) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiItem
          key={p.id}
          particle={p}
          onComplete={() => {
            // Can clean up
          }}
        />
      ))}
    </Animated.View>
  );
}
