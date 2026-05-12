import { create, get } from 'react-native-passkeys';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

export const rnPasskeysShim = {
  startRegistration: async ({
    optionsJSON,
  }: {
    optionsJSON: PublicKeyCredentialCreationOptionsJSON;
  }): Promise<RegistrationResponseJSON> => {
    // react-native-passkeys uses a compatible but slightly different type signature
    const result = await create(optionsJSON as any);
    return result as unknown as RegistrationResponseJSON;
  },
  startAuthentication: async ({
    optionsJSON,
  }: {
    optionsJSON: PublicKeyCredentialRequestOptionsJSON;
  }): Promise<AuthenticationResponseJSON> => {
    const result = await get(optionsJSON as any);
    return result as unknown as AuthenticationResponseJSON;
  },
};
