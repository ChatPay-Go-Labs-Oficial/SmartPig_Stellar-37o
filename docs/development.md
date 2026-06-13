# Development

> Portuguese version: [development.pt-BR.md](development.pt-BR.md)

## Requirements

- Node.js 20 or later;
- npm;
- an Android or iOS environment supported by Expo SDK 54;
- a PigFi backend reachable locally or over HTTPS.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

On a physical device, `localhost` points to the device itself. Use the development machine's IP address or a reachable HTTPS endpoint.

## Environment variables

All Expo variables below are embedded in the client bundle and must be considered public.

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
EXPO_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
EXPO_PUBLIC_USDC_ISSUER=<PUBLIC_STELLAR_ISSUER>
EXPO_PUBLIC_ACCOUNT_WASM_HASH=<PUBLIC_CONTRACT_HASH>
EXPO_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS=<PUBLIC_CONTRACT_ADDRESS>
EXPO_PUBLIC_NATIVE_TOKEN_CONTRACT=<PUBLIC_CONTRACT_ADDRESS>
EXPO_PUBLIC_STELLAR_RP_ID=<RELYING_PARTY_ID>
EXPO_PUBLIC_RELYING_PARTY=<RELYING_PARTY_ID>
EXPO_PUBLIC_PRIVY_APP_ID=<PUBLIC_PRIVY_APP_ID>
EXPO_PUBLIC_PRIVY_CLIENT_ID=<PUBLIC_PRIVY_CLIENT_ID>
```

Some legacy routes may reference `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`. Keep it only while that flow remains supported.

Do not document or add API secrets, client secrets, seed phrases, private keys or administrative tokens to the app. Those values belong in the backend or build environment secret manager.

## Structure

```text
app/                 Expo Router routes
components/ui/       reusable visual components
components/layout/   shared screen structures
constants/           theme and static content
hooks/               reusable React behavior
lib/api/             HTTP contracts and calls
lib/queries/         TanStack Query hooks
lib/stellar/         Stellar integration and signing
lib/stores/          Zustand state
assets/              images, fonts and sounds
docs/                technical and product documentation
```

## Implementation standards

### Remote data

- Declare HTTP contracts in `lib/api`.
- Encapsulate caching and mutations in `lib/queries`.
- Use stable query keys by domain and identity.
- Invalidate related caches after mutations.
- Use polling only for truly transient states.

### Local state

- Use Zustand for shared application state.
- Persist only what is necessary and define a stable storage key.
- Partition data by user when sessions must not share progress.
- Never persist sensitive cryptographic material in AsyncStorage.

### Screens and components

- Screens compose behavior; reusable components belong in `components`.
- Use tokens from `constants/theme.ts` instead of duplicating colors and fonts.
- Re-export public components from module `index.ts` files.
- User-facing messages should be simple and avoid blockchain jargon.

### Stellar

- Validate addresses, units and limits before requesting a signature.
- Preserve seven decimal places for Stellar assets.
- Distinguish a submitted transaction from a confirmed transaction.
- Map network codes to actionable UI errors.

## Validation before opening a PR

```bash
npm run lint
npx tsc --noEmit
```

Also validate changed flows manually on the relevant mobile target. Financial operations must be tested only on the configured testnet.

## Documentation updates

Update documentation in the same PR when changing:

- a user-visible flow;
- an environment variable;
- a route or module responsibility;
- an API contract or operation state;
- a security or custody rule;
- a public design-system token or API.
