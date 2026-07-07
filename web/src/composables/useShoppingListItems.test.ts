import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useShoppingListItems } from './useShoppingListItems'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingListItem } from '@/types/shoppingList'

const item: ShoppingListItem = {
  uuid: 'i-1',
  name: 'Молоко',
  category: 'products',
  category_label: 'Продукты',
  is_checked: false,
  position: 1,
  quantity: null,
  deadline: null,
  reminder_at: null,
  link: null,
  comment: null,
  tags: [],
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

describe('useShoppingListItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load populates items and derives counts', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item, { ...item, uuid: 'i-2', is_checked: true }])

    const { items, totalCount, checkedCount, load } = useShoppingListItems('l-1')
    await load()

    expect(shoppingListsApi.fetchItems).toHaveBeenCalledWith('l-1')
    expect(items.value).toHaveLength(2)
    expect(totalCount.value).toBe(2)
    expect(checkedCount.value).toBe(1)
  })

  it('add appends the new item', async () => {
    const created: ShoppingListItem = { ...item, uuid: 'i-3', name: 'Хлеб' }
    vi.mocked(shoppingListsApi.addItem).mockResolvedValue(created)

    const { items, add } = useShoppingListItems('l-1')
    const result = await add({ name: 'Хлеб', category: 'products' })

    expect(shoppingListsApi.addItem).toHaveBeenCalledWith('l-1', { name: 'Хлеб', category: 'products' })
    expect(result?.uuid).toBe('i-3')
    expect(items.value[0]?.uuid).toBe('i-3')
  })

  it('check replaces the matching item in place', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item])
    vi.mocked(shoppingListsApi.checkItem).mockResolvedValue({ ...item, is_checked: true })

    const { items, load, check } = useShoppingListItems('l-1')
    await load()
    await check('i-1', true)

    expect(shoppingListsApi.checkItem).toHaveBeenCalledWith('l-1', 'i-1', true)
    expect(items.value[0]?.is_checked).toBe(true)
  })

  it('remove drops the item from the collection', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item])
    vi.mocked(shoppingListsApi.deleteItem).mockResolvedValue(undefined)

    const { items, load, remove } = useShoppingListItems('l-1')
    await load()
    const ok = await remove('i-1')

    expect(ok).toBe(true)
    expect(items.value).toHaveLength(0)
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
