import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  SyncChange,
  SyncChangesResponse,
  SyncPushResult,
} from '@/types/sync'

interface PushBody {
  device_uuid: string
  device_name?: string
  changes: SyncChange[]
}

export const syncApi = {
  /** Тянет изменения с сервера начиная с курсора since (LWW-pull). */
  getChanges: async (
    since: number,
    limit = 200,
  ): Promise<SyncChangesResponse> => {
    const { data } = await apiClient.get<SyncChangesResponse>('sync/changes', {
      params: { since, limit },
    })
    return data
  },

  /** Отправляет батч локальных изменений на сервер (push). */
  pushChanges: async (
    deviceUuid: string,
    deviceName: string | null,
    changes: SyncChange[],
  ): Promise<SyncPushResult> => {
    const body: PushBody = { device_uuid: deviceUuid, changes }
    if (deviceName !== null) body.device_name = deviceName

    const { data } = await apiClient.post<ApiResponse<SyncPushResult>>(
      'sync/push',
      body,
    )
    return data.data
  },
}
