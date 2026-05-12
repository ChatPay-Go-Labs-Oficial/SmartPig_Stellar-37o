import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

function getPasskeys() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-passkeys') as {
      create: (opts: unknown) => Promise<unknown>;
      get: (opts: unknown) => Promise<unknown>;
    };
  } catch {
    throw new Error(
      'Passkeys não está disponível neste ambiente.\nUse um development build (EAS) para autenticação biométrica.'
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
