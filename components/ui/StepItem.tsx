import { ComponentProps } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Accent, Colors, Font, FontSize, Radius } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';

type IconName = ComponentProps<typeof IconSymbol>['name'];

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  status?: 'pending' | 'complete';
  highlighted?: boolean;
  showConnector?: boolean;
  onPress?: () => void;
}

export function StepItem({
  icon,
  title,
  subtitle,
  status = 'pending',
  highlighted = false,
  showConnector = false,
  onPress,
}: Props) {
  const isComplete = status === 'complete';

  const iconColor = isComplete
    ? Accent.success
    : highlighted
    ? Accent.primary
    : Colors.mutedForeground;

  const iconBg = isComplete
    ? 'rgba(25, 213, 96, 0.12)'
    : highlighted
    ? 'rgba(244, 52, 180, 0.12)'
    : Colors.muted;

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={[
          styles.row,
          isComplete && styles.rowComplete,
          highlighted && styles.rowHighlighted,
        ]}
        disabled={!onPress}
      >
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <IconSymbol name={isComplete ? 'checkmark.circle.fill' : icon} size={20} color={iconColor} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {!isComplete && (
          <IconSymbol name="chevron.right" size={20} color={Colors.mutedForeground} />
        )}
      </Pressable>

      {showConnector && (
        <View style={styles.connectorWrapper}>
          <View style={styles.connectorLine} />
        </View>
      )}
    </View>
  );
}

const ICON_BOX_SIZE = 40;
const CARD_PADDING = 16;
// center of icon = card padding + half of icon box
const CONNECTOR_LEFT = CARD_PADDING + ICON_BOX_SIZE / 2 - 1; // -1 = half line width

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: CARD_PADDING,
  },
  rowComplete: {
    borderColor: 'rgba(25, 213, 96, 0.3)',
    backgroundColor: 'rgba(25, 213, 96, 0.06)',
  },
  rowHighlighted: {
    borderColor: Accent.primary,
    backgroundColor: 'rgba(244, 52, 180, 0.04)',
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: ICON_BOX_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: FontSize.body,
    color: Colors.foreground,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.mutedForeground,
  },
  connectorWrapper: {
    height: 16,
    paddingLeft: CONNECTOR_LEFT,
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
  },
});
