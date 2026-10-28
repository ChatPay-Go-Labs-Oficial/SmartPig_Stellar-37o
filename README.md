# PigFi 🐷💸

## Hack Meridian Demo

- **Android APK:** [Download the demo](https://expo.dev/artifacts/eas/zdnX1LjCONIFWpnJdrNGzyLdgllwc4hSIG4CddHH7RA.apk)
- **iPhone TestFlight:** [Join the demo](https://testflight.apple.com/join/S22dz9JV)
- **Demo support:** If you have trouble accessing the demo, contact an administrator or team participant via [WhatsApp](https://wa.me/+5521979119988).
- **Production App:** [use.pigfi.app](https://use.pigfi.app)

---

**Small values, a universe of possibilities.**

Website: https://use.pigfi.app

Android Apk: https://expo.dev/accounts/maykro/projects/pigfi/builds/d5b83ae2-c2a6-48f5-a79e-ac4d3b8960cf

PigFi is a mobile-first financial education and habit-building app for Brazilian families, using Stellar infrastructure to turn small Pix-based contributions into a simple, visual and gamified dollar-denominated experience.

This repository contains the **mobile app** built with **Expo / React Native**, integrated with the PigFi backend, Stellar mainnet infrastructure, and wallet flows.

> **Status:** MVP on mainnet. Demonstrates the product experience, wallet connection, backend integration, Stellar/DeFindex investment flows, and ramp architecture. The app is operational on Android. Submission to the Apple App Store and Google Play is in progress, pending approval.

---

## Product Overview

PigFi exists to make investing in dollars as simple as putting coins into a piggy bank.

The product is designed for people who believe investing is complicated, expensive, or “not for me” — and for those who want to offer their families a different kind of financial habit and education. Instead of exposing users to crypto vocabulary, wallets, DeFi, yield protocols, or blockchain mechanics, PigFi translates the experience into familiar language:

- start with a small amount;
- use a flow similar to Pix;
- watch the piggy bank grow;
- understand progress visually;
- no financial or crypto jargon.

The brand direction is intentionally **tech-emotional**: a modern financial app with an astronaut piggy character, dark UI, neon elements, and a simple tone of voice. It is designed for families and financial education.

---

## What the App Does

In its current version, PigFi demonstrates:

- mobile onboarding;
- Stellar wallet creation and connection;
- persistent wallet and user state;
- listing of available investment vaults via backend;
- portfolio and vault information visualization;
- deposit and withdrawal flows;
- communication with the backend API;
- Stellar mainnet infrastructure;
- the product experience for the Pix → dollar investment flow.

---

## Related Repositories

PigFi is split into two main repositories:

| Repository             | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `SmartPig_Stellar-37o` | Mobile app built with Expo / React Native                               |
| `smartpig-backend`     | Backend API built with NestJS, Prisma/PostgreSQL, Stellar, and DeFindex |

The backend is responsible for API orchestration, vault data, deposit/withdrawal intents, XDR generation, background jobs, and communication with Stellar/DeFindex.

Backend repository:

```txt
https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
```

---

## Architecture

```txt
PigFi Mobile App
Expo / React Native
        │
        │ HTTPS / REST
        ▼
PigFi Backend API
NestJS + Prisma + PostgreSQL
        │
        ├── Wallet login / user persistence
        ├── Vault catalog and synchronization
        ├── Deposit and withdrawal intents
        ├── Unsigned XDR generation
        ├── Signed XDR submission
        └── Background reconciliation jobs
        │
        ▼
Stellar Mainnet + DeFindex
        │
        ▼
Ramp layer: regulated on/off-ramp partner
```

---

## Mobile Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | Expo SDK 54 + React Native 0.81             |
| Language       | TypeScript                                  |
| Routing        | Expo Router                                 |
| State          | Zustand + AsyncStorage                      |
| Remote data    | TanStack Query + Axios                      |
| Wallet         | Privy embedded wallets + WebAuthn           |
| UI / animation | Expo Linear Gradient + Reanimated           |
| Storage        | AsyncStorage / SecureStore where applicable |

---

## Backend Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Runtime          | Node.js 20+                         |
| Framework        | NestJS                              |
| ORM              | Prisma                              |
| Database         | PostgreSQL                          |
| Blockchain       | Stellar                             |
| DeFi Integration | DeFindex SDK / API                  |
| Background jobs  | NestJS Schedule / cron jobs         |
| Validation       | class-validator / class-transformer |

---

## Main Backend Flows

The backend supports:

- wallet login using the user’s Stellar address;
- vault discovery and synchronization;
- APY and portfolio snapshot jobs;
- deposit intent creation;
- unsigned XDR generation for signing in the mobile app;
- signed XDR submission;
- withdrawal intent creation;
- reconciliation jobs for transaction status updates.

The backend does not store the user’s private key. The expected pattern is:

1. the backend prepares the operation;
2. the backend returns an unsigned XDR;
3. the user signs it through the mobile wallet flow;
4. the backend submits or reconciles the signed transaction.

---

## Prerequisites

To run the mobile app locally:

- Node.js 20+
- npm
- Expo CLI / Expo tooling
- Android Studio or a physical Android device
- Backend API running locally or deployed
- Stellar mainnet configuration
- Privy App ID
- WalletConnect Project ID

To run the backend locally, follow the documentation in the backend repository.

---

## Environment Variables

Create a `.env` file in the mobile repository using the example below:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
EXPO_PUBLIC_ACCOUNT_WASM_HASH=
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

For local testing on a physical Android device, `localhost` points to the phone itself, not to your computer. Use your machine’s local IP address or a tunnel URL for `EXPO_PUBLIC_API_URL`.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

---

## Installation and Local Execution

```bash
# Clone the repository
git clone https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o.git
cd SmartPig_Stellar-37o

# Install dependencies
npm install

# Start Expo
npx expo start
```

Then choose one of the available options:

```bash
# Android
npm run android

# iOS
npm run ios

# Web preview
npm run web

# Lint
npm run lint
```

---

## Running with the Backend

Clone and run the backend separately:

```bash
git clone https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend.git
cd smartpig-backend
npm install
npm run start:dev
```

The mobile app must point to the backend via `EXPO_PUBLIC_API_URL`.

The backend repository contains technical documentation for:

- architecture;
- database schema;
- REST API;
- deposit and withdrawal flows;
- DeFindex integration;
- jobs;
- deployment.

---

## Android APK Installation

PigFi is a React Native application. For Android testing, use the APK generated in this repository.

### How to Install the APK

1. Download the APK at https://expo.dev/accounts/maykro/projects/pigfi/builds/d5b83ae2-c2a6-48f5-a79e-ac4d3b8960cf
2. Open the APK file on your Android device.
3. If Android blocks the installation, enable installation from unknown sources for the browser or file manager being used.
4. Confirm the installation.
5. Open PigFi.

### Store Availability

Submissions to the Apple App Store and Google Play have been made and are awaiting approval.

---

## Security and Custody Model

- The app is designed so users do not need to understand blockchain terminology.
- Authentication and key protection are managed by Privy.
- The backend does not store private keys.
- Blockchain operations are prepared as unsigned XDRs where applicable.
- User signing is part of the wallet interaction flow.

---

## Brand and UX Principles

PigFi should feel:

- simple;
- friendly;
- transparent;
- fun;
- financially responsible;
- non-technical for the end user.

PigFi should avoid:

- crypto jargon in the user interface;
- complex financial language;
- unrealistic return promises;
- “get rich quick” messaging;
- presenting the product as a traditional bank or brokerage.

The blockchain and DeFi layers are infrastructure, not the user-facing story.

---

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm start`       | Starts the Expo development server |
| `npm run android` | Opens the Android build target     |
| `npm run ios`     | Opens the iOS simulator            |
| `npm run web`     | Opens the web preview              |
| `npm run lint`    | Runs Expo lint                     |

---

## Disclaimer

PigFi is an MVP on mainnet. It is not a regulated investment product in production and should not be used as financial advice. Any production launch will require additional compliance, custody, risk, legal, security, and infrastructure reviews.

---

## HackMeridian 2026 — PigFi Experience

> Scale track · Lisbon, October 25–26, 2026. This section documents the hackathon contribution separately from the existing product described above. [Versão em português](README.pt-BR.md#hackmeridian-2026--pigfi-experience).

### Why we built it

Making a first deposit accessible is only the beginning. People also need to understand what they are using, build confidence and find a reason to return. PigFi Experience adds short lessons, visible progress and practical payments to the familiar habit of saving.

The goal is to help everyday savers become confident Stellar users. Learning happens inside the app, with one idea at a time, questions and immediate feedback. Sending to a contact makes that knowledge useful in everyday life.

### Existing product and hackathon contribution

| Before HackMeridian | Built for HackMeridian |
| --- | --- |
| Mobile app connected to Stellar mainnet and embedded wallets | PigFi Experience: XP, User Levels, daily reward and level-up scenes |
| Pix-to-dollar experience and DeFindex integration | Introductory learning module with five lessons and saved progress |
| USDC, EURC and XLM vaults, with risk acknowledgment | Progressive access to assets and vaults through learning in Lite mode |
| Asset swaps and wallet transfers by address | Permanent @usernames and sending USDC, EURC or XLM to PigFi contacts |

The **User Level** represents learning and participation. It is separate from the **Pig Level**, which reflects the amount saved or invested. Deposits, withdrawals, transfers and transaction amounts never generate XP.

### Part 1 — Learn, progress and unlock

- New users start at User Level 0. The journey includes Iniciante, Consistente, Dedicado and Veterano tiers, with visible progress and level-up feedback.
- XP comes from the daily reward, completing a lesson and completing a module. Individual answers do not award XP.
- The backend is the source of truth for XP, levels, lesson progress and vault access. Lessons resume from saved progress; content and answer validation come from the backend.
- The introductory module contains five lessons: Fundamentals; Wallet/Ramp/Vault; Dollar/Euro Diversification; XLM Volatility; Liquidity and Exit.

**Hackathon eligibility rules:**

| Asset | Access in Lite mode |
| --- | --- |
| USDC — dollar | Available without a learning prerequisite |
| EURC — euro | Complete Fundamentals, Wallet/Ramp/Vault and Dollar/Euro Diversification |
| XLM — cryptocurrency | Complete all five introductory lessons |

For this delivery, the minimum User Level is temporarily 0: lesson completion determines educational access. The scope plans to restore minimum levels of 5 for EURC and 10 for XLM when more content is available, preserving access already earned.

In Lite, swaps and new vault deposits follow educational eligibility. In Pro, educational restrictions do not apply. Risk acknowledgment remains required per vault in both modes. Learning restrictions never prevent viewing balances, withdrawing or recovering funds; operational vault availability is checked separately.

### Part 2 — Usernames and Send to Contacts

Implementation: [`feat/send-to-contacts`](https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/tree/feat/send-to-contacts), submitted to `feat/pigfi-meridian` through [PR #40](https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o/pull/40). These features require the Part 2 code and a backend with the usernames module.

- Create a permanent @username from Profile, with format validation, availability checks and feedback for an existing username or network failure.
- Open Send in Lite or Transfer in Pro and find another PigFi user by their exact @username. If the sender has no username yet, creation opens first and returns to the transfer.
- Show the recipient's registered name only when verified; otherwise show “Usuário PigFi”. Sending to your own username is blocked.
- Select USDC, EURC or XLM from assets with a balance. Lite shows learning restrictions with a lock. The app checks insufficient balance and whether the recipient can receive the asset.
- Review the recipient, asset and amount, authenticate with biometrics and sign. Destination and balance are checked again on the network before signing; success requires network acceptance.
- If the network response is missing, check the transaction hash. A retry resubmits the same signed transaction to avoid a duplicate payment.
- Save contacts locally per account, containing only username and name. Contacts are removed on sign-out and account deletion.

This delivery supports PigFi usernames only, without federation with other wallets. Pro's existing address-based USDC transfer remains available.

### How Stellar is used

Contact transfers are payments between the two users' Stellar wallets. The backend resolves a PigFi username to the recipient; the app handles transaction preparation, wallet signing and submission through the Stellar integration. USDC and EURC are issued assets; XLM is Stellar's native asset. Recipient asset support is checked before sending.

Learning progress and XP live in the backend. Payments settle on Stellar. The existing vault experience uses Stellar and DeFindex; the hackathon adds educational access rules and a username-based payment experience around that infrastructure.

### Review and demo guide

1. Use the hackathon app branch `feat/pigfi-meridian`. For Part 2, use a revision containing PR #40, or review `feat/send-to-contacts` directly.
2. Run the backend with the Experience, Learning, eligibility and usernames modules. The development dependency is `feat/pigfi-experience-learning-eligibility` in the [backend repository](https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend).
3. Follow the installation instructions above and the [development guide](docs/development.md). Configure the app and backend for the same Stellar network, asset issuers and deployed services. The APK linked earlier is not identified here as a HackMeridian build.
4. In Lite, inspect the User Level on Home, claim the daily reward and open the learning path. Complete lessons, observe XP and level-up feedback, and check EURC/XLM unlocks.
5. Confirm that a learning restriction leaves balances and withdrawals accessible. Compare the experience with Pro.
6. With Part 2 installed, create a username in Profile, find a second PigFi account and proceed to the transfer review. Check recipient identity, asset and amount before confirming any real payment.

### Validation and remaining work

Part 2's implementation report records a clean `npx tsc --noEmit`, lint with 0 errors, and Android validation against the local backend in Lite and Pro, compared with Figma, through the transfer review step. These are the reported implementation checks, not a claim that a real transfer was tested for every asset.

Still pending or outside this delivery:

- Real minimum-value transfers in USDC, EURC and XLM between two team accounts; a second account was missing during the reported validation.
- Server-saved contacts; the backend has no contacts route yet.
- The visual v2 update for Pro's address-based transfer, reserved for a separate PR.
- Chama/streaks, Savings Goals, PigCoin and achievement badges.
- Further content for the Dedicado and Veterano tiers.

The pitch identifies D7/D30 retention, lesson completion, returning users and repeat transfers as future measurement targets. No results for those metrics are claimed here.

### Documentation and team

| Reference | English | Português |
| --- | --- | --- |
| Features and flows | [Read](docs/features-and-flows.md) | [Ler](docs/features-and-flows.pt-BR.md) |
| Architecture | [Read](docs/architecture.md) | [Ler](docs/architecture.pt-BR.md) |
| Design system | [Read](docs/design-system.md) | [Ler](docs/design-system.pt-BR.md) |
| Development | [Read](docs/development.md) | [Ler](docs/development.pt-BR.md) |
| Security | [Read](docs/security.md) | [Ler](docs/security.pt-BR.md) |

The submission deck presents the team as Vanessa Barros (CEO), Carol Tavares (CPO), Maycon Rodrigues (CTO) and Matheus Brasil (CAIO).

This addition is based on the team's *PigFi Experience — HackMeridian 2026* pitch deck, *PigFi — Escopo do HackMeridian 2026 v1.0.2*, repository implementation and the Part 2 PR description. The earlier README is preserved as the original product documentation; this section records the hackathon scope and validation limits.
