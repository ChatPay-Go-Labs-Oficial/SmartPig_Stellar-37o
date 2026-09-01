// Piggy Bank Grow Design System — Dark-only theme

// ─── Surfaces ───────────────────────────────────────────────────────────────
export const Colors = {
  background:      'hsl(260, 20%, 8%)',
  card:            'hsl(260, 20%, 12%)',
  surface:         'hsl(260, 20%, 13%)',
  surface2:        'hsl(260, 20%, 14%)',
  muted:           'hsl(260, 15%, 18%)',
  border:          'hsl(260, 15%, 20%)',
  foreground:      'hsl(0, 0%, 96%)',
  mutedForeground: 'hsl(260, 10%, 55%)',
};

// ─── Accent ──────────────────────────────────────────────────────────────────
export const Accent = {
  primary:     'hsl(320, 90%, 58%)',  // Neon Pink — CTA principal
  secondary:   'hsl(270, 80%, 60%)',  // Purple
  accent:      'hsl(38, 100%, 55%)',  // Amber
  gold:        'hsl(42, 100%, 58%)',  // Gold — conquistas
  neonOrange:  'hsl(25, 100%, 55%)',  // Orange Hot
  success:     'hsl(145, 80%, 48%)', // Neon Green
  destructive: 'hsl(0, 84%, 60%)',   // Vermelho
};

// ─── Gradients ───────────────────────────────────────────────────────────────
// Use with expo-linear-gradient: <LinearGradient colors={Gradients.primary} start={{x:0,y:0}} end={{x:1,y:1}} />
export const Gradients = {
  primary: ['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)'] as const,   // pink → purple
  hot:     ['hsl(25, 100%, 55%)',  'hsl(320, 90%, 58%)'] as const,  // orange → pink
  gold:    ['hsl(42, 100%, 58%)',  'hsl(25, 100%, 55%)'] as const,  // gold → orange
  card:    ['hsl(260, 20%, 14%)',  'hsl(260, 20%, 10%)'] as const,  // surface dark
};

// ─── Radius ──────────────────────────────────────────────────────────────────
export const Radius = {
  sm:   12,
  md:   14,
  lg:   16,
  full: 9999,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
// Font family names match @expo-google-fonts/nunito keys loaded in root _layout.tsx
export const Font = {
  regular:   'Nunito_400Regular',
  semiBold:  'Nunito_600SemiBold',
  bold:      'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black:     'Nunito_900Black',
} as const;

// ─── Escala tipográfica ──────────────────────────────────────────────────────
// O app trava `allowFontScaling` em todo <Text>/<TextInput> via plugin Babel
// (ver babel.config.js), então estes números são o tamanho final na tela: a
// configuração de fonte do aparelho não os altera mais. Por isso a escala vive
// num fator único — é o botão para deixar o texto do app inteiro maior ou
// menor sem caçar valor por valor.
export const TYPE_SCALE = 0.85;

/** Aplica a escala global. Use em qualquer fontSize fora dos tokens abaixo. */
export function scaleFont(px: number): number {
  return Math.round(px * TYPE_SCALE);
}

export const FontSize = {
  display:    scaleFont(35),
  displaySm:  scaleFont(28),
  heading:    scaleFont(24),
  subheading: scaleFont(18),
  body:       scaleFont(16),
  bodySmall:  scaleFont(14),
  label:      scaleFont(12),
} as const;

// ─── Shadows (glow effects) ──────────────────────────────────────────────────
// iOS: shadowColor + shadowOffset + shadowOpacity + shadowRadius
// Android: elevation
export const Glow = {
  pink: {
    shadowColor: 'hsl(320, 90%, 58%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  gold: {
    shadowColor: 'hsl(42, 100%, 58%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  green: {
    shadowColor: 'hsl(145, 80%, 48%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 6,
  },
  purple: {
    shadowColor: 'hsl(270, 80%, 60%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
