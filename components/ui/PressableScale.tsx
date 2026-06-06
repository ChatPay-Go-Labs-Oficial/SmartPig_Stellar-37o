import { Pressable, PressableProps, Animated } from 'react-native';
import { useRef, useCallback } from 'react';
import { useSound } from '@/hooks/use-sound';

interface PressableScaleProps extends PressableProps {
  scale?: number;
  disableSound?: boolean;
}

export function PressableScale({
  scale = 0.95,
  onPressIn,
  onPressOut,
  style,
  disabled,
  disableSound = false,
  ...rest
}: PressableScaleProps) {
  const anim = useRef(new Animated.Value(1)).current;
  const { playClick } = useSound();

  const handlePressIn = useCallback(
    (e: any) => {
      if (!disableSound && !disabled) {
        playClick();
      }
      Animated.spring(anim, {
        toValue: scale,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
      onPressIn?.(e);
    },
    [anim, scale, onPressIn, disableSound, disabled, playClick],
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
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} {...rest} />
    </Animated.View>
  );
}
