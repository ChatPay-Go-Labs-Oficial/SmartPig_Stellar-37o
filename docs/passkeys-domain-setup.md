# Passkeys — Configuração de Domínio

Para que o WebAuthn / Passkeys funcione no Android e iOS, é necessário hospedar arquivos de
verificação no domínio configurado como `rpId` (atualmente `smartpig.app`).

## Arquivos necessários

### Android — `assetlinks.json`

Hospedar em: `https://smartpig.app/.well-known/assetlinks.json`

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.smartpig.app",
      "sha256_cert_fingerprints": ["<SHA256_DO_SEU_KEYSTORE>"]
    }
  }
]
```

**Como obter o SHA256 do keystore:**
```bash
# Se usar EAS Managed Credentials (recomendado):
eas credentials --platform android
# O fingerprint é exibido na seção "Keystore"

# Se tiver o .keystore manualmente:
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

> **Atenção:** O Android cacheia o `assetlinks.json` por até 24h. Após atualizar,
> reinstale o app no dispositivo para forçar a releitura.

---

### iOS — `apple-app-site-association`

Hospedar em: `https://smartpig.app/.well-known/apple-app-site-association`

> Sem extensão `.json`. Content-Type deve ser `application/json`.

```json
{
  "webcredentials": {
    "apps": ["<APPLE_TEAM_ID>.com.smartpig.app"]
  }
}
```

**Como obter o Apple Team ID:**
- Acesse [developer.apple.com](https://developer.apple.com/account)
- No canto superior direito → seu nome → "Membership details"
- O Team ID é uma string de 10 caracteres, ex: `A1B2C3D4E5`

---

## Configuração já feita no app

| Item | Valor |
|------|-------|
| `rpId` (env var) | `EXPO_PUBLIC_WEBAUTHN_RP_ID=smartpig.app` |
| `rpName` | `SmartPig` |
| iOS `associatedDomains` | `webcredentials:smartpig.app` (em `app.json`) |
| Android `package` | `com.smartpig.app` |
| iOS `bundleIdentifier` | `com.smartpig.app` |

Se o domínio mudar, atualizar:
1. `app.json` → `ios.associatedDomains`
2. `.env` → `EXPO_PUBLIC_WEBAUTHN_RP_ID`
3. Os dois arquivos de well-known acima

---

## Checklist antes de testar passkeys

- [ ] Domínio com SSL válido
- [ ] `assetlinks.json` hospedado e acessível
- [ ] `apple-app-site-association` hospedado e acessível
- [ ] SHA256 do keystore adicionado no `assetlinks.json`
- [ ] Apple Team ID adicionado no AASA
- [ ] Build EAS gerado **após** a configuração de domínio
- [ ] App instalado no dispositivo (não Expo Go)

---

## Testando a configuração

### Android
```bash
# Verificar se o arquivo está correto:
curl https://smartpig.app/.well-known/assetlinks.json

# Ferramenta oficial do Google:
# https://developers.google.com/digital-asset-links/tools/generator
```

### iOS
```bash
curl https://smartpig.app/.well-known/apple-app-site-association
```

Também é possível usar o [AASA Validator](https://branch.io/resources/aasa-validator/).

---

## Build EAS de desenvolvimento

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login (conta expo.dev)
eas login

# Build Android APK de desenvolvimento (instala via cabo)
eas build --profile development --platform android

# Após instalar o APK, iniciar o Metro:
npx expo start --dev-client
```
