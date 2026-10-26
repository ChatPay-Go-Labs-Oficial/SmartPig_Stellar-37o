import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getToken } from './token';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// `/auth/wallet` saiu daqui de propósito. Ela aceita chamada sem token para
// registrar uma conta nova, mas quando o token existe ele tem que ir junto: é
// assim que o backend resolve a conta pelas carteiras Stellar que a Privy
// verificou, em vez de apenas pela que `selectPrimaryStellarAddress` escolheu.
// Com mais de uma carteira vinculada, só o caminho autenticado recupera a conta
// original. O `if (token)` abaixo mantém o bootstrap de conta nova funcionando.
const PUBLIC_ENDPOINTS = ['/app-config/version'];

apiClient.interceptors.request.use(async (config) => {
  const isPublic = PUBLIC_ENDPOINTS.some(e => (config.url ?? '').includes(e));

  if (!isPublic) {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const contractId = useAuthStore.getState().contractId;
  if (contractId && config.params === undefined) {
    config.params = { userId: contractId };
  } else if (contractId) {
    config.params = { ...config.params, userId: contractId };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A request can race Privy's session restoration during app startup. A 401
    // must not erase the persisted session; AppGate reconciles explicit logout
    // using Privy's restored user state.
    return Promise.reject(error);
  },
);
