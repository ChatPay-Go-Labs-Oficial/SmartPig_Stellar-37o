# Features and Flows

> Portuguese version: [features-and-flows.pt-BR.md](features-and-flows.pt-BR.md)

## Recent evolution

The latest implementations incorporated through June 26, 2026 include:

- social login with Google, email OTP and passkey through Privy;
- local biometric lock when opening the app and returning from the background;
- persistent learning progress per user;
- direct USDC transfers with account and trustline validation;
- history containing Stellar transfers and deposit/withdrawal states;
- a learning trail with lesson player, feedback, XP and sounds;
- audio migration to `expo-audio`;
- redesigned profile, history and financial modals;
- polling and cache invalidation for pending operations;
- Stellar balance normalization and invested-value display.

## Authentication and wallet

1. The user authenticates with Google, an email code or a passkey.
2. Privy restores or creates the embedded Stellar wallet.
3. The app authenticates the public address with the backend.
4. Public session and account IDs are persisted locally.
5. For already-authenticated sessions, the app requires local biometrics on launch and when returning from the background when the device has enrolled biometrics.
6. When required, the app requests and signs smart-account activation.

Legacy wallet creation and connection screens remain in the authentication group for compatibility, but the current primary flow is Privy-based.

## Vaults, deposits and withdrawals

- The **Invest** tab lists vaults returned by the backend.
- The detail screen reads vault information, APY and wallet balance.
- Deposits and withdrawals create idempotent intents on the backend.
- Withdrawals require local biometrics before creating the intent when the device has enrolled biometrics.
- Returned XDRs are signed on the client without sharing a private key.
- Intermediate operations are polled while awaiting confirmation.
- Underlying balances are converted from Stellar atomic units; withdrawal shares remain raw.

## USDC transfers

The transfer modal:

- validates Stellar addresses and prevents transfers to the same account;
- accepts up to seven decimal places;
- limits text memos to 28 bytes;
- checks account existence, authorized trustline and available limit;
- checks USDC balance and XLM reserve/fee requirements;
- signs with the Privy wallet and submits to Horizon;
- translates network and Stellar codes into user-friendly errors.

## History

The history screen displays deposits, withdrawals and USDC transfers. Transient and final states must be presented consistently without treating submission as confirmation.

## Learning trail

- Content is defined in `constants/trilha.ts` and `constants/flashcards.ts`.
- `LessonPlayer` controls lesson interaction types.
- Completions and XP are stored per user in `learning.store.ts`.
- A completed lesson does not award XP again.
- Sounds and haptics respect the user's global preference.

## Etherfuse and ramp

The app includes screens and contracts for:

- customer creation and lookup;
- KYC forms and document upload through presigned URLs;
- acceptance of terms and agreements;
- bank-account synchronization;
- quote, creation and tracking of on/off-ramp orders;
- trustline creation and off-ramp XDR signing.

The full cycle with third-party DeFindex vaults is not available in the current testnet. This restriction must remain explicit in demonstrations and documentation.

## Visual experience and feedback

- dark theme with pink, purple, orange and gold accents;
- Nunito throughout the application;
- reusable buttons, cards, inputs and badges;
- touch feedback, sounds and animations for navigation, success, errors and evolution;
- an evolving mascot associated with user progress.
