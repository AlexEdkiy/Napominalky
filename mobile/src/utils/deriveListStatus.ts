import type { TaskStatus } from '@/constants/taskStatus'

/**
 * Деривация статуса задачи (списка type='tasks') из статусов её пунктов —
 * единая логика с backend/web. Применяется только когда статус задачи НЕ
 * закреплён вручную (status_is_manual=false):
 *  1. хоть один пункт in_progress → in_progress;
 *  2. иначе все пункты done → done;
 *  3. иначе все пункты postponed → postponed;
 *  4. иначе (в т.ч. пунктов нет) → new.
 */
export const deriveListStatus = (itemStatuses: readonly TaskStatus[]): TaskStatus => {
  if (itemStatuses.length === 0) return 'new'
  if (itemStatuses.some((s) => s === 'in_progress')) return 'in_progress'
  if (itemStatuses.every((s) => s === 'done')) return 'done'
  if (itemStatuses.every((s) => s === 'postponed')) return 'postponed'
  return 'new'
}
