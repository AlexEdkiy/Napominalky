import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent } from 'vue'
import type { VueWrapper } from '@vue/test-utils'

import RemindersView from './RemindersView.vue'
import LkReminderFormDialog from '@/components/lk/LkReminderFormDialog.vue'
import { remindersApi } from '@/api/remindersApi'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Reminder } from '@/types/reminder'

/** Будущая дата по умолчанию: дефолтный фильтр — «Запланированные». */
const FUTURE_REMIND_AT = new Date(Date.now() + 3 * 86_400_000).toISOString()

function makeReminder(overrides: Partial<Reminder>): Reminder {
  return {
    uuid: 'r-1',
    title: 'Позвонить врачу',
    notes: null,
    remind_at: FUTURE_REMIND_AT,
    recurrence: 'none',
    is_completed: false,
    completed_at: null,
    snoozed_until: null,
    source_uuid: null,
    source_type: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const paginatedReminders = (data: Reminder[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length },
  links: { first: null, last: null, prev: null, next: null },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk/reminders', name: 'lk-reminders', component: RemindersView },
      { path: '/lk/reminders/new', name: 'lk-reminder-create', component: { template: '<div />' } },
      { path: '/lk/reminders/:uuid', name: 'lk-reminder-edit', component: { template: '<div />' } },
    ],
  })
}

// `useLkForms`/`remindersVersion` — module-level singleton: если не
// размонтировать компоненты, их `watch(remindersVersion, ...)` продолжает
// реагировать на бампы версии из последующих тестов. Отслеживаем обёртки и
// размонтируем в `afterEach`.
const mountedWrappers: VueWrapper[] = []

async function mountView() {
  const router = createTestRouter()
  await router.push({ name: 'lk-reminders' })
  const wrapper = mount(RemindersView, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

// Модалка «Напоминание» рендерится один раз в `LkLayout`, а не в
// `RemindersView` — для интеграционных тестов (create/edit через модалку)
// монтируем оба компонента рядом, как это делает реальный `LkLayout`.
const RemindersViewWithDialog = defineComponent({
  components: { RemindersView, LkReminderFormDialog },
  template: '<div><RemindersView /><LkReminderFormDialog /></div>',
})

async function mountViewWithDialog() {
  const router = createTestRouter()
  await router.push({ name: 'lk-reminders' })
  const wrapper = mount(RemindersViewWithDialog, { global: { plugins: [router] } })
  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

describe('RemindersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('loads ALL reminders (per_page <= 100) on mount — разбивка на клиенте', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    await mountView()

    await vi.waitFor(() =>
      expect(remindersApi.fetchReminders).toHaveBeenCalledWith({
        status: 'all',
        sort: 'remind_at',
        order: 'asc',
        per_page: 100,
      }),
    )
  })

  it('renders reminders as cards', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1', title: 'Позвонить врачу' })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.findAll('.lk-reminder-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Позвонить врачу')
  })

  it('shows the empty state with a create CTA', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    expect(wrapper.text()).toContain('Ничего не запланировано')
    expect(wrapper.find('.reminders-view__empty-cta').exists()).toBe(true)
  })

  it('shows an error message when the API call fails', async () => {
    vi.mocked(remindersApi.fetchReminders).mockRejectedValue(new Error('network down'))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('network down'))
  })

  it('shows the 7-day retention hint only on the «Выполненные» tab (WEB-53)', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-done', title: 'Сделано', is_completed: true })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))
    expect(wrapper.find('[data-testid="completed-retention-hint"]').exists()).toBe(false)

    const completedTab = wrapper.findAll('.reminders-view__filter').find((btn) => btn.text().includes('Выполненные'))
    await completedTab!.trigger('click')

    const hint = wrapper.find('[data-testid="completed-retention-hint"]')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('удаляются автоматически через 7 дней')
  })

  it('switches filters client-side (без refetch): Просроченные/Запланированные/Выполненные', async () => {
    const past = makeReminder({
      uuid: 'r-over',
      title: 'Просроченное дело',
      remind_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    })
    const future = makeReminder({ uuid: 'r-plan', title: 'Будущее дело' })
    const done = makeReminder({ uuid: 'r-done', title: 'Сделанное дело', is_completed: true })
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([past, future, done]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    // Дефолт — «Запланированные»: только будущее активное, секцией с заголовком.
    expect(wrapper.text()).toContain('Будущее дело')
    expect(wrapper.text()).not.toContain('Просроченное дело')
    expect(wrapper.findAll('.reminders-view__section-title').length).toBeGreaterThan(0)

    // Счётчики в сегментах — как в МП: Просроченные 1 / Запланированные 1.
    const counts = wrapper.findAll('.reminders-view__filter-count').map((el) => el.text())
    expect(counts).toEqual(['1', '1'])

    // «Просроченные»: карточка с danger-подсветкой и подписью просрочки.
    await wrapper.findAll('.reminders-view__filter')[0]?.trigger('click')
    expect(wrapper.text()).toContain('Просроченное дело')
    const overdueCard = wrapper.find('.lk-reminder-card')
    expect(overdueCard.classes()).toContain('lk-reminder-card--overdue')
    expect(overdueCard.text()).toContain('просрочено на 2 дня')
    expect(overdueCard.text()).toContain('Просрочено')

    // «Выполненные»: только завершённое.
    await wrapper.findAll('.reminders-view__filter')[2]?.trigger('click')
    expect(wrapper.text()).toContain('Сделанное дело')
    expect(wrapper.text()).not.toContain('Будущее дело')

    // Всё это — без повторных запросов к API.
    expect(remindersApi.fetchReminders).toHaveBeenCalledTimes(1)
  })

  it('opens the reminder form modal (edit) with the full reminder when a card is clicked', async () => {
    const reminder = makeReminder({ uuid: 'r-1' })
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([reminder]))

    const { wrapper, router } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card').trigger('click')

    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toEqual(reminder)
    expect(router.currentRoute.value.name).toBe('lk-reminders')
  })

  it('opens the reminder form modal (creation) from the toolbar button, without navigating', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminders-view__create-btn').trigger('click')

    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(true)
    expect(forms.reminderFormReminder.value).toBeNull()
  })

  it('creates a reminder end-to-end through the modal and closes it', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 9, 10, 0))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(paginatedReminders([]))
    vi.mocked(remindersApi.createReminder).mockResolvedValue(makeReminder({ uuid: 'r-2' }))

    const { wrapper } = await mountViewWithDialog()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminders-view__create-btn').trigger('click')
    expect(wrapper.find('[aria-label="Новое напоминание"]').exists()).toBe(true)

    await wrapper.find('#reminder-form-title').setValue('Купить корм')
    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    await pillGroups[0]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await pillGroups[1]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(remindersApi.createReminder).toHaveBeenCalled())
    expect(wrapper.find('[aria-label="Новое напоминание"]').exists()).toBe(false)
    vi.useRealTimers()
  })

  it('reloads the reminders list after a save through the modal (remindersVersion bump)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 9, 10, 0))
    vi.mocked(remindersApi.fetchReminders).mockResolvedValueOnce(paginatedReminders([]))
    vi.mocked(remindersApi.createReminder).mockResolvedValue(makeReminder({ uuid: 'r-2' }))

    const { wrapper } = await mountViewWithDialog()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    vi.mocked(remindersApi.fetchReminders).mockResolvedValueOnce(paginatedReminders([makeReminder({ uuid: 'r-2' })]))
    await wrapper.find('.reminders-view__create-btn').trigger('click')
    await wrapper.find('#reminder-form-title').setValue('Купить корм')
    const pillGroups = wrapper.findAll('.lk-form-dialog__pills')
    await pillGroups[0]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await pillGroups[1]!.findAll('.lk-form-dialog__pill')[0]!.trigger('click')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(remindersApi.fetchReminders).toHaveBeenCalledTimes(2))
    vi.useRealTimers()
  })

  it('selects a single reminder via the select checkbox without opening the form', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' }), makeReminder({ uuid: 'r-2' })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card__select-input').setValue(true)

    expect(wrapper.text()).toContain('Выбрано: 1')
    const forms = useLkForms()
    expect(forms.isReminderFormOpen.value).toBe(false)

    const selectAll = wrapper.find<HTMLInputElement>('.reminders-view__select-all-input')
    expect(selectAll.element.indeterminate).toBe(true)
    expect(selectAll.element.checked).toBe(false)
  })

  it('selects and deselects all reminders through the "Выделить все" checkbox', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' }), makeReminder({ uuid: 'r-2' })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    const selectAll = wrapper.find<HTMLInputElement>('.reminders-view__select-all-input')
    await selectAll.setValue(true)

    expect(wrapper.text()).toContain('Выбрано: 2')
    expect(selectAll.element.indeterminate).toBe(false)
    const cardChecks = wrapper.findAll<HTMLInputElement>('.lk-reminder-card__select-input')
    expect(cardChecks.every((check) => check.element.checked)).toBe(true)

    await selectAll.setValue(false)
    expect(wrapper.text()).toContain('Выбрано: 0')
    expect(wrapper.find<HTMLButtonElement>('.reminders-view__bulk-delete').element.disabled).toBe(true)
  })

  it('deletes all selected reminders after confirming, then resets the selection', async () => {
    vi.mocked(remindersApi.fetchReminders)
      .mockResolvedValueOnce(paginatedReminders([makeReminder({ uuid: 'r-1' }), makeReminder({ uuid: 'r-2' })]))
      .mockResolvedValue(paginatedReminders([]))
    vi.mocked(remindersApi.deleteReminder).mockResolvedValue(undefined)

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminders-view__select-all-input').setValue(true)
    await wrapper.find('.reminders-view__bulk-delete').trigger('click')

    expect(wrapper.text()).toContain('Удалить выбранные напоминания (2)?')
    expect(remindersApi.deleteReminder).not.toHaveBeenCalled()

    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(remindersApi.deleteReminder).toHaveBeenCalledTimes(2))
    expect(remindersApi.deleteReminder).toHaveBeenCalledWith('r-1')
    expect(remindersApi.deleteReminder).toHaveBeenCalledWith('r-2')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ничего не запланировано'))
  })

  it('does not delete anything when the bulk-delete confirmation is cancelled', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' })]),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card__select-input').setValue(true)
    await wrapper.find('.reminders-view__bulk-delete').trigger('click')
    await wrapper.find('.lk-confirm-dialog__cancel').trigger('click')

    expect(remindersApi.deleteReminder).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Выбрано: 1')
  })

  it('keeps the failed reminders listed and selected on a partial bulk-delete failure', async () => {
    const failing = makeReminder({ uuid: 'r-2', title: 'Неудаляемое' })
    vi.mocked(remindersApi.fetchReminders)
      .mockResolvedValueOnce(paginatedReminders([makeReminder({ uuid: 'r-1' }), failing]))
      .mockResolvedValue(paginatedReminders([failing]))
    vi.mocked(remindersApi.deleteReminder).mockImplementation(async (uuid: string) => {
      if (uuid === 'r-2') {
        throw new Error('server error')
      }
    })

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.reminders-view__select-all-input').setValue(true)
    await wrapper.find('.reminders-view__bulk-delete').trigger('click')
    await wrapper.find('.lk-confirm-dialog__confirm').trigger('click')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Не удалось удалить напоминаний: 1'))
    expect(wrapper.text()).toContain('Неудаляемое')
    expect(wrapper.text()).toContain('Выбрано: 1')
  })

  it('completes a reminder', async () => {
    vi.mocked(remindersApi.fetchReminders).mockResolvedValue(
      paginatedReminders([makeReminder({ uuid: 'r-1' })]),
    )
    vi.mocked(remindersApi.completeReminder).mockResolvedValue(
      makeReminder({ uuid: 'r-1', is_completed: true }),
    )

    const { wrapper } = await mountView()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Загрузка'))

    await wrapper.find('.lk-reminder-card__action--complete').trigger('click')

    await vi.waitFor(() => expect(remindersApi.completeReminder).toHaveBeenCalledWith('r-1'))
  })
})

vi.mock('@/api/remindersApi', () => ({
  remindersApi: {
    fetchReminders: vi.fn(),
    fetchReminder: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    completeReminder: vi.fn(),
    snoozeReminder: vi.fn(),
    snoozeReminderUntil: vi.fn(),
  },
}))
