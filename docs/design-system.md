# Design System — Smart Piggy

Design system adaptado de [CarolTea/piggy-bank-grow](https://github.com/CarolTea/piggy-bank-grow) para **React Native / Expo**.

**Stack:** Expo SDK 54 · React Native 0.81 · TypeScript · `expo-font` · `expo-linear-gradient` · `react-native-reanimated`

---

## Índice

- [Cores — Superfícies](#cores--superfícies-dark-only)
- [Cores de Destaque](#cores-de-destaque)
- [Gradientes](#gradientes)
- [Tipografia](#tipografia)
- [Border Radius](#border-radius)
- [Espaçamento](#espaçamento)
- [Sombras (iOS / Android)](#sombras-ios--android)
- [Animações](#animações)
- [Componentes](#componentes)
- [Texto Gradiente](#texto-gradiente)

---

## Cores — Superfícies (Dark-only)

Adicione ao `constants/theme.ts`:

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

| Nome          | Valor HSL              | Uso                        |
|---------------|------------------------|----------------------------|
| `background`  | `hsl(260, 20%, 8%)`    | Fundo principal da tela    |
| `card`        | `hsl(260, 20%, 12%)`   | Cards, Modals              |
| `surface2`    | `hsl(260, 20%, 14%)`   | Início do gradiente de card|
| `muted`       | `hsl(260, 15%, 18%)`   | Áreas silenciadas          |
| `border`      | `hsl(260, 15%, 20%)`   | Bordas e inputs            |
| `foreground`  | `hsl(0, 0%, 96%)`      | Texto principal            |

---

## Cores de Destaque

```ts
export const Accent = {
  primary:         'hsl(320, 90%, 58%)',  // Neon Pink
  secondary:       'hsl(270, 80%, 60%)',  // Purple
  accent:          'hsl(38, 100%, 55%)',  // Amber
  gold:            'hsl(42, 100%, 58%)',  // Gold
  neonOrange:      'hsl(25, 100%, 55%)',  // Orange Hot
  success:         'hsl(145, 80%, 48%)', // Neon Green
  destructive:     'hsl(0, 84%, 60%)',   // Vermelho
  mutedForeground: 'hsl(260, 10%, 55%)', // Texto muted
};
```

| Nome              | Valor HSL              | Uso                       |
|-------------------|------------------------|---------------------------|
| `primary`         | `hsl(320, 90%, 58%)`   | Neon Pink — CTA principal |
| `secondary`       | `hsl(270, 80%, 60%)`   | Purple — secundário       |
| `accent`          | `hsl(38, 100%, 55%)`   | Amber — destaque          |
| `gold`            | `hsl(42, 100%, 58%)`   | Gold — conquistas         |
| `neonOrange`      | `hsl(25, 100%, 55%)`   | Orange Hot                |
| `success`         | `hsl(145, 80%, 48%)`   | Neon Green — sucesso      |
| `destructive`     | `hsl(0, 84%, 60%)`     | Erros / perigo            |
| `mutedForeground` | `hsl(260, 10%, 55%)`   | Texto secundário          |

---

## Gradientes

> Requer `expo-linear-gradient`: `npx expo install expo-linear-gradient`

| Nome               | Cores                    | Uso                          |
|--------------------|--------------------------|------------------------------|
| `gradientPrimary`  | Pink `→` Purple          | Botão primário, títulos      |
| `gradientHot`      | Orange `→` Pink          | Destaque intenso             |
| `gradientGold`     | Gold `→` Orange          | Botão gold, conquistas       |
| `gradientCard`     | Surface-2 `→` Background | Background de cards          |

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

// gradient-card (145deg ≈ ligeiramente mais vertical)
<LinearGradient
  colors={['hsl(260, 20%, 14%)', 'hsl(260, 20%, 10%)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 0.94, y: 1 }}
/>
```

---

## Tipografia

**Fonte:** `Nunito` — pesos: 400, 600, 700, 800, 900. Única fonte da aplicação.

### Carregamento com expo-font

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

### Escala tipográfica

| Estilo          | fontSize | fontWeight | Cor                    | Uso                         |
|-----------------|----------|------------|------------------------|-----------------------------|
| Display         | 35       | `'900'`    | Gradiente (ver abaixo) | Título principal da tela    |
| Heading         | 24       | `'800'`    | `foreground`           | Seções, cards principais    |
| Subheading      | 18       | `'700'`    | `foreground`           | Título de card              |
| Body            | 16       | `'600'`    | `foreground`           | Conteúdo principal          |
| Body Muted      | 14       | `'400'`    | `mutedForeground`      | Descrições, labels          |
| Label Uppercase | 12       | `'700'`    | `mutedForeground`      | Metadata, categorias        |

```ts
// Label Uppercase em StyleSheet
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

Valor base: **16px**. Todos os componentes derivam desse valor.

| Nome    | Valor  | Uso                   |
|---------|--------|-----------------------|
| `sm`    | 12     | Botões, inputs        |
| `md`    | 14     | Componentes internos  |
| `lg`    | 16     | Cards, containers     |
| `full`  | 9999   | Badges, pills         |

```ts
export const Radius = { sm: 12, md: 14, lg: 16, full: 9999 };
```

---

## Espaçamento

Padding horizontal de tela: **32px**. Escala base de 4px:

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

## Sombras (iOS / Android)

> React Native não suporta `box-shadow` nem múltiplas sombras. O efeito de glow é aproximado com as props de sombra no iOS e `elevation` no Android.

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

## Animações

Usa `react-native-reanimated` (já incluído no projeto).

| Nome         | Comportamento                      | Uso                  |
|--------------|------------------------------------|----------------------|
| `glowPulse`  | opacity 0.6→1 + scale 1→1.05       | Decorativo           |
| `float`      | translateY 0→-12                   | Mascote / ícone      |
| `wiggle`     | rotate -3deg→3deg                  | Interação lúdica     |
| `coinSpin`   | rotateY 0→360deg                   | Moeda / conquista    |

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

// coinSpin (disparo único)
const rotateY = useSharedValue(0);
const startSpin = () => { rotateY.value = withTiming(360, { duration: 600 }); };
const animStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${rotateY.value}deg` }],
}));
```

> `accordion` (expand/collapse): use `react-native-reanimated` Layout Animations ou `withTiming` em `height` com `useAnimatedStyle`.

---

## Componentes

### Botões

| Variante    | Background             | Texto                     | Sombra         |
|-------------|------------------------|---------------------------|----------------|
| **Primary** | `gradientPrimary`      | `#fff`                    | `glowPink`     |
| **Gold**    | `gradientGold`         | `hsl(42, 100%, 10%)`      | `glowGold`     |
| **Ghost**   | `transparent`          | `hsl(320, 90%, 58%)`      | Borda 1px pink |
| **Secondary**| `hsl(260, 20%, 14%)`  | `hsl(0, 0%, 96%)`         | Borda 1px border|

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Botão Primary
<Pressable style={styles.btnBase}>
  <LinearGradient
    colors={['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={[styles.btnBase, glowPink]}
  >
    <Text style={styles.btnPrimaryText}>Primário</Text>
  </LinearGradient>
</Pressable>

// Botão Ghost
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

| Variante    | backgroundColor               | color                      | borderColor                   |
|-------------|-------------------------------|----------------------------|-------------------------------|
| `destaque`  | `rgba(244, 52, 180, 0.18)`    | `hsl(320, 90%, 75%)`       | `rgba(244, 52, 180, 0.28)`    |
| `conquista` | `rgba(247, 185, 0, 0.18)`     | `hsl(42, 100%, 75%)`       | `rgba(247, 185, 0, 0.28)`     |
| `sucesso`   | `rgba(25, 213, 96, 0.18)`     | `hsl(145, 80%, 68%)`       | `rgba(25, 213, 96, 0.28)`     |
| `erro`      | `rgba(239, 68, 68, 0.18)`     | `hsl(0, 84%, 78%)`         | `rgba(239, 68, 68, 0.28)`     |

```tsx
import { View, Text, StyleSheet } from 'react-native';

<View style={[styles.badge, styles.badgeDestaque]}>
  <Text style={[styles.badgeText, styles.badgeDestaqueText]}>Destaque</Text>
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
  // repetir padrão para conquista, sucesso, erro...
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
  <Text style={styles.cardTitle}>Economias do Mês</Text>
  <Text style={styles.cardBody}>Você economizou R$ 1.200 este mês.</Text>
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

Equivalente mobile do padrão "Sidebar". Usado em menus laterais (Drawer) ou tabs customizadas.

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

## Texto Gradiente

> `-webkit-background-clip: text` **não é suportado em React Native**.

**Opção 1 — Biblioteca `@react-native-masked-view/masked-view` + `expo-linear-gradient`:**

```tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

// npx expo install @react-native-masked-view/masked-view

<MaskedView maskElement={<Text style={styles.displayText}>Título</Text>}>
  <LinearGradient
    colors={['hsl(320, 90%, 58%)', 'hsl(270, 80%, 60%)']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
  >
    <Text style={[styles.displayText, { opacity: 0 }]}>Título</Text>
  </LinearGradient>
</MaskedView>
```

**Opção 2 — Cor sólida (mais simples):** use `color: 'hsl(320, 90%, 58%)'` (neon pink) para títulos de destaque sem gradiente.

---

*Adaptado de github.com/CarolTea/piggy-bank-grow para React Native — maio/2026*
