import { apiClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type { SearchResult, SearchType } from '@/types/search'

export const searchApi = {
  async search(params: { q: string; type: SearchType; page: number }, signal: AbortSignal): Promise<PaginatedResponse<SearchResult>> {
    const { data } = await apiClient.get<PaginatedResponse<SearchResult>>('/search', {
      params: { ...params, per_page: 20 }, signal,
    })
    return data
  },
}
