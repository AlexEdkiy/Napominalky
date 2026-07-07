import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkCalendarLegend from './LkCalendarLegend.vue'

describe('LkCalendarLegend', () => {
  it('renders one legend item per event type with its label', () => {
    const wrapper = mount(LkCalendarLegend)

    const labels = wrapper.findAll('.lk-calendar-legend__item').map((item) => item.text())
    expect(labels).toEqual(['Списки', 'Напоминания', 'Дела'])
  })

  it('applies the compact modifier class when compact is true', () => {
    const wrapper = mount(LkCalendarLegend, { props: { compact: true } })

    expect(wrapper.find('.lk-calendar-legend--compact').exists()).toBe(true)
  })
})
