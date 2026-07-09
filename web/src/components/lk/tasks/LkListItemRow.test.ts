import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkListItemRow from './LkListItemRow.vue'
import type { ShoppingListItem } from '@/types/shoppingList'

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    uuid: 'i-1',
    name: 'Молоко',
    category: 'products',
    category_label: 'Продукты',
    is_checked: false,
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    tags: [],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('LkListItemRow', () => {
  it('renders the name and category pill, without a meta row when there is no metadata', () => {
    const wrapper = mount(LkListItemRow, { props: { item: makeItem() } })

    expect(wrapper.find('.lk-list-item-row__name').text()).toBe('Молоко')
    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.find('.lk-list-item-row__meta').exists()).toBe(false)
  })

  it('renders quantity, deadline, reminder, link, comment and tags when present', () => {
    const wrapper = mount(LkListItemRow, {
      props: {
        item: makeItem({
          quantity: 2,
          deadline: '2026-07-10',
          reminder_at: '2026-07-09T18:30:00Z',
          link: 'https://example.com/recipe',
          comment: 'Купить обезжиренное',
          tags: ['Покупки', 'Важное'],
        }),
      },
    })

    const meta = wrapper.find('.lk-list-item-row__meta')
    expect(meta.exists()).toBe(true)
    expect(meta.text()).toContain('× 2')
    expect(meta.text()).toContain('Купить обезжиренное')

    const link = wrapper.find('.lk-list-item-row__meta-chip--link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com/recipe')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')

    expect(wrapper.findAll('.lk-tag-pill').map((tag) => tag.text())).toEqual(['Покупки', 'Важное'])
  })

  it('omits individual meta chips whose field is null (quantity present, others absent)', () => {
    const wrapper = mount(LkListItemRow, { props: { item: makeItem({ quantity: 3 }) } })

    expect(wrapper.find('.lk-list-item-row__meta').exists()).toBe(true)
    expect(wrapper.text()).toContain('× 3')
    expect(wrapper.find('.lk-list-item-row__meta-chip--link').exists()).toBe(false)
  })

  it('defaults the checkbox accent to teal and applies a custom accent color when provided', () => {
    const teal = mount(LkListItemRow, { props: { item: makeItem() } })
    expect(teal.find('.lk-list-item-row__checkbox').attributes('style')).toContain('#17897a')

    const amber = mount(LkListItemRow, { props: { item: makeItem(), accentColor: '#c98a2b' } })
    expect(amber.find('.lk-list-item-row__checkbox').attributes('style')).toContain('#c98a2b')
  })

  it('emits check and remove events', async () => {
    const wrapper = mount(LkListItemRow, { props: { item: makeItem() } })

    await wrapper.find('.lk-list-item-row__checkbox').setValue(true)
    expect(wrapper.emitted('check')).toEqual([['i-1', true]])

    await wrapper.find('.lk-list-item-row__remove').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['i-1']])
  })
})
