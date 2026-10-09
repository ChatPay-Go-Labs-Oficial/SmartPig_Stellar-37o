// Design System V2 — tokens da nova interface (Figma "Protótipo v2").
//
// Convive com o V1 (constants/theme.ts) durante a migração: telas V1 seguem
// importando de lá, telas V2 importam daqui. Nada neste arquivo altera o V1.
//
// A cor de destaque NÃO mora aqui como constante solta: o V2 permite ao
// usuário escolher a cor do app (Figma "Perfil · Cor do app"). Componentes
// leem o destaque por `useAccent()` (hooks/use-accent.ts); este arquivo só
// define as paletas disponíveis.

// ─── Superfícies e texto ─────────────────────────────────────────────────────
export const V2Colors = {
  background: '#0a0712',
  text: '#f4f5f7',
  textSecondary: 'rgba(244,245,247,0.6)',
  textTertiary: 'rgba(244,245,247,0.38)',
  textMuted: 'rgba(244,245,247,0.5)',
  onPrimary: '#ffffff',

  /** Vidro da tab bar e de elementos flutuantes. */
  glass: 'rgba(28,22,40,0.74)',
  sheetTop: '#1a1326',
  sheetBase: '#120c1e',
  overlay: 'rgba(5,3,10,0.66)',

  /** Cartões e listas sobre o fundo. */
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceBorderStrong: 'rgba(255,255,255,0.1)',
  divider: 'rgba(255,255,255,0.07)',

  /** Pílulas, selos e botões de ícone. */
  chip: 'rgba(255,255,255,0.06)',
  chipBorder: 'rgba(255,255,255,0.12)',

  success: '#3de08a',
  error: '#ff5a7f',
  warning: '#ffc24b',
} as const;

// ─── Destaque (cor do app) ───────────────────────────────────────────────────
export interface AccentPalette {
  /** Cor principal ("PF.Roxo" no Figma, mesmo quando a paleta é rosa). */
  base: string;
  /** Valores positivos de porquinho e destaques sobre fundo escuro. */
  light: string;
  /** Base dos botões 3D. */
  dark: string;
}

// Só a paleta padrão existe por enquanto. As demais (Roxo, Azul, Laranja)
// entram junto com a tela "Cor do app", com os valores lidos do Figma.
export const AccentPalettes = {
  rosa: { base: '#f434b4', light: '#f878d3', dark: '#822b63' },
} as const satisfies Record<string, AccentPalette>;

export type AccentName = keyof typeof AccentPalettes;

export const DEFAULT_ACCENT: AccentName = 'rosa';

/** `#rrggbb` + opacidade → `rgba(...)`. Gera as variações "Primária N%". */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Tipografia ──────────────────────────────────────────────────────────────
// Inter, carregada por @expo-google-fonts/inter no root _layout.tsx.
//
// Os tamanhos V2 são os do Figma, sem o TYPE_SCALE do V1: o protótipo V2 já
// foi desenhado no tamanho final de tela. O teto de escala do sistema
// (babel.config.js, MAX_FONT_SCALE) continua valendo.
export const V2Font = {
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

// ─── Raios ───────────────────────────────────────────────────────────────────
export const V2Radius = {
  icon: 12,
  key: 18,
  list: 22,
  card: 24,
  sheet: 30,
  full: 999,
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────
export const V2Layout = {
  /** Margem lateral das telas V2. */
  gutter: 18,
  /** Espaço vertical entre blocos da tela. */
  sectionGap: 18,
  /** Folga no fim da rolagem para a tab bar flutuante. */
  tabBarClearance: 130,
} as const;
