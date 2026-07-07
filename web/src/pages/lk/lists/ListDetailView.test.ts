import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'

import ListDetailView from './ListDetailView.vue'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты на неделю',
  items_count: 2,
  checked_items_count: 1,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function makeItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    uuid: 'i-1',
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    position: 0,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/lk/lists/:uuid', name: 'lk-list-detail', component: ListDetailView }],
  })
}

/** Хост-компонент: предоставляет «хвост» крошек, как это делает `LkLayout`, и читает его. */
function makeHost() {
  return defineComponent({
    setup() {
      const tail = provideLkBreadcrumbTail()
      return { tail }
    },
    template: '<div><span class="tail">{{ tail ?? "none" }}</span><RouterView /></div>',
  })
}

async function mountDetail() {
  const router = createTestRouter()
  await router.push({ name: 'lk-list-detail', params: { uuid: 'l-1' } })
  const wrapper = mount(makeHost(), { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ListDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state before the list and items resolve', async () => {
    let resolveList: (() => void) | undefined
    vi.mocked(shoppingListsApi.fetchList).mockReturnValue(
      new Promise((resolve) => {
        resolveList = () => resolve(list)
      }),
    )
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Загрузка')
    resolveList?.()
  })

  it('renders the list title, progress and items grouped by category', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', name: 'Молоко', category: 'products', category_label: 'Продукты', is_checked: true }),
      makeItem({ uuid: 'i-2', name: 'Мыло', category: 'household', category_label: 'Хозтовары' }),
    ])

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.find('.list-detail__title').text()).toBe('Продукты на неделю')
    expect(wrapper.find('.list-detail__progress-label').text()).toBe('1 / 2')
    expect(wrapper.text()).toContain('Молоко')
    expect(wrapper.text()).toContain('Мыло')
    expect(wrapper.findAll('.list-detail__group')).toHaveLength(2)
  })

  it('writes the loaded list title into the shared breadcrumb tail', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.find('.tail').text()).toBe('Продукты на неделю'))
  })

  it('shows the empty state when the list has no items', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('В списке пока нет пунктов')
  })

  it('shows an error message when a request fails', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockRejectedValue(new Error('network down'))
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('adds a new item through the form', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
    vi.mocked(shoppingListsApi.addItem).mockResolvedValue(makeItem({ uuid: 'i-3', name: 'Хлеб' }))

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.list-detail__add input').setValue('Хлеб')
    await wrapper.find('.list-detail__add').trigger('submit')

    expect(shoppingListsApi.addItem).toHaveBeenCalledWith('l-1', { name: 'Хлеб', category: 'products' })
  })

  it('checks and removes an item', async () => {
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(list)
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.checkItem).mockResolvedValue(makeItem({ uuid: 'i-1', name: 'Молоко', is_checked: true }))
    vi.mocked(shoppingListsApi.deleteItem).mockResolvedValue(undefined)

    const wrapper = await mountDetail()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-list-item-row__checkbox').setValue(true)
    await vi.waitFor(() => expect(shoppingListsApi.checkItem).toHaveBeenCalledWith('l-1', 'i-1', true))

    await wrapper.find('.lk-list-item-row__remove').trigger('click')
    await vi.waitFor(() => expect(shoppingListsApi.deleteItem).toHaveBeenCalledWith('l-1', 'i-1'))
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchList: vi.fn(),
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
