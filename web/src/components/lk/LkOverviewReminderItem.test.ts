import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkOverviewReminderItem from './LkOverviewReminderItem.vue'
import type { Reminder } from '@/types/reminder'

const TODAY = new Date(2026, 6, 6, 9, 0)

function makeReminder(remindAt: string, isCompleted = false): Reminder {
  return {
    uuid: 'r-1',
    title: 'Купить молоко',
    notes: null,
    remind_at: remindAt,
    recurrence: 'none',
    is_completed: isCompleted,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }
}

describe('LkOverviewReminderItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a checkbox (not the bell icon) for the "today" variant, per the design brief', () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 6, 21, 0).toISOString()), variant: 'today' },
    })

    expect(wrapper.find('.lk-reminder-item__checkbox').exists()).toBe(true)
    expect(wrapper.find('.lk-reminder-item__icon').exists()).toBe(false)
    expect(wrapper.text()).toContain('Купить молоко')
    expect(wrapper.find('.lk-reminder-item__time').text()).toBe('Сегодня · 21:00')
  })

  it('shows the bell icon (not a checkbox) for the "upcoming" variant, per the design brief', () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 9, 8, 30).toISOString()), variant: 'upcoming' },
    })

    expect(wrapper.find('.lk-reminder-item__icon').exists()).toBe(true)
    expect(wrapper.find('.lk-reminder-item__checkbox').exists()).toBe(false)
  })

  it('emits complete with the reminder uuid when the today checkbox is clicked', async () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 6, 21, 0).toISOString()), variant: 'today' },
    })

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')

    expect(wrapper.emitted('complete')?.[0]).toEqual(['r-1'])
  })

  it('does not emit open when the checkbox is clicked (stopPropagation, no navigation)', async () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 6, 21, 0).toISOString()), variant: 'today' },
    })

    await wrapper.find('.lk-reminder-item__checkbox').trigger('click')

    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('emits open with the reminder uuid when the row body is clicked (today variant)', async () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 6, 21, 0).toISOString()), variant: 'today' },
    })

    await wrapper.find('.lk-reminder-item__body').trigger('click')

    expect(wrapper.emitted('open')?.[0]).toEqual(['r-1'])
    expect(wrapper.emitted('complete')).toBeUndefined()
  })

  it('emits open with the reminder uuid when the row body is clicked (upcoming variant)', async () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 9, 8, 30).toISOString()), variant: 'upcoming' },
    })

    await wrapper.find('.lk-reminder-item__body').trigger('click')

    expect(wrapper.emitted('open')?.[0]).toEqual(['r-1'])
  })

  it('emits open on Enter/Space keydown for keyboard accessibility', async () => {
    const wrapper = mount(LkOverviewReminderItem, {
      props: { reminder: makeReminder(new Date(2026, 6, 6, 21, 0).toISOString()), variant: 'today' },
    })

    const body = wrapper.find('.lk-reminder-item__body')
    expect(body.attributes('role')).toBe('button')
    expect(body.attributes('tabindex')).toBe('0')

    await body.trigger('keydown.enter')
    expect(wrapper.emitted('open')).toHaveLength(1)

    await body.trigger('keydown.space')
    expect(wrapper.emitted('open')).toHaveLength(2)
  })
})
