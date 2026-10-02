jest.mock('@/db/client', () => ({ db: {}, DATABASE_NAME: 'napominalki.db' }))
jest.mock('@/providers/DbProvider', () => ({ useDb: jest.fn() }))
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn(() => ({ remove: jest.fn() })) }))
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: (fn: () => void) => { require('react').useEffect(fn, [fn]) },
  Redirect: () => null,
}))

import React from 'react'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { addDatabaseChangeListener } from 'expo-sqlite'
import { router, useLocalSearchParams } from 'expo-router'
import { eq } from 'drizzle-orm'
import { useDb } from '@/providers/DbProvider'
import { useAuthStore } from '@/stores/authStore'
import { createSqliteTestDb } from '@/db/testing/sqlite'
import { notes, shoppingLists, shoppingListItems, shoppingListItemComments, reminders, syncMeta } from '@/db/schema'
import { LAST_USER_ID } from '@/services/sync/syncMeta'
import ThemeProvider from '@/theme/ThemeProvider'
import SearchScreen from '../search'

let fixture: ReturnType<typeof createSqliteTestDb>
let client: QueryClient
const updatedAt = '2026-10-02T00:00:00Z'
const mount = () => render(<QueryClientProvider client={client}><ThemeProvider>
  <SearchScreen />
</ThemeProvider></QueryClientProvider>)
const changed = () => {
  const listener = (addDatabaseChangeListener as jest.Mock).mock.calls.at(-1)?.[0]
  listener({ databaseName: 'main', databaseFilePath: '/data/napominalki.db', tableName: 'notes', rowId: 1 })
}

beforeEach(() => {
  jest.clearAllMocks()
  fixture = createSqliteTestDb()
  ;(useDb as jest.Mock).mockReturnValue(fixture.db)
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({})
  useAuthStore.setState({ token: null, user: null, guestMode: true })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  onlineManager.setOnline(false)
})
afterEach(async () => { await cleanup(); client.clear(); fixture.close(); onlineManager.setOnline(true) })

it('searches real local SQLite offline, filters, opens a note and preserves query after editing', async () => {
  fixture.db.insert(notes).values({ uuid: 'note', title: 'Список', body: 'МОЛОКО', updatedAt }).run()
  const screen = await mount()
  expect(screen.getByText('Введите название или текст для поиска.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Поисковый запрос'), ' молоко ')
  await fireEvent.press(screen.getByLabelText('Найти'))
  await waitFor(() => expect(screen.getByLabelText('Открыть: Список')).toBeTruthy())
  await fireEvent.press(screen.getByLabelText('Открыть: Список'))
  expect(router.push).toHaveBeenCalledWith({ pathname: '/notes/[uuid]', params: { uuid: 'note' } })
  expect(screen.getByLabelText('Поисковый запрос').props.value).toBe(' молоко ')
  fixture.db.update(notes).set({ title: 'Исправлено' }).where(eq(notes.uuid, 'note')).run()
  await act(changed)
  await waitFor(() => expect(screen.getByLabelText('Открыть: Исправлено')).toBeTruthy())
  await fireEvent.press(screen.getByLabelText('Искать: Напоминания'))
  await waitFor(() => expect(screen.queryByLabelText('Открыть: Исправлено')).toBeNull())
  expect(screen.getByText('Ничего не найдено. Измените запрос или выберите «Все».')).toBeTruthy()
  await fireEvent.press(screen.getByLabelText('Назад'))
  expect(router.back).toHaveBeenCalled()
})

it('loads the incoming query, pages all results and resets pagination on a new query', async () => {
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({ q: 'Молоко' })
  for (let i = 0; i < 25; i++) fixture.db.insert(notes)
    .values({ uuid: String(i).padStart(2, '0'), title: `Молоко ${i}`, updatedAt }).run()
  const screen = await mount()
  await waitFor(() => expect(screen.getByText('1 / 2')).toBeTruthy())
  await fireEvent.press(screen.getByLabelText('Следующая страница'))
  await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())
  expect(screen.getByLabelText('Открыть: Молоко 24')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Поисковый запрос'), 'Молоко 0')
  await fireEvent(screen.getByLabelText('Поисковый запрос'), 'submitEditing')
  await waitFor(() => expect(screen.getByText('Найдено: 1 · На устройстве')).toBeTruthy())
  expect(screen.queryByLabelText('Следующая страница')).toBeNull()
})

it('opens lists, a matching item comment and reminder by UUID', async () => {
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({ q: 'молоко' })
  fixture.db.insert(shoppingLists).values({ uuid: 'list', title: 'Молоко купить', updatedAt }).run()
  fixture.db.insert(shoppingListItems).values({ uuid: 'item', shoppingListUuid: 'list', name: 'Важный пункт', updatedAt }).run()
  fixture.db.insert(shoppingListItemComments).values({ uuid: 'comment', shoppingListItemUuid: 'item',
    body: 'Взять молоко', authorName: 'Тест', updatedAt }).run()
  fixture.db.insert(reminders).values({ uuid: 'reminder', title: 'Напоминание', notes: 'молоко',
    remindAt: updatedAt, updatedAt }).run()
  const screen = await mount()
  await waitFor(() => expect(screen.getByLabelText('Открыть: Важный пункт')).toBeTruthy())
  for (const title of ['Молоко купить', 'Важный пункт', 'Напоминание']) await fireEvent.press(screen.getByLabelText(`Открыть: ${title}`))
  expect(router.push).toHaveBeenNthCalledWith(1, { pathname: '/lists/[uuid]', params: { uuid: 'list' } })
  expect(router.push).toHaveBeenNthCalledWith(2, { pathname: '/lists/[uuid]',
    params: { uuid: 'list', itemUuid: 'item', showComments: '1' } })
  expect(router.push).toHaveBeenNthCalledWith(3, { pathname: '/reminders/[uuid]', params: { uuid: 'reminder' } })
})

it('clears results on logout and cannot show previous profile data to another user or guest', async () => {
  ;(useLocalSearchParams as jest.Mock).mockReturnValue({ q: 'молоко' })
  useAuthStore.setState({ token: 'a', guestMode: false, user: { uuid: 'alice', name: 'Alice',
    email: 'a@example.test', sync_enabled: true, is_admin: false, created_at: updatedAt } })
  fixture.db.insert(syncMeta).values({ key: LAST_USER_ID, value: 'alice' }).run()
  fixture.db.insert(notes).values({ uuid: 'private', title: 'Молоко Alice', updatedAt }).run()
  const screen = await mount()
  await waitFor(() => expect(screen.getByLabelText('Открыть: Молоко Alice')).toBeTruthy())
  await act(async () => { useAuthStore.setState({ token: null, user: null }) })
  expect(screen.queryByLabelText('Открыть: Молоко Alice')).toBeNull()
  await act(async () => { useAuthStore.setState({ guestMode: true }) })
  await waitFor(() => expect(screen.getByText('Найдено: 0 · На устройстве')).toBeTruthy())
  expect(screen.queryByLabelText('Открыть: Молоко Alice')).toBeNull()
  expect((addDatabaseChangeListener as jest.Mock).mock.results[0]?.value.remove).toHaveBeenCalled()
})

it('handles a SQLite error and retry, and does not search a one-character query', async () => {
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Поисковый запрос'), 'м')
  await fireEvent.press(screen.getByLabelText('Найти'))
  expect(screen.getByText('Введите от 2 до 200 символов.')).toBeTruthy()
  const read = jest.spyOn(fixture.db, 'select').mockImplementation(() => { throw new Error('DB unavailable') })
  await fireEvent.changeText(screen.getByLabelText('Поисковый запрос'), 'молоко')
  await fireEvent.press(screen.getByLabelText('Найти'))
  await waitFor(() => expect(screen.getByText('Повторить поиск')).toBeTruthy())
  read.mockRestore()
  fixture.db.insert(notes).values({ uuid: 'restored', title: 'Молоко доступно', updatedAt }).run()
  await fireEvent.press(screen.getByText('Повторить поиск'))
  await waitFor(() => expect(screen.getByLabelText('Открыть: Молоко доступно')).toBeTruthy())
})
