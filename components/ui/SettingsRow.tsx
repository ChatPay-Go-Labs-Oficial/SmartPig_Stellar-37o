import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Accent,
  Colors,
  Font,
  FontSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Tone = 'default' | 'destructive';

interface SettingsRowProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: Tone;
  /** Texto revelado por um ⓘ na própria linha. */
  hint?: string;
  right?: React.ReactNode;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'default',
  hint,
  right,
}: SettingsRowProps) {
  const [hintVisible, setHintVisible] = useState(false);
  const isDestructive = tone === 'destructive';
  const accent = isDestructive ? Accent.destructive : Accent.primary;

  return (
    <View>
      <PressableScale onPress={onPress}>
        <View style={[styles.row, isDestructive && styles.rowDestructive]}>
          <View
            style={[
              styles.iconWrap,
              isDestructive && styles.iconWrapDestructive,
            ]}
          >
            <MaterialIcons name={icon} size={18} color={accent} />
          </View>

          <View style={styles.textWrap}>
            <Text style={[styles.title, isDestructive && { color: accent }]}>
              {title}
            </Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          {hint && (
            <Pressable
              onPress={() => setHintVisible((visible) => !visible)}
              hitSlop={12}
            >
              <MaterialIcons
                name={hintVisible ? 'info' : 'info-outline'}
                size={18}
                color={hintVisible ? accent : Colors.mutedForeground}
              />
            </Pressable>
          )}

          {right ?? (
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={Colors.mutedForeground}
            />
          )}
        </View>
      </PressableScale>

      {hint && hintVisible && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  rowDestructive: {
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(244,52,180,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapDestructive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.bodySmall,
    fontFamily: Font.bold,
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  hint: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[1],
    fontSize: FontSize.label,
    fontFamily: Font.semiBold,
    color: Colors.mutedForeground,
    lineHeight: 17,
  },
});
