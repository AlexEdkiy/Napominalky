import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useShoppingList } from './useShoppingList'
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

describe('useShoppingList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('load fetches the single list by uuid', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)

    const { list: loaded, isLoading, load } = useShoppingList('l-1')
    await load()

    expect(shoppingListsApi.fetchList).toHaveBeenCalledWith('l-1')
    expect(loaded.value?.title).toBe('Продукты')
    expect(isLoading.value).toBe(false)
  })

  it('load records an error message on failure', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockRejectedValue(new Error('network down'))

    const { error, load } = useShoppingList('l-1')
    await load()

    expect(error.value).toBe('network down')
  })

  it('rename updates the list title on success', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, title: 'Новое название' })

    const { list: loaded, load, rename } = useShoppingList('l-1')
    await load()
    const ok = await rename('Новое название')

    expect(ok).toBe(true)
    expect(loaded.value?.title).toBe('Новое название')
  })

  it('rename returns false on failure without throwing', async () => {
    vi.mocked(shoppingListsApi.updateList).mockRejectedValue(new Error('validation error'))

    const { rename } = useShoppingList('l-1')
    const ok = await rename('x')

    expect(ok).toBe(false)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchList: vi.fn(),
    updateList: vi.fn(),
  },
}))
