import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Accent, Gradients, Radius, Font, FontSize, Glow } from '@/constants/theme';

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
  rightIcon?: ReactNode;
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
  rightIcon,
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
    fontFamily: Font.bold,
    fontWeight: '700',
  };

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[baseStyle, Glow.pink]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Text style={[textStyle, { color: '#fff' }]}>{label}</Text>{rightIcon}</>
          }
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'gold') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}>
        <LinearGradient
          colors={Gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[baseStyle, Glow.gold]}
        >
          {loading
            ? <ActivityIndicator color="#1a0a00" size="small" />
            : <><Text style={[textStyle, { color: 'hsl(42, 100%, 10%)' }]}>{label}</Text>{rightIcon}</>
          }
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'ghost'
      ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: Accent.primary }
      : variant === 'destructive'
      ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: Accent.destructive }
      : { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border }; // secondary

  const variantTextColor =
    variant === 'ghost' ? Accent.primary
    : variant === 'destructive' ? Accent.destructive
    : Colors.foreground;

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={[baseStyle, variantStyle, style]}>
      {loading
        ? <ActivityIndicator color={variantTextColor} size="small" />
        : <><Text style={[textStyle, { color: variantTextColor }]}>{label}</Text>{rightIcon}</>
      }
    </Pressable>
  );
}
