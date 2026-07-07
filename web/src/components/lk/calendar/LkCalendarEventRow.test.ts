import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import LkCalendarEventRow from './LkCalendarEventRow.vue'
import type { LkCalendarEvent } from '@/types/lkCalendar'

const StubView = { template: '<div />' }

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: StubView },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: StubView },
    ],
  })
}

function makeEvent(overrides: Partial<LkCalendarEvent> = {}): LkCalendarEvent {
  return {
    id: 'reminder-r-1',
    title: 'Купить молоко',
    dateKey: '2026-07-10',
    time: '09:00',
    type: 'reminder',
    route: { name: 'lk-reminder-edit', params: { uuid: 'r-1' } },
    ...overrides,
  }
}

async function mountRow(event: LkCalendarEvent) {
  const router = createTestRouter()
  await router.push('/lk/reminders/r-1')
  return mount(LkCalendarEventRow, { props: { event }, global: { plugins: [router] } })
}

describe('LkCalendarEventRow', () => {
  it('renders the type label, time and title for a timed event', async () => {
    const wrapper = await mountRow(makeEvent())

    expect(wrapper.find('.lk-calendar-event-row__type').text()).toBe('Напоминания')
    expect(wrapper.find('.lk-calendar-event-row__time').text()).toBe('09:00')
    expect(wrapper.find('.lk-calendar-event-row__title').text()).toBe('Купить молоко')
  })

  it('shows "Весь день" for a deadline event without a time', async () => {
    const wrapper = await mountRow(makeEvent({ time: null, type: 'list' }))

    expect(wrapper.find('.lk-calendar-event-row__time').text()).toBe('Весь день')
    expect(wrapper.find('.lk-calendar-event-row__type').text()).toBe('Списки')
  })

  it('links to the event route', async () => {
    const wrapper = await mountRow(
      makeEvent({ type: 'task', route: { name: 'lk-list-detail', params: { uuid: 'l-2' } } }),
    )

    expect(wrapper.find('.lk-calendar-event-row__type').text()).toBe('Дела')
    expect(wrapper.find('a').attributes('href')).toBe('/lk/lists/l-2')
  })
})
