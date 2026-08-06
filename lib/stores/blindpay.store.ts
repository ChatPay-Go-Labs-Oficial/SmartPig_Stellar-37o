import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// CPF, data de nascimento, endereço e as URLs dos documentos de KYC (selfie,
// frente/verso do documento) são dados pessoais sensíveis (ver docs/security.md
// — "KYC documents" e "presigned URLs that are still valid" estão nas duas
// categorias listadas como Sensitive). Ficam à parte do resto da store, em
// chaves próprias do SecureStore, em vez de dentro do blob que o zustand
// persiste no AsyncStorage. `expo-secure-store` tem limite de ~2048 bytes por
// chave no Android — por isso usamos uma chave por campo/grupo pequeno em vez
// de uma chave só maior, pra nenhuma delas correr risco de estourar o limite.
const KYC_DRAFT_SECURE_KEY = 'smartpig-blindpay-kyc-draft';
const KYC_SELFIE_URL_SECURE_KEY = 'smartpig-blindpay-kyc-selfie-url';
const KYC_DOC_FRONT_URL_SECURE_KEY = 'smartpig-blindpay-kyc-doc-front-url';
const KYC_DOC_BACK_URL_SECURE_KEY = 'smartpig-blindpay-kyc-doc-back-url';
const KYC_DOC_FRONT_KIND_SECURE_KEY = 'smartpig-blindpay-kyc-doc-front-kind';
const KYC_DOC_BACK_KIND_SECURE_KEY = 'smartpig-blindpay-kyc-doc-back-kind';

function deleteSecureKycFields() {
  SecureStore.deleteItemAsync(KYC_DRAFT_SECURE_KEY).catch(() => {});
  SecureStore.deleteItemAsync(KYC_SELFIE_URL_SECURE_KEY).catch(() => {});
  SecureStore.deleteItemAsync(KYC_DOC_FRONT_URL_SECURE_KEY).catch(() => {});
  SecureStore.deleteItemAsync(KYC_DOC_BACK_URL_SECURE_KEY).catch(() => {});
  SecureStore.deleteItemAsync(KYC_DOC_FRONT_KIND_SECURE_KEY).catch(() => {});
  SecureStore.deleteItemAsync(KYC_DOC_BACK_KIND_SECURE_KEY).catch(() => {});
}

export type IdDocKind = 'image' | 'pdf';

export type BlindPayOnboardingStep =
  | 'check-status'
  | 'tos'
  | 'kyc-form'
  | 'kyc-document'
  | 'kyc-address'
  | 'kyc-documents-intro'
  | 'kyc-selfie'
  | 'kyc-doc-front'
  | 'kyc-doc-back'
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
  idDocFrontKind: IdDocKind | null;
  idDocBackKind: IdDocKind | null;
  /**
   * Arquivo PDF local (ex.: Carteira de Identidade Digital / CNH Digital do
   * Gov.br) escolhido na etapa da frente — a BlindPay exige o mesmo PDF nas
   * duas etapas, então isso permite reaproveitar sem reabrir o seletor.
   * Vive só em memória: não é persistido nem no SecureStore nem no AsyncStorage.
   */
  pendingPdfDoc: { uri: string; fileName: string } | null;
  hasBankAccount: boolean;
  hasWallet: boolean;
  currentStep: BlindPayOnboardingStep;

  setTosId: (id: string) => void;
  /**
   * Prepara um reenvio de KYC: descarta o `tosId` mantendo o rascunho.
   *
   * Cada `tos_id` da BlindPay só pode ser vinculado a um customer, e o reenvio
   * cria um customer novo — o aceite anterior está queimado. O rascunho (CPF,
   * endereço, data de nascimento) fica, para o usuário não redigitar tudo.
   */
  startKycRetry: () => void;
  setKycDraft: (patch: Partial<BlindPayKycDraft>) => void;
  /** Repõe kycDraft e as URLs dos documentos a partir do SecureStore — chamar uma vez no início do onboarding. */
  hydrateSecureFields: () => Promise<void>;
  /** Limpa o rascunho de KYC e as URLs dos documentos (memória + SecureStore) sem mexer no resto do estado. */
  clearKycDraft: () => void;
  setSelfieFileUrl: (url: string) => void;
  setIdDocFrontUrl: (url: string, kind: IdDocKind) => void;
  setIdDocBackUrl: (url: string, kind: IdDocKind) => void;
  setPendingPdfDoc: (doc: { uri: string; fileName: string } | null) => void;
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
  idDocFrontKind: null,
  idDocBackKind: null,
  pendingPdfDoc: null,
  hasBankAccount: false,
  hasWallet: false,
  currentStep: 'check-status' as BlindPayOnboardingStep,
};

export const useBlindPayStore = create<BlindPayState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTosId: (id) => set({ tosId: id }),
      startKycRetry: () => set({ tosId: null, currentStep: 'tos' }),
      setKycDraft: (patch) => {
        const kycDraft = { ...get().kycDraft, ...patch };
        set({ kycDraft });
        // Best-effort: se o SecureStore falhar (ex.: aparelho sem suporte),
        // o draft ainda funciona normalmente em memória pro resto da sessão.
        SecureStore.setItemAsync(KYC_DRAFT_SECURE_KEY, JSON.stringify(kycDraft)).catch(() => {});
      },
      hydrateSecureFields: async () => {
        try {
          const raw = await SecureStore.getItemAsync(KYC_DRAFT_SECURE_KEY);
          if (raw) set({ kycDraft: JSON.parse(raw) });
        } catch {
          // Sem draft salvo ou JSON inválido — segue com o draft vazio atual.
        }
        const [selfieFileUrl, idDocFrontUrl, idDocBackUrl, idDocFrontKind, idDocBackKind] = await Promise.all([
          SecureStore.getItemAsync(KYC_SELFIE_URL_SECURE_KEY).catch(() => null),
          SecureStore.getItemAsync(KYC_DOC_FRONT_URL_SECURE_KEY).catch(() => null),
          SecureStore.getItemAsync(KYC_DOC_BACK_URL_SECURE_KEY).catch(() => null),
          SecureStore.getItemAsync(KYC_DOC_FRONT_KIND_SECURE_KEY).catch(() => null),
          SecureStore.getItemAsync(KYC_DOC_BACK_KIND_SECURE_KEY).catch(() => null),
        ]);
        set({
          selfieFileUrl,
          idDocFrontUrl,
          idDocBackUrl,
          idDocFrontKind: idDocFrontKind as IdDocKind | null,
          idDocBackKind: idDocBackKind as IdDocKind | null,
        });
      },
      clearKycDraft: () => {
        set({
          kycDraft: {},
          selfieFileUrl: null,
          idDocFrontUrl: null,
          idDocBackUrl: null,
          idDocFrontKind: null,
          idDocBackKind: null,
          pendingPdfDoc: null,
        });
        deleteSecureKycFields();
      },
      setSelfieFileUrl: (url) => {
        set({ selfieFileUrl: url });
        SecureStore.setItemAsync(KYC_SELFIE_URL_SECURE_KEY, url).catch(() => {});
      },
      setIdDocFrontUrl: (url, kind) => {
        set({ idDocFrontUrl: url, idDocFrontKind: kind });
        SecureStore.setItemAsync(KYC_DOC_FRONT_URL_SECURE_KEY, url).catch(() => {});
        SecureStore.setItemAsync(KYC_DOC_FRONT_KIND_SECURE_KEY, kind).catch(() => {});
      },
      setIdDocBackUrl: (url, kind) => {
        set({ idDocBackUrl: url, idDocBackKind: kind });
        SecureStore.setItemAsync(KYC_DOC_BACK_URL_SECURE_KEY, url).catch(() => {});
        SecureStore.setItemAsync(KYC_DOC_BACK_KIND_SECURE_KEY, kind).catch(() => {});
      },
      setPendingPdfDoc: (doc) => set({ pendingPdfDoc: doc }),
      setReceiver: (id) => set({ receiverId: id }),
      setBankAccount: (has) => set({ hasBankAccount: has }),
      setWallet: (has) => set({ hasWallet: has }),
      setCurrentStep: (step) => set({ currentStep: step }),
      resetOnboarding: () => {
        set({ ...initialState });
        deleteSecureKycFields();
      },
    }),
    {
      name: 'smartpig-blindpay',
      storage: createJSONStorage(() => AsyncStorage),
      // kycDraft e as URLs/kind dos documentos nunca vão pro AsyncStorage —
      // vivem só no SecureStore (ver hydrateSecureFields/setKycDraft/
      // setSelfieFileUrl etc. acima), pra não duplicar dado sensível em dois
      // lugares. pendingPdfDoc é um uri de cache local: não persiste em lugar
      // nenhum, só reaproveitado durante a mesma sessão do app.
      partialize: (state) => {
        const {
          kycDraft: _kycDraft,
          selfieFileUrl: _selfieFileUrl,
          idDocFrontUrl: _idDocFrontUrl,
          idDocBackUrl: _idDocBackUrl,
          idDocFrontKind: _idDocFrontKind,
          idDocBackKind: _idDocBackKind,
          pendingPdfDoc: _pendingPdfDoc,
          ...rest
        } = state;
        return rest;
      },
    },
  ),
);
