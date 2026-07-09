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
  it('renders the title, progress fraction and "В работе" status for a partially checked list', () => {
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

  it('shows "Новый" when no items are checked, including an empty list', () => {
    const wrapper = mount(LkShoppingListCard, {
      props: { list: { ...list, items_count: 0, checked_items_count: 0 } },
    })

    expect(wrapper.find('.lk-shopping-list-card__status').text()).toBe('Новый')
    expect(wrapper.find('.lk-shopping-list-card__status--new').exists()).toBe(true)
  })

  it('uses the teal accent for a goods list and the amber accent for a tasks list', () => {
    const goods = mount(LkShoppingListCard, { props: { list: { ...list, type: 'goods' } } })
    expect(goods.find('.lk-shopping-list-card__progress-fill').attributes('style')).toContain('rgb(23, 137, 122)')

    const tasks = mount(LkShoppingListCard, { props: { list: { ...list, type: 'tasks' } } })
    expect(tasks.find('.lk-shopping-list-card__progress-fill').attributes('style')).toContain('rgb(201, 138, 43)')
  })

  it('paints the "Новый"/"В работе" status pill with the teal accent for a goods list', () => {
    const brandNew = mount(LkShoppingListCard, {
      props: { list: { ...list, type: 'goods', items_count: 4, checked_items_count: 0 } },
    })
    const brandNewStyle = brandNew.find('.lk-shopping-list-card__status').attributes('style')
    expect(brandNewStyle).toContain('rgb(216, 235, 228)')
    expect(brandNewStyle).toContain('rgb(23, 137, 122)')

    const active = mount(LkShoppingListCard, {
      props: { list: { ...list, type: 'goods', items_count: 4, checked_items_count: 2 } },
    })
    const activeStyle = active.find('.lk-shopping-list-card__status').attributes('style')
    expect(activeStyle).toContain('rgb(216, 235, 228)')
    expect(activeStyle).toContain('rgb(23, 137, 122)')
  })

  it('paints the "Новый"/"В работе" status pill with the amber accent for a tasks list', () => {
    const brandNew = mount(LkShoppingListCard, {
      props: { list: { ...list, type: 'tasks', items_count: 4, checked_items_count: 0 } },
    })
    const brandNewStyle = brandNew.find('.lk-shopping-list-card__status').attributes('style')
    expect(brandNewStyle).toContain('rgb(247, 235, 213)')
    expect(brandNewStyle).toContain('rgb(201, 138, 43)')

    const active = mount(LkShoppingListCard, {
      props: { list: { ...list, type: 'tasks', items_count: 4, checked_items_count: 2 } },
    })
    const activeStyle = active.find('.lk-shopping-list-card__status').attributes('style')
    expect(activeStyle).toContain('rgb(247, 235, 213)')
    expect(activeStyle).toContain('rgb(201, 138, 43)')
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
