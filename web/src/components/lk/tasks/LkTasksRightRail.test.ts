import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { VueWrapper } from '@vue/test-utils'

import LkTasksRightRail from './LkTasksRightRail.vue'
import { remindersApi } from '@/api/remindersApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Reminder } from '@/types/reminder'

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    uuid: 'r-1',
    title: 'Позвонить врачу',
    notes: null,
    remind_at: '2026-07-10T18:00:00.000Z',
    recurrence: 'none',
    is_completed: false,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginated = (data: Reminder[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

// `useLkForms`/`remindersVersion` — module-level singleton: если не
// размонтировать компоненты, их `watch(remindersVersion, ...)` продолжает
// реагировать на бампы версии из последующих тестов. Отслеживаем обёртки и
// размонтируем в `afterEach`.
const mountedWrappers: VueWrapper[] = []

function mountRail() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/lk/calendar', name: 'lk-calendar', component: { template: '<div />' } }],
  })
  const wrapper = mount(LkTasksRightRail, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('LkTasksRightRail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('opens the reminder form modal with the full reminder when an upcoming item is clicked', async () => {
    const reminder = makeReminder({ uuid: 'r-1' })
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([reminder]))

    const wrapper = mountRail()
    await vi.waitFor(() => expect(wrapper.find('.lk-reminder-item').exists()).toBe(true))

    await wrapper.find('.lk-reminder-item__body').trigger('click')

    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toEqual(reminder)
  })

  it('reloads the upcoming reminders after a save through the modal (remindersVersion bump)', async () => {
    // Монтирование дёргает `fetchReminders` дважды (мини-календарь + список
    // «Ближайшие напоминания») — используем общий базовый мок для обоих.
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginated([]))

    const wrapper = mountRail()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Предстоящих напоминаний нет'))
    const callsAfterMount = vi.mocked(remindersApi.fetchReminders).mock.calls.length

    vi.mocked(remindersApi.fetchReminders).mockResolvedValueOnce(paginated([makeReminder({ uuid: 'r-2' })]))
    useLkForms().notifyReminderSaved()

    await vi.waitFor(() =>
      expect(remindersApi.fetchReminders).toHaveBeenCalledTimes(callsAfterMount + 1),
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('Позвонить врачу'))
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
  },
}))
