import { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
  duration: number;
  delay: number;
}

interface Nebula {
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
  xAnim: Animated.Value;
  yAnim: Animated.Value;
  duration: number;
}

function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 1,
    opacity: new Animated.Value(Math.random() * 0.3 + 0.1),
    duration: Math.random() * 2000 + 1500,
    delay: Math.random() * 3000,
  }));
}

function createNebulas(count: number): Nebula[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 6 + Math.random() * 20,
    opacity: new Animated.Value(0.06 + Math.random() * 0.12),
    xAnim: new Animated.Value(0),
    yAnim: new Animated.Value(0),
    duration: 4 + Math.random() * 4,
  }));
}

interface StarryBackgroundProps {
  stars?: number;
  nebulas?: number;
  shootingStars?: boolean;
}

export function StarryBackground({
  stars: starCount = 40,
  nebulas: nebulaCount = 6,
  shootingStars = true,
}: StarryBackgroundProps) {
  const stars = useRef(createStars(starCount)).current;
  const nebulas = useRef(createNebulas(nebulaCount)).current;

  useEffect(() => {
    const animations = stars.map((star) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: star.duration,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.1,
            duration: star.duration,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    const nebulaAnims = nebulas.map((n) =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(n.xAnim, {
              toValue: Math.random() * 30 - 15,
              duration: n.duration * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(n.xAnim, {
              toValue: 0,
              duration: n.duration * 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(n.yAnim, {
              toValue: -30 - Math.random() * 20,
              duration: n.duration * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(n.yAnim, {
              toValue: 0,
              duration: n.duration * 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(n.opacity, {
              toValue: 0.25,
              duration: (n.duration / 2) * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(n.opacity, {
              toValue: 0.06,
              duration: (n.duration / 2) * 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ),
    );

    animations.forEach((a) => a.start());
    nebulaAnims.forEach((a) => a.start());

    return () => {
      animations.forEach((a) => a.stop());
      nebulaAnims.forEach((a) => a.stop());
    };
  }, [stars, nebulas]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Nebula blobs */}
      {nebulas.map((n, i) => (
        <Animated.View
          key={`neb-${i}`}
          style={{
            position: 'absolute',
            left: n.x,
            top: n.y,
            width: n.size,
            height: n.size,
            borderRadius: n.size / 2,
            backgroundColor: `hsla(${220 + Math.random() * 80}, 80%, 65%, 1)`,
            opacity: n.opacity,
            transform: [
              { translateX: n.xAnim },
              { translateY: n.yAnim },
            ],
          }}
        />
      ))}
      {/* Twinkle stars */}
      {stars.map((star, i) => (
        <Animated.View
          key={`star-${i}`}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#fff',
            opacity: star.opacity,
            shadowColor: '#fff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 3,
          }}
        />
      ))}
    </View>
  );
}

export function ShootingStar() {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.random() * 5000),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 220,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 100,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity, translateX, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: '10%',
        top: '15%',
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate: '-25deg' },
        ],
        pointerEvents: 'none',
      }}
    >
      <View
        style={{
          width: 60,
          height: 1.5,
          backgroundColor: 'transparent',
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <View
          style={{
            width: 60,
            height: 1.5,
            backgroundColor: '#fff',
          }}
        />
      </View>
    </Animated.View>
  );
}
