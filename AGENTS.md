# Agent Configuration

## Project Information

This is an Expo/React Native project with TypeScript, using React Navigation, TanStack Query, and Privy authentication.

## Build Commands

- `npm run lint` - Run Expo lint
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npx expo doctor` - Check Expo configuration
- `npx tsc --noEmit` - TypeScript type checking

## CI Configuration

- CI workflow: `.github/workflows/ci.yml` - Runs lint and build checks on PRs
- Branch protection: Main branch requires PR approval from code owner and passing CI checks
- CODEOWNERS: `.github/CODEOWNERS` - Requires @Maycon-Rodrigues approval for all changes

## GitHub Repository

- Owner: ChatPay-Go-Labs-Oficial
- Repository: SmartPig_Stellar-37o
- Main branch is protected with branch rules

## Technology Stack

- React Native 0.81.5
- Expo ~54.0.33
- TypeScript ~5.9.2
- React Navigation 7.x
- TanStack Query 5.x
- Stellar SDK 15.1.0
- Privy authentication
