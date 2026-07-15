import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lkTableDateLabel, lkTableTimeLabel, nearestIso, useLkTasksTable } from './useLkTasksTable'
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
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
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

    expect(table.derivedFor('l-1')).toEqual({ deadline: '2026-03-12', reminderAt: '2026-03-12T09:00:00' })
    expect(table.derivedFor('l-2')).toEqual({ deadline: '2026-03-11', reminderAt: null })
    expect(table.derivedFor('l-3')).toEqual({ deadline: null, reminderAt: null })

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

    expect(table.derivedFor('l-1')).toEqual({ deadline: null, reminderAt: null })
    expect(lkTableDateLabel(table.derivedFor('l-1')?.deadline ?? null, NOW)).toBe('')
    expect(lkTableTimeLabel(table.derivedFor('l-1')?.reminderAt ?? null)).toBe('')
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
