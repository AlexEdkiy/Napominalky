import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkShoppingListCard from './LkShoppingListCard.vue'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты на неделю',
  type: 'goods',
  tags: [],
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

  it('renders the "Купить" type badge for a goods list and "Сделать" for a tasks list', () => {
    const goods = mount(LkShoppingListCard, { props: { list: { ...list, type: 'goods' } } })
    expect(goods.find('.lk-shopping-list-card__type').text()).toBe('Купить')
    expect(goods.find('.lk-shopping-list-card__type--goods').exists()).toBe(true)

    const tasks = mount(LkShoppingListCard, { props: { list: { ...list, type: 'tasks' } } })
    expect(tasks.find('.lk-shopping-list-card__type').text()).toBe('Сделать')
    expect(tasks.find('.lk-shopping-list-card__type--tasks').exists()).toBe(true)
  })

  it('renders a colored pill for every real tag from the API', () => {
    const wrapper = mount(LkShoppingListCard, {
      props: { list: { ...list, tags: ['Покупки', 'Важное'] } },
    })

    const tags = wrapper.findAll('.lk-tag-pill').map((tag) => tag.text())
    expect(tags).toEqual(['Покупки', 'Важное'])
  })

  it('does not render the tags block when the list has no tags', () => {
    const wrapper = mount(LkShoppingListCard, { props: { list: { ...list, tags: [] } } })

    expect(wrapper.find('.lk-shopping-list-card__tags').exists()).toBe(false)
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
