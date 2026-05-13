# Copilot Instructions — stellarpig-app

React Native / Expo app for personal finance (piggy bank theme). Uses the **Smart Piggy design system** — documented in `docs/design-system.md`.

## Commands

```bash
npx expo start          # dev server (opens QR code for Expo Go)
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx expo start --web    # browser

npm run lint            # ESLint (eslint-config-expo/flat)
```

No test suite is configured yet.

## Architecture

Routing is **file-based via expo-router**. Every file inside `app/` becomes a route automatically:

```
app/
  _layout.tsx          # Root: Stack navigator + ThemeProvider
  modal.tsx            # Presented as a modal sheet
  (tabs)/
    _layout.tsx        # Tab bar (bottom navigation)
    index.tsx          # Home tab
    explore.tsx        # Explore tab
```

- The root layout wraps everything in React Navigation's `ThemeProvider` using `DarkTheme` / `DefaultTheme` based on the device color scheme.
- Tab bar uses `HapticTab` as the button component — haptic feedback fires on iOS only (`process.env.EXPO_OS === 'ios'`).
- `typedRoutes` is enabled: route names are type-checked at compile time.

## Theming

All colors live in `constants/theme.ts` under `Colors.light` and `Colors.dark`. The design system target is dark-only (Piggy Bank Grow), but the scaffold currently ships both schemes.

**Pattern for theme-aware values:**
```tsx
import { useThemeColor } from '@/hooks/use-theme-color';
const color = useThemeColor({ light: '#fff', dark: '#000' }, 'text');
```

Prefer the `ThemedText` and `ThemedView` wrappers over inline `useThemeColor` calls for standard text/background.

## Design System

Target visual: **dark background, neon pink primary, Nunito font, glow effects.**
Full token reference: `docs/design-system.md`.

Key values to use when implementing screens:
- Background: `hsl(260 20% 8%)`
- Primary (pink): `hsl(320 90% 58%)`
- Card: `hsl(260 20% 12%)`, gradient `145deg → hsl(260 20% 14%) → hsl(260 20% 10%)`
- Border: `hsl(260 15% 20%)`
- Font: Nunito, weights 400/600/700/800/900
- Base border-radius: 16px (`--radius`); `sm = 12px`, badges = `9999px`

> **Note:** The app does not use Tailwind CSS — apply the design tokens via React Native `StyleSheet` or inline styles.

## Icons

`IconSymbol` is a cross-platform wrapper:
- **iOS**: uses `expo-symbols` (SF Symbols, native)
- **Android / Web**: uses `@expo/vector-icons/MaterialIcons`

Icon names are SF Symbol strings (e.g. `"house.fill"`). When adding a new icon, add its SF Symbol → Material Icon mapping to `components/ui/icon-symbol.tsx` (`MAPPING` object).

## Platform-Specific Files

Expo's file convention resolves platform variants automatically:

| File | Loaded on |
|------|-----------|
| `foo.ios.tsx` | iOS only |
| `foo.web.ts` | Web only |
| `foo.tsx` | Android + fallback |

`use-color-scheme.web.ts` hydrates lazily to support static web rendering (defaults to `'light'` until mounted).

## Path Alias

`@/` maps to the repository root (configured in `tsconfig.json`). Always use `@/` for imports instead of relative paths.

## Key Flags (app.json)

- `newArchEnabled: true` — React Native New Architecture is active
- `experiments.reactCompiler: true` — React Compiler (auto-memoisation) is enabled; avoid manual `useMemo`/`useCallback` unless profiling shows a need
- `experiments.typedRoutes: true` — route strings are typed
