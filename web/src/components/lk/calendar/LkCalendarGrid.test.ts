import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkCalendarGrid from './LkCalendarGrid.vue'
import type { LkCalendarEvent } from '@/types/lkCalendar'

function makeEvent(id: string, title: string): LkCalendarEvent {
  return {
    id,
    title,
    dateKey: '2026-07-10',
    time: '09:00',
    type: 'reminder',
    route: { name: 'lk-reminder-edit', params: { uuid: id } },
  }
}

describe('LkCalendarGrid', () => {
  it('renders a 6x7 grid of day cells', () => {
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay: new Map(), selectedDate: new Date(2026, 6, 10) },
    })

    expect(wrapper.findAll('.lk-calendar-grid__cell')).toHaveLength(42)
  })

  it('renders truncated event chips with titles in non-compact mode', () => {
    const byDay = new Map([['2026-07-10', [makeEvent('r-1', 'Позвонить врачу')]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10), compact: false },
    })

    expect(wrapper.find('.lk-calendar-grid__event-title').text()).toBe('Позвонить врачу')
    expect(wrapper.find('.lk-calendar-grid__event--dot').exists()).toBe(false)
  })

  it('collapses chips into plain dots without titles in compact mode', () => {
    const byDay = new Map([['2026-07-10', [makeEvent('r-1', 'Позвонить врачу')]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10), compact: true },
    })

    expect(wrapper.find('.lk-calendar-grid__event--dot').exists()).toBe(true)
    expect(wrapper.find('.lk-calendar-grid__event-title').exists()).toBe(false)
  })

  it('shows a "+N" overflow marker beyond the visible event limit', () => {
    const events = [
      makeEvent('e-1', 'Событие 1'),
      makeEvent('e-2', 'Событие 2'),
      makeEvent('e-3', 'Событие 3'),
      makeEvent('e-4', 'Событие 4'),
    ]
    const byDay = new Map([['2026-07-10', events]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10) },
    })

    expect(wrapper.find('.lk-calendar-grid__more').text()).toBe('+1')
  })

  it('marks the selected day cell', () => {
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay: new Map(), selectedDate: new Date(2026, 6, 10) },
    })

    const selected = wrapper.find('.lk-calendar-grid__cell--selected')
    expect(selected.exists()).toBe(true)
    expect(selected.attributes('aria-selected')).toBe('true')
  })

  it('emits openEvent with the event on chip double-click and does not leak an extra selectDay', async () => {
    const event = makeEvent('r-1', 'Позвонить врачу')
    const byDay = new Map([['2026-07-10', [event]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10), compact: false },
    })

    await wrapper.find('.lk-calendar-grid__event').trigger('dblclick')

    expect(wrapper.emitted('openEvent')).toHaveLength(1)
    expect(wrapper.emitted('openEvent')?.[0]).toEqual([event])
    expect(wrapper.emitted('selectDay')).toBeUndefined()
  })

  it('emits openEvent on dot double-click in compact mode', async () => {
    const event = makeEvent('r-1', 'Позвонить врачу')
    const byDay = new Map([['2026-07-10', [event]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10), compact: true },
    })

    await wrapper.find('.lk-calendar-grid__event--dot').trigger('dblclick')

    expect(wrapper.emitted('openEvent')?.[0]).toEqual([event])
  })

  it('keeps single click on a chip selecting the day (bubbles to the cell)', async () => {
    const byDay = new Map([['2026-07-10', [makeEvent('r-1', 'Позвонить врачу')]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 1), compact: false },
    })

    await wrapper.find('.lk-calendar-grid__event').trigger('click')

    expect(wrapper.emitted('openEvent')).toBeUndefined()
    expect(wrapper.emitted('selectDay')).toHaveLength(1)
    const [emittedDate] = wrapper.emitted('selectDay')?.[0] as [Date]
    expect(emittedDate.getDate()).toBe(10)
  })

  it('shows the event title as a tooltip/aria-label on the chip', () => {
    const byDay = new Map([['2026-07-10', [makeEvent('r-1', 'Позвонить врачу')]]])
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay, selectedDate: new Date(2026, 6, 10) },
    })

    const chip = wrapper.find('.lk-calendar-grid__event')
    expect(chip.attributes('title')).toContain('Позвонить врачу')
    expect(chip.attributes('aria-label')).toBe('Позвонить врачу')
  })

  it('emits selectDay with the clicked date', async () => {
    const wrapper = mount(LkCalendarGrid, {
      props: { year: 2026, month: 6, byDay: new Map(), selectedDate: new Date(2026, 6, 10) },
    })

    const cells = wrapper.findAll('.lk-calendar-grid__cell:not(.lk-calendar-grid__cell--muted)')
    await cells[0]?.trigger('click')

    expect(wrapper.emitted('selectDay')).toHaveLength(1)
    const [emittedDate] = wrapper.emitted('selectDay')?.[0] as [Date]
    expect(emittedDate.getDate()).toBe(1)
  })
})
