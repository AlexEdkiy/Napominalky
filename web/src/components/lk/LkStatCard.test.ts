import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import LkStatCard from './LkStatCard.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk', name: 'lk-dashboard', component: { template: '<div />' } },
      { path: '/lk/tasks', name: 'lk-tasks', component: { template: '<div />' } },
    ],
  })
}

describe('LkStatCard', () => {
  it('renders the icon square, value and label per the design brief', () => {
    const wrapper = mount(LkStatCard, {
      props: { icon: 'list', variant: 'blue', value: '12', label: 'Активных задач' },
    })

    expect(wrapper.find('.lk-stat-card__icon svg').exists()).toBe(true)
    expect(wrapper.find('.lk-stat-card__value').text()).toBe('12')
    expect(wrapper.find('.lk-stat-card__label').text()).toBe('Активных задач')
  })

  it.each([
    ['blue', 'lk-stat-card--blue'],
    ['amber', 'lk-stat-card--amber'],
    ['teal', 'lk-stat-card--teal'],
    ['gradient', 'lk-stat-card--gradient'],
  ] as const)('applies the %s variant class carrying the color token', (variant, expectedClass) => {
    const wrapper = mount(LkStatCard, {
      props: { icon: 'check', variant, value: '1', label: 'Label' },
    })

    expect(wrapper.classes()).toContain(expectedClass)
  })

  it('renders as a static, non-clickable <article> when no "to" prop is given', () => {
    const wrapper = mount(LkStatCard, {
      props: { icon: 'check', variant: 'gradient', value: '40%', label: 'Выполнено за неделю' },
    })

    expect(wrapper.element.tagName).toBe('ARTICLE')
    expect(wrapper.classes()).not.toContain('lk-stat-card--clickable')
  })

  it('renders as a clickable link and navigates to the "to" route when clicked', async () => {
    const router = createTestRouter()
    await router.push({ name: 'lk-dashboard' })
    const wrapper = mount(LkStatCard, {
      props: {
        icon: 'list',
        variant: 'blue',
        value: '3',
        label: 'Активных задач',
        to: { name: 'lk-tasks' },
      },
      global: { plugins: [router] },
    })

    expect(wrapper.classes()).toContain('lk-stat-card--clickable')
    expect(wrapper.element.tagName).toBe('A')

    await wrapper.trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
  })
})
