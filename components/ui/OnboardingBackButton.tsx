import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { Colors, Spacing } from '@/constants/theme';

export function OnboardingBackButton() {
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)' as any)}
      style={styles.backBtn}
      hitSlop={8}
    >
      <IconSymbol
        name="chevron.right"
        size={24}
        color={Colors.foreground}
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
});
