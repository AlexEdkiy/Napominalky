import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import LkOverviewTasksPanel from './LkOverviewTasksPanel.vue'
import { LK_VISIBLE_COUNT_DEBOUNCE_MS } from '@/composables/useLkVisibleCount'
import type { ShoppingList } from '@/types/shoppingList'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

function makeList(uuid: string, overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    uuid,
    title: `Список ${uuid}`,
    type: 'goods',
    tags: [],
    items_count: 3,
    checked_items_count: 1,
    is_completed: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function makeLists(count: number): ShoppingList[] {
  return Array.from({ length: count }, (_, index) => makeList(`l-${index + 1}`))
}

function setInnerHeight(value: number): void {
  Object.defineProperty(window, 'innerHeight', { value, writable: true, configurable: true })
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/lk/tasks', name: 'lk-tasks', component: { template: '<div />' } },
    ],
  })
}

async function mountPanel(lists: ShoppingList[]) {
  const router = createTestRouter()
  await router.push({ name: 'home' })
  const wrapper = mount(LkOverviewTasksPanel, { props: { lists }, global: { plugins: [router] } })
  return { wrapper, router }
}

describe('LkOverviewTasksPanel', () => {
  beforeEach(() => {
    stubMatchMedia(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setInnerHeight(ORIGINAL_INNER_HEIGHT)
    vi.useRealTimers()
  })

  it('shows the empty state without the «Все задачи» link when there are no lists', async () => {
    const { wrapper } = await mountPanel([])

    expect(wrapper.text()).toContain('Пока нет задач.')
    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(false)
  })

  it('renders rows with the title, «M / N» counter and a type-accent dot', async () => {
    const { wrapper } = await mountPanel([
      makeList('l-1', { title: 'Продукты', type: 'goods', items_count: 5, checked_items_count: 2 }),
      makeList('l-2', { title: 'Дела недели', type: 'tasks' }),
    ])

    const rows = wrapper.findAll('.lk-overview-tasks__item')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Продукты')
    expect(rows[0]?.text()).toContain('2 / 5')
    // Акценты по типу: goods — teal, tasks — amber.
    expect(rows[0]?.find('.lk-overview-tasks__dot').attributes('style')).toContain('rgb(23, 137, 122)')
    expect(rows[1]?.find('.lk-overview-tasks__dot').attributes('style')).toContain('rgb(201, 138, 43)')
  })

  it('adapts the visible rows to the screen height (5 rows fit on a 290px viewport)', async () => {
    setInnerHeight(290) // (290 - 40) / 48 = 5
    const { wrapper } = await mountPanel(makeLists(10))

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(5)
    expect(wrapper.find('.lk-overview-tasks__link').text()).toContain('Все задачи')
  })

  it('clamps the visible rows to the max (8) on tall screens and to the min (3) on tiny ones', async () => {
    setInnerHeight(2000)
    const tall = await mountPanel(makeLists(20))
    expect(tall.wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(8)

    setInnerHeight(100)
    const tiny = await mountPanel(makeLists(20))
    expect(tiny.wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(3)
  })

  it('hides the «Все задачи» link when every list fits into the visible area', async () => {
    setInnerHeight(2000) // максимум 8 видимых, списков всего 3 — всё влезло
    const { wrapper } = await mountPanel(makeLists(3))

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(3)
    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(false)
  })

  it('navigates to lk-tasks when the «Все задачи» link is clicked', async () => {
    setInnerHeight(290)
    const { wrapper, router } = await mountPanel(makeLists(10))

    expect(wrapper.find('.lk-overview-tasks__link').attributes('href')).toBe('/lk/tasks')
    await wrapper.find('.lk-overview-tasks__link').trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
  })

  it('emits open with the clicked list (row body click)', async () => {
    const lists = makeLists(2)
    const { wrapper } = await mountPanel(lists)

    await wrapper.findAll('.lk-overview-tasks__body')[1]?.trigger('click')

    expect(wrapper.emitted('open')).toEqual([[lists[1]]])
  })

  it('falls back to a fixed small number of rows on mobile (page scrolls anyway)', async () => {
    stubMatchMedia(false) // мобильная раскладка
    setInnerHeight(2000)
    const { wrapper } = await mountPanel(makeLists(10))

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(4)
    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(true)
  })

  it('recomputes the visible rows after a debounced window resize', async () => {
    vi.useFakeTimers()
    setInnerHeight(290)
    const { wrapper } = await mountPanel(makeLists(10))
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(5)

    setInnerHeight(2000)
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(LK_VISIBLE_COUNT_DEBOUNCE_MS)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(8)
  })
})
