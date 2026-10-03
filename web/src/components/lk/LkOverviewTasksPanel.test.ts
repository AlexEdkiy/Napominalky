import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import LkOverviewTasksPanel from './LkOverviewTasksPanel.vue'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import { LK_VISIBLE_COUNT_DEBOUNCE_MS } from '@/composables/useLkVisibleCount'
import type { ShoppingList } from '@/types/shoppingList'

enableAutoUnmount(afterEach)

const ORIGINAL_INNER_HEIGHT = window.innerHeight

// «Сейчас» для индикатора сегодняшнего дедлайна фиксировано, чтобы тесты
// не зависели от реальной сегодняшней даты.
const NOW = new Date(2026, 6, 6, 9, 0) // 2026-07-06 09:00 local

function makeList(uuid: string, overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    uuid,
    title: `Список ${uuid}`,
    type: 'goods',
    tags: [],
    items_count: 3,
    checked_items_count: 1,
    is_completed: false,
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
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

async function mountPanel(
  lists: ShoppingList[],
  derivedDates?: Map<string, LkListDerivedDates>,
) {
  const router = createTestRouter()
  await router.push({ name: 'home' })
  const props: { lists: ShoppingList[]; derivedDates?: Map<string, LkListDerivedDates> } = { lists }
  if (derivedDates !== undefined) {
    props.derivedDates = derivedDates
  }
  const wrapper = mount(LkOverviewTasksPanel, { props, global: { plugins: [router] } })
  return { wrapper, router }
}

/** Карта производных дат: uuid → ближайший deadline пунктов. */
function makeDerived(entries: Record<string, string | null>): Map<string, LkListDerivedDates> {
  return new Map(
    Object.entries(entries).map(([uuid, deadline]) => [
      uuid,
      { deadline, reminderAt: null, commentsCount: 0, comments: [] },
    ]),
  )
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

    expect(wrapper.text()).toContain('Пока нет задач и покупок.')
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
    expect(wrapper.find('.lk-overview-tasks__link').attributes('aria-label')).toBe('Все задачи и покупки')
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

  it('emits open with the clicked list (title button click)', async () => {
    const lists = makeLists(2)
    const { wrapper } = await mountPanel(lists)

    await wrapper.findAll('.lk-overview-tasks__item-title')[1]?.trigger('click')

    expect(wrapper.emitted('open')).toEqual([[lists[1]]])
  })

  it('previews task items on title focus, hides on click, and opens only from the title', async () => {
    const list = makeList('task', { type: 'tasks' })
    const { wrapper } = await mountPanel([list], new Map([['task', {
      deadline: null, reminderAt: null, commentsCount: 1,
      comments: [{ uuid: 'c', itemName: 'Прототип', body: 'Не для Обзора', author_name: 'Автор', created_at: '2026-10-01T10:00:00Z' }],
      items: [{ uuid: 'i', name: 'Прототип', is_checked: false, status: 'in_progress' }],
    }]]))
    try {
      await wrapper.find('.lk-overview-tasks__count').trigger('click')
      expect(wrapper.emitted('open')).toBeUndefined()
      const title = wrapper.find('.lk-overview-tasks__item-title')
      await title.trigger('focusin')
      const tooltip = document.querySelector('[role="tooltip"]')
      expect(tooltip?.textContent).toContain('Прототип')
      expect(tooltip?.querySelector('.lk-status-badge')).toBeNull()
      expect(tooltip?.textContent).not.toContain('В работе')
      expect(tooltip?.textContent).not.toContain('Не для Обзора')
      expect(title.attributes('aria-describedby')).toBe(tooltip?.id)
      await title.trigger('click')
      expect(document.querySelector('[role="tooltip"]')).toBeNull()
      expect(wrapper.emitted('open')).toEqual([[list]])
      // After the preview closes, Escape must reach the dialog's window handler.
      document.body.appendChild(wrapper.element)
      const onEscape = vi.fn()
      window.addEventListener('keydown', onEscape)
      try {
        await title.trigger('keydown', { key: 'Escape' })
        expect(onEscape).toHaveBeenCalledTimes(1)
        await title.trigger('focusin')
        await title.trigger('keydown', { key: 'Escape' })
        expect(document.querySelector('[role="tooltip"]')).toBeNull()
        expect(onEscape).toHaveBeenCalledTimes(1)
      } finally { window.removeEventListener('keydown', onEscape) }
    } finally { wrapper.unmount(); wrapper.element.remove() }
  })

  it('falls back to a fixed small number of rows on mobile (page scrolls anyway)', async () => {
    stubMatchMedia(false) // мобильная раскладка
    setInnerHeight(2000)
    const { wrapper } = await mountPanel(makeLists(10))

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(4)
    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(true)
  })

  it('marks only today deadlines without hiding other lists or showing the old filter', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const derived = makeDerived({ 'l-1': '2026-07-06', 'l-2': null, 'l-3': '2026-07-07' })
    derived.get('l-2')!.reminderAt = '2026-07-06T23:00:00'
    const { wrapper } = await mountPanel(makeLists(3), derived)
    expect(wrapper.find('h2').text()).toBe('Задачи и покупки')
    expect(wrapper.find('.lk-overview-tasks__filter').exists()).toBe(false)
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(3)
    expect(wrapper.findAll('.lk-overview-tasks__alarm')).toHaveLength(1)
    expect(wrapper.find('.lk-overview-tasks__alarm').attributes('title')).toBe('Дедлайн на сегодня')
    expect(wrapper.findAll('.lk-overview-tasks__item')[1]!.find('.lk-overview-tasks__alarm').exists()).toBe(false)
    expect(wrapper.findAll('.lk-overview-tasks__item')[2]!.find('.lk-overview-tasks__alarm').exists()).toBe(false)
  })

  it('updates alarms at local midnight and removes timers on unmount', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 6, 23, 59, 59))
    const { wrapper } = await mountPanel(makeLists(2), makeDerived({ 'l-1': '2026-07-06', 'l-2': '2026-07-07' }))
    expect(wrapper.findAll('.lk-overview-tasks__item')[0]!.find('.lk-overview-tasks__alarm').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1100)
    expect(wrapper.findAll('.lk-overview-tasks__item')[0]!.find('.lk-overview-tasks__alarm').exists()).toBe(false)
    expect(wrapper.findAll('.lk-overview-tasks__item')[1]!.find('.lk-overview-tasks__alarm').exists()).toBe(true)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
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
