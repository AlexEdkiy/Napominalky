import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSyncMeter } from './useSyncMeter'
import { syncApi } from '@/api/syncApi'

const emptyChangesResponse = {
  data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
  meta: { cursor: 1, has_more: false },
}

describe('useSyncMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets isSyncing while the request is in flight and records lastSyncedAt on success', async () => {
    let resolveChanges: (() => void) | undefined
    vi.mocked(syncApi.fetchChanges).mockReturnValue(
      new Promise((resolve) => {
        resolveChanges = () => resolve(emptyChangesResponse)
      }),
    )
    const { isSyncing, lastSyncedAt, runSync } = useSyncMeter()

    const syncPromise = runSync()
    expect(isSyncing.value).toBe(true)

    resolveChanges?.()
    await syncPromise

    expect(isSyncing.value).toBe(false)
    expect(lastSyncedAt.value).toBeInstanceOf(Date)
    expect(syncApi.fetchChanges).toHaveBeenCalledWith(0)
  })

  it('clears isSyncing and records an error without throwing when the request fails', async () => {
    vi.mocked(syncApi.fetchChanges).mockRejectedValue(new Error('network down'))
    const { isSyncing, error, runSync } = useSyncMeter()

    await expect(runSync()).resolves.toBeUndefined()

    expect(isSyncing.value).toBe(false)
    expect(error.value).toBe('network down')
  })

  it('ignores a concurrent runSync call while one is already in flight', async () => {
    let resolveChanges: (() => void) | undefined
    vi.mocked(syncApi.fetchChanges).mockReturnValue(
      new Promise((resolve) => {
        resolveChanges = () => resolve(emptyChangesResponse)
      }),
    )
    const { runSync } = useSyncMeter()

    const first = runSync()
    const second = runSync()

    resolveChanges?.()
    await Promise.all([first, second])

    expect(syncApi.fetchChanges).toHaveBeenCalledTimes(1)
  })

  it('shares state across every consumer (module-level singleton)', async () => {
    vi.mocked(syncApi.fetchChanges).mockResolvedValue(emptyChangesResponse)
    const a = useSyncMeter()
    const b = useSyncMeter()

    await a.runSync()

    expect(b.isSyncing.value).toBe(false)
    expect(b.lastSyncedAt.value).toBe(a.lastSyncedAt.value)
  })
})

vi.mock('@/api/syncApi', () => ({
  syncApi: {
    fetchChanges: vi.fn(),
    fetchConflicts: vi.fn(),
  },
}))
