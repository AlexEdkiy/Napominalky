import * as Notifications from 'expo-notifications'
import { useSettingsStore } from '@/stores/settingsStore'
import { ensureAndroidNotificationChannel } from './notifications'
import { remindersRepo } from '@/db/repositories/remindersRepo'
import { shoppingListsRepo } from '@/db/repositories/shoppingListsRepo'

/**
 * Переустанавливает локальные уведомления для всех ещё не наступивших
 * напоминаний (основных и пунктов списков покупок) при старте приложения
 * (FR-27/28). Системные alarm на Android могут быть потеряны после
 * перезагрузки устройства или переустановки приложения — без этого прохода
 * такие напоминания никогда не сработают. Best-effort: ошибка одной из
 * репозиторных операций не должна ронять запуск приложения.
 */
export const rescheduleAllNotificationsOnStart = async (): Promise<void> => {
  await Promise.allSettled([
    remindersRepo.rescheduleAllPending(),
    shoppingListsRepo.rescheduleAllPendingItems(),
  ])
}

// Serialize rebuilding/cancellation so a rapid on/off sequence cannot leave alarms behind.
let pendingReconcile = Promise.resolve()
export const reconcileNotificationSettings = (): Promise<void> => {
  const run = async (): Promise<void> => {
    const settings = useSettingsStore.getState()
    if (!settings.isHydrated) return
    await Notifications.cancelAllScheduledNotificationsAsync()
    if (!useSettingsStore.getState().notificationsEnabled) return
    await ensureAndroidNotificationChannel()
    let permission = await Notifications.getPermissionsAsync()
    if (!useSettingsStore.getState().notificationsEnabled) return
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync()
    if (!useSettingsStore.getState().notificationsEnabled) return
    if (!permission.granted) {
      await useSettingsStore.getState().setNotificationsEnabled(false)
      useSettingsStore.setState({ notificationsError: 'Разрешите уведомления в настройках телефона.' })
      return
    }
    await rescheduleAllNotificationsOnStart()
  }
  const next = pendingReconcile.then(run)
  pendingReconcile = next.catch(() => {})
  return next
}
