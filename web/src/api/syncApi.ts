import { apiClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type { SyncChangesParams, SyncChangesResponse, SyncConflict } from '@/types/sync'

function buildChangesParams(params: SyncChangesParams): Record<string, number> {
  const query: Record<string, number> = { since: params.since }
  if (params.limit !== undefined) {
    query.limit = params.limit
  }
  return query
}

export const syncApi = {
  /**
   * Пагинированный список спорных записей (GET /sync/conflicts).
   * Эндпоинта разрешения конфликтов на бэке нет — конфликты только для просмотра.
   */
  fetchConflicts: async (page?: number): Promise<PaginatedResponse<SyncConflict>> => {
    const { data } = await apiClient.get<PaginatedResponse<SyncConflict>>('/sync/conflicts', {
      params: page !== undefined ? { page } : undefined,
    })
    return data
  },

  /**
   * Delta-pull изменений (GET /sync/changes). Используется для статуса
   * синхронизации — `meta.cursor` отражает последнюю серверную ревизию.
   */
  fetchChanges: async (since: number, limit?: number): Promise<SyncChangesResponse> => {
    const params: SyncChangesParams = limit !== undefined ? { since, limit } : { since }
    const { data } = await apiClient.get<SyncChangesResponse>('/sync/changes', {
      params: buildChangesParams(params),
    })
    return data
  },
}
