# PigFi 🐷

> 🇺🇸 [Read in English](README.md)

App móvel de finanças pessoais DeFi construído com **Expo / React Native**, integrado à rede **Stellar**. Permite que usuários conectem ou criem carteiras Stellar e depositem em vaults de rendimento gerenciados pelo protocolo Defindex.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 54 · React Native 0.81 |
| Linguagem | TypeScript 5.9 |
| Roteamento | expo-router 6 (file-based) |
| Estado global | Zustand 5 + AsyncStorage (persistido) |
| Dados remotos | TanStack Query v5 + Axios |
| Carteira | `@creit.tech/stellar-wallets-kit` + WalletConnect |
| UI/Animações | expo-linear-gradient · react-native-reanimated 4 |
| Fontes | Nunito via `@expo-google-fonts/nunito` |

---

## Pré-requisitos

- Node.js ≥ 20
- [Expo Go](https://expo.dev/go) no dispositivo físico, ou simulador iOS / emulador Android configurado
- Variável de ambiente `EXPO_PUBLIC_API_URL` apontando para o backend (veja `.env.example`)

---

## Instalação e execução

```bash
# instalar dependências
npm install

# servidor de desenvolvimento (QR code para Expo Go)
npx expo start

# plataformas específicas
npx expo start --ios
npx expo start --android
npx expo start --web
```

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor Expo |
| `npm run ios` | Abre no simulador iOS |
| `npm run android` | Abre no emulador Android |
| `npm run web` | Abre no navegador |
| `npm run lint` | ESLint (`eslint-config-expo/flat`) |

---

## Arquitetura

### Roteamento (`app/`)

```
app/
  _layout.tsx          # Root: QueryClient + Nunito + redirecionamento auth
  (auth)/              # Onboarding, criar e conectar carteira Stellar
    index.tsx          # Tela inicial de boas-vindas
    create-wallet.tsx  # Criação de nova carteira
    connect-wallet.tsx # Conexão via WalletConnect / chave privada
  (tabs)/              # Navegação por abas (bottom tabs)
    index.tsx          # Home — portfólio e vaults ativos
    vaults.tsx         # Listagem de todos os vaults disponíveis
    history.tsx        # Histórico de transações
    profile.tsx        # Perfil e configurações
  vault/
    [id].tsx           # Detalhes do vault + ações (depositar/sacar)
```

**Fluxo de autenticação:** o root layout verifica `useAuthStore.isAuthenticated` após carregar as fontes e redireciona para `/(auth)` ou `/(tabs)`.

### Camada de dados (`lib/`)

```
lib/
  api/
    client.ts          # Axios com baseURL e interceptor de userId
    vaults.ts          # Endpoints de vaults (listagem, detalhes, APY, balance)
    deposits.ts        # Endpoints de depósitos
    withdrawals.ts     # Endpoints de saques
  queries/             # TanStack Query hooks (useVaults, useDeposits…)
  stores/
    auth.store.ts      # contractId + isAuthenticated (Zustand + AsyncStorage)
    wallet.store.ts    # walletAddress (Zustand + AsyncStorage)
    ui.store.ts        # Estado de UI transiente
  wallet-kit.ts        # Inicialização do StellarWalletsKit + WalletConnect
```

### Componentes (`components/`)

```
components/
  ui/
    Button.tsx         # Variantes: primary, ghost, secondary, gold
    Card.tsx           # LinearGradient card com borda; variante flat
    Badge.tsx          # Pills: destaque, conquista, sucesso, erro, muted
    GradientText.tsx   # Texto com gradiente (MaskedView + LinearGradient)
    ConfirmModal.tsx   # Modal de confirmação reutilizável
    icon-symbol.tsx    # MaterialIcons (Android/Web)
    icon-symbol.ios.tsx# SF Symbols (iOS nativo)
  layout/
    ScreenContainer.tsx# SafeAreaView + ScrollView + padding padrão
  haptic-tab.tsx       # Tab button com feedback háptico (iOS)
```

---

## Design System

Visual dark-only com neon pink como cor primária. Todos os tokens estão em `constants/theme.ts`.

| Export | Conteúdo |
|---|---|
| `Colors` | Superfícies: `background`, `card`, `surface2`, `muted`, `border`, `foreground` |
| `Accent` | `primary` (neon pink), `secondary` (purple), `gold`, `success`, `destructive`… |
| `Gradients` | `primary`, `hot`, `gold`, `card` — usar com `expo-linear-gradient` |
| `Radius` | `sm`=12, `md`=14, `lg`=16, `full`=9999 |
| `Spacing` | Escala base 4 px (tokens 1–16) |
| `Font` | Nunito: `regular`, `semiBold`, `bold`, `extraBold`, `black` |
| `FontSize` | `display`=35 → `label`=12 |
| `Glow` | Sombras glow: `pink`, `gold`, `green`, `purple` |

Documentação completa: [`docs/design-system.pt-BR.md`](docs/design-system.pt-BR.md).

---

## Convenções

- Imports sempre via alias `@/` (mapeado para a raiz do repositório)
- Sem `useMemo` / `useCallback` manual — **React Compiler** está ativo (`experiments.reactCompiler: true`)
- Tema dark-only: não há lógica de tema claro nas telas
- Arquivos de plataforma: `foo.ios.tsx` para iOS, `foo.tsx` como fallback (Android + Web)
- Variáveis de ambiente públicas prefixadas com `EXPO_PUBLIC_`
