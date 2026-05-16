import { apiClient } from './client';

export interface UserResponse {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name: string;
  email: string;
}

export const UsersApi = {
  getUser: (userId: string): Promise<UserResponse> =>
    apiClient.get<UserResponse>(`/users/${userId}`).then((r) => r.data),

  updateUser: (userId: string, data: UpdateUserDto): Promise<UserResponse> =>
    apiClient
      .patch<UserResponse>(`/users/${userId}`, data)
      .then((r) => r.data),
};
