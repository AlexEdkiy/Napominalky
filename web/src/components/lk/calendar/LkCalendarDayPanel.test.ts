import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import LkCalendarDayPanel from './LkCalendarDayPanel.vue'
import type { LkCalendarEvent } from '@/types/lkCalendar'

const StubView = { template: '<div />' }

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: StubView }],
  })
}

async function mountPanel(date: Date, events: LkCalendarEvent[]) {
  const router = createTestRouter()
  await router.push('/lk/reminders/r-1')
  return mount(LkCalendarDayPanel, { props: { date, events }, global: { plugins: [router] } })
}

describe('LkCalendarDayPanel', () => {
  it('shows the empty state when there are no events for the day', async () => {
    const wrapper = await mountPanel(new Date(2026, 6, 10), [])

    expect(wrapper.text()).toContain('На этот день ничего не запланировано.')
    expect(wrapper.find('.lk-calendar-day-panel__list').exists()).toBe(false)
  })

  it('renders one row per event of the selected day', async () => {
    const events: LkCalendarEvent[] = [
      {
        id: 'reminder-r-1',
        title: 'Позвонить врачу',
        dateKey: '2026-07-10',
        time: '09:00',
        type: 'reminder',
        route: { name: 'lk-reminder-edit', params: { uuid: 'r-1' } },
      },
    ]
    const wrapper = await mountPanel(new Date(2026, 6, 10), events)

    expect(wrapper.findAll('.lk-calendar-event-row')).toHaveLength(1)
    expect(wrapper.text()).toContain('Позвонить врачу')
  })

  it('formats the full ru-RU date in the heading', async () => {
    const wrapper = await mountPanel(new Date(2026, 6, 10), [])

    expect(wrapper.find('.lk-calendar-day-panel__title').text()).toContain('июля')
    expect(wrapper.find('.lk-calendar-day-panel__title').text()).toContain('2026')
  })
})
