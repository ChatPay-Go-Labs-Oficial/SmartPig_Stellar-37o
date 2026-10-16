import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { V2Colors } from '@/constants/theme-v2';

interface V2SpinnerProps {
  size?: number;
  color?: string;
}

/**
 * Spinner V2 (Figma "v2/Spinner/Claro"): anel com um quarto aberto girando
 * em 0,7 s. O traço acompanha o tamanho (2,5 no anel de 18).
 */
export function V2Spinner({ size = 18, color = V2Colors.onPrimary }: V2SpinnerProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 700, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const stroke = (size * 2.5) / 18;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: color,
          borderTopColor: 'transparent',
        },
        style,
      ]}
    />
  );
}
