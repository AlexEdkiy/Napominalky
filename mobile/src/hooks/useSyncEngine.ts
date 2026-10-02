import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useNetStatus } from '@/services/netStatus'
import { syncEngine, type SyncResult } from '@/services/sync/syncEngine'
import { QueryKeys } from '@/constants/QueryKeys'

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
  const serverEnabled = useAuthStore((state) => state.syncEnabled)
  const localEnabled = useSettingsStore((state) => state.syncEnabled)
  const settingsReady = useSettingsStore((state) => state.isHydrated)
  const syncEnabled = serverEnabled && localEnabled && settingsReady
  const { isOnline } = useNetStatus()

  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wasOnline = useRef(isOnline)

  const apply = useCallback(
    (result: SyncResult): void => {
      setError(result.ok || ['sync_disabled', 'sync_cancelled', 'unauthenticated'].includes(result.error ?? '')
        ? null : (result.error ?? 'sync_failed'))
      if (result.lastSyncedAt !== undefined) setLastSyncedAt(result.lastSyncedAt)
      // pull пишет напрямую в SQLite мимо репозиториев/react-query. Без инвалидации
      // экраны показывают устаревший кэш (например, удалённые на другом устройстве
      // записи остаются видимыми). После успешного синка обновляем доменные запросы.
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: QueryKeys.notes.all })
        void queryClient.invalidateQueries({ queryKey: QueryKeys.reminders.all })
        void queryClient.invalidateQueries({ queryKey: QueryKeys.lists.all })
        void queryClient.invalidateQueries({ queryKey: QueryKeys.calendar.all })
      }
    },
    [queryClient],
  )

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
