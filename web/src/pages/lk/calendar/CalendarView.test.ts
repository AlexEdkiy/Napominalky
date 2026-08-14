import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import CalendarView from './CalendarView.vue'
import { remindersApi } from '@/api/remindersApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { LK_DESKTOP_QUERY, LK_WIDE_DESKTOP_QUERY } from '@/composables/useLkBreakpoint'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

function makeReminder(uuid: string, remindAt: string): Reminder {
  return {
    uuid,
    title: `Напоминание ${uuid}`,
    notes: null,
    remind_at: remindAt,
    recurrence: 'none',
    is_completed: false,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function makeList(uuid: string, type: ShoppingList['type']): ShoppingList {
  return {
    uuid,
    title: 'Список',
    type,
    tags: [],
    items_count: 1,
    checked_items_count: 0,
    is_completed: false,
    status: 'new',
    status_label: 'Новая',
    status_is_manual: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

function makeItem(
  uuid: string,
  name: string,
  overrides: Partial<Pick<ShoppingListItem, 'deadline' | 'reminder_at'>>,
): ShoppingListItem {
  return {
    uuid,
    name,
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    status: 'new',
    status_label: 'Новая',
    position: 1,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    tags: [],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = <T>(data: T[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 200, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/calendar', name: 'lk-calendar', component: CalendarView },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: { template: '<div />' } },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: { template: '<div />' } },
    ],
  })
}

/**
 * Стаб `window.matchMedia`. Принимает либо один флаг (одинаковый ответ для
 * любого media-query — как в большинстве тестов ниже), либо карту
 * `query -> matches` — нужна, чтобы независимо задать `isDesktop`
 * (`LK_DESKTOP_QUERY`) и `isWideDesktop` (`LK_WIDE_DESKTOP_QUERY`), напр. для
 * состояния 1024–1279px (десктоп-сетка, но day-панель ещё не right-rail).
 */
function stubMatchMedia(matches: boolean | Record<string, boolean>): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: typeof matches === 'boolean' ? matches : (matches[query] ?? false),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

async function mountCalendarView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-calendar' })
  const wrapper = mount(CalendarView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 6, 9, 0))
  })

  it('shows a loading state before the reminders resolve', async () => {
    stubMatchMedia(true)
    let resolveReminders: (() => void) | undefined
    vi.mocked(remindersApi.fetchReminders).mockReturnValue(
      new Promise((resolve) => {
        resolveReminders = () => resolve(paginated([]))
      }),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()

    expect(wrapper.text()).toContain('Загрузка')
    resolveReminders?.()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows an error message with a retry button when reminders fail to load', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))

    expect(wrapper.find('.calendar-view__retry-btn').exists()).toBe(true)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the empty state in the day panel when there are no events', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('На этот день ничего не запланировано.')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the legend and the current month label', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-calendar-legend__item')).toHaveLength(3)
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июль 2026')
  })

  it('navigates months with prev/next and returns to today', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('[aria-label="Следующий месяц"]').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Август 2026')

    await wrapper.find('[aria-label="Предыдущий месяц"]').trigger('click')
    await wrapper.find('[aria-label="Предыдущий месяц"]').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июнь 2026')

    await wrapper.find('.calendar-view__today-btn').trigger('click')
    expect(wrapper.find('.calendar-view__month').text()).toBe('Июль 2026')
  })

  it('selecting a day updates the day panel events', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 15, 14, 0).toISOString())]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cells = wrapper.findAll('.lk-calendar-grid__cell')
    const target = cells.find((cell) => cell.text().startsWith('15'))
    await target?.trigger('click')

    expect(wrapper.text()).toContain('Напоминание r-1')
    expect(wrapper.text()).toContain('14:00')
  })

  it('opens the event route on chip double-click in the month grid', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 15, 14, 0).toISOString())]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper, router } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cells = wrapper.findAll('.lk-calendar-grid__cell')
    const day15 = cells.find((cell) => cell.text().startsWith('15'))
    await day15?.find('.lk-calendar-grid__event').trigger('dblclick')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/lk/reminders/r-1'))
  })

  it('single click on a chip still selects the day without navigating away', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 15, 14, 0).toISOString())]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    const { wrapper, router } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cells = wrapper.findAll('.lk-calendar-grid__cell')
    const day15 = cells.find((cell) => cell.text().startsWith('15'))
    await day15?.find('.lk-calendar-grid__event').trigger('click')

    expect(router.currentRoute.value.name).toBe('lk-calendar')
    expect(wrapper.text()).toContain('Напоминание r-1')
    expect(wrapper.text()).toContain('14:00')
  })

  it('positions the day panel as a right rail only from the wide-desktop breakpoint (>=1280px)', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(paginated([]))

    // 1024-1279px: desktop grid (chips), but the day panel is still a section
    // below the grid, not a right rail.
    stubMatchMedia({ [LK_DESKTOP_QUERY]: true, [LK_WIDE_DESKTOP_QUERY]: false })
    const narrowDesktop = await mountCalendarView()
    await vi.waitFor(() => expect(narrowDesktop.wrapper.text()).not.toContain('Загрузка'))
    expect(narrowDesktop.wrapper.find('.calendar-view__day--rail').exists()).toBe(false)
    expect(narrowDesktop.wrapper.find('.calendar-view__layout--rail').exists()).toBe(false)
    vi.unstubAllGlobals()

    // >=1280px: right rail.
    stubMatchMedia({ [LK_DESKTOP_QUERY]: true, [LK_WIDE_DESKTOP_QUERY]: true })
    const wideDesktop = await mountCalendarView()
    await vi.waitFor(() => expect(wideDesktop.wrapper.text()).not.toContain('Загрузка'))
    expect(wideDesktop.wrapper.find('.calendar-view__day--rail').exists()).toBe(true)
    expect(wideDesktop.wrapper.find('.calendar-view__layout--rail').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('aggregates a reminder, a goods-list deadline and a task-list reminder into the grid and day panel end-to-end', async () => {
    stubMatchMedia(true)
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginated([makeReminder('r-1', new Date(2026, 6, 15, 21, 0).toISOString())]),
    )
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue(
      paginated([makeList('l-goods', 'goods'), makeList('l-tasks', 'tasks')]),
    )
    vi.mocked(shoppingListsApi.fetchItems).mockImplementation(async (uuid: string) => {
      if (uuid === 'l-goods') {
        return [makeItem('i-1', 'Купить молоко', { deadline: '2026-07-15' })]
      }
      return [makeItem('i-2', 'Сдать отчёт', { reminder_at: new Date(2026, 6, 15, 8, 0).toISOString() })]
    })

    const { wrapper } = await mountCalendarView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const cells = wrapper.findAll('.lk-calendar-grid__cell')
    const day15 = cells.find((cell) => cell.text().startsWith('15'))
    expect(day15).toBeDefined()
    // Reminder + goods deadline + task reminder — 3 events, all visible (limit is 3).
    expect(day15?.findAll('.lk-calendar-grid__event')).toHaveLength(3)

    await day15?.trigger('click')

    const rows = wrapper.findAll('.lk-calendar-event-row')
    expect(rows).toHaveLength(3)
    const rowTexts = rows.map((row) => row.text())
    expect(rowTexts.some((text) => text.includes('Напоминания') && text.includes('Напоминание r-1'))).toBe(
      true,
    )
    expect(rowTexts.some((text) => text.includes('Списки') && text.includes('Купить молоко'))).toBe(true)
    expect(rowTexts.some((text) => text.includes('Дела') && text.includes('Сдать отчёт'))).toBe(true)

    const taskRow = rows.find((row) => row.text().includes('Сдать отчёт'))
    expect(taskRow?.find('a').attributes('href')).toBe('/lk/lists/l-tasks')
    const goodsRow = rows.find((row) => row.text().includes('Купить молоко'))
    expect(goodsRow?.find('a').attributes('href')).toBe('/lk/lists/l-goods')
    const reminderRow = rows.find((row) => row.text().includes('Напоминание r-1'))
    expect(reminderRow?.find('a').attributes('href')).toBe('/lk/reminders/r-1')
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    fetchItems: vi.fn(),
  },
}))
