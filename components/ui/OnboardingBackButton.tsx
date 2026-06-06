import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { PressableScale } from './PressableScale';

export function OnboardingBackButton() {
  return (
    <PressableScale
      onPress={() => router.replace('/(tabs)' as any)}
      hitSlop={8}
    >
      <View style={styles.backBtn}>
        <IconSymbol
          name="chevron.right"
          size={24}
          color={Colors.foreground}
          style={{ transform: [{ rotate: '180deg' }] }}
        />
      </View>
    </PressableScale>
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
