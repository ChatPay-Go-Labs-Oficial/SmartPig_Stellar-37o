import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius, blendOver } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';

const FACE = 56;
// A base é a face "extrudada" 3 px para a direita e 5 px para baixo.
const DEPTH_X = 3;
const DEPTH_Y = 5;
// Passos da extrusão: retângulos arredondados opacos ao longo da diagonal.
// Com passo de 1 px não aparece degrau nas curvas.
const EXTRUSION_STEPS = [0.2, 0.4, 0.6, 0.8, 1];

const HIGHLIGHT = 1.5; // brilho interno no topo (Figma: inner shadow y 1.5, branco 24%)
const SHADE = 2; // sombra interna embaixo (Figma: inner shadow y -2, preto 18%)

interface ActionKey3DProps {
  icon: V2IconName;
  label: string;
  /** Primária = ação principal (tinta do destaque); Neutra = as demais. */
  variant?: 'primary' | 'neutral';
  /** Neutra com cadeado: a ação existe mas ainda não está liberada. */
  locked?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  /**
   * Teto de escala da fonte do rótulo. A tela calcula um valor comum para as
   * quatro teclas (cabe na coluna mais estreita), então elas ficam iguais.
   */
  labelMaxScale?: number;
}

/**
 * Tecla 3D das ações da Carteira (Figma "v2/Ação 3D"). O rótulo fica abaixo.
 *
 * Estática de propósito: o toque não anima nem re-renderiza nada, só dispara
 * a ação. O volume vem do desenho:
 * - base: a face extrudada na diagonal, com sombra projetada;
 * - face: degradê + brilho de 1,5 px no topo e sombra de 2 px embaixo que
 *   acompanham a curva (três camadas deslocadas, recortadas pelo raio).
 */
export const ActionKey3D = memo(function ActionKey3D({
  icon,
  label,
  variant = 'neutral',
  locked = false,
  onPress,
  accessibilityHint,
  labelMaxScale = 1.3,
}: ActionKey3DProps) {
  const accent = useAccent();
  const isPrimary = variant === 'primary' && !locked;

  const faceColors = isPrimary
    ? ([accent.alpha(0.28), accent.alpha(0.16)] as const)
    : locked
      ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)'] as const)
      : (['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)'] as const);
  const faceFill = isPrimary ? V2Colors.background : '#000000';
  // Base opaca: as camadas da extrusão se sobrepõem sem somar transparência.
  const baseColors = isPrimary
    ? ([
        blendOver(accent.base, 0.12, V2Colors.background),
        blendOver(accent.base, 0.06, V2Colors.background),
      ] as const)
    : ([
        blendOver('#ffffff', 0.06, V2Colors.background),
        blendOver('#ffffff', 0.02, V2Colors.background),
      ] as const);
  const faceBorder = isPrimary ? accent.alpha(0.4) : 'rgba(255,255,255,0.1)';
  const iconColor = locked ? V2Colors.textMuted : V2Colors.text;

  const face = (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: faceFill }]} />
      <LinearGradient colors={faceColors} style={StyleSheet.absoluteFill} />
    </>
  );

  return (
    <Pressable
      onPressIn={() => {
        Haptics.selectionAsync();
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, bloqueado` : label}
      accessibilityHint={accessibilityHint}
      style={styles.wrapper}
    >
      <View style={styles.key}>
        {/* Sombra projetada: View com fundo próprio (a elevação do Android
            precisa de um contorno opaco, que o degradê nativo não fornece). */}
        <View style={[styles.slab, styles.slabShadow, { backgroundColor: baseColors[1] }]} />
        {EXTRUSION_STEPS.map((t) => (
          <LinearGradient
            key={t}
            colors={baseColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.slab, { left: DEPTH_X * t, top: DEPTH_Y * t }]}
          />
        ))}

        {/* Camada 1: a face inteira com o brilho por cima. */}
        <View style={styles.face}>
          {face}
          <View style={[StyleSheet.absoluteFill, styles.highlightTint]} />

          {/* Camada 2: 1,5 px abaixo, com a sombra; o que sobra da camada 1
              acima dela é o brilho, já na forma da curva. */}
          <View style={[styles.layer, { top: HIGHLIGHT }]}>
            {face}
            <View style={[StyleSheet.absoluteFill, styles.shadeTint]} />

            {/* Camada 3: a face limpa, 2 px acima da camada 2; o que sobra
                dela embaixo é a sombra. */}
            <View style={[styles.layer, { top: -SHADE }]}>{face}</View>
          </View>

          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            <V2Icon name={icon} size={24} color={iconColor} />
          </View>
          <View style={[styles.border, { borderColor: faceBorder }]} pointerEvents="none" />
        </View>

        {locked && (
          <View style={styles.lockBadge} pointerEvents="none">
            <V2Icon name="lock" size={11} color={V2Colors.textSecondary} />
          </View>
        )}
      </View>

      <Text
        style={[styles.label, locked && { color: V2Colors.textMuted }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={labelMaxScale}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Coluna flexível com teto: em telas largas as teclas não se espalham.
  wrapper: {
    flex: 1,
    maxWidth: 88,
    alignItems: 'center',
    gap: 8,
  },
  key: {
    width: FACE + DEPTH_X,
    height: FACE + DEPTH_Y,
  },
  slab: {
    position: 'absolute',
    width: FACE,
    height: FACE,
    borderRadius: V2Radius.key,
  },
  slabShadow: {
    left: DEPTH_X,
    top: DEPTH_Y,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  face: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FACE,
    height: FACE,
    borderRadius: V2Radius.key,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    width: FACE,
    height: FACE,
    borderRadius: V2Radius.key,
    overflow: 'hidden',
  },
  highlightTint: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  shadeTint: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: V2Radius.key,
    borderWidth: 1,
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
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: V2Font.extraBold,
    fontSize: 12.5,
    color: V2Colors.text,
  },
});
