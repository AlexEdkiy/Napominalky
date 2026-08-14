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
  status: 'new',
  status_label: 'Новая',
  position: 1,
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

  it('resolves the uuid getter on EACH call (reactive to route param changes)', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item])
    vi.mocked(shoppingListsApi.addItem).mockResolvedValue({ ...item, uuid: 'i-3', name: 'Хлеб' })

    let uuid = 'l-1'
    const { load, add } = useShoppingListItems(() => uuid)
    await load()
    expect(shoppingListsApi.fetchItems).toHaveBeenLastCalledWith('l-1')

    uuid = 'l-2'
    await load()
    expect(shoppingListsApi.fetchItems).toHaveBeenLastCalledWith('l-2')
    await add({ name: 'Хлеб', category: 'products' })
    expect(shoppingListsApi.addItem).toHaveBeenCalledWith('l-2', { name: 'Хлеб', category: 'products' })
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

  it('addComment POSTs the body and appends the created comment locally (без рефетча)', async () => {
    const existing = {
      uuid: 'c-1',
      author_name: 'Анна',
      body: 'Старый',
      created_at: '2026-03-01T10:00:00Z',
    }
    const created = {
      uuid: 'c-2',
      author_name: 'Анна',
      body: 'Новый',
      created_at: '2026-03-02T11:00:00Z',
    }
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      { ...item, comments: [existing], comments_count: 1 },
    ])
    vi.mocked(shoppingListsApi.addItemComment).mockResolvedValue(created)

    const { items, load, addComment } = useShoppingListItems('l-1')
    await load()
    const result = await addComment('i-1', 'Новый')

    expect(shoppingListsApi.addItemComment).toHaveBeenCalledWith('l-1', 'i-1', { body: 'Новый' })
    expect(result).toEqual(created)
    // Локальный append в конец треда (ASC) + инкремент счётчика — БЕЗ fetchItems.
    expect(items.value[0]?.comments).toEqual([existing, created])
    expect(items.value[0]?.comments_count).toBe(2)
    expect(shoppingListsApi.fetchItems).toHaveBeenCalledTimes(1)
  })

  it('addComment surfaces the error and keeps the thread intact on failure', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item])
    vi.mocked(shoppingListsApi.addItemComment).mockRejectedValue(new Error('Сеть недоступна'))

    const { items, error, load, addComment } = useShoppingListItems('l-1')
    await load()
    const result = await addComment('i-1', 'Текст')

    expect(result).toBeNull()
    expect(error.value).toBe('Сеть недоступна')
    expect(items.value[0]?.comments).toEqual([])
    expect(items.value[0]?.comments_count).toBe(0)
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
    fetchItemComments: vi.fn(),
    addItemComment: vi.fn(),
    deleteItemComment: vi.fn(),
  },
}))
