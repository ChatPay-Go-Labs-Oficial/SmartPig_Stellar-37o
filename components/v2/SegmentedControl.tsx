import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * compact: pílula do tamanho do texto (Carteira). large: largura total,
   * opções iguais de 42 (Figma "seletor" do Modo do app).
   */
  size?: 'compact' | 'large';
  disabled?: boolean;
}

/** Seletor em pílula (Figma "seletor" da Carteira): opção ativa no destaque. */
function SegmentedControlView<T extends string>({
  options,
  value,
  onChange,
  size = 'compact',
  disabled = false,
}: SegmentedControlProps<T>) {
  const accent = useAccent();
  const large = size === 'large';
  return (
    <View style={[styles.track, large && styles.trackLarge]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(option.id);
            }}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            style={[
              styles.option,
              large && styles.optionLarge,
              selected && { backgroundColor: accent.base },
            ]}
          >
            <Text
              style={[
                styles.label,
                large && styles.labelLarge,
                { color: selected ? V2Colors.onPrimary : V2Colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SegmentedControl = memo(SegmentedControlView) as typeof SegmentedControlView;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: V2Radius.full,
    borderWidth: 1,
    borderColor: V2Colors.surfaceBorderStrong,
    backgroundColor: V2Colors.chip,
  },
  option: {
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: V2Radius.full,
  },
  label: {
    fontFamily: V2Font.bold,
    fontSize: 13,
  },
  trackLarge: {
    gap: 0,
    padding: 4,
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  optionLarge: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelLarge: {
    fontFamily: V2Font.black,
    fontSize: 14,
  },
});
