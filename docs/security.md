# Security and Sensitive Data

> Portuguese version: [security.pt-BR.md](security.pt-BR.md)

## Classification

### Public

- public Stellar addresses and contract IDs;
- public RPC, Horizon and API URLs;
- public client application IDs;
- testnet passphrase and configuration;
- transaction hashes and public network data.

### Sensitive

- private keys, seed phrases and signing material;
- access tokens, refresh tokens and session cookies;
- API secrets and client secrets;
- KYC documents, bank details and complete personal data;
- presigned URLs that are still valid;
- build credentials, certificates and keystores.

## Mandatory rules

1. Never include sensitive data in README files, `docs/`, examples, screenshots, issues or logs.
2. Never use `EXPO_PUBLIC_*` for secrets. These variables are available in the client bundle.
3. Never commit `.env` files; commit only `.env.example` with public placeholders.
4. Never store private keys or seed phrases in AsyncStorage, Zustand or the backend.
5. Never log tokens, complete signed XDRs, KYC documents or presigned URLs.
6. Immediately revoke and replace any credential exposed in Git history.

## Custody and signing

The current flow delegates authentication and signing to the Privy embedded wallet. The app registers a signing provider and submits only the required signatures or transactions. The backend may generate unsigned XDRs and reconcile results, but it must not receive the user's private key.

Before requesting a signature, the UI must provide enough operation context: asset, amount, destination and purpose. Submission must use the configured network and verify that the signature matches the source address.

## Local lock

Automatically restored sessions must pass local biometric authentication when opening the app and when returning from the background if the device has enrolled biometrics. If biometrics are unavailable or not enrolled, the app may continue to preserve device compatibility.

Sensitive actions, such as vault withdrawals, must also request local biometrics before creating intents or requesting signatures.

Biometric failures or cancellations keep the app on a locked screen with no financial data visible. The screen must allow retrying or signing out.

## KYC and ramp

- Collect only fields required by the provider.
- Upload documents directly through the presigned URL flow.
- Do not persist document images longer than required for upload.
- Do not include personal payloads in telemetry or error messages.
- Treat bank accounts and KYC status as personal data, even when the API returns opaque IDs.

## Documentation and release checklist

- [ ] No real secret or credential value was added.
- [ ] Examples use recognizable placeholders.
- [ ] Development logs contain no tokens or personal data.
- [ ] The build targets testnet unless another environment was formally approved.
- [ ] Ramp limitations and the unregulated-product warning remain visible.
- [ ] New dependencies and native permissions were reviewed.
- [ ] Signing flows display and validate the correct data.
- [ ] Local environment files remain ignored by Git.
