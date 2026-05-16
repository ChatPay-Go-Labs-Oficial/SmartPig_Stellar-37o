import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersApi, type UpdateUserDto } from '@/lib/api/users.api';
import { useAuthStore } from '@/lib/stores/auth.store';

const userKeys = {
  detail: (userId: string) => ['user', userId] as const,
};

export const useUser = () => {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: userKeys.detail(userId ?? ''),
    queryFn: () => UsersApi.getUser(userId!),
    enabled: !!userId,
  });
};

export const useUpdateUser = () => {
  const userId = useAuthStore((s) => s.userId);
  const setUserName = useAuthStore((s) => s.setUserName);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserDto) => UsersApi.updateUser(userId!, data),
    onSuccess: (user) => {
      const firstName = user.name?.split(' ')[0] ?? '';
      if (firstName) setUserName(firstName);
      qc.invalidateQueries({ queryKey: userKeys.detail(userId ?? '') });
    },
  });
};
