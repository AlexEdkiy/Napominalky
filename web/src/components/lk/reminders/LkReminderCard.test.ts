import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkReminderCard from './LkReminderCard.vue'
import type { Reminder } from '@/types/reminder'

const reminder: Reminder = {
  uuid: 'r-1',
  title: 'Позвонить врачу',
  notes: 'Уточнить время приёма',
  remind_at: '2026-07-10T18:00:00.000Z',
  recurrence: 'weekly',
  is_completed: false,
  completed_at: null,
  snoozed_until: null,
  source_uuid: null,
  source_type: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

describe('LkReminderCard', () => {
  it('renders the title, notes and the recurrence badge', () => {
    const wrapper = mount(LkReminderCard, { props: { reminder } })

    expect(wrapper.text()).toContain('Позвонить врачу')
    expect(wrapper.text()).toContain('Уточнить время приёма')
    expect(wrapper.text()).toContain('Еженедельно')
    expect(wrapper.text()).toContain('Ожидает')
  })

  it('shows the "done" status and hides the action buttons when completed', () => {
    const wrapper = mount(LkReminderCard, { props: { reminder: { ...reminder, is_completed: true } } })

    expect(wrapper.text()).toContain('Выполнено')
    expect(wrapper.find('.lk-reminder-card__action--complete').exists()).toBe(false)
  })

  it('emits open when the card is clicked', async () => {
    const wrapper = mount(LkReminderCard, { props: { reminder } })

    await wrapper.find('.lk-reminder-card').trigger('click')

    expect(wrapper.emitted('open')).toEqual([['r-1']])
  })

  it('подсвечивает просрочку: danger-класс, статус «Просрочено», подпись', () => {
    const wrapper = mount(LkReminderCard, {
      props: { reminder, overdueText: 'просрочено на 3 дня' },
    })

    expect(wrapper.classes()).toContain('lk-reminder-card--overdue')
    expect(wrapper.text()).toContain('Просрочено')
    expect(wrapper.text()).toContain('просрочено на 3 дня')
    expect(wrapper.find('.lk-reminder-card__icon').classes()).toContain(
      'lk-reminder-card__icon--overdue',
    )
  })

  it('«Своё время»: пикер по кнопке, будущая дата эмитит snoozeUntil, прошлая — блокирует', async () => {
    const wrapper = mount(LkReminderCard, { props: { reminder } })
    expect(wrapper.find('.lk-reminder-card__custom-snooze').exists()).toBe(false)

    await wrapper.find('[aria-label="Отложить на своё время: Позвонить врачу"]').trigger('click')
    const input = wrapper.find('.lk-reminder-card__custom-snooze-input')
    expect(input.exists()).toBe(true)
    expect(wrapper.emitted('open')).toBeUndefined()

    // Прошлое время — кнопка «Отложить» заблокирована, эмита нет.
    await input.setValue('2020-01-01T10:00')
    const submit = wrapper.find<HTMLButtonElement>('.lk-reminder-card__custom-snooze-submit')
    expect(submit.element.disabled).toBe(true)
    await submit.trigger('click')
    expect(wrapper.emitted('snoozeUntil')).toBeUndefined()

    // Будущее время — эмит snoozeUntil с ISO, пикер закрывается.
    const future = new Date(Date.now() + 2 * 3_600_000)
    const pad = (n: number): string => String(n).padStart(2, '0')
    const local = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`
    await input.setValue(local)
    expect(submit.element.disabled).toBe(false)
    await submit.trigger('click')

    const emitted = wrapper.emitted('snoozeUntil')
    expect(emitted).toHaveLength(1)
    const [uuid, iso] = emitted![0] as [string, string]
    expect(uuid).toBe('r-1')
    expect(new Date(iso).getTime()).toBeGreaterThan(Date.now())
    expect(wrapper.find('.lk-reminder-card__custom-snooze').exists()).toBe(false)
  })

  it('emits complete/snooze/remove without triggering open (stopPropagation)', async () => {
    const wrapper = mount(LkReminderCard, { props: { reminder } })

    await wrapper.find('.lk-reminder-card__action--complete').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([['r-1']])
    expect(wrapper.emitted('open')).toBeUndefined()

    await wrapper.find('.lk-reminder-card__action--danger').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['r-1']])
    expect(wrapper.emitted('open')).toBeUndefined()
  })
})
