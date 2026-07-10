import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import ListFormRedirectView from './ListFormRedirectView.vue'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты на неделю',
  type: 'goods',
  tags: [],
  items_count: 2,
  checked_items_count: 1,
  is_completed: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/tasks', name: 'lk-tasks', component: { template: '<div />' } },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: ListFormRedirectView },
    ],
  })
}

describe('ListFormRedirectView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  it('fetches the list, opens the task form in edit mode and redirects to lk-tasks', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    const router = createTestRouter()
    await router.push({ name: 'lk-list-detail', params: { uuid: 'l-1' } })
    mount(ListFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
    expect(shoppingListsApi.fetchList).toHaveBeenCalledWith('l-1')
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
    expect(useLkForms().taskFormList.value).toEqual(list)
  })

  it('redirects to lk-tasks without opening the form when the list fetch fails', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockRejectedValue(new Error('network down'))
    const router = createTestRouter()
    await router.push({ name: 'lk-list-detail', params: { uuid: 'l-404' } })
    mount(ListFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
    expect(useLkForms().isTaskFormOpen.value).toBe(false)
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchList: vi.fn(),
  },
}))
