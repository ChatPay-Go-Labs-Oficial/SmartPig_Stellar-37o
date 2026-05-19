import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isOnboarded: boolean;
  createdAt: string;
}

export const getUser = async (id: string): Promise<UserProfile> => {
  const { data } = await apiClient.get(`/users/${id}`);
  return data;
};
