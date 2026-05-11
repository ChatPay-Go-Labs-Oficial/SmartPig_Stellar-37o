import { Colors } from '@/constants/theme';

// App is dark-only. This hook returns a color from Colors by key,
// with optional per-call overrides for edge cases.
export function useThemeColor(
  props: { override?: string },
  colorName: keyof typeof Colors,
): string {
  if (props.override) return props.override;
  return Colors[colorName];
}
