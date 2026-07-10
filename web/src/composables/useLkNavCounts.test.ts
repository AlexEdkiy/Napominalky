import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkNavCounts } from './useLkNavCounts'
import { notesApi } from '@/api/notesApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

function makeList(itemsCount: number, checkedCount: number): ShoppingList {
  return {
    uuid: `l-${itemsCount}-${checkedCount}`,
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: itemsCount,
    checked_items_count: checkedCount,
    is_completed: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

describe('useLkNavCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sums active (unchecked) items across all lists and reads notes total', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [makeList(5, 2), makeList(3, 3)],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 2 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 1, total: 7 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { activeTasksCount, notesCount, load } = useLkNavCounts()
    await load()

    expect(activeTasksCount.value).toBe(3)
    expect(notesCount.value).toBe(7)
  })

  it('leaves counts as null when the request fails, without throwing', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockRejectedValue(new Error('network down'))
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 1, total: 0 },
      links: { first: null, last: null, prev: null, next: null },
    })

    const { activeTasksCount, notesCount, load } = useLkNavCounts()
    await expect(load()).resolves.toBeUndefined()

    expect(activeTasksCount.value).toBeNull()
    expect(notesCount.value).toBeNull()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))
