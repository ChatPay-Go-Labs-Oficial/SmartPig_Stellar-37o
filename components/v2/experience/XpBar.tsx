import { memo } from 'react';
import { View } from 'react-native';
import { useAccent } from '@/hooks/use-accent';

// Figma "barra" de cada tela: altura, raio e trilho.
const SIZES = {
  // Home (30i): 6, ponta redonda, trilho a 10%.
  small: { height: 6, radius: 3, track: 'rgba(255,255,255,0.1)' },
  // Card de nível da Trilha (34j): 6, trilho a 8%.
  trail: { height: 6, radius: 3, track: 'rgba(255,255,255,0.08)' },
  // Seu nível (36a): 8, raio 4, trilho a 8%.
  large: { height: 8, radius: 4, track: 'rgba(255,255,255,0.08)' },
} as const;

interface XpBarProps {
  /** 0–1. */
  fraction: number;
  size: keyof typeof SIZES;
}

/** Barra do XP dentro do nível (Figma "barra"). */
function XpBarView({ fraction, size }: XpBarProps) {
  const accent = useAccent();
  const { height, radius, track } = SIZES[size];
  const width = `${Math.min(1, Math.max(0, fraction)) * 100}%` as const;
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: track }}>
      <View style={{ width, height, borderRadius: radius, backgroundColor: accent.base }} />
    </View>
  );
}

export const XpBar = memo(XpBarView);
