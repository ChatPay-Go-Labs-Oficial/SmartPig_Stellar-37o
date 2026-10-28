# Application Architecture

> Portuguese version: [architecture.pt-BR.md](architecture.pt-BR.md)

This document describes the architecture implemented in the mobile application. The backend has its own lifecycle and documentation.

## Principles

1. The interface presents financial concepts without exposing blockchain complexity to the user.
2. Authentication, signing, local persistence and remote data remain in separate layers.
3. The backend orchestrates business resources; Stellar operations that require custody remain user-signed.
4. Remote data uses TanStack Query. Persistent local state uses Zustand.
5. `constants/theme.ts` is the source of truth for shared visual tokens.

## Layers

| Layer | Main directories | Responsibility |
| --- | --- | --- |
| Routes | `app/` | Screens, layouts and flow composition |
| Components | `components/ui`, `components/layout`, `components/v2` | Reusable UI and screen structure; `components/v2` is the V2 design system |
| Queries | `lib/queries` | Cache, polling, invalidation and mutations |
| API | `lib/api` | HTTP contracts and Axios client |
| Stellar | `lib/stellar` | Configuration, signing, transfers and swaps |
| Local state | `lib/stores` | Session, mode, preferences, ramp state and pending scenes |
| Content | `constants`, `lib/copy` | Theme, flashcards, trail milestones and Lite/Pro terms |

## Providers and initialization

`app/_layout.tsx` initializes:

- polyfills before SDKs that depend on web or crypto APIs;
- global audio mode with `expo-audio`;
- Nunito fonts;
- `PrivyProvider` for authentication and the embedded wallet;
- `QueryClientProvider` for remote state;
- `AppGate`, which waits for Privy and Zustand hydration before redirecting.

The Privy token provider is registered in `lib/api/token.ts` and used by the HTTP client. The hash-signing provider is registered in `lib/stellar/signer.ts` for Stellar operations.

## Routes

| Group | Routes | Purpose |
| --- | --- | --- |
| Authentication | `app/(auth)` and `app/oauth/callback.tsx` | Social, email and passkey login plus wallet-flow compatibility |
| Main | `app/(tabs)` | Home, Save, Wallet, Trail (with Your level) and Profile |
| Lesson | `app/learning/[moduleKey].tsx` | Trail V2 lesson, over the tabs |
| Vault | `app/vault/[id]` | Details, deposits and withdrawals |
| Etherfuse | `app/(etherfuse-onboarding)` | Registration, KYC, documents, agreements and bank account |
| Content | `app/education.tsx`, `app/pigs.tsx` | Education and mascot evolution |

## State and persistence

| Store | Persistence | Content |
| --- | --- | --- |
| `auth.store.ts` | AsyncStorage | Public session IDs, wallet, activation and last displayed level |
| `app-mode.store.ts` | AsyncStorage | Lite/Pro mode and last change date, reconciled with the backend |
| `contacts.store.ts` | AsyncStorage | Saved contacts for sending by @ (only @ and name), per account; erased on sign-out |
| `level-up.store.ts`, `piggy-unlock.store.ts` | Memory | Level-up and unlocked-piggy scene requested and not yet shown |
| `settings.store.ts` | AsyncStorage | Preferences such as muted audio |
| `etherfuse.store.ts` | Flow-specific | Onboarding and ramp navigation state |
| `pix.store.ts`, `ui.store.ts` | Interface state | Temporary presentation and flow data |

XP, level and lesson progress are not stored on the device: they come from the backend (`lib/api/experience.ts`, `lib/api/learning.ts`). The v1 trail local progress was removed; its old key is erased on sign-out and on account deletion.

AsyncStorage is not a secure vault. Tokens, documents, private keys and secrets must not be added to these stores.

## Remote data

The standard flow is:

```text
Screen -> hook in lib/queries -> function in lib/api -> backend
```

Queries define cache keys by domain. Deposits and withdrawals in intermediate states are polled every five seconds until `CONFIRMED` or `FAILED`. Mutations invalidate related lists after success.

API errors are read by `code` in `lib/api/errors.ts` (`readApiError`, `hasApiErrorCode`, `apiErrorDetails`). PigFi Experience queries are per account (`contractId`) and live in `lib/queries/experience.queries.ts` and `learning.queries.ts`; `refreshVaultAccess` refetches vault access after a lesson or a 409.

## Stellar operations

- **Activation:** the backend prepares the operation; the app signs and submits the response.
- **Vault deposit/withdrawal:** the backend generates an unsigned XDR; the user signs through the wallet flow; the backend submits or reconciles it.
- **Send by @ (USDC, EURC and XLM):** the backend only resolves the @ to the address; the app checks destination and balance on the network, signs with Privy (`buildSignedPayment`) and submits to Horizon (`submitSignedPayment`), checking by hash before reporting a network error.
- **USDC transfer:** the app validates the account, trustline, balance and memo, builds the transaction, requests a Privy signature and submits it to Horizon.
- **Stellar history:** USDC payments are read from Horizon and combined with backend operations in the UI.
- **Swap:** `lib/stellar/swap.ts` provides path discovery and XLM/USDC swaps for flows that require the asset.

Contract values with seven atomic decimal places are normalized in `lib/api/vaults.ts` before reaching the UI. `dfTokens` remains raw because it represents shares used for withdrawals.

## Responsibility boundaries

The app must not:

- store private keys or server credentials;
- implement business rules that must be authoritative on the backend;
- assume an asynchronous mutation is confirmed before receiving remote status;
- duplicate HTTP contracts directly inside screens.

The backend must not receive private keys. It may prepare unsigned XDRs, validate rules, persist intents and reconcile transactions.
