# PigFi 🐷

> 🇧🇷 [Leia em Português](README.pt-BR.md)

A DeFi personal finance mobile app built with **Expo / React Native**, integrated with the **Stellar** network. Users can connect or create Stellar wallets and deposit into yield vaults managed by the Defindex protocol.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 · React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | expo-router 6 (file-based) |
| Global state | Zustand 5 + AsyncStorage (persisted) |
| Remote data | TanStack Query v5 + Axios |
| Wallet | `@creit.tech/stellar-wallets-kit` + WalletConnect |
| UI / Animations | expo-linear-gradient · react-native-reanimated 4 |
| Fonts | Nunito via `@expo-google-fonts/nunito` |

---

## Prerequisites

- Node.js ≥ 20
- [Expo Go](https://expo.dev/go) on a physical device, or a configured iOS simulator / Android emulator
- `EXPO_PUBLIC_API_URL` environment variable pointing to the backend (see `.env.example`)

---

## Installation & running

```bash
# install dependencies
npm install

# development server (QR code for Expo Go)
npx expo start

# specific platforms
npx expo start --ios
npx expo start --android
npx expo start --web
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm start` | Starts the Expo server |
| `npm run ios` | Opens on iOS simulator |
| `npm run android` | Opens on Android emulator |
| `npm run web` | Opens in the browser |
| `npm run lint` | ESLint (`eslint-config-expo/flat`) |

---

## Architecture

### Routing (`app/`)

```
app/
  _layout.tsx          # Root: QueryClient + Nunito + auth redirect
  (auth)/              # Onboarding, create and connect Stellar wallet
    index.tsx          # Welcome screen
    create-wallet.tsx  # New wallet creation
    connect-wallet.tsx # Connect via WalletConnect / private key
  (tabs)/              # Bottom tab navigation
    index.tsx          # Home — portfolio and active vaults
    vaults.tsx         # All available vaults listing
    history.tsx        # Transaction history
    profile.tsx        # Profile and settings
  vault/
    [id].tsx           # Vault detail + actions (deposit / withdraw)
```

**Auth flow:** the root layout checks `useAuthStore.isAuthenticated` after fonts are loaded and redirects to `/(auth)` or `/(tabs)`.

### Data layer (`lib/`)

```
lib/
  api/
    client.ts          # Axios with baseURL and userId interceptor
    vaults.ts          # Vault endpoints (list, detail, APY, balance)
    deposits.ts        # Deposit endpoints
    withdrawals.ts     # Withdrawal endpoints
  queries/             # TanStack Query hooks (useVaults, useDeposits…)
  stores/
    auth.store.ts      # contractId + isAuthenticated (Zustand + AsyncStorage)
    wallet.store.ts    # walletAddress (Zustand + AsyncStorage)
    ui.store.ts        # Transient UI state
  wallet-kit.ts        # StellarWalletsKit + WalletConnect initialization
```

### Components (`components/`)

```
components/
  ui/
    Button.tsx         # Variants: primary, ghost, secondary, gold
    Card.tsx           # LinearGradient card with border; flat variant
    Badge.tsx          # Pills: destaque, conquista, sucesso, erro, muted
    GradientText.tsx   # Gradient text via MaskedView + LinearGradient
    ConfirmModal.tsx   # Reusable confirmation modal
    icon-symbol.tsx    # MaterialIcons (Android/Web)
    icon-symbol.ios.tsx# SF Symbols (iOS native)
  layout/
    ScreenContainer.tsx# SafeAreaView + ScrollView + default padding
  haptic-tab.tsx       # Tab button with haptic feedback (iOS only)
```

---

## Design System

Dark-only visual with neon pink as primary color. All tokens live in `constants/theme.ts`.

| Export | Content |
|---|---|
| `Colors` | Surfaces: `background`, `card`, `surface2`, `muted`, `border`, `foreground` |
| `Accent` | `primary` (neon pink), `secondary` (purple), `gold`, `success`, `destructive`… |
| `Gradients` | `primary`, `hot`, `gold`, `card` — use with `expo-linear-gradient` |
| `Radius` | `sm`=12, `md`=14, `lg`=16, `full`=9999 |
| `Spacing` | 4 px base scale (tokens 1–16) |
| `Font` | Nunito: `regular`, `semiBold`, `bold`, `extraBold`, `black` |
| `FontSize` | `display`=35 → `label`=12 |
| `Glow` | Glow shadows: `pink`, `gold`, `green`, `purple` |

Full reference: [`docs/design-system.md`](docs/design-system.md).

---

## Conventions

- Imports always via `@/` alias (mapped to the repository root)
- No manual `useMemo` / `useCallback` — **React Compiler** is active (`experiments.reactCompiler: true`)
- Dark-only theme: no light theme logic in screens
- Platform files: `foo.ios.tsx` for iOS, `foo.tsx` as fallback (Android + Web)
- Public environment variables prefixed with `EXPO_PUBLIC_`
