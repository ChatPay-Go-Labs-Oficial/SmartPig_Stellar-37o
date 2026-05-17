# PigFi 🐷💸

**Small investments. A universe of possibilities.**

PigFi is a mobile investment app built for Brazilian first-time investors. It lets users start with small amounts, use a familiar Pix-based flow, and access dollar-denominated opportunities through an interface that feels simple, playful and safe instead of technical or intimidating.

This repository contains the **mobile app** built with **Expo / React Native** and integrated with the PigFi backend, Stellar testnet infrastructure, wallet flows, and the current hackathon ramp architecture.

> **Hackathon status:** this is a testnet MVP. It demonstrates the product experience, wallet connection, backend integration, Stellar/DeFindex investment flows and ramp architecture limitations in the current testnet environment. It is not a production financial product.

---

## Product overview

PigFi exists to make dollar investment feel as simple as saving coins in a piggy bank.

The product is designed for people who usually believe investing is too complex, too expensive or “not for them”. Instead of exposing users to crypto vocabulary, wallets, DeFi, yield protocols or blockchain mechanics, PigFi translates the experience into familiar language:

- start with a small amount;
- use a Pix-like entry point;
- see the digital piggy bank grow;
- understand progress visually;
- avoid financial and crypto jargon.

The brand direction is intentionally **tech-affectionate**: a modern financial app with a friendly pig character, dark UI, neon accents and a simple tone of voice.

---

## What this app does

In the current hackathon version, PigFi demonstrates:

- mobile onboarding;
- Stellar wallet creation / connection flow;
- persistent local wallet/user state;
- listing available investment vaults from the backend;
- viewing portfolio and vault information;
- preparing investment/deposit flows;
- preparing withdrawal flows;
- communicating with the backend API;
- using Stellar testnet infrastructure;
- showing how a Pix-to-dollar investment flow would work in the product experience.

---

## Important testnet limitation: Etherfuse on/off ramp

PigFi uses **Etherfuse** in the current ramp architecture to represent the on/off ramp layer.

However, in the current hackathon/testnet environment, **Etherfuse does not execute on-ramp or off-ramp operations to third-party DeFi protocols such as DeFindex**.

Because of that, the app does **not** complete a full real-money Pix → USDC → DeFindex → USDC → Pix cycle in testnet.

What the MVP demonstrates instead:

1. the intended user experience for a Pix-based dollar investment app;
2. the mobile/backend architecture required for the flow;
3. Stellar wallet interaction in testnet;
4. DeFindex vault integration through backend-generated unsigned XDRs;
5. the separation between a user-friendly app experience and the blockchain/DeFi infrastructure underneath;
6. the current external limitation of the ramp provider in testnet.

This limitation is not a UX or app logic decision. It is an infrastructure constraint of the ramp environment available during the hackathon.

---

## Related repositories

PigFi is split into two main repositories:

| Repository | Purpose |
|---|---|
| `SmartPig_Stellar-37o` | Mobile app built with Expo / React Native |
| `smartpig-backend` | Backend API built with NestJS, Prisma/PostgreSQL, Stellar and DeFindex integration |

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
        ├── Vault catalog and APY sync
        ├── Deposit and withdrawal intents
        ├── Unsigned XDR generation
        ├── Signed XDR submission
        └── Background reconciliation jobs
        │
        ▼
Stellar Testnet + DeFindex
        │
        ▼
Ramp layer: Etherfuse
Current limitation: no third-party DeFindex on/off ramp execution in testnet
```

---

## Mobile stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript |
| Routing | Expo Router |
| State | Zustand + AsyncStorage |
| Remote data | TanStack Query + Axios |
| Wallet | Stellar Wallets Kit + WalletConnect |
| UI / animation | Expo Linear Gradient + Reanimated |
| Storage | AsyncStorage / SecureStore where applicable |

---

## Backend stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Blockchain | Stellar |
| DeFi integration | DeFindex SDK / API |
| Background jobs | NestJS Schedule / cron jobs |
| Validation | class-validator / class-transformer |

---

## Core backend flows

The backend supports:

- wallet login using the user’s Stellar address;
- vault discovery and synchronization;
- APY and portfolio snapshot jobs;
- deposit intent creation;
- unsigned XDR generation for the mobile app to sign;
- signed XDR submission;
- withdrawal intent creation;
- reconciliation jobs for transaction status.

The backend never needs to store the user’s private key. The expected pattern is:

1. backend prepares the operation;
2. backend returns an unsigned XDR;
3. user signs through the mobile wallet flow;
4. backend submits or reconciles the signed transaction.

---

## Prerequisites

To run the mobile app locally:

- Node.js 20+
- npm
- Expo CLI / Expo tooling
- Android Studio or a physical Android device
- Backend API running locally or deployed
- Stellar testnet configuration
- WalletConnect Project ID

To run the backend locally, follow the backend repository documentation.

---

## Environment variables

Create a `.env` file in the mobile repository using the example below:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
EXPO_PUBLIC_ACCOUNT_WASM_HASH=
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

For local testing on a physical Android device, `localhost` points to the phone itself, not the computer. Use your machine’s local network IP or a tunnel URL for `EXPO_PUBLIC_API_URL`.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

---

## Installation and local run

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

## Running with the backend

Clone and run the backend separately:

```bash
git clone https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend.git
cd smartpig-backend
npm install
npm run start:dev
```

The mobile app must point to the backend through `EXPO_PUBLIC_API_URL`.

The backend repository contains the technical documentation for:

- architecture;
- database schema;
- REST API;
- deposit and withdrawal flows;
- DeFindex integration;
- jobs;
- deployment.

---

## APK installation for hackathon evaluators

PigFi is a React Native mobile application. For Android testing, evaluators should use the APK generated from this repository.

### Recommended delivery for the hackathon

The APK should be attached to a GitHub Release in this repository, for example:

```txt
Release name: PigFi Hackathon APK
Asset name: pigfi-hackathon.apk
```

The hackathon submission should include:

```txt
Mobile repository: https://github.com/ChatPay-Go-Labs-Oficial/SmartPig_Stellar-37o
Backend repository: https://github.com/ChatPay-Go-Labs-Oficial/smartpig-backend
APK: GitHub Release asset attached to this repository
```

### How to install the APK on Android

1. Download the APK from the GitHub Release attached to this repository.
2. Open the APK file on an Android device.
3. If Android blocks the installation, enable installation from unknown apps for the browser or file manager being used.
4. Confirm the installation.
5. Open PigFi.
6. Use the testnet flow demonstrated in the app.

### Important evaluator note

The APK demonstrates the mobile app and testnet investment architecture. The complete Pix/on-off ramp execution into third-party DeFindex vaults is not available in the current Etherfuse testnet environment.

---

## Current hackathon scope

Implemented / demonstrated:

- React Native mobile app;
- PigFi user experience and branding direction;
- wallet-oriented onboarding;
- backend API integration;
- Stellar testnet configuration;
- DeFindex-oriented vault architecture;
- deposit/withdrawal intent architecture;
- XDR-based blockchain transaction pattern;
- ramp flow architecture;
- APK-based Android evaluation path.

Not executed in testnet due to external infrastructure limitation:

- full Pix → USDC → DeFindex third-party vault investment;
- full DeFindex → USDC → Pix off-ramp;
- production money movement.

---

## Security and custody model

- The app is designed so that users do not need to understand blockchain terminology.
- The backend should not store private keys.
- Blockchain operations are prepared as unsigned XDRs where applicable.
- User-side signing is part of the wallet interaction flow.
- This hackathon version runs on testnet and must not be used with real funds.

---

## Brand and UX principles

PigFi should feel:

- simple;
- friendly;
- transparent;
- playful;
- financially responsible;
- non-technical for the end user.

PigFi should avoid:

- crypto jargon in the user interface;
- complex financial language;
- unrealistic return promises;
- “get rich quick” messaging;
- presenting the product as a bank or traditional broker.

The blockchain and DeFi layers are infrastructure, not the user-facing story.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Starts the Expo development server |
| `npm run android` | Opens the Android build target |
| `npm run ios` | Opens the iOS simulator target |
| `npm run web` | Opens the web preview |
| `npm run lint` | Runs Expo lint |

---

## Disclaimer

PigFi is currently a hackathon MVP running in a testnet environment. It is not a regulated production investment product and must not be used as financial advice. Any production release would require additional compliance, custody, risk, legal, security and infrastructure reviews.
