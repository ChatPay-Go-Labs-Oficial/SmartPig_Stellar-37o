import { memo } from 'react';
import { View } from 'react-native';
import { useAccent } from '@/hooks/use-accent';

interface XpBarProps {
  /** 0–1. */
  fraction: number;
  /** Home: 6 (trilho a 10%, ponta redonda). Seu nível: 8 (trilho a 8%, raio 4). */
  size: 'small' | 'large';
}

/** Barra do XP dentro do nível (Figma "barra"). */
function XpBarView({ fraction, size }: XpBarProps) {
  const accent = useAccent();
  const height = size === 'small' ? 6 : 8;
  const radius = size === 'small' ? height / 2 : 4;
  const width = `${Math.min(1, Math.max(0, fraction)) * 100}%` as const;
  return (
    <View
      style={{
        height,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: size === 'small' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <View style={{ width, height, borderRadius: radius, backgroundColor: accent.base }} />
    </View>
  );
}

export const XpBar = memo(XpBarView);
