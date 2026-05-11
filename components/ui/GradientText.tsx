import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextStyle, StyleProp } from 'react-native';
import { Gradients, Font, FontSize } from '@/constants/theme';

type GradientVariant = 'primary' | 'hot' | 'gold';

interface GradientTextProps {
  children: string;
  variant?: GradientVariant;
  style?: StyleProp<TextStyle>;
}

export function GradientText({ children, variant = 'primary', style }: GradientTextProps) {
  const colors = Gradients[variant];

  return (
    <MaskedView
      maskElement={
        <Text style={[{ fontSize: FontSize.display, fontFamily: Font.extraBold }, style]}>
          {children}
        </Text>
      }
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[{ fontSize: FontSize.display, fontFamily: Font.extraBold, opacity: 0 }, style]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
