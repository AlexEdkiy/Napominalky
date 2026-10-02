jest.mock('@/db/client', () => ({ db: {} }))
jest.mock('@/db/repositories/remindersRepo', () => {
  const real = jest.requireActual('@/db/repositories/remindersRepo')
  return { ...real, remindersRepo: { rescheduleAllPending: () => new real.RemindersRepository(mockDb).rescheduleAllPending() } }
})
jest.mock('@/db/repositories/shoppingListsRepo', () => {
  const real = jest.requireActual('@/db/repositories/shoppingListsRepo')
  return { ...real, shoppingListsRepo: { rescheduleAllPendingItems: () => new real.ShoppingListsRepository(mockDb).rescheduleAllPendingItems() } }
})
import * as Notifications from 'expo-notifications'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import type { Database } from '@/db/client'
import { reminders } from '@/db/schema'
import { useSettingsStore } from '@/stores/settingsStore'
import { reconcileNotificationSettings } from '../notificationsBootstrap'
import { scheduleReminder, scheduleItemReminder, configureNotificationHandler } from '../notifications'

let mockDb: Database
let f: ReturnType<typeof createSqliteTestDb>
const schedule = Notifications.scheduleNotificationAsync as jest.Mock
const permission = Notifications.getPermissionsAsync as jest.Mock
const request = Notifications.requestPermissionsAsync as jest.Mock
const future = () => new Date(Date.now() + 3600000).toISOString()
const reminder = () => ({ uuid: 'r', title: 'Call', remind_at: future() })
beforeEach(() => {
  jest.clearAllMocks(); f = createSqliteTestDb(); mockDb = f.db
  useSettingsStore.setState({ isHydrated: true, notificationsEnabled: true, notificationsError: null })
  permission.mockResolvedValue({ granted: true }); request.mockResolvedValue({ granted: true })
  schedule.mockReset().mockResolvedValue('notif-fixture')
})
afterEach(() => f.close())
it('OFF cancels scheduled alarms and blocks both reminder types without asking permission', async () => {
  useSettingsStore.setState({ notificationsEnabled: false })
  await reconcileNotificationSettings()
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1)
  expect(await scheduleReminder(reminder())).toBeNull()
  expect(await scheduleItemReminder({ uuid: 'i', listUuid: 'l', name: 'Buy', reminderAt: future() })).toBeNull()
  expect(schedule).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled()
})
it('ON restores future pending reminders from SQLite and stores the new notification ID', async () => {
  mockDb.insert(reminders).values({ uuid: 'r', title: 'Call', remindAt: future(), createdAt: future(), updatedAt: future(), notificationId: 'old-id' }).run()
  mockDb.insert(reminders).values({ uuid: 'done', title: 'Done', remindAt: future(), createdAt: future(), updatedAt: future(), isCompleted: 1 }).run()
  await reconcileNotificationSettings()
  expect(schedule).toHaveBeenCalledTimes(1)
  expect(mockDb.select().from(reminders).all().find((r) => r.uuid === 'r')?.notificationId).toBe('notif-fixture')
})
it('denied OS permission turns the switch off and gives a useful message', async () => {
  permission.mockResolvedValue({ granted: false }); request.mockResolvedValue({ granted: false })
  await reconcileNotificationSettings()
  expect(useSettingsStore.getState().notificationsEnabled).toBe(false)
  expect(useSettingsStore.getState().notificationsError).toContain('настройках телефона')
  expect(schedule).not.toHaveBeenCalled()
})
it('a permission response cannot schedule after OFF', async () => {
  permission.mockImplementationOnce(async () => { useSettingsStore.setState({ notificationsEnabled: false }); return { granted: true } })
  expect(await scheduleReminder(reminder())).toBeNull(); expect(schedule).not.toHaveBeenCalled()
})
it('cancels a native schedule that finishes after OFF then ON', async () => {
  schedule.mockImplementationOnce(async () => {
    useSettingsStore.setState({ notificationsEnabled: false }); useSettingsStore.setState({ notificationsEnabled: true })
    return 'late-alarm'
  })
  expect(await scheduleReminder(reminder())).toBeNull()
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('late-alarm')
})
it('foreground handler reads the current switch each time', async () => {
  configureNotificationHandler()
  const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0]
  useSettingsStore.setState({ notificationsEnabled: false })
  expect(await handler.handleNotification()).toMatchObject({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false })
  useSettingsStore.setState({ notificationsEnabled: true })
  expect(await handler.handleNotification()).toMatchObject({ shouldShowBanner: true, shouldPlaySound: true })
})
