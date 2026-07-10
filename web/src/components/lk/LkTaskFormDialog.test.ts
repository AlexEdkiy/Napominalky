import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkTaskFormDialog from './LkTaskFormDialog.vue'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { ShoppingList, ShoppingListItem } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты',
  type: 'goods',
  tags: ['Покупки'],
  items_count: 2,
  checked_items_count: 1,
  is_completed: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

function makeItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
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

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

async function mountDialog() {
  stubMatchMedia(true)
  const wrapper = mount(LkTaskFormDialog)
  return { wrapper }
}

describe('LkTaskFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([])
  })

  it('renders nothing when the form is closed', async () => {
    const { wrapper } = await mountDialog()
    expect(wrapper.find('.lk-form-dialog__overlay').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('opens empty in the new mode WITHOUT creating a list on open', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Новая задача / покупка')
    expect((wrapper.find('#task-form-title').element as HTMLInputElement).value).toBe('')
    // Прогресс «M / N» — только в edit-режиме (в new списка ещё нет).
    expect(wrapper.find('.lk-form-dialog__progress').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(false)
    expect(wrapper.text()).toContain('В списке пока нет пунктов')
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('shows the list title, progress and loaded items in the edit mode', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', name: 'Молоко', is_checked: true }),
      makeItem({ uuid: 'i-2', name: 'Хлеб' }),
    ])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Продукты')
    expect(shoppingListsApi.fetchItems).toHaveBeenCalledWith('l-1')
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(2))
    expect(wrapper.find('.lk-form-dialog__progress').text()).toBe('1 / 2')
    expect(wrapper.findAll('.lk-form-dialog__item')[0]?.classes()).toContain('lk-form-dialog__item--checked')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('switches the type toggle (Купить teal by default, Сделать amber) and the item placeholder', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    const types = wrapper.findAll('.lk-form-dialog__type')
    expect(types.map((button) => button.text())).toEqual(['Купить', 'Сделать'])
    expect(types[0]?.classes()).toContain('lk-form-dialog__type--active-goods')
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Например, Молоко')
    // Кнопка «Добавить» по умолчанию (goods) — teal.
    expect(wrapper.find('.lk-form-dialog__item-add').attributes('style')).toContain('rgb(23, 137, 122)')

    await types[1]?.trigger('click')
    expect(types[1]?.classes()).toContain('lk-form-dialog__type--active-tasks')
    // Активный остаётся ровно один: «Купить» теряет подсветку.
    expect(types[0]?.classes()).not.toContain('lk-form-dialog__type--active-goods')
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Например, Помыть окна')
    // Кнопка «Добавить» перекрашивается в amber по типу.
    expect(wrapper.find('.lk-form-dialog__item-add').attributes('style')).toContain('rgb(201, 138, 43)')
    vi.unstubAllGlobals()
  })

  it('creates the list on the FIRST «Добавить пункт» in the new mode and continues in edit mode', async () => {
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9', title: 'Дача', tags: [] })
    vi.mocked(shoppingListsApi.addItem).mockResolvedValue(makeItem({ uuid: 'i-9', name: 'Семена' }))
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Дача')
    await wrapper.find('.lk-form-dialog__item-input').setValue('Семена')
    await wrapper.find('.lk-form-dialog__item-add').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({ title: 'Дача', type: 'goods', tags: [] }),
    )
    await vi.waitFor(() => expect(shoppingListsApi.addItem).toHaveBeenCalledWith('l-9', { name: 'Семена' }))
    expect(forms.tasksVersion.value).toBe(1)
    // Модалка осталась открытой в edit-режиме того же списка.
    expect(forms.isTaskFormOpen.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(true))

    // Второй пункт добавляется БЕЗ повторного создания списка.
    await wrapper.find('.lk-form-dialog__item-input').setValue('Лейка')
    await wrapper.find('.lk-form-dialog__item-add').trigger('click')
    await vi.waitFor(() => expect(shoppingListsApi.addItem).toHaveBeenCalledWith('l-9', { name: 'Лейка' }))
    expect(shoppingListsApi.createList).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('does not create a list when adding an item with an empty title (validation error instead)', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__item-input').setValue('Семена')
    await wrapper.find('.lk-form-dialog__item-add').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Введите название задачи')
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    expect(shoppingListsApi.addItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('checks and removes items immediately through the API in the edit mode', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.checkItem).mockResolvedValue(makeItem({ uuid: 'i-1', is_checked: true }))
    vi.mocked(shoppingListsApi.deleteItem).mockResolvedValue(undefined)
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    await vi.waitFor(() => expect(shoppingListsApi.checkItem).toHaveBeenCalledWith('l-1', 'i-1', true))

    await wrapper.find('.lk-form-dialog__item-remove').trigger('click')
    await vi.waitFor(() => expect(shoppingListsApi.deleteItem).toHaveBeenCalledWith('l-1', 'i-1'))
    vi.unstubAllGlobals()
  })

  it('bumps tasksVersion on close (крестик) after item-only changes so the table reloads', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.checkItem).mockResolvedValue(makeItem({ uuid: 'i-1', is_checked: true }))
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    await vi.waitFor(() => expect(shoppingListsApi.checkItem).toHaveBeenCalled())
    await wrapper.find('.lk-form-dialog__close').trigger('click')

    expect(forms.tasksVersion.value).toBe(1)
    expect(forms.isTaskFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('toggles preset tag chips and adds a custom tag through «+ Свой тег»', async () => {
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9' })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAll('.lk-form-dialog__tag')
    expect(chips.map((chip) => chip.text())).toEqual([
      'Покупки',
      'Дом',
      'Личное',
      'Важное',
      'Звонки',
      'Счета',
      'Здоровье',
      '+ Свой тег',
    ])

    await chips[1]?.trigger('click')
    await chips[3]?.trigger('click')

    await wrapper.find('.lk-form-dialog__tag-add').trigger('click')
    await wrapper.find('.lk-form-dialog__tag-input').setValue('Дача')
    await wrapper.find('.lk-form-dialog__tag-input').trigger('keydown.enter')

    // Свой тег отрисован активным чипом после пресетов.
    const updatedChips = wrapper.findAll('.lk-form-dialog__tag--active')
    expect(updatedChips.map((chip) => chip.text())).toEqual(['Дом', 'Важное', 'Дача'])

    await wrapper.find('#task-form-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({
        title: 'Продукты',
        type: 'goods',
        tags: ['Дом', 'Важное', 'Дача'],
      }),
    )
    vi.unstubAllGlobals()
  })

  it('renders the невыбранный/выбранный tag chip colors from the tagPal palette', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    // Невыбранный чип «Покупки»: bg = tagPal.bg (#d8ebe4).
    const shopping = wrapper.findAll('.lk-form-dialog__tag')[0]!
    expect(shopping.attributes('style')).toContain('rgb(216, 235, 228)')

    // Выбранный чип: bg = tagPal.fg (#17897a), текст белый.
    await shopping.trigger('click')
    const activeStyle = shopping.attributes('style') ?? ''
    expect(activeStyle).toContain('rgb(23, 137, 122)')
    expect(activeStyle).toContain('rgb(255, 255, 255)')
    vi.unstubAllGlobals()
  })

  it('shows a validation error and skips the API call when saving with an empty title', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Введите название задачи')
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('creates the list on «Сохранить» in the new mode and closes the modal', async () => {
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9', type: 'tasks' })
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Дела на день')
    await wrapper.findAll('.lk-form-dialog__type')[1]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({ title: 'Дела на день', type: 'tasks', tags: [] }),
    )
    await vi.waitFor(() => expect(forms.isTaskFormOpen.value).toBe(false))
    expect(forms.tasksVersion.value).toBe(1)
    vi.unstubAllGlobals()
  })

  it('updates title/type/tags of an existing list on «Сохранить»', async () => {
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, title: 'Обновлено' })
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Обновлено')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', {
        title: 'Обновлено',
        type: 'goods',
        tags: ['Покупки'],
      }),
    )
    expect(forms.tasksVersion.value).toBe(1)
    expect(forms.isTaskFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('shows a field-level validation error from a 422 API response', async () => {
    vi.mocked(shoppingListsApi.createList).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Слишком длинное название'] } } },
    })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Слишком длинное название'))
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
    vi.unstubAllGlobals()
  })

  it('deletes the list from the footer after confirmation', async () => {
    vi.mocked(shoppingListsApi.deleteList).mockResolvedValue(undefined)
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    expect(wrapper.text()).toContain('Удалить список?')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(shoppingListsApi.deleteList).toHaveBeenCalledWith('l-1'))
    expect(forms.tasksVersion.value).toBe(1)
    expect(forms.isTaskFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('does not delete when the confirmation is cancelled', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(shoppingListsApi.deleteList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('closes on Cancel, the close button, Escape and the scrim click', async () => {
    const { wrapper } = await mountDialog()
    const forms = useLkForms()

    forms.openTaskForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__cancel').trigger('click')
    expect(forms.isTaskFormOpen.value).toBe(false)

    forms.openTaskForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__close').trigger('click')
    expect(forms.isTaskFormOpen.value).toBe(false)

    forms.openTaskForm()
    await wrapper.vm.$nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(forms.isTaskFormOpen.value).toBe(false)

    forms.openTaskForm()
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__overlay').trigger('click')
    expect(forms.isTaskFormOpen.value).toBe(false)

    vi.unstubAllGlobals()
  })

  it('renders the макет section labels and no date/reminder pills (решение пользователя)', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    const labels = wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())
    expect(labels).toEqual(['Название', 'Тип', 'Пункты', 'Теги'])
    expect(wrapper.find('#task-form-title').attributes('placeholder')).toBe('Что нужно сделать или купить?')
    expect(wrapper.find('.lk-form-dialog__submit').text()).toBe('Сохранить')
    expect(wrapper.find('.lk-form-dialog__cancel').text()).toBe('Отмена')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('renders as a bottom sheet on mobile and a centered modal on desktop', async () => {
    stubMatchMedia(false)
    const mobile = mount(LkTaskFormDialog)
    useLkForms().openTaskForm()
    await mobile.vm.$nextTick()
    expect(mobile.find('.lk-form-dialog__overlay--desktop').exists()).toBe(false)
    vi.unstubAllGlobals()

    resetLkFormsForTests()
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-form-dialog__overlay--desktop').exists()).toBe(true)
    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    fetchItems: vi.fn(),
    addItem: vi.fn(),
    deleteItem: vi.fn(),
    checkItem: vi.fn(),
  },
}))
