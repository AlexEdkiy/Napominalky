import { createSyncSession, isSyncEnabled, type SyncSession } from './syncSession'
import { getIsOnline } from '@/services/netStatus'
import { pushChanges } from './pushChanges'
import { pullChanges } from './pullChanges'
import { setLastSyncedAt } from './syncMeta'

/** Опции запуска синхронизации. */
export interface SyncOptions {
  /** Ручной запуск; настройки и отсутствие сети по-прежнему учитываются. */
  force?: boolean
}

/** Итог одной синхронизации. */
export interface SyncResult {
  ok: boolean
  pushed?: number
  error?: string
  lastSyncedAt?: string
}

type SyncListener = (result: SyncResult) => void

const listeners = new Set<SyncListener>()

/** Текущий промис синхронизации (анти-параллель): null, если не идёт. */
let inFlight: Promise<SyncResult> | null = null
let activeSession: SyncSession | undefined

/** Подписка на завершение синхронизации. Возвращает функцию отписки. */
const onChange = (listener: SyncListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const emit = (result: SyncResult): void => {
  listeners.forEach((listener) => listener(result))
}

/** Выполняет push → pull и фиксирует метку времени. Ошибки — наружу. */
const runSync = async (session: SyncSession): Promise<SyncResult> => {
  const pushResult = await pushChanges(undefined, session)
  session.assertActive()
  await pullChanges(undefined, session)
  session.assertActive()

  const lastSyncedAt = new Date().toISOString()
  await setLastSyncedAt(lastSyncedAt)

  return { ok: true, pushed: pushResult?.applied.length ?? 0, lastSyncedAt }
}

const toError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const sync = (_opts: SyncOptions = {}): Promise<SyncResult> => {
  if (inFlight !== null) {
    // A new ON/account must wait for cancellation, then get its own session.
    return activeSession?.signal.aborted && isSyncEnabled()
      ? inFlight.then(() => sync(_opts)) : inFlight
  }

  inFlight = (async (): Promise<SyncResult> => {
    let session: SyncSession | undefined
    try {
      session = createSyncSession()
      activeSession = session
      if (!(await getIsOnline())) return { ok: false, error: 'offline' }
      session.assertActive()
      return await runSync(session)
    } catch (error) {
      return { ok: false, error: session?.signal.aborted ? 'sync_cancelled' : toError(error) }
    } finally {
      session?.dispose()
      activeSession = undefined
    }
  })().then((result) => {
    inFlight = null
    emit(result)
    return result
  })
  return inFlight
}

/** Единый движок синхронизации приложения. */
export const syncEngine = {
  sync, onChange,
  stop: async (): Promise<void> => { activeSession?.cancel(); await inFlight },
}
