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
    let org;

    try {
      org = await EtherfuseApi.createOrganization({
        userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    } catch (e) {
      // Se o registro já existe, buscamos o existente e seguimos normalmente
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
    try {
      return await EtherfuseApi.getPresignedUrl(userId, pubkey);
    } catch (e) {
      const msg = extractErrorMessage(e);
      console.error('[OnboardingService] getPresignedUrl falhou:', msg, e);
      throw new Error(msg);
    }
  },
};
