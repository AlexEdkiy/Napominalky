import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import LkBottomNav from './LkBottomNav.vue'

const StubView = { template: '<div />' }

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk', name: 'lk-dashboard', component: StubView },
      { path: '/lk/tasks', name: 'lk-tasks', component: StubView },
      { path: '/lk/reminders', name: 'lk-reminders', component: StubView },
      // Без `:uuid`-параметра — в тесте важно только имя маршрута для подсветки.
      { path: '/lk/reminders/edit', name: 'lk-reminder-edit', component: StubView },
      { path: '/lk/calendar', name: 'lk-calendar', component: StubView },
      { path: '/lk/notes', name: 'lk-notes', component: StubView },
    ],
  })
}

async function mountBottomNav(routeName: string) {
  const router = createTestRouter()
  await router.push({ name: routeName })
  return mount(LkBottomNav, { global: { plugins: [router] } })
}

describe('LkBottomNav', () => {
  it('renders the 6 slots in order: Обзор, Задачи, Напомин., [+ center], Календарь, Заметки', async () => {
    const wrapper = await mountBottomNav('lk-dashboard')

    const slotLabels = wrapper.findAll('.lk-bottom-nav > *').map((node) => {
      if (node.classes().includes('lk-bottom-nav__create')) return '+'
      return node.find('.lk-bottom-nav__label').text()
    })

    expect(slotLabels).toEqual(['Главная', 'Задачи', 'Напомин.', '+', 'Календарь', 'Заметки'])
  })

  it('highlights the active nav item in teal, matching the current route', async () => {
    const wrapper = await mountBottomNav('lk-calendar')

    const activeLinks = wrapper.findAll('.lk-bottom-nav__link--active')
    expect(activeLinks).toHaveLength(1)
    expect(activeLinks[0]?.find('.lk-bottom-nav__label').text()).toBe('Календарь')
  })

  it('highlights ONLY «Напомин.» on the reminders routes (не «Задачи»)', async () => {
    for (const routeName of ['lk-reminders', 'lk-reminder-edit']) {
      const wrapper = await mountBottomNav(routeName)
      const activeLinks = wrapper.findAll('.lk-bottom-nav__link--active')
      expect(activeLinks).toHaveLength(1)
      expect(activeLinks[0]?.find('.lk-bottom-nav__label').text()).toBe('Напомин.')
    }
  })

  it('emits create when the central teal button is pressed', async () => {
    const wrapper = await mountBottomNav('lk-dashboard')

    await wrapper.find('.lk-bottom-nav__create').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
  })
})
