import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'

import ReminderEditView from './ReminderEditView.vue'
import { remindersApi } from '@/api/remindersApi'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import type { Reminder } from '@/types/reminder'

const reminder: Reminder = {
  uuid: 'r-1',
  title: 'Позвонить врачу',
  notes: 'Уточнить время приёма',
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
      { path: '/lk/reminders/new', name: 'lk-reminder-create', component: ReminderEditView },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: ReminderEditView },
    ],
  })
}

/** Хост-компонент: предоставляет «хвост» крошек, как это делает `LkLayout`. */
function makeHost() {
  return defineComponent({
    setup() {
      const tail = provideLkBreadcrumbTail()
      return { tail }
    },
    template: '<div><span class="tail">{{ tail ?? "none" }}</span><RouterView /></div>',
  })
}

async function mountEdit(routeName: 'lk-reminder-create' | 'lk-reminder-edit', uuid?: string) {
  const router = createTestRouter()
  await router.push(uuid ? { name: routeName, params: { uuid } } : { name: routeName })
  const wrapper = mount(makeHost(), { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return { wrapper, router }
}

describe('ReminderEditView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the create form immediately without loading an existing reminder', async () => {
    const { wrapper } = await mountEdit('lk-reminder-create')

    expect(wrapper.text()).toContain('Новое напоминание')
    expect(remindersApi.fetchReminder).not.toHaveBeenCalled()
    expect(wrapper.find('.tail').text()).toBe('none')
  })

  it('loads an existing reminder and writes its title into the shared breadcrumb tail', async () => {
    vi.mocked(remindersApi.fetchReminder).mockResolvedValue(reminder)

    const { wrapper } = await mountEdit('lk-reminder-edit', 'r-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect((wrapper.find('#reminder-title').element as HTMLInputElement).value).toBe('Позвонить врачу')
    await vi.waitFor(() => expect(wrapper.find('.tail').text()).toBe('Позвонить врачу'))
  })

  it('creates a reminder with the entered title/notes/datetime/recurrence', async () => {
    vi.mocked(remindersApi.createReminder).mockResolvedValue({ ...reminder, uuid: 'r-2' })

    const { wrapper, router } = await mountEdit('lk-reminder-create')

    await wrapper.find('#reminder-title').setValue('Купить корм')
    await wrapper.find('#reminder-notes').setValue('Для кота')
    await wrapper.find('#reminder-remind-at').setValue('2026-07-15T09:30')
    const recurrenceButtons = wrapper.findAll('.reminder-edit__recurrence-btn')
    await recurrenceButtons[2]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(remindersApi.createReminder).toHaveBeenCalledWith({
        title: 'Купить корм',
        notes: 'Для кота',
        remind_at: new Date('2026-07-15T09:30').toISOString(),
        recurrence: 'weekly',
      }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
  })

  it('updates an existing reminder', async () => {
    vi.mocked(remindersApi.fetchReminder).mockResolvedValue(reminder)
    vi.mocked(remindersApi.updateReminder).mockResolvedValue({ ...reminder, title: 'Обновлено' })

    const { wrapper, router } = await mountEdit('lk-reminder-edit', 'r-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('#reminder-title').setValue('Обновлено')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(remindersApi.updateReminder).toHaveBeenCalledWith('r-1', expect.objectContaining({
      title: 'Обновлено',
    })))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
  })

  it('deletes the reminder after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.mocked(remindersApi.fetchReminder).mockResolvedValue(reminder)
    vi.mocked(remindersApi.deleteReminder).mockResolvedValue(undefined)

    const { wrapper, router } = await mountEdit('lk-reminder-edit', 'r-1')
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminder-edit__delete').trigger('click')

    await vi.waitFor(() => expect(remindersApi.deleteReminder).toHaveBeenCalledWith('r-1'))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-reminders'))
    vi.unstubAllGlobals()
  })

  it('does not show a delete button in create mode', async () => {
    const { wrapper } = await mountEdit('lk-reminder-create')
    expect(wrapper.find('.reminder-edit__delete').exists()).toBe(false)
  })

  it('shows a validation error message from a 422 API response', async () => {
    vi.mocked(remindersApi.createReminder).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Обязательное поле'] } } },
    })

    const { wrapper } = await mountEdit('lk-reminder-create')
    await wrapper.find('#reminder-remind-at').setValue('2026-07-15T09:30')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Обязательное поле'))
  })

  it('shows a client-side validation error when the date/time field is empty', async () => {
    const { wrapper } = await mountEdit('lk-reminder-create')

    await wrapper.find('#reminder-title').setValue('Без даты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Укажите дату и время напоминания'))
    expect(remindersApi.createReminder).not.toHaveBeenCalled()
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
    fetchReminder: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    completeReminder: vi.fn(),
    snoozeReminder: vi.fn(),
  },
}))
