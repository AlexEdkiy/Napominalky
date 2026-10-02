import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLkNavCounts } from './useLkNavCounts'
import { notesApi } from '@/api/notesApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

function makeList(itemsCount: number, checkedCount: number): ShoppingList {
  return {
    uuid: `l-${itemsCount}-${checkedCount}`,
    title: 'Продукты',
    type: 'goods',
    tags: [],
    items_count: itemsCount,
    checked_items_count: checkedCount,
    is_completed: false,
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function item(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    uuid: 'i', name: 'Пункт', category: 'other', category_label: 'Другое', is_checked: false,
    status: 'new', status_label: 'Новая', position: 0, quantity: null, deadline: null, reminder_at: null,
    link: null, comment: null, comments_count: 0, comments: [], tags: [],
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', ...overrides,
  }
}
const page = (data: ShoppingList[], current = 1, last = 1) => ({ data,
  meta: { current_page: current, last_page: last, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

describe('useLkNavCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({ ...page([]), data: [] })
  })

  it('counts today deadlines across pages and active child dates, independently of reminders and checked items', async () => {
    const today = ref(new Date(2026, 9, 2, 12))
    const lists = [
      { ...makeList(1, 0), uuid: 'parent', type: 'tasks' as const, deadline: '2026-10-02' },
      { ...makeList(1, 0), uuid: 'done', type: 'tasks' as const, deadline: '2026-10-02', is_completed: true },
      { ...makeList(1, 0), uuid: 'reminder', type: 'tasks' as const, reminder_at: '2026-10-02T10:00:00' },
      { ...makeList(1, 0), uuid: 'goods' },
      { ...makeList(1, 0), uuid: 'checked' },
      { ...makeList(1, 0), uuid: 'overdue', type: 'tasks' as const, deadline: '2026-10-01' },
    ]
    vi.mocked(shoppingListsApi.fetchLists).mockImplementation(async (params) =>
      page(params?.page === 2 ? lists.slice(3) : lists.slice(0, 3), params?.page ?? 1, 2))
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid) =>
      ['goods', 'checked', 'overdue'].includes(uuid) ? [item({ deadline: '2026-10-02', is_checked: uuid === 'checked' })] : [])
    const state = useLkNavCounts(today)
    await state.load()
    expect(state.todayDeadlineCount.value).toBe(3)
    expect(shoppingListsApi.fetchItems).not.toHaveBeenCalledWith('done')
    today.value = new Date(2026, 9, 3, 0)
    expect(state.todayDeadlineCount.value).toBe(0)
    today.value = new Date(2026, 9, 2, 12)
    // A saved deadline moves to tomorrow; a refresh updates the badge.
    lists[0]!.deadline = '2026-10-03'
    await state.load()
    expect(state.todayDeadlineCount.value).toBe(2)
    vi.mocked(shoppingListsApi.fetchItems).mockRejectedValue(new Error('offline'))
    await state.load()
    expect(state.todayDeadlineCount.value).toBeNull()
  })

  it('ignores late responses from an older refresh', async () => {
    let resolveOld!: (value: ReturnType<typeof page>) => void
    vi.mocked(shoppingListsApi.fetchLists)
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValue(page([]))
    const state = useLkNavCounts(ref(new Date(2026, 9, 2, 12)))
    const oldLoad = state.load()
    await state.load()
    resolveOld(page([{ ...makeList(1, 0), type: 'tasks', deadline: '2026-10-02' }]))
    await oldLoad
    expect(state.todayDeadlineCount.value).toBe(0)
    expect(state.activeTasksCount.value).toBe(0)
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
    fetchItems: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))
