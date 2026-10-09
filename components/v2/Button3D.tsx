import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

const HEIGHT = 57;
// A face fica sobre uma base 4 px mais baixa; ao tocar, desce até ela.
const DEPTH = 4;

interface Button3DProps {
  label: string;
  onPress: () => void;
  /** Primária = ação principal; Vidro = ação secundária. */
  variant?: 'primary' | 'glass';
  icon?: V2IconName;
  loading?: boolean;
  disabled?: boolean;
}

/** Botão 3D (Figma "v2/Botão 3D"), estilos Primária e Vidro. */
export function Button3D({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
}: Button3DProps) {
  const accent = useAccent();
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

  const faceColor = isPrimary ? accent.base : 'rgba(255,255,255,0.1)';
  const baseColor = isPrimary ? accent.dark : 'rgba(255,255,255,0.05)';
  const textColor = isPrimary ? V2Colors.onPrimary : V2Colors.text;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.wrapper, disabled && styles.disabled]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.base, { backgroundColor: baseColor }]} />
          <View
            style={[
              styles.face,
              { backgroundColor: faceColor },
              pressed && !inactive && { transform: [{ translateY: DEPTH }] },
            ]}
          >
            <View style={styles.highlight} pointerEvents="none" />
            {loading ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <>
                {icon && <V2Icon name={icon} size={20} color={textColor} />}
                <Text style={[styles.label, { color: textColor }]}>{label}</Text>
              </>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: HEIGHT + DEPTH,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HEIGHT,
    borderRadius: V2Radius.key,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: HEIGHT,
    borderRadius: V2Radius.key,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    fontFamily: V2Font.extraBold,
    fontSize: 17,
    letterSpacing: 0.17,
  },
});
