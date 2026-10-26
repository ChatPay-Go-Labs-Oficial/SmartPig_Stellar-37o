import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { V2Colors } from '@/constants/theme-v2';
import { journeyTier } from '@/constants/experience-tiers';
import { useAccent } from '@/hooks/use-accent';
import type { ExperienceTier } from '@/lib/api/experience';

// Medidas dos quadros do Figma. Os pontos ficam num arco em volta da foto,
// com o vão embaixo, onde fica o selo do nível.
const GEOMETRY = {
  // "Trilha · Seu nível" (36a): quadro 220×200, centro na foto.
  large: {
    width: 220,
    height: 200,
    cx: 110,
    cy: 98,
    radius: 75,
    start: 122.6,
    sweep: 294.8,
    lit: 10,
    glow: 22,
    next: 7.5,
    off: 7,
    diamondLit: 12,
    diamondNext: 11,
    diamondOff: 9,
  },
  // "v2/Cabeçalho do Perfil" (38i): quadro 144 em volta do avatar de 104.
  small: {
    width: 144,
    height: 144,
    cx: 72,
    cy: 72,
    radius: 62,
    start: 132,
    sweep: 276,
    lit: 8,
    glow: 18,
    next: 5.5,
    off: 6,
    diamondLit: 10,
    diamondNext: 9,
    diamondOff: 7.5,
  },
} as const;

/** Moldura do nível máximo (36h): os 15 pontos acesos. */
const MAX_DOTS = 15;
/** Aro e ornamentos de quem já completou uma etapa (36e). */
const RIM_RADIUS = 91.25;
const ORNAMENT_RADIUS = 92;
const ORNAMENT_SIZE = 11;
const ORNAMENT_ANGLES = [270, 180, 0];

// O Figma centra o traço no contorno; no RN a borda fica por dentro. Para o
// mesmo desenho, a caixa cresce a largura de um traço.
const NEXT_STROKE = 1.5;
const RIM_STROKE = 1.5;
const ORNAMENT_STROKE = 2;
/** Contorno preto dos losangos aceso e apagado (36e). */
const DIAMOND_STROKE = 1;

interface LevelDotsProps {
  level: number;
  tier: ExperienceTier;
  /** Nível máximo: todos os pontos acesos. */
  max: boolean;
  variant: 'large' | 'small';
}

/**
 * Pontos de luz da moldura (Figma "moldura · Iniciante (1 ponto de luz por
 * nível)"): um ponto por nível da etapa, aceso até o nível atual, o próximo
 * só com o contorno e os demais apagados. No Iniciante são círculos; a partir
 * do Consistente, losangos, e a moldura ganha o aro e os ornamentos.
 */
function LevelDotsView({ level, tier, max, variant }: LevelDotsProps) {
  const accent = useAccent();
  const g = GEOMETRY[variant];
  const info = journeyTier(tier);
  const count = max ? MAX_DOTS : info.lastLevel - info.firstLevel + 1;
  const lit = max ? count : Math.max(0, level - info.firstLevel + 1);
  const diamond = max || info.dot === 'diamond';
  const decorated = variant === 'large' && diamond;

  const at = (angle: number, radius: number, size: number): ViewStyle => {
    const rad = (angle * Math.PI) / 180;
    return {
      position: 'absolute',
      width: size,
      height: size,
      left: g.cx + radius * Math.cos(rad) - size / 2,
      top: g.cy + radius * Math.sin(rad) - size / 2,
    };
  };

  return (
    <View pointerEvents="none" style={{ width: g.width, height: g.height }}>
      {decorated ? (
        <View
          style={[
            at(0, 0, RIM_RADIUS * 2 + RIM_STROKE),
            styles.rim,
            { borderRadius: RIM_RADIUS + RIM_STROKE / 2, borderColor: accent.alpha(0.48) },
          ]}
        />
      ) : null}
      {decorated
        ? ORNAMENT_ANGLES.map((angle) => (
            <View
              key={angle}
              style={[
                at(angle, ORNAMENT_RADIUS, ORNAMENT_SIZE / Math.SQRT2 + ORNAMENT_STROKE),
                styles.ornament,
                { backgroundColor: accent.base },
              ]}
            />
          ))
        : null}
      {Array.from({ length: count }, (_, index) => {
        const angle = g.start + (g.sweep * index) / (count - 1);
        const state = index < lit ? 'lit' : index === lit ? 'next' : 'off';
        if (state === 'lit') {
          const core = diamond ? g.diamondLit / Math.SQRT2 + DIAMOND_STROKE : g.lit;
          return (
            <View key={index} style={StyleSheet.absoluteFill}>
              <View
                style={[
                  at(angle, g.radius, g.glow),
                  { borderRadius: g.glow / 2, backgroundColor: accent.alpha(0.24) },
                ]}
              />
              <View
                style={[
                  at(angle, g.radius, core),
                  diamond ? [styles.diamond, styles.diamondEdge] : { borderRadius: core / 2 },
                  { backgroundColor: accent.base },
                ]}
              />
            </View>
          );
        }
        if (state === 'next') {
          const size = (diamond ? g.diamondNext / Math.SQRT2 : g.next) + NEXT_STROKE;
          return (
            <View
              key={index}
              style={[
                at(angle, g.radius, size),
                diamond ? styles.diamond : { borderRadius: size / 2 },
                styles.next,
                { borderColor: accent.alpha(0.6) },
              ]}
            />
          );
        }
        const size = diamond ? g.diamondOff / Math.SQRT2 + DIAMOND_STROKE : g.off;
        return (
          <View
            key={index}
            style={[
              at(angle, g.radius, size),
              diamond ? [styles.diamond, styles.diamondEdge] : { borderRadius: size / 2 },
              styles.off,
            ]}
          />
        );
      })}
    </View>
  );
}

export const LevelDots = memo(LevelDotsView);

const styles = StyleSheet.create({
  rim: {
    borderWidth: RIM_STROKE,
  },
  ornament: {
    transform: [{ rotate: '45deg' }],
    borderWidth: ORNAMENT_STROKE,
    borderColor: V2Colors.background,
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
  },
  diamondEdge: {
    borderWidth: DIAMOND_STROKE,
    borderColor: '#000',
  },
  next: {
    borderWidth: NEXT_STROKE,
  },
  off: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
