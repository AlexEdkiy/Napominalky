import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkStatCard from './LkStatCard.vue'

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
})
