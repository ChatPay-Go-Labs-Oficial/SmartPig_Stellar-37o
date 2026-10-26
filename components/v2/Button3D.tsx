import { memo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { V2Colors, V2Font, V2Radius, blendOver } from '@/constants/theme-v2';
import { useAccent } from '@/hooks/use-accent';
import { V2Icon, type V2IconName } from './V2Icon';
import { V2Spinner } from './V2Spinner';

const HEIGHT = 57;
// A base aparece 4 px abaixo da face: o degrau do 3D.
const DEPTH = 4;

// Altura da face, raio e texto de cada tamanho do Figma. Regular: ações de
// tela e de sheet. Cartão: o regular com texto de 16, nas ações dentro do
// cartão da subida de nível (37a). Compacto: o "Pegar" da recompensa do dia.
// Pequeno: o "+3 XP" do card de Nível na Home. A largura dos menores vem de
// quem usa (`style`).
const SIZES = {
  regular: { height: HEIGHT, radius: V2Radius.key, fontSize: 17, letterSpacing: 0.17, icon: 20, gap: 10 },
  card: { height: HEIGHT, radius: V2Radius.key, fontSize: 16, letterSpacing: 0.16, icon: 20, gap: 10 },
  compact: { height: 40, radius: 14, fontSize: 14, letterSpacing: 0, icon: 16, gap: 6 },
  small: { height: 32, radius: 12, fontSize: 12.5, letterSpacing: 0, icon: 14, gap: 5 },
} as const;

// Vidro no acabamento das teclas da Carteira (ActionKey3D, Figma "v2/Ação 3D"
// Neutra): face sólida com degradê, contorno fino, brilho de 1,5 px no topo e
// sombra de 2 px embaixo acompanhando a curva, sobre uma base opaca com
// sombra projetada.
const GLASS_FACE = ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)'] as const;
const GLASS_BASE = blendOver('#ffffff', 0.04, V2Colors.background);
// Claro (Figma "Claro = Apple"): face branca sobre base lilás acinzentada.
const LIGHT_BASE = '#b9b3c7';

interface Button3DProps {
  label: string;
  onPress: () => void;
  /** Primária = ação principal; Vidro = ação secundária; Claro = Apple. */
  variant?: 'primary' | 'glass' | 'light';
  /** Regular (padrão), Compacto ou Pequeno; ver SIZES. */
  size?: keyof typeof SIZES;
  icon?: V2IconName;
  /** No lugar do ícone: uma marca que não é ícone de traço (logo do Google). */
  leading?: ReactNode;
  loading?: boolean;
  /** Texto ao lado do spinner enquanto carrega (Figma: "Conectando..."). */
  loadingLabel?: string;
  disabled?: boolean;
  /** Largura e flex do botão (padrão: largura total). */
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Botão 3D (Figma "v2/Botão 3D"), estilos Primária e Vidro.
 *
 * Estático de propósito, como as teclas da Carteira: o toque não anima nem
 * re-renderiza nada. A vibração sai no instante em que o dedo encosta, e a
 * ação no soltar. O volume vem só do desenho:
 * - Primária: face no destaque sobre base mais escura 4 px abaixo, com o
 *   brilho de 2 px do topo acompanhando a curva (Figma);
 * - Vidro: o acabamento das teclas neutras da Carteira (ver GLASS_FACE).
 */
export const Button3D = memo(function Button3D({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  leading,
  loading = false,
  loadingLabel,
  disabled = false,
  style,
  accessibilityHint,
}: Button3DProps) {
  const accent = useAccent();
  const isPrimary = variant === 'primary';
  const isLight = variant === 'light';
  const inactive = disabled || loading;
  const textColor = isLight ? V2Colors.background : V2Colors.onPrimary;
  const metrics = SIZES[size];
  const rounded = { borderRadius: metrics.radius };
  const labelSize = { fontSize: metrics.fontSize, letterSpacing: metrics.letterSpacing };
  const iconSize = size === 'regular' && !isPrimary ? 24 : metrics.icon;

  return (
    <Pressable
      onPressIn={() => {
        Haptics.selectionAsync().catch(() => {});
      }}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      // Desabilitado, a opacidade vale para o botão inteiro (Figma): sem isto o
      // Android a aplica em cada camada, e a base aparece através da face.
      needsOffscreenAlphaCompositing={disabled}
      style={[styles.wrapper, { height: metrics.height + DEPTH }, style, disabled && styles.disabled]}
    >
      {isPrimary ? (
        <View style={[styles.base, rounded, { backgroundColor: accent.dark }]} />
      ) : isLight ? (
        <View style={[styles.base, rounded, { backgroundColor: LIGHT_BASE }]} />
      ) : (
        <View style={[styles.base, rounded, styles.glassBase]} />
      )}

      <View
        style={[
          styles.face,
          rounded,
          { height: metrics.height, gap: metrics.gap },
          isPrimary && { backgroundColor: accent.base },
          isLight && styles.lightFace,
        ]}
      >
        {isPrimary || isLight ? (
          <View style={[styles.highlight, rounded]} pointerEvents="none" />
        ) : (
          <>
            <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
            <LinearGradient colors={GLASS_FACE} style={StyleSheet.absoluteFill} />
            <View style={[styles.glassHighlight, rounded]} pointerEvents="none" />
            <View style={[styles.glassShade, rounded]} pointerEvents="none" />
            <View style={[styles.glassBorder, rounded]} pointerEvents="none" />
          </>
        )}
        {loading && loadingLabel ? (
          <>
            <V2Spinner size={18} color={textColor} />
            <Text style={[styles.label, labelSize, { color: textColor }]} numberOfLines={1}>
              {loadingLabel}
            </Text>
          </>
        ) : loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {leading ?? (icon && <V2Icon name={icon} size={iconSize} color={textColor} />)}
            <Text style={[styles.label, labelSize, { color: textColor }]} numberOfLines={1}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    height: HEIGHT + DEPTH,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  // A base fica por trás da face inteira e aparece só no degrau de baixo.
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: V2Radius.key,
  },
  // Base opaca com sombra projetada (a elevação do Android precisa de fundo
  // opaco), como a extrusão das teclas da Carteira.
  glassBase: {
    backgroundColor: GLASS_BASE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
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
  // Figma: sombra interna 0 2 0 branca 22%, um aro que acompanha a curva do
  // topo e afina até zero nas laterais (a borda de cima com o mesmo raio).
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: V2Radius.key,
    borderTopWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  lightFace: {
    backgroundColor: '#ffffff',
  },
  glassFill: {
    backgroundColor: '#000000',
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: V2Radius.key,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  glassShade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: V2Radius.key,
    borderBottomWidth: 2,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: V2Radius.key,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    flexShrink: 1,
    fontFamily: V2Font.extraBold,
    fontSize: 17,
    letterSpacing: 0.17,
    color: V2Colors.onPrimary,
  },
});
