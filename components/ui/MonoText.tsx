import { Platform, StyleSheet, Text, type TextProps } from 'react-native';
import { Font } from '@/constants/theme';
import { useIsPro } from '@/hooks/use-app-mode';

/**
 * Texto para identificadores — endereços, hashes, contract IDs.
 *
 * No Pro renderiza em monoespaçada, que é o sinal visual mais forte de "isto é
 * um app cripto" disponível sem mexer na paleta: a Nunito do app lê como web2.
 * No Lite volta para a fonte normal, já que ali esses valores praticamente não
 * aparecem.
 */
export function MonoText({ style, ...rest }: TextProps) {
  const isPro = useIsPro();

  return <Text {...rest} style={[isPro ? styles.mono : styles.plain, style]} />;
}

const styles = StyleSheet.create({
  mono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  plain: {
    fontFamily: Font.regular,
  },
});
