# PigFi 🐷💸

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
