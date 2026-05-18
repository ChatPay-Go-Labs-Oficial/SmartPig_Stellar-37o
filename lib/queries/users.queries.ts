import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/api/users';

export const userKeys = {
  detail: (id: string) => ['user', id] as const,
};

export const useUser = (userId: string | null) =>
  useQuery({
    queryKey: userKeys.detail(userId ?? ''),
    queryFn: () => getUser(userId!),
    enabled: !!userId,
  });
