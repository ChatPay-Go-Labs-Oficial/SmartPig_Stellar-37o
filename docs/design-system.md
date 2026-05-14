# Design System — PigFi

> 🇧🇷 [Leia em Português](design-system.pt-BR.md)


**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · `expo-font` · `expo-linear-gradient` · `react-native-reanimated`

---

## Table of Contents

- [Colors — Surfaces](#colors--surfaces-dark-only)
- [Accent Colors](#accent-colors)
- [Gradients](#gradients)
- [Typography](#typography)
- [Border Radius](#border-radius)
- [Spacing](#spacing)
- [Shadows (iOS / Android)](#shadows-ios--android)
- [Animations](#animations)
- [Components](#components)
- [Gradient Text](#gradient-text)

---

## Colors — Surfaces (Dark-only)

Add to `constants/theme.ts`:

```ts
export const Colors = {
  background:  'hsl(260, 20%, 8%)',
  card:        'hsl(260, 20%, 12%)',
  surface2:    'hsl(260, 20%, 14%)',
  muted:       'hsl(260, 15%, 18%)',
  border:      'hsl(260, 15%, 20%)',
  foreground:  'hsl(0, 0%, 96%)',
};
```

| Name          | HSL Value              | Usage                      |
|---------------|------------------------|----------------------------|
| `background`  | `hsl(260, 20%, 8%)`    | Main screen background     |
| `card`        | `hsl(260, 20%, 12%)`   | Cards, Modals              |
| `surface2`    | `hsl(260, 20%, 14%)`   | Card gradient start        |
| `muted`       | `hsl(260, 15%, 18%)`   | Muted areas                |
| `border`      | `hsl(260, 15%, 20%)`   | Borders and inputs         |
| `foreground`  | `hsl(0, 0%, 96%)`      | Primary text               |

---

## Accent Colors

```ts
export const Accent = {
  primary:         'hsl(320, 90%, 58%)',  // Neon Pink
  secondary:       'hsl(270, 80%, 60%)',  // Purple
  accent:          'hsl(38, 100%, 55%)',  // Amber
  gold:            'hsl(42, 100%, 58%)',  // Gold
  neonOrange:      'hsl(25, 100%, 55%)',  // Orange Hot
  success:         'hsl(145, 80%, 48%)', // Neon Green
  destructive:     'hsl(0, 84%, 60%)',   // Red
  mutedForeground: 'hsl(260, 10%, 55%)', // Muted text
};
```

| Name              | HSL Value              | Usage                     |
|-------------------|------------------------|---------------------------|
| `primary`         | `hsl(320, 90%, 58%)`   | Neon Pink — primary CTA   |
| `secondary`       | `hsl(270, 80%, 60%)`   | Purple — secondary        |
| `accent`          | `hsl(38, 100%, 55%)`   | Amber — highlight         |
| `gold`            | `hsl(42, 100%, 58%)`   | Gold — achievements       |
| `neonOrange`      | `hsl(25, 100%, 55%)`   | Orange Hot                |
| `success`         | `hsl(145, 80%, 48%)`   | Neon Green — success      |
| `destructive`     | `hsl(0, 84%, 60%)`     | Errors / danger           |
| `mutedForeground` | `hsl(260, 10%, 55%)`   | Secondary text            |

---

## Gradients

> Requires `expo-linear-gradient`: `npx expo install expo-linear-gradient`

| Name               | Colors                   | Usage                        |
|--------------------|--------------------------|------------------------------|
| `gradientPrimary`  | Pink `→` Purple          | Primary button, titles       |
| `gradientHot`      | Orange `→` Pink          | Intense highlight            |
| `gradientGold`     | Gold `→` Orange          | Gold button, achievements    |
| `gradientCard`     | Surface-2 `→` Background | Card backgrounds             |

```tsx
import { LinearGradient } from 'expo-linear-gradient';

// gradient-primary (135deg = diagonal top-left → bottom-right)
<LinearGradient
  colors={['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>

// gradient-hot
<LinearGradient
  colors={['hsl(25, 100%, 55%)', 'hsl(320, 90%, 58%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>

// gradient-gold
<LinearGradient
  colors={['hsl(42, 100%, 58%)', 'hsl(25, 100%, 55%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>

// gradient-card (145deg ≈ slightly more vertical)
<LinearGradient
  colors={['hsl(260, 20%, 14%)', 'hsl(260, 20%, 10%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 0.94, y: 1 }}
/>
```

---

## Typography

**Font:** `Nunito` — weights: 400, 600, 700, 800, 900. Single font for the entire app.

### Loading with expo-font

```tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Nunito-Regular':   require('./assets/fonts/Nunito-Regular.ttf'),
  'Nunito-SemiBold':  require('./assets/fonts/Nunito-SemiBold.ttf'),
  'Nunito-Bold':      require('./assets/fonts/Nunito-Bold.ttf'),
  'Nunito-ExtraBold': require('./assets/fonts/Nunito-ExtraBold.ttf'),
  'Nunito-Black':     require('./assets/fonts/Nunito-Black.ttf'),
});
```

### Type scale

| Style           | fontSize | fontWeight | Color                  | Usage                       |
|-----------------|----------|------------|------------------------|-----------------------------|
| Display         | 35       | `'900'`    | Gradient (see below)   | Main screen title           |
| Heading         | 24       | `'800'`    | `foreground`           | Sections, main cards        |
| Subheading      | 18       | `'700'`    | `foreground`           | Card title                  |
| Body            | 16       | `'600'`    | `foreground`           | Primary content             |
| Body Muted      | 14       | `'400'`    | `mutedForeground`      | Descriptions, labels        |
| Label Uppercase | 12       | `'700'`    | `mutedForeground`      | Metadata, categories        |

```ts
// Label Uppercase in StyleSheet
labelUppercase: {
  fontSize: 12,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  color: Accent.mutedForeground,
  fontFamily: 'Nunito-Bold',
},
```

---

## Border Radius

Base value: **16px**. All components derive from this value.

| Name    | Value  | Usage                 |
|---------|--------|-----------------------|
| `sm`    | 12     | Buttons, inputs       |
| `md`    | 14     | Internal components   |
| `lg`    | 16     | Cards, containers     |
| `full`  | 9999   | Badges, pills         |

```ts
export const Radius = { sm: 12, md: 14, lg: 16, full: 9999 };
```

---

## Spacing

Horizontal screen padding: **32px**. 4px base scale:

| Token | px  |
|-------|-----|
| `1`   | 4   |
| `2`   | 8   |
| `3`   | 12  |
| `4`   | 16  |
| `6`   | 24  |
| `8`   | 32  |
| `12`  | 48  |
| `16`  | 64  |

```ts
export const Spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48, 16: 64 };
```

---

## Shadows (iOS / Android)

> React Native does not support `box-shadow` or multiple shadows. The glow effect is approximated with shadow props on iOS and `elevation` on Android.

```ts
// glow-pink
const glowPink = {
  shadowColor: 'hsl(320, 90%, 58%)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  elevation: 8, // Android
};

// glow-gold
const glowGold = {
  shadowColor: 'hsl(42, 100%, 58%)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  elevation: 8,
};

// glow-green
const glowGreen = {
  shadowColor: 'hsl(145, 80%, 48%)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 15,
  elevation: 6,
};

// glow-purple
const glowPurple = {
  shadowColor: 'hsl(270, 80%, 60%)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  elevation: 8,
};
```

---

## Animations

Uses `react-native-reanimated` (already included in the project).

| Name         | Behavior                           | Usage                |
|--------------|------------------------------------|----------------------|
| `glowPulse`  | opacity 0.6→1 + scale 1→1.05       | Decorative           |
| `float`      | translateY 0→-12                   | Mascot / icon        |
| `wiggle`     | rotate -3deg→3deg                  | Playful interaction  |
| `coinSpin`   | rotateY 0→360deg                   | Coin / achievement   |

```ts
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';

// glowPulse
const opacity = useSharedValue(0.6);
const scale   = useSharedValue(1);
opacity.value = withRepeat(withTiming(1,   { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
scale.value   = withRepeat(withTiming(1.05,{ duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);

// float
const translateY = useSharedValue(0);
translateY.value = withRepeat(withTiming(-12, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);

// wiggle
const rotate = useSharedValue(0);
rotate.value = withRepeat(
  withSequence(
    withTiming(-3, { duration: 500 }),
    withTiming(3,  { duration: 500 }),
  ), -1, true,
);

// coinSpin (single trigger)
const rotateY = useSharedValue(0);
const startSpin = () => { rotateY.value = withTiming(360, { duration: 600 }); };
const animStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${rotateY.value}deg` }],
}));
```

> `accordion` (expand/collapse): use `react-native-reanimated` Layout Animations or `withTiming` on `height` with `useAnimatedStyle`.

---

## Components

### Buttons

| Variant     | Background             | Text                      | Shadow         |
|-------------|------------------------|---------------------------|----------------|
| **Primary** | `gradientPrimary`      | `#fff`                    | `glowPink`     |
| **Gold**    | `gradientGold`         | `hsl(42, 100%, 10%)`      | `glowGold`     |
| **Ghost**   | `transparent`          | `hsl(320, 90%, 58%)`      | 1px pink border|
| **Secondary**| `hsl(260, 20%, 14%)`  | `hsl(0, 0%, 96%)`         | 1px border     |

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Primary Button
<Pressable style={styles.btnBase}>
  <LinearGradient
    colors={['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={[styles.btnBase, glowPink]}
  >
    <Text style={styles.btnPrimaryText}>Primary</Text>
  </LinearGradient>
</Pressable>

// Ghost Button
<Pressable style={[styles.btnBase, styles.btnGhost]}>
  <Text style={styles.btnGhostText}>Ghost</Text>
</Pressable>

const styles = StyleSheet.create({
  btnBase: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,       // Radius.sm
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'hsl(320, 90%, 58%)',
  },
  btnGhostText: {
    color: 'hsl(320, 90%, 58%)',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
});
```

---

### Badges

| Variant     | backgroundColor               | color                      | borderColor                   |
|-------------|-------------------------------|----------------------------|-------------------------------|
| `destaque`  | `rgba(244, 52, 180, 0.18)`    | `hsl(320, 90%, 75%)`       | `rgba(244, 52, 180, 0.28)`    |
| `conquista` | `rgba(247, 185, 0, 0.18)`     | `hsl(42, 100%, 75%)`       | `rgba(247, 185, 0, 0.28)`     |
| `sucesso`   | `rgba(25, 213, 96, 0.18)`     | `hsl(145, 80%, 68%)`       | `rgba(25, 213, 96, 0.28)`     |
| `erro`      | `rgba(239, 68, 68, 0.18)`     | `hsl(0, 84%, 78%)`         | `rgba(239, 68, 68, 0.28)`     |

```tsx
import { View, Text, StyleSheet } from 'react-native';

<View style={[styles.badge, styles.badgeDestaque]}>
  <Text style={[styles.badgeText, styles.badgeDestaqueText]}>Highlight</Text>
</View>

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },
  badgeDestaque: {
    backgroundColor: 'rgba(244, 52, 180, 0.18)',
    borderColor: 'rgba(244, 52, 180, 0.28)',
  },
  badgeDestaqueText: { color: 'hsl(320, 90%, 75%)' },
  // repeat pattern for conquista, sucesso, erro...
});
```

---

### Card

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['hsl(260, 20%, 14%)', 'hsl(260, 20%, 10%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 0.94, y: 1 }}
  style={styles.card}
>
  <Text style={styles.cardTitle}>Monthly Savings</Text>
  <Text style={styles.cardBody}>You saved $1,200 this month.</Text>
</LinearGradient>

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,       // Radius.lg
    borderWidth: 1,
    borderColor: 'hsl(260, 15%, 20%)',
    padding: 22,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: 'hsl(0, 0%, 96%)',
    fontFamily: 'Nunito-ExtraBold',
    marginBottom: 7,
  },
  cardBody: {
    fontSize: 14,
    color: 'hsl(260, 10%, 55%)',
    fontFamily: 'Nunito-Regular',
  },
});
```

---

### Navigation Item (Tab / Drawer)

Mobile equivalent of the "Sidebar" pattern. Used in side menus (Drawer) or custom tabs.

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';

<Pressable style={[styles.navItem, isActive && styles.navItemActive]}>
  <Text style={[styles.navText, isActive && styles.navTextActive]}>Dashboard</Text>
</Pressable>

const styles = StyleSheet.create({
  navItem: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: 'rgba(244, 52, 180, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 52, 180, 0.24)',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'hsl(260, 10%, 55%)',
    fontFamily: 'Nunito-SemiBold',
  },
  navTextActive: {
    color: 'hsl(320, 90%, 75%)',
    fontWeight: '800',
    fontFamily: 'Nunito-ExtraBold',
  },
});
```

---

## Gradient Text

> `-webkit-background-clip: text` **is not supported in React Native**.

**Option 1 — `@react-native-masked-view/masked-view` + `expo-linear-gradient`:**

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

// npx expo install @react-native-masked-view/masked-view

<MaskedView maskElement={<Text style={styles.displayText}>Title</Text>}>
  <LinearGradient
    colors={['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
  >
    <Text style={[styles.displayText, { opacity: 0 }]}>Title</Text>
  </LinearGradient>
</MaskedView>
```

**Option 2 — Solid color (simpler):** use `color: 'hsl(320, 90%, 58%)'` (neon pink) for highlight titles without a gradient.

---

*Adapted from github.com/CarolTea/piggy-bank-grow for React Native — May/2026*
