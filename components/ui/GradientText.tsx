import { Text, TextStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients, Font, FontSize, Accent } from '@/constants/theme';

type GradientVariant = 'primary' | 'hot' | 'gold';

interface GradientTextProps {
  children: string;
  variant?: GradientVariant;
  style?: StyleProp<TextStyle>;
}

const variantColor: Record<GradientVariant, string> = {
  primary: Accent.primary,
  hot: Accent.neonOrange,
  gold: Accent.gold,
};

export function GradientText({ children, variant = 'primary', style }: GradientTextProps) {
  // Use solid color fallback — MaskedView can crash on some environments
  return (
    <Text style={[{ fontSize: FontSize.display, fontFamily: Font.extraBold, color: variantColor[variant] }, style]}>
      {children}
    </Text>
  );
}
