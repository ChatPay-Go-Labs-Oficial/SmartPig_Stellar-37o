import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Accent, Colors, Font, FontSize, Radius } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

interface Props {
  title?: string;
  onBack?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  showHelp?: boolean;
}

export function OnboardingHeader({
  title = 'PigFi',
  onBack,
  showClose = false,
  onClose,
  showHelp = true,
}: Props) {
  const router = useRouter();

  const handleLeft = () => {
    if (showClose) {
      onClose ? onClose() : router.back();
    } else {
      onBack ? onBack() : router.back();
    }
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={handleLeft} style={styles.sideBtn} hitSlop={12}>
        <IconSymbol
          name={showClose ? 'xmark' : 'chevron.left'}
          size={24}
          color={Colors.foreground}
        />
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      {showHelp ? (
        <Pressable style={styles.sideBtn} hitSlop={12}>
          <View style={styles.helpCircle}>
            <IconSymbol name="questionmark.circle" size={20} color={Colors.mutedForeground} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.sideBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sideBtn: {
    width: 36,
    alignItems: 'center',
  },
  title: {
    fontFamily: Font.extraBold,
    fontSize: FontSize.subheading,
    color: Accent.primary,
  },
  helpCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
