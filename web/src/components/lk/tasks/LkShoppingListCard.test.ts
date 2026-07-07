import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkShoppingListCard from './LkShoppingListCard.vue'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты на неделю',
  items_count: 4,
  checked_items_count: 2,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-07T00:00:00Z',
}

describe('LkShoppingListCard', () => {
  it('renders the title, progress fraction and "В работе" status for an incomplete list', () => {
    const wrapper = mount(LkShoppingListCard, { props: { list } })

    expect(wrapper.find('.lk-shopping-list-card__title').text()).toBe('Продукты на неделю')
    expect(wrapper.find('.lk-shopping-list-card__progress-label').text()).toBe('2 / 4')
    expect(wrapper.find('.lk-shopping-list-card__status').text()).toBe('В работе')
    expect(wrapper.find('.lk-shopping-list-card__status--active').exists()).toBe(true)
  })

  it('shows "Завершён" when every item is checked', () => {
    const wrapper = mount(LkShoppingListCard, {
      props: { list: { ...list, items_count: 3, checked_items_count: 3 } },
    })

    expect(wrapper.find('.lk-shopping-list-card__status').text()).toBe('Завершён')
    expect(wrapper.find('.lk-shopping-list-card__status--done').exists()).toBe(true)
  })

  it('emits open when the card body is clicked', async () => {
    const wrapper = mount(LkShoppingListCard, { props: { list } })

    await wrapper.find('.lk-shopping-list-card').trigger('click')

    expect(wrapper.emitted('open')).toEqual([['l-1']])
  })

  it('emits remove without triggering open when the delete action is clicked', async () => {
    const wrapper = mount(LkShoppingListCard, { props: { list } })

    await wrapper.find('.lk-shopping-list-card__action--danger').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['l-1']])
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('emits rename with the new title after editing and saving', async () => {
    const wrapper = mount(LkShoppingListCard, { props: { list } })

    await wrapper.find('.lk-shopping-list-card__action:not(.lk-shopping-list-card__action--danger)').trigger('click')
    const input = wrapper.find('.lk-shopping-list-card__rename input')
    await input.setValue('Продукты (обновлено)')
    await wrapper.find('.lk-shopping-list-card__rename').trigger('submit')

    expect(wrapper.emitted('rename')).toEqual([['l-1', 'Продукты (обновлено)']])
    expect(wrapper.emitted('open')).toBeUndefined()
  })
})
