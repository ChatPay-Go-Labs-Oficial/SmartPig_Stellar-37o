import { Pressable, PressableProps, Animated } from 'react-native';
import { useRef, useCallback } from 'react';

interface PressableScaleProps extends PressableProps {
  scale?: number;
}

export function PressableScale({ scale = 0.95, onPressIn, onPressOut, style, ...rest }: PressableScaleProps) {
  const anim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      Animated.spring(anim, {
        toValue: scale,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
      onPressIn?.(e);
    },
    [anim, scale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
      onPressOut?.(e);
    },
    [anim, onPressOut],
  );

  return (
    <Animated.View style={[{ transform: [{ scale: anim }] }, style as any]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest} />
    </Animated.View>
  );
}
