import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkReminderFormDialog from './LkReminderFormDialog.vue'
import { remindersApi } from '@/api/remindersApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Reminder } from '@/types/reminder'

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

function mountDialog() {
  stubMatchMedia(true)
  return mount(LkReminderFormDialog)
}

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    uuid: 'r-1',
    title: 'Позвонить врачу',
    notes: 'Уточнить время',
    remind_at: '2026-07-09T12:00:00.000Z',
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

describe('LkReminderFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 9, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when the form is closed', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.lk-form-dialog__overlay').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('shows the "new" title with the 4 date presets and 4 time presets, none selected', async () => {
    const wrapper = mountDialog()
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Новое напоминание')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(false)

    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    const datePills = pillGroups[0]!.findAll('.lk-form-dialog__pill')
    expect(datePills.map((pill) => pill.text())).toEqual(['Сегодня', 'Завтра', 'В выходные', 'Через неделю'])
    expect(wrapper.findAll('.lk-form-dialog__pill--active')).toHaveLength(1) // "Без повтора" по умолчанию

    const timePills = pillGroups[1]!.findAll('.lk-form-dialog__pill')
    expect(timePills.map((pill) => pill.text())).toEqual(['09:00', '12:00', '18:00', '21:00'])
    vi.unstubAllGlobals()
  })

  it('shows a validation error when the title is empty', async () => {
    const wrapper = mountDialog()
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Введите текст напоминания')
    expect(remindersApi.createReminder).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('shows a validation error when the date/time pills are not selected', async () => {
    const wrapper = mountDialog()
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#reminder-form-title').setValue('Позвонить маме')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Укажите дату и время напоминания')
    expect(remindersApi.createReminder).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('builds remind_at from the selected date pill + time pill and creates the reminder', async () => {
    const wrapper = mountDialog()
    vi.mocked(remindersApi.createReminder).mockResolvedValue(makeReminder({ uuid: 'r-2' }))
    const forms = useLkForms()
    forms.openReminderForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#reminder-form-title').setValue('Купить корм')
    await wrapper.find('#reminder-form-notes').setValue('Для кота')
    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    await pillGroups[0]!.findAll('.lk-form-dialog__pill')[1]!.trigger('click') // Завтра
    await pillGroups[1]!.findAll('.lk-form-dialog__pill')[2]!.trigger('click') // 18:00
    await wrapper.find('form').trigger('submit')

    const expectedIso = new Date(2026, 6, 10, 18, 0).toISOString()
    await vi.waitFor(() =>
      expect(remindersApi.createReminder).toHaveBeenCalledWith({
        title: 'Купить корм',
        notes: 'Для кота',
        remind_at: expectedIso,
        recurrence: 'none',
      }),
    )
    expect(forms.remindersVersion.value).toBe(1)
    expect(forms.isReminderFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('includes the selected recurrence pill in the payload', async () => {
    const wrapper = mountDialog()
    vi.mocked(remindersApi.createReminder).mockResolvedValue(makeReminder({ uuid: 'r-2' }))
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#reminder-form-title').setValue('Оплатить счёт')
    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    await pillGroups[0]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click') // Сегодня
    await pillGroups[1]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click') // 09:00
    await pillGroups[2]!.findAll('.lk-form-dialog__pill')[2]!.trigger('click') // Еженедельно
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(remindersApi.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({ recurrence: 'weekly' }),
      ),
    )
    vi.unstubAllGlobals()
  })

  it('pre-selects the matching date/time pills and prefills fields in edit mode', async () => {
    const wrapper = mountDialog()
    // remind_at совпадает с пресетом "Сегодня" + "12:00" (UTC-строка ниже
    // соответствует локальному полудню при системном времени теста).
    const reminder = makeReminder({
      remind_at: new Date(2026, 6, 9, 12, 0).toISOString(),
    })
    useLkForms().openReminderForm(reminder)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Редактирование напоминания')
    expect((wrapper.find('#reminder-form-title').element as HTMLInputElement).value).toBe('Позвонить врачу')
    expect((wrapper.find('#reminder-form-notes').element as HTMLInputElement).value).toBe('Уточнить время')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(true)

    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    const activeDate = pillGroups[0]!.find('.lk-form-dialog__pill--active')
    expect(activeDate.text()).toBe('Сегодня')
    const activeTime = pillGroups[1]!.find('.lk-form-dialog__pill--active')
    expect(activeTime.text()).toBe('12:00')
    vi.unstubAllGlobals()
  })

  it('adds and selects an "actual" pill when the reminder date/time do not match any preset', async () => {
    const wrapper = mountDialog()
    const offPresetDate = new Date(2026, 6, 20, 14, 37)
    const reminder = makeReminder({ remind_at: offPresetDate.toISOString() })
    useLkForms().openReminderForm(reminder)
    await wrapper.vm.$nextTick()

    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    const dateLabels = pillGroups[0]!.findAll('.lk-form-dialog__pill').map((pill) => pill.text())
    expect(dateLabels).toHaveLength(5)
    expect(pillGroups[0]!.find('.lk-form-dialog__pill--active').text()).toBe(dateLabels[4])

    const timeLabels = pillGroups[1]!.findAll('.lk-form-dialog__pill').map((pill) => pill.text())
    expect(timeLabels[0]).toBe('14:37')
    expect(pillGroups[1]!.find('.lk-form-dialog__pill--active').text()).toBe('14:37')
    vi.unstubAllGlobals()
  })

  it('updates an existing reminder using its uuid', async () => {
    const wrapper = mountDialog()
    const reminder = makeReminder({ remind_at: new Date(2026, 6, 9, 12, 0).toISOString() })
    vi.mocked(remindersApi.updateReminder).mockResolvedValue({ ...reminder, title: 'Обновлено' })
    const forms = useLkForms()
    forms.openReminderForm(reminder)
    await wrapper.vm.$nextTick()

    await wrapper.find('#reminder-form-title').setValue('Обновлено')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(remindersApi.updateReminder).toHaveBeenCalledWith(
        'r-1',
        expect.objectContaining({ title: 'Обновлено' }),
      ),
    )
    expect(forms.remindersVersion.value).toBe(1)
    vi.unstubAllGlobals()
  })

  it('shows a field-level validation error from a 422 API response', async () => {
    const wrapper = mountDialog()
    vi.mocked(remindersApi.createReminder).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Обязательное поле'] } } },
    })
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#reminder-form-title').setValue('Что-то')
    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    await pillGroups[0]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await pillGroups[1]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Обязательное поле'))
    vi.unstubAllGlobals()
  })

  it('deletes the reminder from the footer after confirmation', async () => {
    const wrapper = mountDialog()
    const reminder = makeReminder({ remind_at: new Date(2026, 6, 9, 12, 0).toISOString() })
    vi.mocked(remindersApi.deleteReminder).mockResolvedValue(undefined)
    const forms = useLkForms()
    forms.openReminderForm(reminder)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    expect(wrapper.text()).toContain('Удалить напоминание?')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(remindersApi.deleteReminder).toHaveBeenCalledWith('r-1'))
    expect(forms.remindersVersion.value).toBe(1)
    expect(forms.isReminderFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const wrapper = mountDialog()
    const reminder = makeReminder({ remind_at: new Date(2026, 6, 9, 12, 0).toISOString() })
    useLkForms().openReminderForm(reminder)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(remindersApi.deleteReminder).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('closes on Cancel, the close button, Escape and the scrim click', async () => {
    const wrapper = mountDialog()
    const forms = useLkForms()

    forms.openReminderForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__cancel').trigger('click')
    expect(forms.isReminderFormOpen.value).toBe(false)

    forms.openReminderForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__close').trigger('click')
    expect(forms.isReminderFormOpen.value).toBe(false)

    forms.openReminderForm()
    await wrapper.vm.$nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(forms.isReminderFormOpen.value).toBe(false)

    forms.openReminderForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__overlay').trigger('click')
    expect(forms.isReminderFormOpen.value).toBe(false)

    vi.unstubAllGlobals()
  })

  it('renders as a bottom sheet on mobile and a centered modal on desktop', async () => {
    stubMatchMedia(false)
    const mobile = mount(LkReminderFormDialog)
    useLkForms().openReminderForm()
    await mobile.vm.$nextTick()
    expect(mobile.find('.lk-form-dialog__overlay--desktop').exists()).toBe(false)
    vi.unstubAllGlobals()

    resetLkFormsForTests()
    const wrapper = mountDialog()
    useLkForms().openReminderForm()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-form-dialog__overlay--desktop').exists()).toBe(true)
    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
  },
}))
