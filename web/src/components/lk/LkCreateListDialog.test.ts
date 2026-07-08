import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkCreateListDialog from './LkCreateListDialog.vue'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import type { ShoppingList } from '@/types/shoppingList'

const createdList: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты',
  type: 'goods',
  tags: [],
  items_count: 0,
  checked_items_count: 0,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

describe('LkCreateListDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a validation error and does not call the API when the title is empty', async () => {
    stubMatchMedia(true)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Введите название списка')
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('defaults to the "goods" type and creates the list with the entered title', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(createdList)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('#create-list-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({
        title: 'Продукты',
        type: 'goods',
        tags: [],
      }),
    )
    expect(wrapper.emitted('created')).toEqual([[createdList]])
    vi.unstubAllGlobals()
  })

  it('switches the type toggle to "tasks" (Сделать)', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(createdList)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('#create-list-title').setValue('Дела на день')
    const buttons = wrapper.findAll('.lk-create-list-dialog__type-btn')
    await buttons[1]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({
        title: 'Дела на день',
        type: 'tasks',
        tags: [],
      }),
    )
    vi.unstubAllGlobals()
  })

  it('adds tags by pressing Enter and removes them via the pill close button', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.createList).mockResolvedValue(createdList)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('#create-list-title').setValue('Продукты')
    const tagInput = wrapper.find('#create-list-tags')
    await tagInput.setValue('Покупки')
    await tagInput.trigger('keydown', { key: 'Enter' })
    await tagInput.setValue('Здоровье')
    await tagInput.trigger('keydown', { key: ',' })

    const tagTexts = wrapper.findAll('.lk-create-list-dialog__tag').map((tag) => tag.text().replace(/\s+/g, ''))
    expect(tagTexts).toEqual(['Покупки×', 'Здоровье×'])

    await wrapper.find('.lk-create-list-dialog__tag-remove').trigger('click')
    expect(wrapper.findAll('.lk-create-list-dialog__tag')).toHaveLength(1)

    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({
        title: 'Продукты',
        type: 'goods',
        tags: ['Здоровье'],
      }),
    )
    vi.unstubAllGlobals()
  })

  it('shows a field-level validation error from a 422 API response', async () => {
    stubMatchMedia(true)
    vi.mocked(shoppingListsApi.createList).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Слишком длинное название'] } } },
    })
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('#create-list-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Слишком длинное название'))
    vi.unstubAllGlobals()
  })

  it('emits close when the cancel button, the close button or Escape are used', async () => {
    stubMatchMedia(true)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('.lk-create-list-dialog__cancel').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.find('.lk-create-list-dialog__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(3)
    vi.unstubAllGlobals()
  })

  it('emits close when clicking the overlay backdrop but not the panel', async () => {
    stubMatchMedia(true)
    const wrapper = mount(LkCreateListDialog)

    await wrapper.find('.lk-create-list-dialog__panel').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await wrapper.find('.lk-create-list-dialog__overlay').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it('renders as a bottom sheet on mobile and a centered modal on desktop', async () => {
    stubMatchMedia(false)
    const mobile = mount(LkCreateListDialog)
    await mobile.vm.$nextTick()
    expect(mobile.find('.lk-create-list-dialog__overlay--desktop').exists()).toBe(false)
    vi.unstubAllGlobals()

    stubMatchMedia(true)
    const desktop = mount(LkCreateListDialog)
    await desktop.vm.$nextTick()
    expect(desktop.find('.lk-create-list-dialog__overlay--desktop').exists()).toBe(true)
    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    createList: vi.fn(),
  },
}))
