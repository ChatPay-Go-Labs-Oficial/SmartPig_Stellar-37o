# Features and Flows

> Portuguese version: [features-and-flows.pt-BR.md](features-and-flows.pt-BR.md)

## Recent evolution

The latest implementations incorporated through June 26, 2026 include:

- social login with Google, email OTP and passkey through Privy;
- local biometric lock when opening the app and returning from the background;
- learning progress per user (now on the backend);
- direct USDC transfers with account and trustline validation;
- history containing Stellar transfers and deposit/withdrawal states;
- a learning trail with lesson player, feedback, XP and sounds;
- audio migration to `expo-audio`;
- redesigned profile, history and financial modals;
- polling and cache invalidation for pending operations;
- Stellar balance normalization and invested-value display.

October 2026 added the **PigFi Experience**: user level and XP from the backend, the daily reward, the Trail V2 with backend-served lessons, and piggy unlocking through the trail in Lite mode.

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

The history screen displays Pix operations, vault deposits and withdrawals, and USDC transfers. Transient and final states must be presented consistently without treating submission as confirmation.

## PigFi Experience: level, trail and piggies

The backend is the source of truth for XP, level, lesson progress and piggy access. The app keeps no learning progress on the device.

**Lite and Pro mode.** The mode belongs to the account: `GET /users/me` at every session start reconciles the device mode with the backend one by "last change wins" (`hooks/use-experience-mode-sync.ts`). Switching in Preferences is queued to the backend. Signing out resets the mode to the default.

**User Level.** Card on Home, the Your level screen (`app/(tabs)/learn/level.tsx`) and the level on Profile. The daily reward grants XP once a day; `409 DAILY_REWARD_ALREADY_CLAIMED` refetches the profile and shows the reward as claimed, with no error. XP only comes from the daily reward, a completed lesson and a completed module: no money action grants XP.

**Trail V2.** `app/(tabs)/learn/index.tsx` shows the lesson path (`GET /learning/modules` and `GET /learning/content`), the Lite unlock milestones (`constants/learning-trail.ts`) and the Dictionary. A lesson opens at `app/learning/[moduleKey].tsx`, over the tabs, resumes from the saved point (`GET /learning/progress`) and records every answer on the backend. `409 LEARNING_CONTENT_VERSION_STALE` reloads the lesson and keeps the step.

**Level up.** When the answer that completes a lesson, or the daily reward, returns a new level, the Evolution! scene shows over the tabs (`LevelUpScene`). The level-up arrives once, in the response that caused it; nothing is stored.

**Piggy eligibility.** Each vault carries an `access` computed by the backend. In Lite, saving into a piggy may require trail lessons:

- a locked piggy stays visible on Save, Home and Wallet, with the lock and the missing lesson;
- Save shows "Pra liberar" with the lessons and a shortcut to the Trail;
- a locked piggy with a balance shows "Passos pendentes": Save disabled, Withdraw enabled;
- `409 VAULT_EDUCATION_LOCKED` on deposit or swap closes the operation and shows what is missing;
- after the unlocking lesson, "Ver o porquinho" opens the Unlocked! scene on that piggy (`PiggyUnlockScene`);
- learning never blocks seeing a balance, withdrawing from a piggy or cashing out, and unlocked by the trail does not mean available: the vault's operational pause still applies.

Without `access` (older backend), the old Pro-only piggy flag applies.

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
