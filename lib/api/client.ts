import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getToken } from './token';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

const PUBLIC_ENDPOINTS = ['/auth/wallet'];

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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);
