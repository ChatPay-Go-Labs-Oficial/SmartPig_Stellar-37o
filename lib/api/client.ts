import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const contractId = useAuthStore.getState().contractId;
  if (contractId && config.params === undefined) {
    config.params = { userId: contractId };
  } else if (contractId) {
    config.params = { ...config.params, userId: contractId };
  }
  return config;
});
