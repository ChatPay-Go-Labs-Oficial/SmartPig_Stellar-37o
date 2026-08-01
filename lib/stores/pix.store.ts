import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const STORE_NAME = 'stellarpig-pix';

// Chave Pix costuma SER o CPF, e-mail ou telefone da pessoa — dado pessoal
// (ver docs/security.md, "Treat bank accounts ... as personal data"). Guardado
// no SecureStore em vez de AsyncStorage, que não é criptografado.
const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

// Residual de uma versão anterior que guardava a chave em AsyncStorage sem
// criptografia — limpeza única, best-effort, pra não deixar cópia em texto
// puro esquecida no aparelho depois da migração pro SecureStore.
AsyncStorage.removeItem(STORE_NAME).catch(() => {});

interface PixState {
  pixKey: string;
  setPixKey: (key: string) => void;
  clearPixKey: () => void;
}

export const usePixStore = create<PixState>()(
  persist(
    (set) => ({
      pixKey: '',
      setPixKey: (pixKey) => set({ pixKey }),
      clearPixKey: () => set({ pixKey: '' }),
    }),
    {
      name: STORE_NAME,
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
