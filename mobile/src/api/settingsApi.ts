import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/auth'

export const settingsApi = {
  updateSyncEnabled: async (enabled: boolean): Promise<User> => {
    const { data } = await apiClient.patch<ApiResponse<User>>(
      'settings/sync',
      { sync_enabled: enabled },
    )
    return data.data
  },
}
