import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

interface NavChipProps {
  label: string;
  /** Ícone antes do texto (Histórico). */
  icon?: V2IconName;
  /** Seta depois do texto, para "ir a outra tela" (Ir pra carteira, Ver todos). */
  chevron?: boolean;
  /** Só o ícone, quando o texto não cabe (Histórico em tela estreita). */
  iconOnly?: boolean;
  /**
   * Sem onPress o chip é só indicação: o toque é de quem o contém (a linha da
   * carteira na Home inteira é o botão).
   */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip de navegação V2 (Figma "ver histórico"): pílula neutra de vidro, texto
 * claro e ícone no destaque claro. É o padrão para atalhos de tela — o chip
 * Histórico da Carteira, "Ir pra carteira" e "Ver todos" da Home.
 */
function NavChipView({ label, icon, chevron, iconOnly, onPress, accessibilityLabel, style }: NavChipProps) {
  const accent = useAccent();
  const content = (
    <>
      {icon && <V2Icon name={icon} size={iconOnly ? 16 : 14} color={accent.light} />}
      {!iconOnly && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
      {chevron && !iconOnly && <V2Icon name="chevron-right" size={14} color={accent.light} />}
    </>
  );
  const chipStyle = [
    styles.chip,
    icon && !chevron ? styles.leading : styles.trailing,
    iconOnly && styles.iconOnly,
    style,
  ];

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [chipStyle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {content}
    </Pressable>
  );
}

export const NavChip = memo(NavChipView);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.chip,
  },
  leading: {
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
  },
  trailing: {
    gap: 4,
    paddingLeft: 12,
    paddingRight: 9,
  },
  iconOnly: {
    width: 36,
    height: 36,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: V2Font.semiBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
});
