import { useQuery } from '@tanstack/react-query';
import { getDeposit, listDeposits } from '@/lib/api/deposits';
import { useAuthStore } from '@/lib/stores/auth.store';

export const depositKeys = {
  all: (userId: string) => ['deposits', userId] as const,
  detail: (id: string) => ['deposits', 'detail', id] as const,
};

export const useDeposits = () => {
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: depositKeys.all(userId ?? ''),
    queryFn: () => listDeposits(userId!),
    enabled: !!userId,
  });
};

export const useDeposit = (id: string) =>
  useQuery({
    queryKey: depositKeys.detail(id),
    queryFn: () => getDeposit(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'SUBMITTED' ? 5_000 : false,
  });
