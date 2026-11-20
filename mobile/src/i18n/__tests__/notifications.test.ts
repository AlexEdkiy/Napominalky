import * as Notifications from 'expo-notifications'
import { useLanguageStore } from '..'
import { ensureReminderNotificationCategory, REMINDER_ACTION_COMPLETE, REMINDER_ACTION_SNOOZE_10M } from '@/services/notifications'

it('refreshes notification action labels on a language change without changing action identifiers', async () => {
  useLanguageStore.setState({ language: 'ru' })
  await ensureReminderNotificationCategory()
  useLanguageStore.setState({ language: 'en' })
  await ensureReminderNotificationCategory()
  const calls = jest.mocked(Notifications.setNotificationCategoryAsync).mock.calls
  expect(calls[calls.length - 1]?.[1]).toEqual([
    { identifier: REMINDER_ACTION_COMPLETE, buttonTitle: 'Done', options: { opensAppToForeground: false } },
    { identifier: REMINDER_ACTION_SNOOZE_10M, buttonTitle: 'Snooze for 10 min', options: { opensAppToForeground: false } },
  ])
  const count = calls.length
  await ensureReminderNotificationCategory()
  expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(count)
  useLanguageStore.setState({ language: 'ru' })
  await ensureReminderNotificationCategory()
  expect(calls[calls.length - 1]?.[1][0]?.buttonTitle).toBe('Выполнено')
})
