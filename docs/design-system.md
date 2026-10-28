# PigFi Design System

> Portuguese version: [design-system.pt-BR.md](design-system.pt-BR.md)

The source of truth is `constants/theme.ts`. Shared components live in `components/ui` and `components/layout`.

## Foundations

- Dark-only interface with `Colors.background`, `card`, `surface`, `surface2`, `muted` and `border`.
- Accent roles: `primary`, `secondary`, `accent`, `gold`, `neonOrange`, `success` and `destructive`.
- Shared gradients: `Gradients.primary`, `hot`, `gold` and `card`.
- Radius scale: `12`, `14`, `16` and pill (`9999`).
- Spacing follows a 4 px base scale; screen content defaults to 24 px in `ScreenContainer`.
- Nunito is loaded from `@expo-google-fonts/nunito` in weights 400 through 900.

Always import tokens instead of duplicating values:

```tsx
import { Accent, Colors, Font, FontSize, Gradients, Radius, Spacing } from '@/constants/theme';
```

## Typography

| Token | Size | Typical use |
| --- | ---: | --- |
| `FontSize.display` | 35 | Primary page title |
| `FontSize.displaySm` | 28 | Compact page title |
| `FontSize.heading` | 24 | Section heading |
| `FontSize.subheading` | 18 | Card heading |
| `FontSize.body` | 16 | Primary content |
| `FontSize.bodySmall` | 14 | Supporting content |
| `FontSize.label` | 12 | Labels and metadata |

Use `Font.regular`, `semiBold`, `bold`, `extraBold` and `black`. Do not reference local font files directly.

## Public components

| Component | Contract |
| --- | --- |
| `Button` | Variants `primary`, `gold`, `ghost`, `secondary`, `destructive`; sizes `sm`, `md`, `lg` |
| `Card` | Variants `default`, `flat`, `elevated` |
| `Input` | Default and `glass` presentation |
| `Badge` | `destaque`, `conquista`, `sucesso`, `erro`, `info`, `muted` |
| `GradientText` | Semantic accent fallback; currently renders solid color for runtime stability |
| `PressableScale` | Scale feedback and optional global click sound |
| `ScreenContainer` | Safe-area wrapper with scrollable/non-scrollable modes |

Use the exported component before creating a screen-local alternative. Add a new variant only when it represents a repeated semantic role.

## Design system V2

New screens use `components/v2` (exported from `components/v2/index.ts`), with the V2 Figma file as the source of truth.

| Component | Contract |
| --- | --- |
| `Button3D` | 3D key with no press-down animation; sizes include `card` (16 text) for buttons inside cards and scenes |
| `V2Sheet` | Default bottom sheet for V2 screens |
| `V2Icon` | V2 icons (Lucide in Figma) |
| `ScreenGlow`, `CardGlow`, `CircleGlow` | Screen, card and round background glows |
| `components/v2/experience` | User Level: `LevelCard`, `LevelAvatar`, `LevelDots`, `XpBar`, `XpGainPill`, `DailyRewardCard`, `TierJourney`, `TierLevelsSheet`, `XpWaysCard` and the `LevelUpScene` scene |
| `components/v2/trail` | Trail V2: `TrailPath`, `TrailNode`, `TrailLevelCard`, `TrailModuleCard`, `DictionaryShortcut`, `DictionarySheet` |
| `components/v2/lesson` | Lesson: frame, steps, questions, completions and each screen's visuals |
| `components/profile/UsernameSheet`, `components/wallet/SendSheet` | @ creation and sending by @, on `V2Sheet`, reusing the Save sheet parts (amount field, notices and summary) |
| `components/guardar` | Piggies: `PiggyCard` (including locked and pending steps), `PiggySections` ("Pra liberar") and the `PiggyUnlockScene` scene |

Celebration scenes (`LevelUpScene`, `PiggyUnlockScene`) are mounted in the tabs layout and requested through an in-memory store; they use `Confetti` and take the full screen (`Dimensions.get('screen')`) so the Modal does not jump on Android.

Copy that differs between Lite and Pro comes from `lib/copy/terms.ts`; Lite uses no crypto terms.

## Interaction and feedback

- `PressableScale` provides press animation and sound.
- Navigation and important outcomes may add haptic feedback.
- `useSound` centralizes sound playback and respects the persisted mute setting.
- Reanimated is used for richer mascot, celebration and lesson animations.
- Feedback must not rely on sound, color or animation alone; keep a visible text/state change.

## Layout rules

- Use `ScreenContainer` for standard screens.
- Respect safe areas and leave space for the floating bottom tab bar.
- Use spacing tokens for reusable components; isolated artwork may use explicit values.
- Keep financial values and operation status visually distinct from decorative content.
- Use plain user language and avoid exposing blockchain jargon in primary UI copy.

## Accessibility and maintenance

- Provide labels for icon-only actions.
- Preserve readable contrast on dark surfaces.
- Use disabled/loading states for asynchronous actions.
- Do not indicate operation success before remote confirmation.
- Update `constants/theme.ts`, this document and both language versions together when the public token/component contract changes.
