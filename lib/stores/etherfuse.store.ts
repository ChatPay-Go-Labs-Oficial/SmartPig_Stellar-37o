import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EtherfuseKycStatus } from '@/lib/api/etherfuse';

export type OnboardingStep =
  | 'check-status'
  | 'organization'
  | 'kyc-form'
  | 'kyc-documents'
  | 'agreements'
  | 'presigned-bank'
  | 'pending';

interface EtherfuseState {
  customerId: string | null;
  etherfuseOrgId: string | null;
  kycStatus: EtherfuseKycStatus | null;
  currentStep: OnboardingStep;
  hasBankAccount: boolean;
  bankAccountCompliant: boolean;
  presignedUrl: string | null;

  setCustomer: (id: string, orgId: string) => void;
  setKycStatus: (status: EtherfuseKycStatus) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  setBankAccount: (has: boolean, compliant: boolean) => void;
  setPresignedUrl: (url: string | null) => void;
  resetOnboarding: () => void;
}

export const useEtherfuseStore = create<EtherfuseState>()(
  persist(
    (set) => ({
      customerId: null,
      etherfuseOrgId: null,
      kycStatus: null,
      currentStep: 'check-status',
      hasBankAccount: false,
      bankAccountCompliant: false,
      presignedUrl: null,

      setCustomer: (id, orgId) => set({ customerId: id, etherfuseOrgId: orgId }),
      setKycStatus: (status) => set({ kycStatus: status }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setBankAccount: (has, compliant) =>
        set({ hasBankAccount: has, bankAccountCompliant: compliant }),
      setPresignedUrl: (url) => set({ presignedUrl: url }),
      resetOnboarding: () =>
        set({
          customerId: null,
          etherfuseOrgId: null,
          kycStatus: null,
          currentStep: 'check-status',
          hasBankAccount: false,
          bankAccountCompliant: false,
          presignedUrl: null,
        }),
    }),
    {
      name: 'smartpig-etherfuse',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
