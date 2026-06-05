import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/stores/authStore'
import { useNetStatus } from '@/services/netStatus'
import { syncEngine, type SyncResult } from '@/services/sync/syncEngine'

interface UseSyncEngineResult {
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  syncNow: () => Promise<void>
}

/**
 * Связывает движок синхронизации с UI: следит за состоянием, авто-запускает
 * sync при монтировании (full pull при логине) и при переходе offline→online.
 */
export const useSyncEngine = (): UseSyncEngineResult => {
  const token = useAuthStore((state) => state.token)
  const syncEnabled = useAuthStore((state) => state.syncEnabled)
  const { isOnline } = useNetStatus()

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wasOnline = useRef(isOnline)

  const apply = useCallback((result: SyncResult): void => {
    setError(result.ok ? null : (result.error ?? 'sync_failed'))
    if (result.lastSyncedAt !== undefined) setLastSyncedAt(result.lastSyncedAt)
  }, [])

  const run = useCallback(
    async (force: boolean): Promise<void> => {
      setIsSyncing(true)
      try {
        apply(await syncEngine.sync({ force }))
      } finally {
        setIsSyncing(false)
      }
    },
    [apply],
  )

  const syncNow = useCallback((): Promise<void> => run(true), [run])

  useEffect(() => syncEngine.onChange(apply), [apply])

  useEffect(() => {
    if (token !== null && syncEnabled) void run(false)
  }, [token, syncEnabled, run])

  useEffect(() => {
    const cameOnline = isOnline && !wasOnline.current
    wasOnline.current = isOnline
    if (cameOnline && token !== null && syncEnabled) void run(false)
  }, [isOnline, token, syncEnabled, run])

  return { isSyncing, lastSyncedAt, error, syncNow }
}
