import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

const FACE = 56;
// A base fica 3 px à direita e 5 px abaixo da face; ao tocar, a face desce até ela.
const OFFSET_X = 3;
const OFFSET_Y = 5;

interface ActionKey3DProps {
  icon: V2IconName;
  label: string;
  /** Primária = ação principal (tinta do destaque); Neutra = as demais. */
  variant?: 'primary' | 'neutral';
  /** Neutra com cadeado: a ação existe mas ainda não está liberada. */
  locked?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}

/** Tecla 3D das ações da Carteira (Figma "v2/Ação 3D"). O rótulo fica abaixo. */
export function ActionKey3D({
  icon,
  label,
  variant = 'neutral',
  locked = false,
  onPress,
  accessibilityHint,
}: ActionKey3DProps) {
  const accent = useAccent();
  const isPrimary = variant === 'primary' && !locked;

  const faceColors = isPrimary
    ? ([accent.alpha(0.28), accent.alpha(0.16)] as const)
    : locked
      ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)'] as const)
      : (['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)'] as const);
  const baseColors = isPrimary
    ? ([accent.alpha(0.12), accent.alpha(0.06)] as const)
    : (['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as const);
  const faceBorder = isPrimary ? accent.alpha(0.4) : 'rgba(255,255,255,0.1)';
  const iconColor = locked ? V2Colors.textMuted : V2Colors.text;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, bloqueado` : label}
      accessibilityHint={accessibilityHint}
      style={styles.wrapper}
    >
      {({ pressed }) => (
        <>
          <View style={styles.key}>
            <View style={styles.base}>
              <View style={[StyleSheet.absoluteFill, styles.baseFill]} />
              <LinearGradient
                colors={baseColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.rounded]}
              />
            </View>

            <View
              style={[
                styles.face,
                pressed && { transform: [{ translateX: OFFSET_X }, { translateY: OFFSET_Y }] },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, styles.baseFill]} />
              <LinearGradient
                colors={faceColors}
                style={[StyleSheet.absoluteFill, styles.rounded]}
              />
              {/* Brilho interno no topo da face */}
              <View style={styles.faceHighlight} pointerEvents="none" />
              <V2Icon name={icon} size={24} color={iconColor} />
              {/* Borda numa camada própria, por cima do degradê */}
              <View
                style={[StyleSheet.absoluteFill, styles.faceBorder, { borderColor: faceBorder }]}
                pointerEvents="none"
              />

              {locked && (
                <View style={styles.lockBadge}>
                  <V2Icon name="lock" size={11} color={V2Colors.textSecondary} />
                </View>
              )}
            </View>
          </View>

          <Text style={[styles.label, locked && { color: V2Colors.textMuted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  key: {
    width: FACE + OFFSET_X,
    height: FACE + OFFSET_Y,
  },
  rounded: {
    borderRadius: V2Radius.key,
  },
  base: {
    position: 'absolute',
    left: OFFSET_X,
    top: OFFSET_Y,
    width: FACE,
    height: FACE,
    borderRadius: V2Radius.key,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  baseFill: {
    backgroundColor: V2Colors.background,
    borderRadius: V2Radius.key,
  },
  face: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FACE,
    height: FACE,
    borderRadius: V2Radius.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceBorder: {
    borderRadius: V2Radius.key,
    borderWidth: 1,
  },
  faceHighlight: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  lockBadge: {
    position: 'absolute',
    left: 37,
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: V2Colors.sheetTop,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
});
