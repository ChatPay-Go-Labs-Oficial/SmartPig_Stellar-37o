import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, FontSize, Radius } from '@/constants/theme';
import { flashcards } from '@/constants/flashcards';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export function FlashcardSwiper() {
  const [index, setIndex] = useState(0);
  const total = flashcards.length;
  const card = flashcards[index];

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      pan.setValue({ x: gesture.dx, y: 0 });
      const s = Math.max(0.9, 1 - Math.abs(gesture.dx) / (width * 2));
      scale.setValue(s);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 80) {
        const swipeDir = gesture.dx > 0 ? 1 : -1;
        const indexDir = -swipeDir;
        const targetX = swipeDir * 400;
        Animated.timing(pan, {
          toValue: { x: targetX, y: 0 },
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          const next = (index + indexDir + total) % total;
          setIndex(next);
          pan.setValue({ x: -targetX, y: 0 });
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          scale.setValue(1);
        });
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.cardArea}>
        {card && (
          <Animated.View
            style={{
              transform: [
                { translateX: pan.x },
                { rotate },
                { scale },
              ],
            }}
            {...panResponder.panHandlers}
          >
            <LinearGradient
              colors={card.color}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.emoji}>{card.emoji}</Text>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.content}>{card.content}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {flashcards.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <Text style={styles.counter}>{index + 1} de {total} cards</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  cardArea: {
    width: CARD_WIDTH,
    height: 280,
  },
  card: {
    width: CARD_WIDTH,
    height: 280,
    borderRadius: Radius.lg,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSize.subheading,
    fontFamily: Font.extraBold,
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.foreground,
  },
  counter: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
  },
});
