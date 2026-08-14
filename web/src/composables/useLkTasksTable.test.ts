import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isLkDateToday,
  lkTableDateLabel,
  lkTableTimeLabel,
  nearestIso,
  useLkTasksTable,
} from './useLkTasksTable'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: 4,
    checked_items_count: 2,
    is_completed: false,
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    uuid: 'i-1',
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    status: 'new',
    status_label: 'Новая',
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    comments_count: 0,
    comments: [],
    tags: [],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = (data: ShoppingList[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

// «Сейчас» фиксировано, чтобы тесты не зависели от реальной сегодняшней даты.
const NOW = new Date('2026-03-10T12:00:00')

describe('nearestIso', () => {
  it('picks the earliest upcoming value (today counts as upcoming)', () => {
    expect(nearestIso(['2026-03-20', '2026-03-10', '2026-03-15'], NOW)).toBe('2026-03-10')
  })

  it('returns null when everything is overdue (no fallback to past values)', () => {
    expect(nearestIso(['2026-03-01', '2026-03-05'], NOW)).toBeNull()
  })

  it('skips past values and still picks the earliest upcoming one', () => {
    expect(nearestIso(['2026-03-01', '2026-03-15', '2026-03-12'], NOW)).toBe('2026-03-12')
  })

  it('ignores null and invalid values; returns null when nothing is left', () => {
    expect(nearestIso([null, 'мусор'], NOW)).toBeNull()
    expect(nearestIso([null, '2026-03-12'], NOW)).toBe('2026-03-12')
  })
})

describe('lkTableDateLabel / lkTableTimeLabel', () => {
  it('formats today, tomorrow and other dates in Russian', () => {
    expect(lkTableDateLabel('2026-03-10', NOW)).toBe('Сегодня')
    expect(lkTableDateLabel('2026-03-11', NOW)).toBe('Завтра')
    expect(lkTableDateLabel('2026-03-15', NOW)).toBe('15 марта')
    expect(lkTableDateLabel(null, NOW)).toBe('')
  })

  it('formats the reminder time as HH:MM', () => {
    expect(lkTableTimeLabel('2026-03-10T09:05:00')).toBe('09:05')
    expect(lkTableTimeLabel(null)).toBe('')
  })

  it('isLkDateToday matches exactly the dates labelled «Сегодня» (shared filter rule)', () => {
    expect(isLkDateToday('2026-03-10', NOW)).toBe(true)
    expect(isLkDateToday('2026-03-10T23:30:00', NOW)).toBe(true)
    expect(isLkDateToday('2026-03-11', NOW)).toBe(false)
    expect(isLkDateToday('2026-03-09', NOW)).toBe(false)
    expect(isLkDateToday(null, NOW)).toBe(false)
    expect(isLkDateToday('мусор', NOW)).toBe(false)
  })
})

describe('useLkTasksTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters the visible lists by tab using the is_completed flag', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', is_completed: false }),
        makeList({ uuid: 'l-2', is_completed: true }),
      ]),
    )

    const table = useLkTasksTable()
    await table.reload()

    expect(table.visibleLists.value).toHaveLength(2)

    table.tab.value = 'active'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1'])

    table.tab.value = 'completed'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-2'])
  })

  it('filters by the type quick filter and combines it with the status tab (AND)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', title: 'Продукты', type: 'goods', is_completed: false }),
        makeList({ uuid: 'l-2', title: 'Ремонт', type: 'tasks', is_completed: false }),
        makeList({ uuid: 'l-3', title: 'Аптека', type: 'goods', is_completed: true }),
      ]),
    )

    const table = useLkTasksTable()
    await table.reload()

    expect(table.typeFilter.value).toBe('all')
    expect(table.visibleLists.value).toHaveLength(3)

    table.typeFilter.value = 'goods'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-3'])

    table.typeFilter.value = 'tasks'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-2'])

    // AND-комбинация со статус-вкладкой: активные покупки / выполненные покупки.
    table.typeFilter.value = 'goods'
    table.tab.value = 'active'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1'])

    table.tab.value = 'completed'
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-3'])

    // Сортировка применяется поверх отфильтрованного набора.
    table.tab.value = 'all'
    table.toggleSort('title')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-3', 'l-1'])
  })

  it('sorts by title and reverses on a second toggle', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList({ uuid: 'l-1', title: 'Продукты' }), makeList({ uuid: 'l-2', title: 'Аптека' })]),
    )

    const table = useLkTasksTable()
    await table.reload()

    table.toggleSort('title')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-1'])

    table.toggleSort('title')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-2'])
  })

  it('sorts by the first tag keeping untagged lists at the end in both directions', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', tags: [] }),
        makeList({ uuid: 'l-2', tags: ['Покупки'] }),
        makeList({ uuid: 'l-3', tags: ['Дом'] }),
      ]),
    )

    const table = useLkTasksTable()
    await table.reload()

    table.toggleSort('tags')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-3', 'l-2', 'l-1'])

    table.toggleSort('tags')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-3', 'l-1'])
  })

  it('derives the nearest item deadline/reminder per list and sorts by them (empty at the end)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1' }),
        makeList({ uuid: 'l-2' }),
        makeList({ uuid: 'l-3' }),
      ]),
    )
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid) => {
      if (uuid === 'l-1') {
        return [
          makeItem({ uuid: 'i-1', deadline: '2026-03-20' }),
          makeItem({ uuid: 'i-2', deadline: '2026-03-12', reminder_at: '2026-03-12T09:00:00' }),
        ]
      }
      if (uuid === 'l-2') {
        return [makeItem({ uuid: 'i-3', deadline: '2026-03-11' })]
      }
      return []
    })

    const table = useLkTasksTable()
    await table.reload()
    await vi.waitFor(() => expect(table.derivedFor('l-1')).toBeDefined())

    expect(table.derivedFor('l-1')).toEqual({
      deadline: '2026-03-12',
      reminderAt: '2026-03-12T09:00:00',
      commentsCount: 0,
      comments: [],
    })
    expect(table.derivedFor('l-2')).toEqual({
      deadline: '2026-03-11',
      reminderAt: null,
      commentsCount: 0,
      comments: [],
    })
    expect(table.derivedFor('l-3')).toEqual({
      deadline: null,
      reminderAt: null,
      commentsCount: 0,
      comments: [],
    })

    table.toggleSort('date')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-1', 'l-3'])

    // Реверс: пустые значения остаются в конце.
    table.toggleSort('date')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-2', 'l-3'])

    table.toggleSort('reminder')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-2', 'l-3'])
  })

  it('derives null (columns show «—») when all item dates are in the past', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([makeList({ uuid: 'l-1' })]))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', deadline: '2026-03-02', reminder_at: '2026-03-03T09:00:00' }),
    ])

    const table = useLkTasksTable()
    await table.reload()
    await vi.waitFor(() => expect(table.derivedFor('l-1')).toBeDefined())

    expect(table.derivedFor('l-1')).toEqual({
      deadline: null,
      reminderAt: null,
      commentsCount: 0,
      comments: [],
    })
    expect(lkTableDateLabel(table.derivedFor('l-1')?.deadline ?? null, NOW)).toBe('')
    expect(lkTableTimeLabel(table.derivedFor('l-1')?.reminderAt ?? null)).toBe('')
  })

  it('derives the total comments counter and a flat item-grouped thread for the 💬 popover', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([makeList({ uuid: 'l-1' })]))
    // Комментарии приходят embed'ом в ТОМ ЖЕ fetchItems, что и даты, —
    // дополнительных запросов агрегат не делает.
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({
        uuid: 'i-1',
        name: 'Плитка',
        comments_count: 2,
        comments: [
          { uuid: 'c-1', author_name: 'Анна', body: 'Взять образец', created_at: '2026-03-01T10:00:00Z' },
          { uuid: 'c-2', author_name: 'Пётр', body: 'Уже взял', created_at: '2026-03-02T11:00:00Z' },
        ],
      }),
      makeItem({
        uuid: 'i-2',
        name: 'Затирка',
        comments_count: 1,
        comments: [
          { uuid: 'c-3', author_name: 'Анна', body: 'Белую', created_at: '2026-03-03T12:00:00Z' },
        ],
      }),
    ])

    const table = useLkTasksTable()
    await table.reload()
    await vi.waitFor(() => expect(table.derivedFor('l-1')).toBeDefined())

    expect(shoppingListsApi.fetchItems).toHaveBeenCalledTimes(1)
    const derived = table.derivedFor('l-1')
    expect(derived?.commentsCount).toBe(3)
    expect(derived?.comments).toEqual([
      { uuid: 'c-1', itemName: 'Плитка', author_name: 'Анна', body: 'Взять образец', created_at: '2026-03-01T10:00:00Z' },
      { uuid: 'c-2', itemName: 'Плитка', author_name: 'Пётр', body: 'Уже взял', created_at: '2026-03-02T11:00:00Z' },
      { uuid: 'c-3', itemName: 'Затирка', author_name: 'Анна', body: 'Белую', created_at: '2026-03-03T12:00:00Z' },
    ])
    // Даты не сломаны параллельной агрегацией комментариев.
    expect(derived?.deadline).toBeNull()
    expect(derived?.reminderAt).toBeNull()
  })

  it('keeps rendering when the background items fetch fails (derived stays undefined)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([makeList({ uuid: 'l-1' })]))
    vi.mocked(shoppingListsApi.fetchItems).mockRejectedValue(new Error('network down'))

    const table = useLkTasksTable()
    await table.reload()
    await vi.waitFor(() => expect(shoppingListsApi.fetchItems).toHaveBeenCalled())

    expect(table.error.value).toBeNull()
    expect(table.visibleLists.value).toHaveLength(1)
    expect(table.derivedFor('l-1')).toBeUndefined()
  })

  it('toggles is_completed through updateList and reflects it in the local state', async () => {
    const list = makeList({ uuid: 'l-1', is_completed: false })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([list]))
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, is_completed: true })

    const table = useLkTasksTable()
    await table.reload()
    await table.toggleCompleted(table.lists.value[0]!)

    expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { is_completed: true })
    expect(table.lists.value[0]?.is_completed).toBe(true)
  })

  it('sorts by status following LK_STATUS_ORDER, goods (без статусов) always at the end', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', type: 'goods', status: 'new' }),
        makeList({ uuid: 'l-2', type: 'tasks', status: 'done', status_label: 'Выполнена' }),
        makeList({ uuid: 'l-3', type: 'tasks', status: 'new' }),
        makeList({ uuid: 'l-4', type: 'tasks', status: 'postponed', status_label: 'Отложена' }),
        makeList({ uuid: 'l-5', type: 'tasks', status: 'in_progress', status_label: 'В работе' }),
      ]),
    )

    const table = useLkTasksTable()
    await table.reload()

    table.toggleSort('status')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual([
      'l-3',
      'l-5',
      'l-4',
      'l-2',
      'l-1',
    ])

    // Реверс: порядок статусов обратный, goods по-прежнему в конце.
    table.toggleSort('status')
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual([
      'l-2',
      'l-4',
      'l-5',
      'l-3',
      'l-1',
    ])
  })

  it('changeStatus sends PUT {status} for a manual pick and PUT {status_is_manual:false} for «Авто»', async () => {
    const list = makeList({ uuid: 'l-1', type: 'tasks', status: 'new' })
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([list]))
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({
      ...list,
      status: 'in_progress',
      status_label: 'В работе',
      status_is_manual: true,
    })

    const table = useLkTasksTable()
    await table.reload()

    await table.changeStatus(table.lists.value[0]!, 'in_progress')
    expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { status: 'in_progress' })
    // Локальное состояние заменяется ответом сервера (статус закреплён).
    expect(table.lists.value[0]?.status).toBe('in_progress')
    expect(table.lists.value[0]?.status_is_manual).toBe(true)

    await table.changeStatus(table.lists.value[0]!, 'auto')
    expect(shoppingListsApi.updateList).toHaveBeenLastCalledWith('l-1', { status_is_manual: false })
  })

  it('exposes hasMore and appends the next page via loadNextPage', async () => {
    vi.mocked(shoppingListsApi.fetchLists)
      .mockResolvedValueOnce({
        data: [makeList({ uuid: 'l-1' })],
        meta: { current_page: 1, last_page: 2, per_page: 100, total: 2 },
        links: { first: null, last: null, prev: null, next: null },
      })
      .mockResolvedValueOnce({
        data: [makeList({ uuid: 'l-2' })],
        meta: { current_page: 2, last_page: 2, per_page: 100, total: 2 },
        links: { first: null, last: null, prev: null, next: null },
      })

    const table = useLkTasksTable()
    await table.reload()
    expect(table.hasMore.value).toBe(true)

    await table.loadNextPage()
    expect(table.visibleLists.value.map((list) => list.uuid)).toEqual(['l-1', 'l-2'])
    expect(table.hasMore.value).toBe(false)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    fetchItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    checkItem: vi.fn(),
  },
}))
