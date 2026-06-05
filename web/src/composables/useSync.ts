import { computed, ref } from 'vue'

import { syncApi } from '@/api/syncApi'
import type { SyncChangesMeta, SyncConflict } from '@/types/sync'

/**
 * Инкапсулирует состояние раздела синхронизации в ЛК: список спорных записей
 * (только просмотр — resolve-эндпоинта на бэке нет) и статус delta-pull.
 */
export function useSync() {
  const conflicts = ref<SyncConflict[]>([])
  const status = ref<SyncChangesMeta | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const unresolvedCount = computed(
    () => conflicts.value.filter((conflict) => conflict.resolved_at === null).length,
  )

  function resolveError(e: unknown): void {
    error.value = e instanceof Error ? e.message : 'Не удалось выполнить операцию'
  }

  async function load(page?: number): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await syncApi.fetchConflicts(page)
      conflicts.value = response.data
    } catch (e) {
      resolveError(e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Подтягивает статус синхронизации (последний серверный курсор) через
   * delta-pull от начала истории. Ошибку не выбрасывает — статус опционален.
   */
  async function loadStatus(): Promise<void> {
    try {
      const response = await syncApi.fetchChanges(0)
      status.value = response.meta
    } catch (e) {
      resolveError(e)
    }
  }

  return { conflicts, status, isLoading, error, unresolvedCount, load, loadStatus }
}
