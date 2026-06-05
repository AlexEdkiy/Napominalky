import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSync } from './useSync'
import { syncApi } from '@/api/syncApi'
import type { SyncConflict } from '@/types/sync'

const conflict: SyncConflict = {
  uuid: 'c-1',
  entity_type: 'reminder',
  entity_uuid: 'r-1',
  server_payload: { title: 'Сервер' },
  client_payload: { title: 'Клиент' },
  resolved_at: null,
  created_at: '2026-06-01T00:00:00Z',
}

describe('useSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates conflicts from the paginated response', async () => {
    vi.mocked(syncApi.fetchConflicts).mockResolvedValue({
      data: [conflict],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { conflicts, isLoading, unresolvedCount, load } = useSync()
    await load(2)

    expect(syncApi.fetchConflicts).toHaveBeenCalledWith(2)
    expect(conflicts.value).toHaveLength(1)
    expect(conflicts.value[0]?.uuid).toBe('c-1')
    expect(unresolvedCount.value).toBe(1)
    expect(isLoading.value).toBe(false)
  })

  it('unresolvedCount ignores resolved conflicts', async () => {
    vi.mocked(syncApi.fetchConflicts).mockResolvedValue({
      data: [conflict, { ...conflict, uuid: 'c-2', resolved_at: '2026-06-02T00:00:00Z' }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { unresolvedCount, load } = useSync()
    await load()

    expect(unresolvedCount.value).toBe(1)
  })

  it('loadStatus stores the delta-pull cursor', async () => {
    vi.mocked(syncApi.fetchChanges).mockResolvedValue({
      data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
      meta: { cursor: 42, has_more: false },
    })

    const { status, loadStatus } = useSync()
    await loadStatus()

    expect(syncApi.fetchChanges).toHaveBeenCalledWith(0)
    expect(status.value?.cursor).toBe(42)
  })

  it('load records an error message on failure', async () => {
    vi.mocked(syncApi.fetchConflicts).mockRejectedValue(new Error('network down'))

    const { error, isLoading, load } = useSync()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
  })
})

vi.mock('@/api/syncApi', () => ({
  syncApi: {
    fetchConflicts: vi.fn(),
    fetchChanges: vi.fn(),
  },
}))
