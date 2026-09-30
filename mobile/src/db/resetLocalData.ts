import * as Notifications from 'expo-notifications'

import type { Database } from './client'
import { notes } from './schema/notes'
import { reminders } from './schema/reminders'
import { shoppingListItemComments } from './schema/shoppingListItemComments'
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
  // The Expo Drizzle transaction callback is synchronous.
  db.transaction((tx) => {
    tx.delete(syncOutbox).run()
    tx.delete(shoppingListItemComments).run()
    tx.delete(shoppingListItems).run()
    tx.delete(shoppingLists).run()
    tx.delete(reminders).run()
    tx.delete(notes).run()
    tx.delete(syncMeta).run()
  })

  await Notifications.cancelAllScheduledNotificationsAsync()
}
