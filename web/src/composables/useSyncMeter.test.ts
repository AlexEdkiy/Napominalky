import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSyncMeterForTests, useSyncMeter } from './useSyncMeter'
import { syncApi } from '@/api/syncApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'

const emptyChangesResponse = {
  data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
  meta: { cursor: 1, has_more: false },
}

describe('useSyncMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSyncMeterForTests()
    resetLkFormsForTests()
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

  it('bumps the tasks/notes/reminders versions after a successful sync so open sections reload', async () => {
    vi.mocked(syncApi.fetchChanges).mockResolvedValue(emptyChangesResponse)
    const { runSync } = useSyncMeter()
    const { tasksVersion, notesVersion, remindersVersion } = useLkForms()

    await runSync()

    expect(tasksVersion.value).toBe(1)
    expect(notesVersion.value).toBe(1)
    expect(remindersVersion.value).toBe(1)

    await runSync()

    expect(tasksVersion.value).toBe(2)
    expect(notesVersion.value).toBe(2)
    expect(remindersVersion.value).toBe(2)
  })

  it('does not bump the section versions when the sync request fails', async () => {
    vi.mocked(syncApi.fetchChanges).mockRejectedValue(new Error('network down'))
    const { runSync } = useSyncMeter()
    const { tasksVersion, notesVersion, remindersVersion } = useLkForms()

    await runSync()

    expect(tasksVersion.value).toBe(0)
    expect(notesVersion.value).toBe(0)
    expect(remindersVersion.value).toBe(0)
  })

  it('bumps each section version only once for concurrent runSync calls (overlap guard)', async () => {
    let resolveChanges: (() => void) | undefined
    vi.mocked(syncApi.fetchChanges).mockReturnValue(
      new Promise((resolve) => {
        resolveChanges = () => resolve(emptyChangesResponse)
      }),
    )
    const { runSync } = useSyncMeter()
    const { tasksVersion, notesVersion, remindersVersion } = useLkForms()

    const first = runSync()
    const second = runSync()
    resolveChanges?.()
    await Promise.all([first, second])

    expect(tasksVersion.value).toBe(1)
    expect(notesVersion.value).toBe(1)
    expect(remindersVersion.value).toBe(1)
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
