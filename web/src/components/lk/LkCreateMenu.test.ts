import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkCreateMenu from './LkCreateMenu.vue'

describe('LkCreateMenu', () => {
  it('renders the 3 items in order with the design-brief colour coding', () => {
    const wrapper = mount(LkCreateMenu)

    const items = wrapper.findAll('.lk-create-menu__item')
    expect(items.map((item) => item.text())).toEqual(['Заметка', 'Напоминание', 'Список'])
    expect(items[0]?.find('.lk-create-menu__icon--teal').exists()).toBe(true)
    expect(items[1]?.find('.lk-create-menu__icon--amber').exists()).toBe(true)
    expect(items[2]?.find('.lk-create-menu__icon--blue').exists()).toBe(true)
  })

  it('emits the matching event for each item', async () => {
    const wrapper = mount(LkCreateMenu)
    const items = wrapper.findAll('.lk-create-menu__item')

    await items[0]?.trigger('click')
    expect(wrapper.emitted('selectNote')).toHaveLength(1)

    await items[1]?.trigger('click')
    expect(wrapper.emitted('selectReminder')).toHaveLength(1)

    await items[2]?.trigger('click')
    expect(wrapper.emitted('selectList')).toHaveLength(1)
  })
})
