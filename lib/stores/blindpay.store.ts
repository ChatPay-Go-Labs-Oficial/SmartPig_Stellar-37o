import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BlindPayOnboardingStep =
  | 'check-status'
  | 'tos'
  | 'kyc-form'
  | 'kyc-documents'
  | 'bank-account'
  | 'wallet'
  | 'pending';

export interface BlindPayKycDraft {
  firstName: string;
  lastName: string;
  email: string;
  taxId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  dateOfBirth: string;
  idDocCountry: string;
  idDocType: 'PASSPORT' | 'ID_CARD' | 'DRIVERS';
}

interface BlindPayState {
  receiverId: string | null;
  tosId: string | null;
  kycDraft: Partial<BlindPayKycDraft>;
  selfieFileUrl: string | null;
  idDocFrontUrl: string | null;
  idDocBackUrl: string | null;
  hasBankAccount: boolean;
  hasWallet: boolean;
  currentStep: BlindPayOnboardingStep;

  setTosId: (id: string) => void;
  setKycDraft: (patch: Partial<BlindPayKycDraft>) => void;
  setSelfieFileUrl: (url: string) => void;
  setIdDocFrontUrl: (url: string) => void;
  setIdDocBackUrl: (url: string) => void;
  setReceiver: (id: string) => void;
  setBankAccount: (has: boolean) => void;
  setWallet: (has: boolean) => void;
  setCurrentStep: (step: BlindPayOnboardingStep) => void;
  resetOnboarding: () => void;
}

const initialState = {
  receiverId: null,
  tosId: null,
  kycDraft: {},
  selfieFileUrl: null,
  idDocFrontUrl: null,
  idDocBackUrl: null,
  hasBankAccount: false,
  hasWallet: false,
  currentStep: 'check-status' as BlindPayOnboardingStep,
};

export const useBlindPayStore = create<BlindPayState>()(
  persist(
    (set) => ({
      ...initialState,

      setTosId: (id) => set({ tosId: id }),
      setKycDraft: (patch) =>
        set((state) => ({ kycDraft: { ...state.kycDraft, ...patch } })),
      setSelfieFileUrl: (url) => set({ selfieFileUrl: url }),
      setIdDocFrontUrl: (url) => set({ idDocFrontUrl: url }),
      setIdDocBackUrl: (url) => set({ idDocBackUrl: url }),
      setReceiver: (id) => set({ receiverId: id }),
      setBankAccount: (has) => set({ hasBankAccount: has }),
      setWallet: (has) => set({ hasWallet: has }),
      setCurrentStep: (step) => set({ currentStep: step }),
      resetOnboarding: () => set({ ...initialState }),
    }),
    {
      name: 'smartpig-blindpay',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
