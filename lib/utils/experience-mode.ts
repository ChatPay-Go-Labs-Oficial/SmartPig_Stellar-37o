import type { ExperienceMode } from '@/lib/api/users';
import type { AppMode } from '@/lib/stores/app-mode.store';

export const toExperienceMode = (mode: AppMode): ExperienceMode =>
  mode === 'pro' ? 'PRO' : 'LITE';

export const toAppMode = (mode: ExperienceMode): AppMode => (mode === 'PRO' ? 'pro' : 'lite');

export type ModeReconciliation =
  | { action: 'none' }
  | { action: 'push' }
  | { action: 'pull'; mode: AppMode; updatedAt: number };

/**
 * Quem vence quando o modo do aparelho e o do backend divergem: quem mudou
 * por último.
 *
 * - Backend sem data: a pessoa nunca escolheu lá (conta anterior à
 *   preferência, que o backend trata como PRO). Vale o aparelho.
 * - Mesmo modo: nada a fazer.
 * - Backend mais novo (troca feita em outro aparelho): o aparelho aplica.
 * - Aparelho mais novo (troca que não chegou ao backend): o aparelho envia.
 */
export function reconcileExperienceMode(
  device: { mode: AppMode; updatedAt: number },
  backend: { mode: ExperienceMode; updatedAt: string | null },
): ModeReconciliation {
  const backendUpdatedAt = backend.updatedAt ? Date.parse(backend.updatedAt) : Number.NaN;
  if (Number.isNaN(backendUpdatedAt)) return { action: 'push' };

  const backendMode = toAppMode(backend.mode);
  if (backendMode === device.mode) return { action: 'none' };

  return backendUpdatedAt > device.updatedAt
    ? { action: 'pull', mode: backendMode, updatedAt: backendUpdatedAt }
    : { action: 'push' };
}
