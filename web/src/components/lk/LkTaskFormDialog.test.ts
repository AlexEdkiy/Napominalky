import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import LkTaskFormDialog from './LkTaskFormDialog.vue'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { ShoppingList } from '@/types/shoppingList'

const list: ShoppingList = {
  uuid: 'l-1',
  title: 'Продукты',
  type: 'goods',
  tags: ['Покупки'],
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

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/tasks', name: 'lk-tasks', component: { template: '<div />' } },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: { template: '<div />' } },
    ],
  })
}

async function mountDialog() {
  stubMatchMedia(true)
  const router = createTestRouter()
  await router.push({ name: 'lk-tasks' })
  const wrapper = mount(LkTaskFormDialog, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('LkTaskFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  it('renders nothing when the form is closed', async () => {
    const { wrapper } = await mountDialog()
    expect(wrapper.find('.lk-form-dialog__overlay').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('shows the "new" title with an empty form when opened without a list', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Новая задача / покупка')
    expect((wrapper.find('#task-form-title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('shows the "edit" title pre-filled with the list title/type/tags', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__title').text()).toBe('Редактирование задачи / покупки')
    expect((wrapper.find('#task-form-title').element as HTMLInputElement).value).toBe('Продукты')
    expect(wrapper.find('.lk-form-dialog__delete').exists()).toBe(true)
    const activeTag = wrapper.findAll('.lk-form-dialog__tag--active')
    expect(activeTag.map((tag) => tag.text())).toEqual(['Покупки'])
    vi.unstubAllGlobals()
  })

  it('shows a validation error and skips the API call when the title is empty', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Введите название списка')
    expect(shoppingListsApi.createList).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('toggles the type pill (default "Покупка / список")', async () => {
    const { wrapper } = await mountDialog()
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9', type: 'tasks' })
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Дела на день')
    const pills = wrapper.findAll('.lk-form-dialog__pill')
    expect(pills.map((pill) => pill.text())).toEqual(['Задача', 'Покупка / список'])
    await pills[0]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({ title: 'Дела на день', type: 'tasks', tags: [] }),
    )
    vi.unstubAllGlobals()
  })

  it('toggles preset tag chips (multi-select)', async () => {
    const { wrapper } = await mountDialog()
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9' })
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Продукты')
    const tags = wrapper.findAll('.lk-form-dialog__tag')
    await tags[0]?.trigger('click')
    await tags[3]?.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(shoppingListsApi.createList).toHaveBeenCalledWith({
        title: 'Продукты',
        type: 'goods',
        tags: ['Покупки', 'Важное'],
      }),
    )
    vi.unstubAllGlobals()
  })

  it('creates a list, notifies the version bump, closes and navigates to the new list detail', async () => {
    const { wrapper, router } = await mountDialog()
    vi.mocked(shoppingListsApi.createList).mockResolvedValue({ ...list, uuid: 'l-9' })
    const forms = useLkForms()
    forms.openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-list-detail'))
    expect(router.currentRoute.value.params.uuid).toBe('l-9')
    expect(forms.tasksVersion.value).toBe(1)
    expect(forms.isTaskFormOpen.value).toBe(false)
    vi.unstubAllGlobals()
  })

  it('updates an existing list without navigating away', async () => {
    const { wrapper, router } = await mountDialog()
    vi.mocked(shoppingListsApi.updateList).mockResolvedValue({ ...list, title: 'Обновлено' })
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
    expect(router.currentRoute.value.name).toBe('lk-tasks')
    vi.unstubAllGlobals()
  })

  it('shows a field-level validation error from a 422 API response', async () => {
    const { wrapper } = await mountDialog()
    vi.mocked(shoppingListsApi.createList).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Ошибка', errors: { title: ['Слишком длинное название'] } } },
    })
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-form-title').setValue('Продукты')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Слишком длинное название'))
    vi.unstubAllGlobals()
  })

  it('deletes the list from the footer after confirmation and navigates back to lk-tasks', async () => {
    const router = createTestRouter()
    await router.push({ name: 'lk-list-detail', params: { uuid: 'l-1' } })
    stubMatchMedia(true)
    const wrapper = mount(LkTaskFormDialog, { global: { plugins: [router] } })
    vi.mocked(shoppingListsApi.deleteList).mockResolvedValue(undefined)
    const forms = useLkForms()
    forms.openTaskForm(list)
    await wrapper.vm.$nextTick()

    await wrapper.find('.lk-form-dialog__delete').trigger('click')
    expect(wrapper.text()).toContain('Удалить список?')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(shoppingListsApi.deleteList).toHaveBeenCalledWith('l-1'))
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('lk-tasks'))
    expect(forms.tasksVersion.value).toBe(1)
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

  // ---------------------------------------------------------------------
  // UI-fidelity: поэлементное соответствие макету (см. web-lk-forms.md,
  // форма 1) — лейблы секций, placeholder, 7 пресет-тегов в порядке макета
  // и раскраска чипов из tagPal (невыбран bg=tagPal.bg; выбран bg=tagPal.fg).
  // ---------------------------------------------------------------------

  it('renders the макет section labels, placeholder and submit label', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm()
    await wrapper.vm.$nextTick()

    const labels = wrapper.findAll('.lk-form-dialog__label').map((label) => label.text())
    expect(labels).toEqual(['Название', 'Тип', 'Теги'])
    expect(wrapper.find('#task-form-title').attributes('placeholder')).toBe('Что нужно сделать или купить?')
    expect(wrapper.find('.lk-form-dialog__submit').text()).toBe('Создать')
    expect(wrapper.find('.lk-form-dialog__cancel').text()).toBe('Отмена')
    vi.unstubAllGlobals()
  })

  it('shows «Сохранить» as the submit label in edit mode', async () => {
    const { wrapper } = await mountDialog()
    useLkForms().openTaskForm(list)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.lk-form-dialog__submit').text()).toBe('Сохранить')
    vi.unstubAllGlobals()
  })

  it('renders all 7 preset tag chips in the макет order with tagPal colors', async () => {
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
    ])

    // Невыбранный чип «Покупки»: bg = tagPal.bg (#d8ebe4), текст = tagPal.fg.
    const shopping = chips[0]!
    expect(shopping.attributes('style')).toContain('rgb(216, 235, 228)')

    // Выбранный чип: bg = tagPal.fg (#17897a), текст белый.
    await shopping.trigger('click')
    expect(shopping.classes()).toContain('lk-form-dialog__tag--active')
    const activeStyle = shopping.attributes('style') ?? ''
    expect(activeStyle).toContain('rgb(23, 137, 122)')
    expect(activeStyle).toContain('rgb(255, 255, 255)')
    vi.unstubAllGlobals()
  })

  it('renders as a bottom sheet on mobile and a centered modal on desktop', async () => {
    stubMatchMedia(false)
    const router = createTestRouter()
    await router.push({ name: 'lk-tasks' })
    const mobile = mount(LkTaskFormDialog, { global: { plugins: [router] } })
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
  },
}))
