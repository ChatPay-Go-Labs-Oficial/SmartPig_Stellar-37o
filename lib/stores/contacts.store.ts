import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Contatos salvos para o envio por @ (Figma 19a), por conta.
 *
 * Só o @ e o nome exibido: o endereço nunca fica guardado. Antes de cada envio
 * o @ é resolvido de novo no backend e a conta conferida na rede (plano, 12.2).
 * Sai com a conta (useSignOut) e na exclusão (wipeLocalState).
 */
export interface SavedContact {
  username: string;
  /** Nome do cadastro quando verificado; senão "Usuário PigFi". */
  displayName: string;
  verified: boolean;
}

interface ContactsState {
  byAccount: Record<string, SavedContact[]>;
  save: (accountId: string, contact: SavedContact) => void;
  clear: () => void;
}

export const useContactsStore = create<ContactsState>()(
  persist(
    (set) => ({
      byAccount: {},
      save: (accountId, contact) =>
        set((state) => {
          const current = (state.byAccount[accountId] ?? []).filter(
            (c) => c.username !== contact.username,
          );
          return { byAccount: { ...state.byAccount, [accountId]: [contact, ...current] } };
        }),
      clear: () => set({ byAccount: {} }),
    }),
    {
      name: 'smartpig-contacts',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
