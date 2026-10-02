import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkTaskFormDialog from './LkTaskFormDialog.vue'
import { reportConnectionLost, retryConnection } from '@/connection'
import dialogSource from './LkTaskFormDialog.vue?raw'
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
  status: 'new',
  status_label: 'Новая',
  status_is_manual: false,
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
    status: 'new',
    status_label: 'Новая',
    position: 0,
    quantity: null,
    deadline: null,
    reminder_at: null,
    link: null,
    comment: null,
    comments_count: 0,
    comments: [],
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

    // Название редактируется в ШАПКЕ: в new-режиме поле активно сразу (h2 нет).
    expect(wrapper.find('.lk-form-dialog__title').exists()).toBe(false)
    const titleInput = wrapper.find('.lk-form-dialog__header #task-form-title')
    expect((titleInput.element as HTMLInputElement).value).toBe('')
    expect(titleInput.attributes('placeholder')).toBe('Что нужно сделать или купить?')
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

  it('edits the title in the HEADER on click (edit mode): Enter saves immediately via PUT', async () => {
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, title: 'Продукты на неделю' })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    // В edit-режиме — заголовок-кнопка; поля ввода до клика нет.
    expect(wrapper.find('#task-form-title').exists()).toBe(false)
    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
    const input = wrapper.find('.lk-form-dialog__header #task-form-title')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Продукты')

    await input.setValue('  Продукты на неделю  ')
    await input.trigger('keydown', { key: 'Enter' })
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', { title: 'Продукты на неделю' }),
    )
    await vi.waitFor(() => expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Продукты на неделю'))
    vi.unstubAllGlobals()
  })

  it('preserves an edited title without autosave when the connection dialog takes focus', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
    const input = wrapper.find('#task-form-title')
    await input.setValue('Несохранённый заголовок')
    reportConnectionLost()
    try {
      await input.trigger('blur')
      expect(shoppingListsApi.updateList).not.toHaveBeenCalled()
      expect((wrapper.get('#task-form-title').element as HTMLInputElement).value).toBe('Несохранённый заголовок')
    } finally {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })))
      await retryConnection()
      wrapper.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('reverts an empty title on blur and Esc cancels the edit (edit mode, no PUT)', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
    let input = wrapper.find('#task-form-title')
    await input.setValue('   ')
    await input.trigger('blur')
    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Продукты')

    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
    input = wrapper.find('#task-form-title')
    await input.setValue('Черновик')
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Продукты')
    // Esc в поле названия не закрывает модалку.
    expect(useLkForms().isTaskFormOpen.value).toBe(true)
    expect(shoppingListsApi.updateList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('shows the title error in the header and re-opens the title input when saving without a title', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-form-dialog__header .lk-form-dialog__title-error').text()).toBe(
        'Введите название задачи.',
      ),
    )
    expect(wrapper.find('.lk-form-dialog__header #task-form-title').exists()).toBe(true)
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('switches the type toggle (Купить teal by default, Сделать amber) and the item placeholder', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    const types = wrapper.findAll('.lk-form-dialog__type')
    expect(types.map((button) => button.text())).toEqual(['Купить', 'Сделать'])
    expect(types[0]?.classes()).toContain('lk-form-dialog__type--active-goods')
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Что купить')
    // Кнопка «Добавить» по умолчанию (goods) — teal.
    expect(wrapper.find('.lk-form-dialog__item-add').attributes('style')).toContain('rgb(23, 137, 122)')

    await types[1]?.trigger('click')
    expect(types[1]?.classes()).toContain('lk-form-dialog__type--active-tasks')
    // Активный остаётся ровно один: «Купить» теряет подсветку.
    expect(types[0]?.classes()).not.toContain('lk-form-dialog__type--active-goods')
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Добавить задачи')
    // Кнопка «Добавить» перекрашивается в amber по типу.
    expect(wrapper.find('.lk-form-dialog__item-add').attributes('style')).toContain('rgb(201, 138, 43)')
    vi.unstubAllGlobals()
  })

  it('hides the type toggle in the edit mode (тип фиксируется при создании)', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__types').exists()).toBe(false)
    expect(wrapper.findAll('.lk-form-dialog__type')).toHaveLength(0)
    // Секция «Тип» скрыта целиком — вместе с заголовком.
    expect(wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())).toEqual(['Теги'])
    vi.unstubAllGlobals()
  })

  it('shows the status switcher in the HEADER (edit + tasks) instead of a body block', async () => {
    const tasksList: ShoppingList = {
      ...list,
      uuid: 'l-2',
      type: 'tasks',
      status: 'in_progress',
      status_label: 'В работе',
      status_is_manual: true,
    }
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(tasksList)
    await wrapper.vm.$nextTick()

    // Блока «Статус» в ТЕЛЕ больше нет: ни label, ни чипов.
    expect(wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())).toEqual(['Теги'])
    expect(wrapper.find('.lk-form-dialog__statuses').exists()).toBe(false)
    // Переключатель — в шапке: интерактивный бейдж с текущим статусом
    // + точка-индикатор ручного закрепления.
    const badge = wrapper.find('.lk-form-dialog__header .lk-status-badge__pill--interactive')
    expect(badge.text()).toBe('В работе')
    expect(wrapper.find('.lk-form-dialog__header .lk-form-dialog__status-pin').exists()).toBe(true)

    // Меню бейджа: 4 статуса + «Авто» (with-auto).
    await badge.trigger('click')
    const options = wrapper.findAll('.lk-form-dialog__header .lk-status-badge__option')
    expect(options.map((option) => option.text())).toEqual([
      'Новая',
      'В работе',
      'Отложена',
      'Выполнена',
      'Авто',
    ])
    vi.unstubAllGlobals()
  })

  it('hides the header status switcher for goods lists and in the new mode', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    // goods-edit: статусов у покупок нет.
    expect(wrapper.find('.lk-form-dialog__header .lk-status-badge').exists()).toBe(false)

    // Тик между закрытием и повторным открытием — иначе watch(isTaskFormOpen)
    // не увидит смену и оставит currentList от прошлого списка.
    resetLkFormsForTests()
    await wrapper.vm.$nextTick()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()
    // new-режим: списка ещё нет — статус ставить не на чем (даже для tasks).
    await wrapper.findAll('.lk-form-dialog__type')[1]?.trigger('click')
    expect(wrapper.find('.lk-form-dialog__header .lk-status-badge').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('PUTs the status picked in the header menu immediately and re-labels the badge', async () => {
    const tasksList: ShoppingList = { ...list, uuid: 'l-2', type: 'tasks' }
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({
      ...tasksList,
      status: 'done',
      status_label: 'Выполнена',
      status_is_manual: true,
      is_completed: true,
    })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(tasksList)
    await wrapper.vm.$nextTick()
    const itemFetchesBefore = vi.mocked(shoppingListsApi.fetchItems).mock.calls.length

    await wrapper.find('.lk-form-dialog__header .lk-status-badge__pill--interactive').trigger('click')
    await wrapper.findAll('.lk-form-dialog__header [role="menuitemradio"]')[3]?.trigger('click')

    // PUT сразу, без «Сохранить» — как атрибуты пунктов.
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-2', { status: 'done' }),
    )
    // Бейдж шапки перекрашен ответом сервера; появилась точка закрепления.
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-form-dialog__header .lk-status-badge__pill--interactive').text()).toBe(
        'Выполнена',
      ),
    )
    expect(wrapper.find('.lk-form-dialog__status-pin').exists()).toBe(true)
    // Пункты перечитаны: сервер мог свести их статусы/is_checked.
    await vi.waitFor(() =>
      expect(vi.mocked(shoppingListsApi.fetchItems).mock.calls.length).toBeGreaterThan(itemFetchesBefore),
    )
    vi.unstubAllGlobals()
  })

  it('resets the manual pin via «Авто» in the header menu (PUT {status_is_manual:false})', async () => {
    const tasksList: ShoppingList = {
      ...list,
      uuid: 'l-2',
      type: 'tasks',
      status: 'done',
      status_label: 'Выполнена',
      status_is_manual: true,
    }
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({
      ...tasksList,
      status: 'new',
      status_label: 'Новая',
      status_is_manual: false,
    })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(tasksList)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-form-dialog__status-pin').exists()).toBe(true)

    await wrapper.find('.lk-form-dialog__header .lk-status-badge__pill--interactive').trigger('click')
    await wrapper.find('.lk-form-dialog__header .lk-status-badge__option--auto').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-2', { status_is_manual: false }),
    )
    // Закрепление сброшено: точка-индикатор пропала, статус — деривированный.
    await vi.waitFor(() => expect(wrapper.find('.lk-form-dialog__status-pin').exists()).toBe(false))
    expect(wrapper.find('.lk-form-dialog__header .lk-status-badge__pill--interactive').text()).toBe('Новая')
    vi.unstubAllGlobals()
  })

  it('shows item status badges in a tasks list, hides them for goods, and PUTs an item status pick', async () => {
    const tasksList: ShoppingList = { ...list, uuid: 'l-2', type: 'tasks' }
    const item = makeItem({ uuid: 'i-1', name: 'Плитка' })
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([item])
    vi.mocked(shoppingListsApi.updateItem).mockResolvedValue({
      ...item,
      status: 'in_progress',
      status_label: 'В работе',
    })
    vi.mocked(shoppingListsApi.fetchList).mockResolvedValue(tasksList)
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(tasksList)
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    // Бейдж статуса пункта — компактный, интерактивный, БЕЗ пункта «Авто».
    const badge = wrapper.find('.lk-item-row__status .lk-status-badge__pill--interactive')
    expect(badge.text()).toBe('Новая')
    await badge.trigger('click')
    expect(wrapper.find('.lk-status-badge__option--auto').exists()).toBe(false)

    await wrapper.findAll('[role="menuitemradio"]')[1]?.trigger('click')
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateItem).toHaveBeenCalledWith('l-2', 'i-1', { status: 'in_progress' }),
    )
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-item-row__status .lk-status-badge__pill--interactive').text()).toBe('В работе'),
    )

    // goods-список: у пунктов бейджей статуса нет. Тик между закрытием и
    // повторным открытием — иначе watch(isTaskFormOpen) не увидит смену.
    resetLkFormsForTests()
    await wrapper.vm.$nextTick()
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-2', name: 'Молоко' })])
    useLkForms().openTaskForm(list)
    // Ждём перерисовку под goods-список (его пункт «Молоко» вместо «Плитка»).
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко'),
    )
    expect(wrapper.find('.lk-item-row__status').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('Escape при открытом меню статуса пункта закрывает ТОЛЬКО меню, а не модалку', async () => {
    const tasksList: ShoppingList = { ...list, uuid: 'l-2', type: 'tasks' }
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Плитка' })])
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(tasksList)
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__status .lk-status-badge__pill--interactive').trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    // Реальный Esc всплывает через document к window: бейдж гасит его на
    // document — модалка (слушатель на window) остаётся открытой.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(forms.isTaskFormOpen.value).toBe(true)

    // Повторный Esc (меню уже закрыто) закрывает саму модалку.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(forms.isTaskFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('keeps the existing type on edit save and colors accents by the actual list type', async () => {
    const tasksList: ShoppingList = { ...list, uuid: 'l-2', title: 'Дела', type: 'tasks', tags: [] }
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...tasksList, title: 'Дела недели' })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(tasksList)
    await wrapper.vm.$nextTick()

    // Акценты edit-режима — по фактическому типу списка: tasks → amber.
    expect(wrapper.find('.lk-form-dialog__item-add').attributes('style')).toContain('rgb(201, 138, 43)')
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Добавить задачи')

    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
    await wrapper.find('#task-form-title').setValue('Дела недели')
    await wrapper.find('form').trigger('submit')

    // `type` не затирается: updateList отправляет существующий тип без изменений.
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-2', {
        title: 'Дела недели',
        type: 'tasks',
        tags: [],
      }),
    )
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

  it('checks items immediately and removes them through the × cross AFTER confirmation', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.checkItem).mockResolvedValue(makeItem({ uuid: 'i-1', is_checked: true }))
    vi.mocked(shoppingListsApi.deleteItem).mockResolvedValue(undefined)
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-form-dialog__item-checkbox').setValue(true)
    await vi.waitFor(() => expect(shoppingListsApi.checkItem).toHaveBeenCalledWith('l-1', 'i-1', true))

    // Текстовой «Удалить строку» в раскрытой области больше нет — только × в строке.
    await wrapper.find('.lk-item-row__chevron').trigger('click')
    expect(wrapper.find('.lk-item-attrs__remove').exists()).toBe(false)

    // Крестик открывает confirm-диалог с именем строки; удаления ещё нет.
    await wrapper.find('.lk-item-row__remove').trigger('click')
    expect(wrapper.text()).toContain('Удалить строку «Молоко»?')
    expect(shoppingListsApi.deleteItem).not.toHaveBeenCalled()

    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')
    await vi.waitFor(() => expect(shoppingListsApi.deleteItem).toHaveBeenCalledWith('l-1', 'i-1'))
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(0))
    vi.unstubAllGlobals()
  })

  it('does NOT remove the item when the row-delete confirmation is cancelled', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__remove').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(shoppingListsApi.deleteItem).not.toHaveBeenCalled()
    expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1)
    // Диалог подтверждения закрыт.
    expect(wrapper.find('.lk-confirm-dialog__panel').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('expands ONLY one item row at a time (chevron, aria-expanded)', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', name: 'Молоко' }),
      makeItem({ uuid: 'i-2', name: 'Хлеб' }),
    ])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(2))

    const chevrons = wrapper.findAll('.lk-item-row__chevron')
    await chevrons[0]?.trigger('click')
    expect(wrapper.findAll('[aria-expanded="true"]')).toHaveLength(1)
    expect(wrapper.find('.lk-item-attrs').exists()).toBe(true)

    // Раскрытие второго пункта сворачивает первый.
    await chevrons[1]?.trigger('click')
    const expanded = wrapper.findAll('.lk-item-row__chevron--expanded')
    expect(expanded).toHaveLength(1)
    expect(expanded[0]?.attributes('aria-label')).toContain('Хлеб')

    // Повторный клик сворачивает панель совсем.
    await chevrons[1]?.trigger('click')
    expect(wrapper.find('.lk-item-attrs').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('adds a deadline through the expanded panel and PUTs it to the item update API', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1' })])
    vi.mocked(shoppingListsApi.updateItem).mockResolvedValue(makeItem({ uuid: 'i-1', deadline: '2027-03-05' }))
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__chevron').trigger('click')
    await wrapper.find('[aria-label="Добавить: Дедлайн"]').trigger('click')
    await wrapper.find('input[type="date"]').setValue('2027-03-05')
    await wrapper.find('.lk-item-attrs__editor-apply').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateItem).toHaveBeenCalledWith('l-1', 'i-1', { deadline: '2027-03-05' }),
    )
    // Токен дедлайна появился на месте чипса (состояние заменено ответом сервера).
    await vi.waitFor(() => expect(wrapper.find('.lk-item-attrs__token').exists()).toBe(true))

    // Изменение атрибутов — «изменение пунктов»: таблица перезагрузится при закрытии.
    await wrapper.find('.lk-form-dialog__close').trigger('click')
    expect(forms.tasksVersion.value).toBe(1)
    vi.unstubAllGlobals()
  })

  it('removes an attribute from its token and clears it through the update API', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({ uuid: 'i-1', reminder_at: '2027-03-05T10:00:00Z' }),
    ])
    vi.mocked(shoppingListsApi.updateItem).mockResolvedValue(makeItem({ uuid: 'i-1', reminder_at: null }))
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__chevron').trigger('click')
    expect(wrapper.find('.lk-item-attrs__token').exists()).toBe(true)
    await wrapper.find('[aria-label="Удалить напоминание"]').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateItem).toHaveBeenCalledWith('l-1', 'i-1', { reminder_at: null }),
    )
    vi.unstubAllGlobals()
  })

  it('renames an item inline: карандаш → input, Enter PUTs { name }, имя заменяется ответом сервера', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.updateItem).mockResolvedValue(makeItem({ uuid: 'i-1', name: 'Кефир' }))
    const { wrapper } = await mountDialog()
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('[aria-label="Переименовать Молоко"]').trigger('click')
    const input = wrapper.find('.lk-item-row__name-input')
    expect((input.element as HTMLInputElement).value).toBe('Молоко')
    await input.setValue('Кефир')
    await input.trigger('keydown.enter')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateItem).toHaveBeenCalledWith('l-1', 'i-1', { name: 'Кефир' }),
    )
    // Имя строки заменено ответом сервера; Enter НЕ сабмитит форму списка.
    await vi.waitFor(() => expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Кефир'))
    expect(shoppingListsApi.updateList).not.toHaveBeenCalled()

    // Переименование — «изменение пунктов»: таблица перезагрузится при закрытии.
    await wrapper.find('.lk-form-dialog__close').trigger('click')
    expect(forms.tasksVersion.value).toBe(1)
    vi.unstubAllGlobals()
  })

  it('does NOT PUT an inline rename with an empty name (откат к прежнему имени)', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('[aria-label="Переименовать Молоко"]').trigger('click')
    await wrapper.find('.lk-item-row__name-input').setValue('   ')
    await wrapper.find('.lk-item-row__name-input').trigger('keydown.enter')
    await wrapper.vm.$nextTick()

    expect(shoppingListsApi.updateItem).not.toHaveBeenCalled()
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
    vi.unstubAllGlobals()
  })

  it('shows an error under the items when the inline rename fails', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    vi.mocked(shoppingListsApi.updateItem).mockRejectedValue(new Error('Сеть недоступна'))
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('[aria-label="Переименовать Молоко"]').trigger('click')
    await wrapper.find('.lk-item-row__name-input').setValue('Кефир')
    await wrapper.find('.lk-item-row__name-input').trigger('keydown.enter')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Сеть недоступна'))
    // Имя осталось прежним — состояние не менялось оптимистично без ответа.
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
    vi.unstubAllGlobals()
  })

  it('Esc во время инлайн-переименования отменяет ТОЛЬКО правку, а не модалку', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', name: 'Молоко' })])
    stubMatchMedia(true)
    const wrapper = mount(LkTaskFormDialog, { attachTo: document.body })
    const forms = useLkForms()
    forms.openTaskForm(list)
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('[aria-label="Переименовать Молоко"]').trigger('click')
    const input = wrapper.find('.lk-item-row__name-input')
    await input.setValue('Другое')

    // Реальный Esc всплывает из инпута к window: `.stop` в строке гасит его —
    // правка отменена, модалка осталась открытой.
    input.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-item-row__name-input').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__item-name').text()).toBe('Молоко')
    expect(forms.isTaskFormOpen.value).toBe(true)
    expect(shoppingListsApi.updateItem).not.toHaveBeenCalled()

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('opens the thread from the 💬 button and POSTs a new comment with a local append', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1' })])
    vi.mocked(shoppingListsApi.addItemComment).mockResolvedValue({
      uuid: 'c-1',
      author_name: 'Анна',
      body: 'привезти',
      created_at: '2026-03-05T14:30:00',
    })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    // Кнопка 💬 раскрывает строку к треду; старого редактора comment нет.
    await wrapper.find('.lk-item-row__comment-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="Добавить: Комментарий"]').exists()).toBe(false)
    expect(wrapper.find('textarea[aria-label="Текст комментария"]').exists()).toBe(false)
    const thread = wrapper.find('.lk-comments-thread')
    expect(thread.exists()).toBe(true)
    expect(thread.text()).toContain('Комментариев пока нет')

    const itemFetchesBefore = vi.mocked(shoppingListsApi.fetchItems).mock.calls.length
    await thread.find('textarea').setValue('привезти')
    await thread.find('.lk-comments-thread__send').trigger('click')

    // POST в тред (НЕ PUT пункта), локальный append без рефетча пунктов.
    await vi.waitFor(() =>
      expect(shoppingListsApi.addItemComment).toHaveBeenCalledWith('l-1', 'i-1', { body: 'привезти' }),
    )
    expect(shoppingListsApi.updateItem).not.toHaveBeenCalled()
    expect(vi.mocked(shoppingListsApi.fetchItems).mock.calls.length).toBe(itemFetchesBefore)
    await vi.waitFor(() => {
      const item = wrapper.find('.lk-comments-thread__item')
      expect(item.exists()).toBe(true)
      expect(item.text()).toContain('Анна')
      expect(item.text()).toContain('привезти')
      expect(item.text()).toContain('14:30 05.03.26')
    })
    // Кнопка 💬 подсвечена и несёт счётчик 1 (индикатор наличия треда).
    expect(wrapper.find('.lk-item-row__comment-btn').classes()).toContain(
      'lk-item-row__comment-btn--active',
    )
    expect(wrapper.find('.lk-item-row__comment-count').text()).toBe('1')
    vi.unstubAllGlobals()
  })

  it('steps the item quantity for goods lists through the update API (минимум 1)', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', quantity: 2 })])
    vi.mocked(shoppingListsApi.updateItem).mockResolvedValue(makeItem({ uuid: 'i-1', quantity: 3 }))
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__chevron').trigger('click')
    await wrapper.find('[aria-label="Увеличить количество"]').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateItem).toHaveBeenCalledWith('l-1', 'i-1', { quantity: 3 }),
    )
    // Значение степпера обновилось из ответа сервера.
    await vi.waitFor(() => expect(wrapper.find('.lk-item-attrs__quantity-value').text()).toBe('3'))
    vi.unstubAllGlobals()
  })

  it('shows the compact meta line of the collapsed row (×qty, тег, индикаторы)', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([
      makeItem({
        uuid: 'i-1',
        quantity: 3,
        tags: ['Дом'],
        reminder_at: '2027-03-05T10:00:00Z',
        link: 'https://ozon.ru',
      }),
    ])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.find('.lk-item-row__meta').exists()).toBe(true))

    expect(wrapper.find('.lk-item-row__meta-chip').text()).toBe('×3')
    expect(wrapper.find('.lk-item-row__meta .lk-tag-pill').text()).toBe('Дом')
    expect(wrapper.findAll('.lk-item-row__indicators svg')).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it('shows an error under the items when the attribute update fails', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'i-1', quantity: 2 })])
    vi.mocked(shoppingListsApi.updateItem).mockRejectedValue(new Error('Сеть недоступна'))
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => expect(wrapper.findAll('.lk-form-dialog__item')).toHaveLength(1))

    await wrapper.find('.lk-item-row__chevron').trigger('click')
    await wrapper.find('[aria-label="Увеличить количество"]').trigger('click')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Сеть недоступна'))
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

  it('collapses the tag cloud by default: «Выбрать тег» expands it, «Свернуть» folds it back', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    // Свёрнуто по умолчанию: облака пресетов нет, видны ТОЛЬКО выбранные
    // теги списка (компактно) + кнопка «Выбрать тег».
    const summary = wrapper.find('.lk-form-dialog__tags--summary')
    expect(summary.exists()).toBe(true)
    expect(summary.findAll('.lk-form-dialog__tag').map((chip) => chip.text())).toEqual(['Покупки'])
    expect(wrapper.text()).not.toContain('Здоровье')
    expect(wrapper.find('.lk-form-dialog__tag-add').exists()).toBe(false)
    const toggle = wrapper.find('.lk-form-dialog__tags-toggle')
    expect(toggle.text()).toBe('Выбрать тег')

    // «Выбрать тег» разворачивает облако: пресеты + «+ Свой тег» + «Свернуть».
    await toggle.trigger('click')
    expect(wrapper.find('.lk-form-dialog__tags--summary').exists()).toBe(false)
    const chips = wrapper.findAll('.lk-form-dialog__tag')
    expect(chips.map((chip) => chip.text())).toEqual([
      'Покупки',
      'Дом',
      'Личное',
      'Важное',
      'Работа',
      'Здоровье',
      '+ Свой тег',
    ])
    expect(wrapper.find('.lk-form-dialog__tags-toggle').text()).toBe('Свернуть')

    // «Свернуть» возвращает компактный вид с выбранными тегами.
    await wrapper.find('.lk-form-dialog__tags-toggle').trigger('click')
    expect(wrapper.find('.lk-form-dialog__tags--summary').exists()).toBe(true)
    expect(wrapper.find('.lk-form-dialog__tag-add').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('removes a selected tag right from the collapsed summary chip', async () => {
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, tags: [] })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    // Клик по выбранному тегу в свёрнутом виде снимает его.
    await wrapper.find('.lk-form-dialog__tags--summary .lk-form-dialog__tag').trigger('click')
    expect(wrapper.findAll('.lk-form-dialog__tags--summary .lk-form-dialog__tag')).toHaveLength(0)

    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-1', {
        title: 'Продукты',
        type: 'goods',
        tags: [],
      }),
    )
    vi.unstubAllGlobals()
  })

  it('toggles preset tag chips and adds a custom tag through «+ Свой тег»', async () => {
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9' })
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    // Облако свёрнуто по умолчанию — раскрываем его кнопкой «Выбрать тег».
    await wrapper.find('.lk-form-dialog__tags-toggle').trigger('click')
    const chips = wrapper.findAll('.lk-form-dialog__tag')
    expect(chips.map((chip) => chip.text())).toEqual([
      'Покупки',
      'Дом',
      'Личное',
      'Важное',
      'Работа',
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
    await wrapper.find('.lk-form-dialog__tags-toggle').trigger('click')

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

    await wrapper.find('.lk-form-dialog__title-button').trigger('click')
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

    // Отдельного поля «Название» и заголовка «Пункты» нет: название — в шапке.
    const labels = wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())
    expect(labels).toEqual(['Тип', 'Теги'])
    expect(wrapper.find('.lk-form-dialog__body #task-form-title').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__header #task-form-title').exists()).toBe(true)
    expect(wrapper.find('.lk-form-dialog__submit').text()).toBe('Сохранить')
    expect(wrapper.find('.lk-form-dialog__cancel').text()).toBe('Отмена')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('scrolls only the body: header and footer stay outside the scroll container', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    // Скроллится середина (пункты/теги) — всё внутри `__body`; название — в шапке.
    const body = wrapper.find('.lk-form-dialog__body')
    expect(body.exists()).toBe(true)
    expect(body.find('#task-form-title').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__header .lk-form-dialog__title-button').exists()).toBe(true)
    expect(body.find('.lk-form-dialog__item-form').exists()).toBe(true)
    expect(body.find('.lk-form-dialog__tags').exists()).toBe(true)

    // Шапка (заголовок + M/N + крестик) и футер (кнопки) зафиксированы —
    // ВНЕ скролл-контейнера, поэтому всегда видимы и не режутся скроллбаром.
    expect(body.find('.lk-form-dialog__header').exists()).toBe(false)
    expect(body.find('.lk-form-dialog__footer').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__form .lk-form-dialog__footer').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('expands the item selected in search and clears that selection for a new form', async () => {
    vi.mocked(shoppingListsApi.fetchItems).mockResolvedValue([makeItem({ uuid: 'found-item', name: 'Найденный пункт' })])
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list, 'found-item')
    await vi.waitFor(() => expect(wrapper.find('#task-item-found-item .lk-comments-thread').exists()).toBe(true))
    useLkForms().closeForm()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()
    expect(useLkForms().taskFormItemUuid.value).toBeNull()
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('reports an item removed after search instead of silently opening the parent', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list, 'removed-item')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Пункт из результатов поиска больше недоступен.'))
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('uses the 700px desktop panel width keeping the fluid width:100%', () => {
    // Стилевой регресс-тест по исходнику SFC (`?raw`): scoped-CSS в jsdom не
    // применяется, поэтому проверяем сами объявления. Ширина 700px — по
    // умолчанию; попапы тредов позиционируются по границе скролл-области.
    expect(dialogSource).toMatch(/\.lk-form-dialog__panel--desktop\s*\{[^}]*max-width:\s*700px/)
    expect(dialogSource).not.toContain('max-width: 1160px')
    // Панель остаётся адаптивной: базовый width: 100% не тронут.
    expect(dialogSource).toMatch(/\.lk-form-dialog__panel\s*\{[^}]*width:\s*100%/)
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
    fetchList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    fetchItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    checkItem: vi.fn(),
    fetchItemComments: vi.fn(),
    addItemComment: vi.fn(),
    deleteItemComment: vi.fn(),
  },
}))
