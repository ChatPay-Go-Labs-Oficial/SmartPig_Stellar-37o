import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { V2Font } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon } from '../V2Icon';

interface XpGainPillProps {
  xp: number;
  /** Home (30h) é a menor; Seu nível (36b), a regular. */
  size: 'small' | 'regular';
}

/** "+3 XP" ao lado do XP depois que a recompensa do dia foi recebida. */
function XpGainPillView({ xp, size }: XpGainPillProps) {
  const accent = useAccent();
  const small = size === 'small';
  return (
    <View
      style={[
        styles.pill,
        small ? styles.small : styles.regular,
        { backgroundColor: accent.alpha(0.16), borderColor: accent.alpha(0.4) },
      ]}
      accessibilityLabel={`Mais ${xp} XP de hoje`}
    >
      <V2Icon name="sparkles" size={small ? 10 : 11} color={accent.light} />
      <Text style={[styles.label, { fontSize: small ? 10.5 : 11, color: accent.light }]}>
        +{xp} XP
      </Text>
    </View>
  );
}

export const XpGainPill = memo(XpGainPillView);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
  small: {
    gap: 3,
    paddingLeft: 6,
    paddingRight: 7,
    paddingVertical: 2,
  },
  regular: {
    gap: 4,
    paddingLeft: 8,
    paddingRight: 9,
    paddingVertical: 3,
  },
  label: {
    fontFamily: V2Font.extraBold,
  },
});
