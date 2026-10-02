import { useSettingsStore } from '@/stores/settingsStore'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { SchedulableTriggerInputTypes } from 'expo-notifications'

/**
 * Минимальный набор полей напоминания, нужный для планирования локального
 * уведомления. snoozed_until имеет приоритет над remind_at (если задан).
 */
export interface SchedulableReminder {
  uuid: string
  title: string
  notes?: string | null
  remind_at: string
  snoozed_until?: string | null
}

/** Полезная нагрузка уведомления для deep link (MOB-12). */
interface ReminderNotificationData {
  type: 'reminder'
  uuid: string
  [key: string]: unknown
}

/** Полезная нагрузка уведомления пункта списка покупок для deep link. */
interface ItemNotificationData {
  type: 'list_item'
  itemUuid: string
  listUuid: string
  [key: string]: unknown
}

/** Минимальный набор полей пункта списка для планирования уведомления. */
export interface SchedulableListItem {
  uuid: string
  listUuid: string
  name: string
  comment?: string | null
  reminderAt: string
}

// ВАЖНО (Android 12+/API 31+): expo-notifications планирует ТОЧНЫЙ будильник
// (setExactAndAllowWhileIdle) только если alarmManager.canScheduleExactAlarms()
// == true, иначе откатывается на НЕТОЧНЫЙ (setAndAllowWhileIdle) — ОС батчит
// такие алармы и откладывает доставку до пробуждения/открытия приложения
// («уведомление приходит только когда откроешь приложение»). Точный режим
// требует объявленных в app.json android.permissions разрешений
// SCHEDULE_EXACT_ALARM (API 31–32) и USE_EXACT_ALARM (API 33+). НЕ удалять их.
// См. expo-notifications ExpoSchedulingDelegate.kt.

let preferenceVersion = 0
useSettingsStore.subscribe((state, previous) => {
  if (state.notificationsEnabled !== previous.notificationsEnabled) preferenceVersion += 1
})
const notificationsAllowed = (): boolean => useSettingsStore.getState().notificationsEnabled

let handlerConfigured = false
let androidChannelConfigured = false
let reminderCategoryConfigured = false

/** Id Android-канала по умолчанию, используемого всеми локальными уведомлениями. */
export const DEFAULT_ANDROID_CHANNEL_ID = 'default'

/** Категория уведомления напоминания — даёт управляющие кнопки-действия. */
export const REMINDER_CATEGORY_ID = 'reminder-actions'
/** actionIdentifier кнопки «Выполнено» в уведомлении напоминания. */
export const REMINDER_ACTION_COMPLETE = 'reminder-complete'
/** actionIdentifier кнопки «Отложить на 10 мин» в уведомлении напоминания. */
export const REMINDER_ACTION_SNOOZE_10M = 'reminder-snooze-10m'

/**
 * Регистрирует категорию уведомлений напоминаний с управляющими кнопками
 * «Выполнено» и «Отложить на 10 мин». Обе кнопки НЕ открывают приложение
 * (opensAppToForeground: false) — действие обрабатывается фоновым
 * response-листенером (useNotifications), а при убитом приложении — через
 * getLastNotificationResponseAsync на следующем старте. Идемпотентна.
 */
export const ensureReminderNotificationCategory = async (): Promise<void> => {
  if (reminderCategoryConfigured) return
  reminderCategoryConfigured = true
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    {
      identifier: REMINDER_ACTION_COMPLETE,
      buttonTitle: 'Выполнено',
      options: { opensAppToForeground: false },
    },
    {
      identifier: REMINDER_ACTION_SNOOZE_10M,
      buttonTitle: 'Отложить на 10 мин',
      options: { opensAppToForeground: false },
    },
  ])
}

/**
 * Настраивает поведение уведомлений в foreground (баннер + список + sound).
 * Идемпотентно: повторные вызовы игнорируются. Вызывается один раз при старте
 * приложения. SDK 53+: shouldShowAlert заменён на shouldShowBanner + shouldShowList.
 */
export const configureNotificationHandler = (): void => {
  if (handlerConfigured) return
  handlerConfigured = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: notificationsAllowed(),
      shouldShowList: notificationsAllowed(),
      shouldPlaySound: notificationsAllowed(),
      shouldSetBadge: false,
    }),
  })
}

/**
 * Создаёт Android-канал уведомлений по умолчанию (importance HIGH). На
 * Android 8+ (API 26+) без явного канала система доставляет локальные
 * уведомления ненадёжно, когда приложение не на переднем плане — это была
 * основная причина «уведомление приходит только при открытом приложении».
 * На iOS каналов нет — вызов no-op. Идемпотентна: повторные вызовы не
 * пересоздают канал (после создания Android позволяет менять только
 * имя/описание — пересоздание не требуется).
 */
export const ensureAndroidNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return
  if (androidChannelConfigured) return
  androidChannelConfigured = true
  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: 'Напоминания',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    enableLights: true,
    showBadge: false,
    bypassDnd: false,
  })
}

/**
 * true, если разрешение на уведомления уже выдано. НЕ показывает системный
 * диалог (в отличие от requestPermissionsAsync) — безопасно вызывать перед
 * каждым планированием.
 */
const hasNotificationPermission = async (): Promise<boolean> => {
  const status = await Notifications.getPermissionsAsync()
  return status.granted
}

/** Дата срабатывания: snoozed_until приоритетнее remind_at. */
const triggerDateIso = (reminder: SchedulableReminder): string =>
  reminder.snoozed_until ?? reminder.remind_at

/**
 * Планирует локальное уведомление на дату срабатывания. Прошедшие даты
 * (<= now) не ставятся в очередь — возвращает null. Перед планированием
 * гарантирует Android-канал и мягко проверяет разрешение (если разрешения
 * нет — не планирует, возвращает null, без исключения). Иначе возвращает
 * identifier запланированного уведомления.
 */
export const scheduleReminder = async (
  reminder: SchedulableReminder,
): Promise<string | null> => {
  if (!notificationsAllowed()) return null
  const version = preferenceVersion
  const dateIso = triggerDateIso(reminder)
  const date = new Date(dateIso)
  if (date.getTime() <= Date.now()) return null

  await ensureAndroidNotificationChannel()
  await ensureReminderNotificationCategory()
  if (!(await hasNotificationPermission()) || !notificationsAllowed() || version !== preferenceVersion) return null

  const data: ReminderNotificationData = { type: 'reminder', uuid: reminder.uuid }
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.notes ?? '',
      data,
      categoryIdentifier: REMINDER_CATEGORY_ID,
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date, channelId: DEFAULT_ANDROID_CHANNEL_ID },
  })
  if (!notificationsAllowed() || version !== preferenceVersion) {
    await cancelReminder(identifier)
    return null
  }
  return identifier
}

/**
 * Отменяет запланированное уведомление по id. Безопасно к id, который уже
 * сработал/отсутствует (ошибка проглатывается).
 */
export const cancelReminder = async (
  notificationId: string | null,
): Promise<void> => {
  if (notificationId === null) return
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch {
    // id мог уже сработать или быть отменённым — это не ошибка.
  }
}

/**
 * Перепланирует уведомление: отменяет старое (если было) и планирует новое.
 * Возвращает identifier нового уведомления или null (прошедшая дата).
 */
export const rescheduleReminder = async (
  reminder: SchedulableReminder,
  oldNotificationId: string | null,
): Promise<string | null> => {
  await cancelReminder(oldNotificationId)
  return scheduleReminder(reminder)
}

/**
 * Планирует локальное DATE-уведомление для пункта списка покупок.
 * title = item.name, body = item.comment ?? '', data.type = 'list_item'.
 * Прошедшая дата (<= now) → null (не ставится в очередь). Перед планированием
 * гарантирует Android-канал и мягко проверяет разрешение (нет прав → null).
 */
export const scheduleItemReminder = async (
  item: SchedulableListItem,
): Promise<string | null> => {
  if (!notificationsAllowed()) return null
  const version = preferenceVersion
  const date = new Date(item.reminderAt)
  if (date.getTime() <= Date.now()) return null

  await ensureAndroidNotificationChannel()
  if (!(await hasNotificationPermission()) || !notificationsAllowed() || version !== preferenceVersion) return null

  const data: ItemNotificationData = {
    type: 'list_item',
    itemUuid: item.uuid,
    listUuid: item.listUuid,
  }
  const identifier = await Notifications.scheduleNotificationAsync({
    content: { title: item.name, body: item.comment ?? '', data },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date, channelId: DEFAULT_ANDROID_CHANNEL_ID },
  })
  if (!notificationsAllowed() || version !== preferenceVersion) {
    await cancelReminder(identifier)
    return null
  }
  return identifier
}

/**
 * Перепланирует уведомление пункта: отменяет старое и планирует новое.
 * Возвращает identifier нового уведомления или null (прошедшая дата).
 */
export const rescheduleItemReminder = async (
  item: SchedulableListItem,
  oldNotificationId: string | null,
): Promise<string | null> => {
  await cancelReminder(oldNotificationId)
  return scheduleItemReminder(item)
}
