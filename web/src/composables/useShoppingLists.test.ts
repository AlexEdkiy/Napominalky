import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useShoppingLists } from './useShoppingLists'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты',
  items_count: 3,
  checked_items_count: 1,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

describe('useShoppingLists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates lists from the paginated response', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [list],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { lists, isLoading, load } = useShoppingLists()
    await load({ page: 1 })

    expect(shoppingListsApi.fetchLists).toHaveBeenCalledWith({ page: 1 })
    expect(lists.value).toHaveLength(1)
    expect(lists.value[0]?.uuid).toBe('l-1')
    expect(isLoading.value).toBe(false)
  })

  it('create prepends the new list', async () => {
    const created: ShoppingList = { ...list, uuid: 'l-2', title: 'Аптека' }
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(created)

    const { lists, create } = useShoppingLists()
    const result = await create({ title: 'Аптека' })

    expect(result?.uuid).toBe('l-2')
    expect(lists.value[0]?.uuid).toBe('l-2')
  })

  it('remove drops the list from the collection', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [list],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(shoppingListsApi.deleteList).mockResolvedValue(undefined)

    const { lists, load, remove } = useShoppingLists()
    await load()
    const ok = await remove('l-1')

    expect(ok).toBe(true)
    expect(lists.value).toHaveLength(0)
  })

  it('load records an error message on failure', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))

    const { error, isLoading, load } = useShoppingLists()
    await load()

    expect(error.value).toBe('network down')
    expect(isLoading.value).toBe(false)
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
