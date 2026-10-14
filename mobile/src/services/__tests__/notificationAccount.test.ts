jest.mock('@/db/client', () => ({ get db() { return mockDb } }))
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

import * as Notifications from 'expo-notifications'
import { QueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { setActiveDatabaseScope, registerDatabaseScope } from '@/db/databaseScope'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import type { Database } from '@/db/client'
import { RemindersRepository } from '@/db/repositories/remindersRepo'
import { reminders } from '@/db/schema'
import { handleNotificationResponse } from '@/hooks/useNotifications'
import { scheduleReminder, notificationBelongsToSession } from '../notifications'

let mockDb: Database
const future = '2030-10-14T12:00:00Z'
beforeEach(() => {
  jest.clearAllMocks()
  setActiveDatabaseScope('account-alice.db')
  useAuthStore.setState({ token: 'alice-token', accountId: 'alice', guestMode: false, isHydrated: true, isSwitching: false })
  useSettingsStore.setState({ notificationsEnabled: true, isHydrated: true })
})

it('rejects legacy/mismatched payloads, logged-out sessions and a switch in progress', () => {
  expect(notificationBelongsToSession({ scope: 'account-alice.db' })).toBe(true)
  expect(notificationBelongsToSession({ scope: 'guest.db' })).toBe(false)
  expect(notificationBelongsToSession({ type: 'reminder', uuid: 'private' })).toBe(false)
  useAuthStore.setState({ token: null })
  expect(notificationBelongsToSession({ scope: 'account-alice.db' })).toBe(false)
  useAuthStore.setState({ guestMode: true, isSwitching: true })
  expect(notificationBelongsToSession({ scope: 'account-alice.db' })).toBe(false)
})

it('cancels native scheduling that finishes after switching to guest', async () => {
  ;(Notifications.scheduleNotificationAsync as jest.Mock).mockImplementationOnce(async () => {
    useAuthStore.setState({ token: null, guestMode: true })
    setActiveDatabaseScope('guest.db')
    return 'late-private-alarm'
  })
  expect(await scheduleReminder({ uuid: 'private', title: 'Secret', remind_at: future, scope: 'account-alice.db' })).toBeNull()
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('late-private-alarm')
})

it('keeps an async local mutation in its original file, without scheduling it for the new guest', async () => {
  const alice = createSqliteTestDb()
  const guest = createSqliteTestDb()
  mockDb = alice.db
  registerDatabaseScope(alice.db, 'account-alice.db')
  registerDatabaseScope(guest.db, 'guest.db')
  try {
    const creating = new RemindersRepository(alice.db).createReminder({ title: 'Private reminder', remindAt: future })
    mockDb = guest.db
    setActiveDatabaseScope('guest.db')
    useAuthStore.setState({ token: null, guestMode: true })
    await creating
    expect(alice.db.select().from(reminders).all()).toHaveLength(1)
    expect(guest.db.select().from(reminders).all()).toEqual([])
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  } finally { alice.close(); guest.close() }
})

it('ignores another owner notification instead of opening or completing a current item', async () => {
  const client = new QueryClient()
  const response = { actionIdentifier: 'reminder-complete', notification: { request: {
    identifier: 'private', content: { data: { scope: 'account-bob.db', type: 'reminder', uuid: 'private' } },
  } } } as unknown as Notifications.NotificationResponse
  await handleNotificationResponse(response, client)
  expect(router.push).not.toHaveBeenCalled()
  expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled()
  client.clear()
})
