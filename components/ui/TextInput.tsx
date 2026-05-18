import { useState, ReactNode } from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Accent, Colors, Font, FontSize, Radius } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextInput({
  label,
  leftIcon,
  rightElement,
  error,
  containerStyle,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <RNTextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={Colors.mutedForeground}
          selectionColor={Accent.primary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontFamily: Font.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    minHeight: 50,
  },
  inputRowFocused: {
    borderColor: Accent.primary,
  },
  inputRowError: {
    borderColor: Accent.destructive,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightElement: {
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Font.regular,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  inputWithLeft: {
    paddingLeft: 8,
  },
  error: {
    fontFamily: Font.regular,
    fontSize: FontSize.label,
    color: Accent.destructive,
  },
});
