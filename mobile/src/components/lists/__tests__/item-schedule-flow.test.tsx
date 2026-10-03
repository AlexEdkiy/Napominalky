/** Real list screen, hooks, repositories and SQLite; only native bridges and HTTP are mocked. */
jest.mock('@/db/client', () => {
  const fixture = jest.requireActual('@/db/testing/sqlite').createSqliteTestDb()
  return { db: fixture.db, testFixture: fixture }
})
jest.mock('@/api/syncApi', () => ({ syncApi: { pushChanges: jest.fn(), getChanges: jest.fn() } }))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ uuid: 'list' }),
}))
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }
})
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native')
  return ({ mode, onChange }: { mode: string; onChange: (event: unknown, date?: Date) => void }) =>
    <View testID={`picker-${mode}`} onChange={onChange} />
})

import React from 'react'
import { Platform } from 'react-native'
import { act, fireEvent, render, waitFor, cleanup } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ListDetailScreen from '../../../../app/lists/[uuid]'
import { db } from '@/db/client'
import type { createSqliteTestDb } from '@/db/testing/sqlite'
import { shoppingListsRepo } from '@/db/repositories/shoppingListsRepo'
import { shoppingListItems, shoppingLists, syncOutbox } from '@/db/schema'
import { syncApi } from '@/api/syncApi'
import { pushChanges } from '@/services/sync/pushChanges'
import { applyChanges } from '@/services/sync/applyChanges'
import type { SyncChangesResponse } from '@/types/sync'

const fixture = (jest.requireMock('@/db/client') as {
  testFixture: ReturnType<typeof createSqliteTestDb>
}).testFixture
const push = jest.mocked(syncApi.pushChanges)
const originalPlatform = Platform.OS
const originalReminder = new Date(2026, 9, 3, 20).toISOString()
const movedReminder = new Date(2026, 9, 13, 18).toISOString()
let queryClient: QueryClient

beforeEach(() => {
  Platform.OS = 'android'
  db.delete(syncOutbox).run()
  db.delete(shoppingListItems).run()
  db.delete(shoppingLists).run()
  db.insert(shoppingLists).values({ uuid: 'list', title: 'Schedule test', type: 'tasks', updatedAt: '2026-01-01T00:00:00Z' }).run()
  db.insert(shoppingListItems).values({ uuid: 'item', shoppingListUuid: 'list',
    updatedAt: '2026-01-01T00:00:00Z', name: 'Move reminder', deadline: '2026-10-03', reminderAt: originalReminder }).run()
  push.mockReset()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })
})
afterEach(() => {
  cleanup()
  queryClient?.clear()
  Platform.OS = originalPlatform
})
afterAll(() => fixture.close())

const openEditor = async (field: 'Дедлайн' | 'Напоминание') => {
  const view = await render(<QueryClientProvider client={queryClient}><ListDetailScreen /></QueryClientProvider>)
  await waitFor(() => expect(view.getByLabelText('Move reminder')).toBeTruthy())
  await act(async () => fireEvent.press(view.getByLabelText('Move reminder')))
  await act(async () => fireEvent.press(view.getByLabelText(new RegExp(`^${field}:`))))
  await act(async () => fireEvent.press(view.getByLabelText(field === 'Дедлайн' ? 'Выбрать дату' : 'Своё время')))
  return view
}
const selectDate = async (view: Awaited<ReturnType<typeof openEditor>>) => {
  await act(async () => fireEvent(view.getByTestId('picker-date'), 'change', { type: 'set' }, new Date(2026, 9, 13)))
  await act(async () => fireEvent(view.getByTestId('picker-time'), 'change', { type: 'set' }, new Date(2000, 0, 1, 18)))
  await waitFor(() => expect(db.select().from(syncOutbox).all()).toHaveLength(1))
}

it('moves the reminder to October 13 through the actual screen and sends reminder_at, leaving deadline unchanged', async () => {
  const view = await openEditor('Напоминание')
  await selectDate(view)
  expect((await shoppingListsRepo.listItems('list'))[0]).toMatchObject({
    deadline: '2026-10-03', reminderAt: movedReminder,
  })
  await waitFor(() => expect(view.getByLabelText(/^Напоминание:.*13/)).toBeTruthy())
  const row = db.select().from(syncOutbox).get()!
  expect(JSON.parse(row.payload)).toMatchObject({ deadline: '2026-10-03', reminder_at: movedReminder })
  push.mockResolvedValue({ applied: ['item'], conflicts: [], cursor: 10 })
  await pushChanges(db)
  expect(push.mock.calls[0]![2][0]).toMatchObject({
    entity_type: 'shopping_list_item', uuid: 'item', payload: { reminder_at: movedReminder, deadline: '2026-10-03' },
  })
  expect(db.select().from(syncOutbox).all()).toHaveLength(0)
})

it('editing the calendar date changes only deadline, preserving the separate reminder on October 3', async () => {
  const view = await openEditor('Дедлайн')
  await selectDate(view)
  expect((await shoppingListsRepo.listItems('list'))[0]).toMatchObject({
    deadline: '2026-10-13T18:00', reminderAt: originalReminder,
  })
  const row = db.select().from(syncOutbox).get()!
  expect(JSON.parse(row.payload)).toMatchObject({ deadline: '2026-10-13T18:00', reminder_at: originalReminder })
})

it('cancelling the reminder time picker does not silently save the date step', async () => {
  const view = await openEditor('Напоминание')
  await act(async () => fireEvent(view.getByTestId('picker-date'), 'change', { type: 'set' }, new Date(2026, 9, 13)))
  await act(async () => fireEvent(view.getByTestId('picker-time'), 'change', { type: 'dismissed' }))
  expect((await shoppingListsRepo.listItems('list'))[0]?.reminderAt).toBe(originalReminder)
  expect(db.select().from(syncOutbox).all()).toHaveLength(0)
})

it('keeps a queued reminder edit through an old pull and a failed push, then retries the same date', async () => {
  const view = await openEditor('Напоминание')
  await selectDate(view)
  const pending = db.select().from(syncOutbox).get()!
  const oldResponse: SyncChangesResponse = {
    data: { notes: [], shopping_lists: [], reminders: [], shopping_list_items: [{
      uuid: 'item', shopping_list_uuid: 'list', name: 'Move reminder', is_checked: false,
      category: 'other', quantity: 1, link: null, comment: null, tags: null, status: 'new', position: 0,
      created_at: '2026-01-01T00:00:00Z',
      deadline: '2026-10-03', reminder_at: originalReminder, updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
    }] }, meta: { cursor: 1, has_more: false },
  }
  await applyChanges(oldResponse, db)
  // A rejected HTTP request must leave the queued edit intact; skip retry delays with a non-retryable 422.
  push.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422 } })
  await expect(pushChanges(db)).rejects.toBeDefined()
  expect(db.select().from(syncOutbox).all()).toEqual([pending])
  expect((await shoppingListsRepo.listItems('list'))[0]?.reminderAt).toBe(movedReminder)
  push.mockResolvedValue({ applied: ['item'], conflicts: [], cursor: 11 })
  await pushChanges(db)
  expect(push.mock.calls[1]![2][0]?.payload.reminder_at).toBe(movedReminder)
  expect(db.select().from(syncOutbox).all()).toHaveLength(0)
})
