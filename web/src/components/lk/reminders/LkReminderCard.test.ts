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
