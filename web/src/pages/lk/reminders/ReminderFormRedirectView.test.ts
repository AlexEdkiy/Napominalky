import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import ReminderFormRedirectView from './ReminderFormRedirectView.vue'
import { remindersApi } from '@/api/remindersApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Reminder } from '@/types/reminder'

const reminder: Reminder = {
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
}

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/reminders', name: 'lk-reminders', component: { template: '<div />' } },
      { path: '/lk/reminders/new', name: 'lk-reminder-create', component: ReminderFormRedirectView },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: ReminderFormRedirectView },
    ],
  })
}

describe('ReminderFormRedirectView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  it('opens the reminder form for creation and redirects to lk-reminders on the "new" deep-link', async () => {
    const router = createTestRouter()
    await router.push({ name: 'lk-reminder-create' })
    mount(ReminderFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
    expect(useLkForms().isReminderFormOpen.value).toBe(true)
    expect(useLkForms().reminderFormReminder.value).toBeNull()
    expect(remindersApi.fetchReminder).not.toHaveBeenCalled()
  })

  it('fetches the reminder, opens the form pre-filled and redirects on the "edit" deep-link', async () => {
    vi.mocked(remindersApi.fetchReminder).mockResolvedValue(reminder)
    const router = createTestRouter()
    await router.push({ name: 'lk-reminder-edit', params: { uuid: 'r-1' } })
    mount(ReminderFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
    expect(remindersApi.fetchReminder).toHaveBeenCalledWith('r-1')
    expect(useLkForms().reminderFormReminder.value).toEqual(reminder)
  })

  it('still opens the form (as a blank creation) and redirects when the fetch fails', async () => {
    vi.mocked(remindersApi.fetchReminder).mockRejectedValue(new Error('network down'))
    const router = createTestRouter()
    await router.push({ name: 'lk-reminder-edit', params: { uuid: 'r-404' } })
    mount(ReminderFormRedirectView, { global: { plugins: [router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
    expect(useLkForms().isReminderFormOpen.value).toBe(true)
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminder: vi.fn(),
  },
}))
