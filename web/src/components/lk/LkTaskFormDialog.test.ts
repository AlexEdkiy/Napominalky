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

  it('hides the type toggle in the edit mode (тип фиксируется при создании)', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__types').exists()).toBe(false)
    expect(wrapper.findAll('.lk-form-dialog__type')).toHaveLength(0)
    // Секция «Тип» скрыта целиком — вместе с заголовком.
    expect(wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())).toEqual([
      'Название',
      'Пункты',
      'Теги',
    ])
    vi.unstubAllGlobals()
  })

  it('shows the «Статус» block (4 чипа + Авто) only in the edit mode of a tasks list', async () => {
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

    // Блок над «Пунктами»: Название → Статус → Пункты → Теги.
    expect(wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())).toEqual([
      'Название',
      'Статус',
      'Пункты',
      'Теги',
    ])
    const chips = wrapper.findAll('.lk-form-dialog__status')
    expect(chips.map((chip) => chip.text())).toEqual([
      'Новая',
      'В работе',
      'Отложена',
      'Выполнена',
      'Авто',
    ])
    // Текущий статус подсвечен; «Авто» неактивен (статус закреплён вручную).
    expect(chips[1]?.attributes('aria-pressed')).toBe('true')
    expect(chips[4]?.attributes('aria-pressed')).toBe('false')
    vi.unstubAllGlobals()
  })

  it('hides the «Статус» block for goods lists and in the new mode', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()
    // goods-edit: статусов у покупок нет.
    expect(wrapper.find('.lk-form-dialog__statuses').exists()).toBe(false)

    resetLkFormsForTests()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()
    // new-режим: списка ещё нет — статус ставить не на чем (даже для tasks).
    expect(wrapper.find('.lk-form-dialog__statuses').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('PUTs the picked status immediately and re-highlights the chips from the server response', async () => {
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

    await wrapper.findAll('.lk-form-dialog__status')[3]?.trigger('click')

    // PUT сразу, без «Сохранить» — как атрибуты пунктов.
    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-2', { status: 'done' }),
    )
    await vi.waitFor(() =>
      expect(wrapper.findAll('.lk-form-dialog__status')[3]?.attributes('aria-pressed')).toBe('true'),
    )
    // Пункты перечитаны: сервер мог свести их статусы/is_checked.
    await vi.waitFor(() =>
      expect(vi.mocked(shoppingListsApi.fetchItems).mock.calls.length).toBeGreaterThan(itemFetchesBefore),
    )
    vi.unstubAllGlobals()
  })

  it('resets the manual pin via «Авто» (PUT {status_is_manual:false})', async () => {
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

    await wrapper.find('.lk-form-dialog__status-auto').trigger('click')

    await vi.waitFor(() =>
      expect(shoppingListsApi.updateList).toHaveBeenCalledWith('l-2', { status_is_manual: false }),
    )
    // «Авто» подсвечен после сброса закрепления.
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-form-dialog__status-auto').classes()).toContain(
        'lk-form-dialog__status-auto--active',
      ),
    )
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
    expect(wrapper.find('.lk-form-dialog__item-input').attributes('placeholder')).toBe('Например, Помыть окна')

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

  it('scrolls only the body: header and footer stay outside the scroll container', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    // Скроллится середина (название/пункты/теги) — всё внутри `__body`.
    const body = wrapper.find('.lk-form-dialog__body')
    expect(body.exists()).toBe(true)
    expect(body.find('#task-form-title').exists()).toBe(true)
    expect(body.find('.lk-form-dialog__item-form').exists()).toBe(true)
    expect(body.find('.lk-form-dialog__tags').exists()).toBe(true)

    // Шапка (заголовок + M/N + крестик) и футер (кнопки) зафиксированы —
    // ВНЕ скролл-контейнера, поэтому всегда видимы и не режутся скроллбаром.
    expect(body.find('.lk-form-dialog__header').exists()).toBe(false)
    expect(body.find('.lk-form-dialog__footer').exists()).toBe(false)
    expect(wrapper.find('.lk-form-dialog__form .lk-form-dialog__footer').exists()).toBe(true)
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
