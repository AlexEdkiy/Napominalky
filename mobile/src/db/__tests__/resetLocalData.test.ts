import * as Notifications from 'expo-notifications'

// Мокаем клиент БД — реальный expo-sqlite не работает в jsdom.
jest.mock('@/db/client', () => ({ db: {} }))

// Схемы мокируем уникальными строками (string — примитив, hoisting-совместимо).
jest.mock('@/db/schema/notes', () => ({ notes: '__notes__' }))
jest.mock('@/db/schema/reminders', () => ({ reminders: '__reminders__' }))
jest.mock('@/db/schema/shoppingLists', () => ({
  shoppingLists: '__shoppingLists__',
}))
jest.mock('@/db/schema/shoppingListItems', () => ({
  shoppingListItems: '__shoppingListItems__',
}))
jest.mock('@/db/schema/shoppingListItemComments', () => ({ shoppingListItemComments: '__comments__' }))
jest.mock('@/db/schema/syncOutbox', () => ({ syncOutbox: '__syncOutbox__' }))
jest.mock('@/db/schema/syncMeta', () => ({ syncMeta: '__syncMeta__' }))

import { resetLocalData } from '../resetLocalData'

const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock

interface FakeDbState {
  deletedTables: unknown[]
}

const createFakeDb = (state: FakeDbState) => ({
  transaction: jest.fn((fn: (tx: unknown) => void) => {
    const tx = {
      delete: jest.fn((table: unknown) => {
        state.deletedTables.push(table)
        return { run: () => undefined }
      }),
    }
    fn(tx)
  }),
})

beforeEach(() => {
  cancelAll.mockClear()
})

describe('resetLocalData — удаление таблиц в транзакции', () => {
  it('удаляет все семь таблиц внутри транзакции', async () => {
    const state: FakeDbState = { deletedTables: [] }
    const db = createFakeDb(state)

    await resetLocalData(db as never)

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(state.deletedTables).toHaveLength(7)
  })

  it('удаляет syncOutbox, shoppingListItems, shoppingLists, reminders, notes, syncMeta', async () => {
    const state: FakeDbState = { deletedTables: [] }
    const db = createFakeDb(state)

    await resetLocalData(db as never)

    expect(state.deletedTables).toContain('__syncOutbox__')
    expect(state.deletedTables).toContain('__comments__')
    expect(state.deletedTables).toContain('__shoppingListItems__')
    expect(state.deletedTables).toContain('__shoppingLists__')
    expect(state.deletedTables).toContain('__reminders__')
    expect(state.deletedTables).toContain('__notes__')
    expect(state.deletedTables).toContain('__syncMeta__')
  })
})

describe('resetLocalData — отмена уведомлений', () => {
  it('вызывает cancelAllScheduledNotificationsAsync после очистки таблиц', async () => {
    const state: FakeDbState = { deletedTables: [] }
    const db = createFakeDb(state)

    await resetLocalData(db as never)

    expect(cancelAll).toHaveBeenCalledTimes(1)
  })

  it('сначала транзакция, потом отмена уведомлений (порядок)', async () => {
    const order: string[] = []
    const db = {
      transaction: jest.fn((fn: (tx: unknown) => void) => {
        const tx = { delete: jest.fn(() => ({ run: () => undefined })) }
        fn(tx)
        order.push('tx')
      }),
    }
    cancelAll.mockImplementation(async () => {
      order.push('cancelAll')
    })

    await resetLocalData(db as never)

    expect(order).toEqual(['tx', 'cancelAll'])
  })
})
