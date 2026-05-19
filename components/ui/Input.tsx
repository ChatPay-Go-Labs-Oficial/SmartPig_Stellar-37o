import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius, Font, FontSize } from '@/constants/theme';

interface InputProps extends TextInputProps {
  glass?: boolean;
}

export function Input({ glass = false, style, ...rest }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.3)"
      style={[
        glass ? styles.glass : styles.default,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.foreground,
    fontFamily: Font.semiBold,
    fontSize: FontSize.body,
    paddingHorizontal: 16,
  },
  glass: {
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    color: Colors.foreground,
    fontFamily: Font.semiBold,
    fontSize: FontSize.body,
    paddingHorizontal: 20,
  },
});
