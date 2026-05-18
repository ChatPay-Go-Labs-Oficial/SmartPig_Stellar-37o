import { EtherfuseApi } from '@/lib/api/etherfuse.api';
import { UsersApi } from '@/lib/api/users.api';
import type { PersonalDataDto } from '@/lib/stores/onboarding.store';
import axios from 'axios';

export interface SubmitPersonalDataResult {
  etherfuseOrgId: string;
}

export interface PresignedUrlResult {
  presignedUrl: string;
  bankAccountId: string;
}

const IS_MOCK = process.env.EXPO_PUBLIC_MOCK_ETHERFUSE === 'true';

function extractErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const serverMsg =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
        ? data.message.join(', ')
        : null;
    return serverMsg ?? `HTTP ${e.response?.status ?? 'sem resposta'}: ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export const OnboardingService = {
  submitPersonalData: async (
    data: PersonalDataDto,
    userId: string,
  ): Promise<SubmitPersonalDataResult> => {
    if (IS_MOCK) {
      // Update name in our backend (best-effort) so the dashboard greeting works
      try {
        await UsersApi.updateUser(userId, {
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
        });
      } catch {}
      return { etherfuseOrgId: 'mock-etherfuse-org-id' };
    }

    let org;

    try {
      org = await EtherfuseApi.createOrganization({
        userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        const serverMsg: string = e.response?.data?.message ?? '';
        if (serverMsg.toLowerCase().includes('already has')) {
          console.warn('[OnboardingService] Organização já existe, buscando registro existente...');
          try {
            org = await EtherfuseApi.getOrganization();
          } catch (fetchErr) {
            const msg = extractErrorMessage(fetchErr);
            console.error('[OnboardingService] getOrganization falhou:', msg, fetchErr);
            throw new Error(`Etherfuse: ${msg}`);
          }
        } else {
          const msg = extractErrorMessage(e);
          console.error('[OnboardingService] createOrganization falhou:', msg, e);
          throw new Error(`Etherfuse: ${msg}`);
        }
      } else {
        const msg = extractErrorMessage(e);
        console.error('[OnboardingService] createOrganization falhou:', msg, e);
        throw new Error(`Etherfuse: ${msg}`);
      }
    }

    try {
      await UsersApi.updateUser(userId, {
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
      });
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error('[OnboardingService] updateUser falhou:', msg, e);
      throw new Error(`Usuário: ${msg}`);
    }

    return { etherfuseOrgId: org.etherfuseOrgId };
  },

  getPresignedUrl: async (userId: string, pubkey: string): Promise<PresignedUrlResult> => {
    if (IS_MOCK) {
      return {
        presignedUrl: 'https://mock.etherfuse.com/onboarding',
        bankAccountId: 'mock-bank-account-id',
      };
    }
    try {
      return await EtherfuseApi.getPresignedUrl(userId, pubkey);
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error('[OnboardingService] getPresignedUrl falhou:', msg, e);
      throw new Error(msg);
    }
  },
};
