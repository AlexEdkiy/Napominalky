import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkTasksList } from './useLkTasksList'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

function makeList(overrides: Partial<ShoppingList>): ShoppingList {
  return {
    uuid: 'l-1',
    title: 'Продукты',
    items_count: 4,
    checked_items_count: 2,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = (data: ShoppingList[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

describe('useLkTasksList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads lists from the API and exposes them unfiltered by default', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', title: 'Продукты', updated_at: '2026-07-01T00:00:00Z' }),
        makeList({ uuid: 'l-2', title: 'Аптека', updated_at: '2026-07-05T00:00:00Z' }),
      ]),
    )

    const { load, filteredLists } = useLkTasksList()
    await load()

    expect(filteredLists.value).toHaveLength(2)
  })

  it('filters by search query on the title (case-insensitive)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList({ uuid: 'l-1', title: 'Продукты' }), makeList({ uuid: 'l-2', title: 'Аптека' })]),
    )

    const { load, filteredLists, searchQuery } = useLkTasksList()
    await load()
    searchQuery.value = 'апт'

    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-2'])
  })

  it('sorts by title / progress / updatedAt', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', title: 'Бытовое', items_count: 10, checked_items_count: 1, updated_at: '2026-07-01T00:00:00Z' }),
        makeList({ uuid: 'l-2', title: 'Аптека', items_count: 4, checked_items_count: 4, updated_at: '2026-07-05T00:00:00Z' }),
      ]),
    )

    const { load, filteredLists, sortBy } = useLkTasksList()
    await load()

    sortBy.value = 'title'
    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-1'])

    sortBy.value = 'progress'
    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-1'])

    sortBy.value = 'updatedAt'
    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-2', 'l-1'])
  })

  it('filters by completion status (active / completed)', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([
        makeList({ uuid: 'l-1', items_count: 4, checked_items_count: 2 }),
        makeList({ uuid: 'l-2', items_count: 3, checked_items_count: 3 }),
      ]),
    )

    const { load, filteredLists, filterBy } = useLkTasksList()
    await load()

    filterBy.value = 'active'
    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-1'])

    filterBy.value = 'completed'
    expect(filteredLists.value.map((list) => list.uuid)).toEqual(['l-2'])

    filterBy.value = 'all'
    expect(filteredLists.value).toHaveLength(2)
  })

  it('exposes hasMore based on the pagination meta', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [makeList({})],
      meta: { current_page: 1, last_page: 2, per_page: 1, total: 2 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { load, hasMore } = useLkTasksList()
    await load()

    expect(hasMore.value).toBe(true)
  })

  it('reports the error message when loading fails', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))

    const { load, error } = useLkTasksList()
    await load()

    expect(error.value).toBe('network down')
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
