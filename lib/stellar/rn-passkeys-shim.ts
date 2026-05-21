import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

function getPasskeys() {
  try {
    const passkeys = require('react-native-passkeys') as {
      create: (opts: unknown) => Promise<unknown>;
      get: (opts: unknown) => Promise<unknown>;
    };
    return passkeys;
  } catch {
    throw new Error(
      'Passkeys indisponível neste ambiente.\nUse um development build (EAS) para autenticação biométrica.',
    );
  }
}

export const rnPasskeysShim = {
  startRegistration: async ({
    optionsJSON,
  }: {
    optionsJSON: PublicKeyCredentialCreationOptionsJSON;
  }): Promise<RegistrationResponseJSON> => {
    const { create } = getPasskeys();
    const result = await create(optionsJSON);
    return result as RegistrationResponseJSON;
  },
  startAuthentication: async ({
    optionsJSON,
  }: {
    optionsJSON: PublicKeyCredentialRequestOptionsJSON;
  }): Promise<AuthenticationResponseJSON> => {
    const { get } = getPasskeys();
    const result = await get(optionsJSON);
    return result as AuthenticationResponseJSON;
  },
};
