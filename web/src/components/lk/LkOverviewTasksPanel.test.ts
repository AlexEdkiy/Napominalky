import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import LkOverviewTasksPanel from './LkOverviewTasksPanel.vue'
import type { LkListDerivedDates } from '@/composables/useLkTasksTable'
import { LK_VISIBLE_COUNT_DEBOUNCE_MS } from '@/composables/useLkVisibleCount'
import type { ShoppingList } from '@/types/shoppingList'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

// «Сейчас» для фильтра «Сделать сегодня» фиксировано, чтобы тесты
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
    Object.entries(entries).map(([uuid, deadline]) => [uuid, { deadline, reminderAt: null }]),
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

  it('shows only today-deadline tasks when «Сделать сегодня» is on and all tasks when off', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const { wrapper } = await mountPanel(
      [makeList('l-1'), makeList('l-2'), makeList('l-3')],
      makeDerived({ 'l-1': '2026-07-06', 'l-2': '2026-07-07', 'l-3': null }),
    )

    const chip = wrapper.find('.lk-overview-tasks__filter')
    expect(chip.text()).toContain('Сделать сегодня')
    expect(chip.attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(3)

    // Вкл: остаются только задачи с дедлайном на сегодня.
    await chip.trigger('click')
    expect(chip.attributes('aria-pressed')).toBe('true')
    const rows = wrapper.findAll('.lk-overview-tasks__item')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('Список l-1')

    // Выкл: снова весь активный набор.
    await chip.trigger('click')
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(3)
  })

  it('shows the today-empty state when the filter is on and nothing is due today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const { wrapper } = await mountPanel(
      [makeList('l-1'), makeList('l-2')],
      makeDerived({ 'l-1': '2026-07-08', 'l-2': null }),
    )

    await wrapper.find('.lk-overview-tasks__filter').trigger('click')

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(0)
    expect(wrapper.text()).toContain('На сегодня задач нет.')
  })

  it('applies the adaptive row limit and the «Все задачи» link to the filtered set', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    setInnerHeight(290) // (290 - 40) / 48 = 5 видимых строк
    const lists = makeLists(10)
    const derived = makeDerived(
      Object.fromEntries(lists.map((list, index) => [list.uuid, index < 7 ? '2026-07-06' : null])),
    )
    const { wrapper } = await mountPanel(lists, derived)

    // Фильтр вкл: 7 сегодняшних > 5 видимых → лимит и ссылка работают по отфильтрованному набору.
    await wrapper.find('.lk-overview-tasks__filter').trigger('click')
    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(5)
    const link = wrapper.find('.lk-overview-tasks__link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/lk/tasks')
  })

  it('hides the «Все задачи» link when the filtered set fits into the visible area', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    setInnerHeight(290) // 5 видимых строк; всего 10 задач, но сегодняшних лишь 2
    const lists = makeLists(10)
    const derived = makeDerived(
      Object.fromEntries(lists.map((list, index) => [list.uuid, index < 2 ? '2026-07-06' : null])),
    )
    const { wrapper } = await mountPanel(lists, derived)

    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(true)
    await wrapper.find('.lk-overview-tasks__filter').trigger('click')

    expect(wrapper.findAll('.lk-overview-tasks__item')).toHaveLength(2)
    expect(wrapper.find('.lk-overview-tasks__link').exists()).toBe(false)
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
