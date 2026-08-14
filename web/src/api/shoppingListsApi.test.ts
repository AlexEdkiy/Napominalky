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
  is_completed: false,
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

  it('passes is_completed through to PUT and returns it from the resource', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: { ...wireList, is_completed: true } } })

    const result = await shoppingListsApi.updateList('l-1', { is_completed: true })

    expect(apiClient.put).toHaveBeenCalledWith('/shopping-lists/l-1', { is_completed: true })
    expect(result.is_completed).toBe(true)
  })

  it('serializes item attributes (в т.ч. tags) when updating an item', async () => {
    const wireItem = {
      uuid: 'i-1',
      name: 'Молоко',
      category: 'products',
      category_label: 'Продукты',
      is_checked: false,
      position: 0,
      quantity: 2,
      deadline: '2026-07-20',
      reminder_at: '2026-07-20T09:00:00Z',
      link: 'https://example.com',
      comment: 'Безлактозное',
      tags: '["Дом"]',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    }
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: wireItem } })

    const result = await shoppingListsApi.updateItem('l-1', 'i-1', {
      quantity: 2,
      deadline: '2026-07-20',
      reminder_at: '2026-07-20T09:00:00Z',
      link: 'https://example.com',
      comment: 'Безлактозное',
      tags: ['Дом'],
    })

    expect(apiClient.put).toHaveBeenCalledWith('/shopping-lists/l-1/items/i-1', {
      quantity: 2,
      deadline: '2026-07-20',
      reminder_at: '2026-07-20T09:00:00Z',
      link: 'https://example.com',
      comment: 'Безлактозное',
      tags: '["Дом"]',
    })
    expect(result.tags).toEqual(['Дом'])
  })

  it('clears an item attribute with explicit null and tags with an empty array', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { data: { ...wireList, uuid: 'i-1', deadline: null, tags: '[]' } },
    })

    await shoppingListsApi.updateItem('l-1', 'i-1', { deadline: null, tags: [] })

    expect(apiClient.put).toHaveBeenCalledWith('/shopping-lists/l-1/items/i-1', {
      deadline: null,
      tags: '[]',
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

  it('defaults comments to [] and comments_count to 0 when the item wire omits them', async () => {
    const wireItem = {
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
      tags: '[]',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [wireItem] } })

    const result = await shoppingListsApi.fetchItems('l-1')

    expect(result[0]?.comments).toEqual([])
    expect(result[0]?.comments_count).toBe(0)
  })

  it('passes the embedded comments thread through the item normalization', async () => {
    const comment = {
      uuid: 'c-1',
      author_name: 'Анна',
      body: 'Взять образец',
      created_at: '2026-07-01T10:00:00Z',
    }
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [
          {
            ...wireList,
            uuid: 'i-1',
            tags: '[]',
            comments: [comment],
            comments_count: 1,
          },
        ],
      },
    })

    const result = await shoppingListsApi.fetchItems('l-1')

    expect(result[0]?.comments).toEqual([comment])
    expect(result[0]?.comments_count).toBe(1)
  })

  it('GETs the item comments thread from the nested endpoint', async () => {
    const comments = [
      { uuid: 'c-1', author_name: 'Анна', body: 'Первый', created_at: '2026-07-01T10:00:00Z' },
      { uuid: 'c-2', author_name: 'Пётр', body: 'Второй', created_at: '2026-07-02T10:00:00Z' },
    ]
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: comments } })

    const result = await shoppingListsApi.fetchItemComments('l-1', 'i-1')

    expect(apiClient.get).toHaveBeenCalledWith('/shopping-lists/l-1/items/i-1/comments')
    expect(result).toEqual(comments)
  })

  it('POSTs a new comment body and returns the created resource', async () => {
    const created = {
      uuid: 'c-9',
      author_name: 'Анна',
      body: 'Новый',
      created_at: '2026-07-03T10:00:00Z',
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: created } })

    const result = await shoppingListsApi.addItemComment('l-1', 'i-1', { body: 'Новый' })

    expect(apiClient.post).toHaveBeenCalledWith('/shopping-lists/l-1/items/i-1/comments', {
      body: 'Новый',
    })
    expect(result).toEqual(created)
  })

  it('DELETEs a comment by its uuid under the item', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 })

    await shoppingListsApi.deleteItemComment('l-1', 'i-1', 'c-1')

    expect(apiClient.delete).toHaveBeenCalledWith('/shopping-lists/l-1/items/i-1/comments/c-1')
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
