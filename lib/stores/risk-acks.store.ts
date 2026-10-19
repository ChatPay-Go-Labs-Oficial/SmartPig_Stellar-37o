import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Último texto de riscos aceito neste aparelho, por conta e vault.
 *
 * O backend guarda o aceite de verdade; ele só não diz qual versão a pessoa
 * aceitou antes da atual. Com este registro, quando sai uma versão nova a tela
 * avisa que o texto mudou e marca os itens novos ou alterados (Figma 13e).
 * Sem ele (outro aparelho, app reinstalado), a tela aparece como na primeira
 * leitura.
 */
interface RiskAck {
  version: number;
  /** Códigos mostrados no aceite. */
  codes: string[];
  /** Impressão dos dados de cada cartão aceito, para achar o que mudou. */
  fingerprints?: Record<string, string>;
}

interface RiskAcksState {
  acks: Record<string, RiskAck>;
  remember: (accountId: string, vaultId: string, ack: RiskAck) => void;
}

export const riskAckKey = (accountId: string, vaultId: string) => `${accountId}:${vaultId}`;

export const useRiskAcksStore = create<RiskAcksState>()(
  persist(
    (set) => ({
      acks: {},
      remember: (accountId, vaultId, ack) =>
        set((state) => ({ acks: { ...state.acks, [riskAckKey(accountId, vaultId)]: ack } })),
    }),
    {
      name: 'smartpig-risk-acks',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
