import * as Notifications from 'expo-notifications'

import type { Database } from './client'
import { notes } from './schema/notes'
import { reminders } from './schema/reminders'
import { shoppingListItems } from './schema/shoppingListItems'
import { shoppingLists } from './schema/shoppingLists'
import { syncMeta } from './schema/syncMeta'
import { syncOutbox } from './schema/syncOutbox'

/**
 * Удаляет все локальные данные текущего пользователя из SQLite и отменяет
 * запланированные локальные уведомления. Вызывается при явном логауте ПОСЛЕ
 * флаша sync. Sync-курсор (sync_meta) сбрасывается, чтобы следующий вход
 * тянул данные нового пользователя с нуля.
 *
 * Гарантия: все DELETE выполняются в одной транзакции. Уведомления отменяются
 * вне транзакции — после очистки таблиц.
 */
export const resetLocalData = async (db: Database): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.delete(syncOutbox)
    await tx.delete(shoppingListItems)
    await tx.delete(shoppingLists)
    await tx.delete(reminders)
    await tx.delete(notes)
    await tx.delete(syncMeta)
  })

  await Notifications.cancelAllScheduledNotificationsAsync()
}
