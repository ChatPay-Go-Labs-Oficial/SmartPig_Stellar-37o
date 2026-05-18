import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface PersonalDataDto {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AddressDto {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface DocumentsDto {
  selfieUri: string | null;
  documentUri: string | null;
}

export interface PixDto {
  keyName: string;
  pixKey: string;
}

export type OnboardingStep = 'personal' | 'account';

interface OnboardingState {
  personalData: PersonalDataDto | null;
  etherfuseOrgId: string | null;
  bankAccountId: string | null;
  completedSteps: OnboardingStep[];

  savePersonalData: (data: PersonalDataDto) => void;
  saveEtherfuseData: (data: { etherfuseOrgId: string }) => void;
  saveBankAccountId: (bankAccountId: string) => void;
  reset: () => void;
}

const initialState = {
  personalData: null,
  etherfuseOrgId: null,
  bankAccountId: null,
  completedSteps: [] as OnboardingStep[],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      savePersonalData: (data) =>
        set((s) => ({
          personalData: data,
          completedSteps: s.completedSteps.includes('personal')
            ? s.completedSteps
            : [...s.completedSteps, 'personal'],
        })),

      saveEtherfuseData: ({ etherfuseOrgId }) => set({ etherfuseOrgId }),

      saveBankAccountId: (bankAccountId) =>
        set((s) => ({
          bankAccountId,
          completedSteps: s.completedSteps.includes('account')
            ? s.completedSteps
            : [...s.completedSteps, 'account'],
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'smartpig-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
