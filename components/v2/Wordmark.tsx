import { Text, type StyleProp, type TextStyle } from 'react-native';
import { V2Colors, V2Font } from '@/constants/theme-v2';

/** Roxo do "Fi" e do destaque do slogan (Figma "v2/Wordmark PigFi"). */
export const BRAND_PURPLE = '#a14bff';

interface WordmarkProps {
  /** Corpo do texto: 38 na abertura, 24 no topo do login. */
  size: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Logo em texto do PigFi (Figma "v2/Wordmark PigFi"): "Pig" branco e "Fi" em
 * roxo, Inter 900 com tracking de −3,5%.
 */
export function Wordmark({ size, style }: WordmarkProps) {
  return (
    <Text
      style={[
        { fontFamily: V2Font.black, fontSize: size, letterSpacing: size * -0.035, color: V2Colors.onPrimary },
        style,
      ]}
      accessibilityRole="header"
      accessibilityLabel="PigFi"
    >
      Pig<Text style={{ color: BRAND_PURPLE }}>Fi</Text>
    </Text>
  );
}
