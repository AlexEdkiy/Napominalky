import { db as defaultDb, type Database } from '@/db/client'
import type { SyncSession } from './syncSession'
import { syncApi } from '@/api/syncApi'
import { applyChanges } from './applyChanges'
import { withBackoff } from './backoff'
import { getLastPulledRevision } from './syncMeta'

/**
 * Тянет изменения с сервера страницами начиная с last_pulled_revision и
 * применяет их к локальной БД. Цикл идёт, пока meta.has_more === true.
 * applyChanges сам сдвигает курсор last_pulled_revision = meta.cursor.
 * Защита от зацикливания: если курсор не вырос — прерываем.
 */
export const pullChanges = async (db: Database = defaultDb, session?: SyncSession): Promise<void> => {
  session?.assertActive()
  let since = await getLastPulledRevision(db)

  for (;;) {
    const response = await withBackoff(() => {
      session?.assertActive()
      return session ? syncApi.getChanges(since, 200, session) : syncApi.getChanges(since)
    })
    session?.assertActive()
    if (session) await applyChanges(response, db, session.assertActive)
    else await applyChanges(response, db)

    const next = response.meta.cursor
    if (!response.meta.has_more || next <= since) return
    since = next
  }
}
