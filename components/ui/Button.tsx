import { Text, ActivityIndicator, View, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Gradients, Radius, Font, FontSize, Glow } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'gold' | 'ghost' | 'secondary' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeStyles: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 7,  paddingHorizontal: 14, fontSize: FontSize.bodySmall },
  md: { paddingVertical: 11, paddingHorizontal: 20, fontSize: FontSize.body },
  lg: { paddingVertical: 15, paddingHorizontal: 28, fontSize: FontSize.subheading },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const sz = sizeStyles[size];
  const isDisabled = disabled || loading;

  const baseStyle: ViewStyle = {
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: sz.paddingVertical,
    paddingHorizontal: sz.paddingHorizontal,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  const textStyle: TextStyle = {
    fontSize: sz.fontSize,
    fontFamily: Font.black,
    fontWeight: '900',
  };

  if (variant === 'primary') {
    return (
      <PressableScale onPress={onPress} disabled={isDisabled} style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
        <LinearGradient
          colors={Gradients.hot}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[baseStyle, Glow.pink]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[textStyle, { color: '#fff' }]}>{label}</Text>
          }
        </LinearGradient>
      </PressableScale>
    );
  }

  if (variant === 'gold') {
    return (
      <PressableScale onPress={onPress} disabled={isDisabled} style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
        <LinearGradient
          colors={Gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[baseStyle, Glow.gold]}
        >
          {loading
            ? <ActivityIndicator color="#1a0a00" size="small" />
            : <Text style={[textStyle, { color: 'hsl(42, 100%, 10%)' }]}>{label}</Text>
          }
        </LinearGradient>
      </PressableScale>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'ghost'
      ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: Accent.primary }
      : variant === 'destructive'
      ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: Accent.destructive }
      : { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border };

  const variantTextColor =
    variant === 'ghost' ? Accent.primary
    : variant === 'destructive' ? Accent.destructive
    : Colors.foreground;

  return (
    <PressableScale onPress={onPress} disabled={isDisabled} style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
      <View style={[baseStyle, variantStyle]}>
        {loading
          ? <ActivityIndicator color={variantTextColor} size="small" />
          : <Text style={[textStyle, { color: variantTextColor }]}>{label}</Text>
        }
      </View>
    </PressableScale>
  );
}
