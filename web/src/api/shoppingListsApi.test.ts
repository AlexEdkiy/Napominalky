import { beforeEach, describe, expect, it, vi } from 'vitest'

import { shoppingListsApi } from './shoppingListsApi'
import { apiClient } from './client'

const wireList = {
  uuid: 'l-1',
  title: 'Продукты',
  type: 'goods',
  tags: '["Покупки","Здоровье"]',
  items_count: 0,
  checked_items_count: 0,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

describe('shoppingListsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serializes tags to a JSON string when creating a list', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: wireList } })

    const result = await shoppingListsApi.createList({
      title: 'Продукты',
      type: 'goods',
      tags: ['Покупки', 'Здоровье'],
    })

    expect(apiClient.post).toHaveBeenCalledWith('/shopping-lists', {
      title: 'Продукты',
      type: 'goods',
      tags: '["Покупки","Здоровье"]',
    })
    expect(result.tags).toEqual(['Покупки', 'Здоровье'])
  })

  it('omits the tags field entirely when not provided', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: { ...wireList, tags: null } } })

    await shoppingListsApi.createList({ title: 'Продукты' })

    expect(apiClient.post).toHaveBeenCalledWith('/shopping-lists', { title: 'Продукты' })
  })

  it('serializes tags to a JSON string when updating a list', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: wireList } })

    await shoppingListsApi.updateList('l-1', { title: 'Продукты', tags: ['Покупки', 'Здоровье'] })

    expect(apiClient.put).toHaveBeenCalledWith('/shopping-lists/l-1', {
      title: 'Продукты',
      tags: '["Покупки","Здоровье"]',
    })
  })

  it('normalizes the opaque tags JSON string back into a string array on fetch', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [wireList],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        links: { first: null, last: null, prev: null, next: null },
      },
    })

    const result = await shoppingListsApi.fetchLists()

    expect(result.data[0]?.tags).toEqual(['Покупки', 'Здоровье'])
  })
})

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))
