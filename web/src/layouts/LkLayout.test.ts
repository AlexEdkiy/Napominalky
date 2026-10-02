import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import LkLayout from './LkLayout.vue'
import { notesApi } from '@/api/notesApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { syncApi } from '@/api/syncApi'
import { resetLkFormsForTests } from '@/composables/useLkForms'
import { resetSyncMeterForTests, useSyncMeter } from '@/composables/useSyncMeter'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/auth'

enableAutoUnmount(afterEach)

const StubView = { template: '<div class="stub-view" />' }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/lk',
        component: LkLayout,
        children: [
          { path: '', name: 'lk-dashboard', component: StubView },
          { path: 'tasks', name: 'lk-tasks', component: StubView },
          { path: 'lists', name: 'lk-lists', component: StubView },
          { path: 'lists/:uuid', name: 'lk-list-detail', component: StubView },
          { path: 'calendar', name: 'lk-calendar', component: StubView },
          { path: 'notes', name: 'lk-notes', component: StubView },
          { path: 'notes/new', name: 'lk-note-create', component: StubView },
          { path: 'notes/:uuid', name: 'lk-note-edit', component: StubView },
          { path: 'reminders', name: 'lk-reminders', component: StubView },
          { path: 'reminders/new', name: 'lk-reminder-create', component: StubView },
          { path: 'reminders/:uuid', name: 'lk-reminder-edit', component: StubView },
          { path: 'account', name: 'lk-account', component: StubView },
        ],
      },
    ],
  })
}

const user: User = {
  uuid: 'u-1',
  name: 'Иван',
  email: 'ivan@example.com',
  is_admin: false,
  is_super_admin: false,
  is_active: true,
  sync_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  avatar: null,
}

function stubMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.push(listener)
      }),
      removeEventListener: vi.fn(),
    }),
  )
  return listeners
}

// LkLayout использует свой собственный <RouterView/> для дочерних разделов —
// как и в реальном приложении, монтируем его через хост-компонент с
// верхнеуровневым <RouterView/>, а не напрямую (иначе глубина `depth` во
// вложенном RouterView не совпадёт с реальной и раздел отрендерится дважды).
const TestHost = { template: '<RouterView />' }

async function mountLayoutWithRouter(routeName = 'lk-dashboard') {
  const router = createTestRouter()
  await router.push({ name: routeName })
  const wrapper = mount(TestHost, { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return { wrapper, router }
}

async function mountLayout(routeName = 'lk-dashboard') {
  const { wrapper } = await mountLayoutWithRouter(routeName)
  return wrapper
}

describe('LkLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLkFormsForTests()
    resetSyncMeterForTests()
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setUser(user)
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 1, total: 0 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(syncApi.fetchChanges).mockResolvedValue({
      data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
      meta: { cursor: 0, has_more: false },
    })
  })

  it.each([true, false])('opens today deadlines from the bell (desktop=%s)', async (desktop) => {
    stubMatchMedia(desktop)
    const { wrapper, router } = await mountLayoutWithRouter()
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Вспомнить все!')
    const bell = wrapper.find('.lk-today-bell')
    expect(bell.exists()).toBe(true)
    expect(bell.find('.lk-today-bell__dot').exists()).toBe(false)
    await bell.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/lk/tasks?deadline=today')
    vi.unstubAllGlobals()
  })

  it('renders the desktop sidebar with all 5 navigation sections', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar').exists()).toBe(true)
    expect(wrapper.find('.lk-bottom-nav').exists()).toBe(false)
    expect(wrapper.text()).toContain('Вспомнить все!')
    expect(wrapper.text()).toContain('Задачи и списки')
    expect(wrapper.text()).toContain('Напоминания')
    expect(wrapper.text()).toContain('Календарь')
    expect(wrapper.text()).toContain('Заметки')

    vi.unstubAllGlobals()
  })

  it('marks ONLY «Напоминания» active on the reminders list and form deep-link routes', async () => {
    stubMatchMedia(true)
    for (const routeName of ['lk-reminders', 'lk-reminder-create']) {
      const wrapper = await mountLayout(routeName)
      const activeLinks = wrapper.findAll('.lk-sidebar__link--active')
      expect(activeLinks).toHaveLength(1)
      expect(activeLinks[0]?.text()).toContain('Напоминания')
    }
    vi.unstubAllGlobals()
  })

  it('marks the nav item matching the current route as active', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout('lk-calendar')

    const activeLinks = wrapper.findAll('.lk-sidebar__link--active')
    expect(activeLinks).toHaveLength(1)
    expect(activeLinks[0]?.text()).toContain('Календарь')

    vi.unstubAllGlobals()
  })

  it('renders the mobile header and bottom nav instead of the sidebar on narrow screens', async () => {
    stubMatchMedia(false)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar').exists()).toBe(false)
    expect(wrapper.find('.lk-mobile-header').exists()).toBe(true)
    expect(wrapper.find('.lk-bottom-nav').exists()).toBe(true)

    vi.unstubAllGlobals()
  })

  it('collapses the sidebar to icon-only mode when the topbar burger is clicked', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar--collapsed').exists()).toBe(false)

    await wrapper.find('.lk-topbar__burger').trigger('click')

    expect(wrapper.find('.lk-sidebar--collapsed').exists()).toBe(true)
    const sidebarText = wrapper.find('.lk-sidebar').text()
    expect(sidebarText).not.toContain('Задачи и списки')
    // Бренд-текст, метр синхронизации и имя пользователя тоже скрыты в узком режиме.
    expect(sidebarText).not.toContain('Напоминалки')
    expect(sidebarText).not.toContain('Личный кабинет')
    expect(sidebarText).not.toContain('Синхронизация')
    expect(sidebarText).not.toContain(user.name)

    vi.unstubAllGlobals()
  })

  it('greets the user on the dashboard subtitle per the design brief (lowercase after the dash)', async () => {
    // Подзаголовок в desktop-topbar по макету не выводится — приветствие
    // показывается в мобильной шапке (там макет предусматривает подзаголовок).
    stubMatchMedia(false)
    const wrapper = await mountLayout('lk-dashboard')

    expect(wrapper.find('.lk-mobile-header__subtitle').text()).toBe('Добрый день, Иван — вот что запланировано')

    vi.unstubAllGlobals()
  })

  it('shows the topbar title per section (без подзаголовка — по десктоп-макету)', async () => {
    stubMatchMedia(true)

    const casesByRoute: Array<[string, string]> = [
      ['lk-tasks', 'Задачи и списки'],
      ['lk-reminders', 'Напоминания'],
      ['lk-calendar', 'Календарь'],
      ['lk-notes', 'Заметки'],
    ]

    for (const [routeName, title] of casesByRoute) {
      const wrapper = await mountLayout(routeName)
      expect(wrapper.find('.lk-topbar__title').text()).toBe(title)
      expect(wrapper.find('.lk-topbar__subtitle').exists()).toBe(false)
    }

    vi.unstubAllGlobals()
  })

  it('shows badges with the active tasks / notes counts on their nav items', async () => {
    vi.mocked(shoppingListsApi.fetchLists).mockResolvedValue({
      data: [
        {
          uuid: 'l-1',
          title: 'Продукты',
          type: 'goods',
          tags: [],
          items_count: 5,
          checked_items_count: 2,
          is_completed: false,
          status: 'new',
          status_label: 'Новая',
          status_is_manual: false,
          created_at: '',
          updated_at: '',
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    })
    vi.mocked(notesApi.fetchNotes).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 1, total: 4 },
      links: { first: null, last: null, prev: null, next: null },
    })
    stubMatchMedia(true)
    const wrapper = await mountLayout()
    await vi.waitFor(() => expect(wrapper.find('.lk-sidebar__badge').exists()).toBe(true))

    const badges = wrapper.findAll('.lk-sidebar__badge').map((badge) => badge.text())
    expect(badges).toEqual(['3', '4'])

    vi.unstubAllGlobals()
  })

  it('opens the create menu with the 3 redesigned items (Заметка/Напоминание/Список)', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    await wrapper.find('.lk-sidebar__create').trigger('click')
    const items = wrapper.findAll('.lk-create-menu__item').map((item) => item.text())

    expect(items).toEqual(['Заметка', 'Напоминание', 'Список'])

    vi.unstubAllGlobals()
  })

  it('opens the note form modal (not a route navigation) when picking "Заметка"', async () => {
    stubMatchMedia(true)
    const { wrapper, router } = await mountLayoutWithRouter()

    await wrapper.find('.lk-sidebar__create').trigger('click')
    const items = wrapper.findAll('.lk-create-menu__item')
    await items[0]?.trigger('click')

    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Новая заметка"]').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('lk-dashboard')

    vi.unstubAllGlobals()
  })

  it('opens the reminder form modal (not a route navigation) when picking "Напоминание"', async () => {
    stubMatchMedia(true)
    const { wrapper, router } = await mountLayoutWithRouter()

    await wrapper.find('.lk-sidebar__create').trigger('click')
    const items = wrapper.findAll('.lk-create-menu__item')
    await items[1]?.trigger('click')

    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Новое напоминание"]').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('lk-dashboard')

    vi.unstubAllGlobals()
  })

  it('opens the task/list form modal (not a route navigation) when picking "Список"', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    await wrapper.find('.lk-sidebar__create').trigger('click')
    const items = wrapper.findAll('.lk-create-menu__item')
    await items[2]?.trigger('click')

    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Новая задача / покупка"]').exists()).toBe(true)

    vi.unstubAllGlobals()
  })

  it('closes the create menu on Escape and on outside click', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    await wrapper.find('.lk-sidebar__create').trigger('click')
    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(false)

    await wrapper.find('.lk-sidebar__create').trigger('click')
    await wrapper.find('.lk-shell__create-overlay').trigger('click')
    expect(wrapper.find('.lk-shell__create-overlay').exists()).toBe(false)

    vi.unstubAllGlobals()
  })

  it('shows the create menu as a mobile bottom action-sheet and a desktop popover', async () => {
    stubMatchMedia(false)
    const mobile = await mountLayout()
    await mobile.find('.lk-bottom-nav__create').trigger('click')
    expect(mobile.find('.lk-shell__create-overlay--desktop').exists()).toBe(false)
    vi.unstubAllGlobals()

    stubMatchMedia(true)
    const desktop = await mountLayout()
    await desktop.find('.lk-sidebar__create').trigger('click')
    expect(desktop.find('.lk-shell__create-overlay--desktop').exists()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('anchors the desktop popover to the actual "Создать" button position, not a fixed screen corner', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    // Кнопка «Создать» реально расположена в верхней трети сайдбара (сразу
    // после 4 пунктов навигации) — сильно выше нижнего угла экрана.
    // Поповер должен быть привязан именно к её фактическому положению
    // (getBoundingClientRect), а не к жёстко зашитому месту в углу.
    const createButton = wrapper.find('.lk-sidebar__create').element as HTMLElement
    vi.spyOn(createButton, 'getBoundingClientRect').mockReturnValue({
      top: 260,
      left: 20,
      right: 236,
      bottom: 306,
      width: 216,
      height: 46,
      x: 20,
      y: 260,
      toJSON: () => ({}),
    })

    await wrapper.find('.lk-sidebar__create').trigger('click')

    const menu = wrapper.find('.lk-shell__create-menu')
    const style = (menu.element as HTMLElement).style
    expect(style.position).toBe('fixed')
    expect(style.top).toBe('260px')
    // Открывается правее кнопки (right + отступ), а не у левого края экрана.
    expect(parseInt(style.left, 10)).toBeGreaterThan(236)

    vi.unstubAllGlobals()
  })

  it('renders the brand block, divider and user row in the sidebar per the design brief', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar__brand-title').text()).toBe('Напоминалки')
    expect(wrapper.find('.lk-sidebar__brand-subtitle').text()).toBe('Личный кабинет')
    expect(wrapper.find('.lk-sidebar__divider').exists()).toBe(true)
    expect(wrapper.find('.lk-sidebar__create').text()).toContain('Создать')
    expect(wrapper.find('.lk-sidebar__sync-label').text()).toBe('Синхронизация с сервером')
    expect(wrapper.find('.lk-sidebar__user-name').text()).toBe(user.name)
    expect(wrapper.find('.lk-sidebar__user-email').text()).toBe(user.email)

    vi.unstubAllGlobals()
  })

  it('shows the avatar photo in the sidebar user row when the user has one', async () => {
    stubMatchMedia(true)
    const avatar = 'data:image/jpeg;base64,abc123'
    useAuthStore().setUser({ ...user, avatar })

    const wrapper = await mountLayout()

    const photo = wrapper.find('.lk-sidebar__avatar--photo')
    expect(photo.exists()).toBe(true)
    expect(photo.attributes('src')).toBe(avatar)

    vi.unstubAllGlobals()
  })

  it('falls back to the initial in the sidebar user row when there is no avatar', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar__avatar--photo').exists()).toBe(false)
    expect(wrapper.find('.lk-sidebar__avatar').text()).toBe('И')

    vi.unstubAllGlobals()
  })

  it('shows the avatar photo in the mobile header when the user has one', async () => {
    stubMatchMedia(false)
    const avatar = 'data:image/jpeg;base64,abc123'
    useAuthStore().setUser({ ...user, avatar })

    const wrapper = await mountLayout()

    const photo = wrapper.find('.lk-mobile-header__avatar-photo')
    expect(photo.exists()).toBe(true)
    expect(photo.attributes('src')).toBe(avatar)

    vi.unstubAllGlobals()
  })

  it('animates the sync meter while a sync is in flight and shows an idle status once it settles', async () => {
    stubMatchMedia(true)
    let resolveSync: (() => void) | undefined
    vi.mocked(syncApi.fetchChanges).mockReturnValue(
      new Promise((resolve) => {
        resolveSync = () =>
          resolve({
            data: { notes: [], shopping_lists: [], shopping_list_items: [], reminders: [] },
            meta: { cursor: 1, has_more: false },
          })
      }),
    )

    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar__sync').classes()).toContain('lk-sidebar__sync--syncing')
    expect(wrapper.find('.lk-sidebar__sync-status').text()).toBe('Синхронизация…')

    resolveSync?.()
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-sidebar__sync').classes()).not.toContain('lk-sidebar__sync--syncing'),
    )
    expect(wrapper.find('.lk-sidebar__sync-status').text()).toContain('Синхронизировано')

    vi.unstubAllGlobals()
  })

  it('re-runs the sync when the sync meter button is clicked', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-sidebar__sync').classes()).not.toContain('lk-sidebar__sync--syncing'),
    )

    vi.mocked(syncApi.fetchChanges).mockClear()
    await wrapper.find('.lk-sidebar__sync').trigger('click')

    expect(syncApi.fetchChanges).toHaveBeenCalledWith(0)

    vi.unstubAllGlobals()
  })

  it('re-runs the sync when the tab becomes visible again (auto refresh on focus)', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-sidebar__sync').classes()).not.toContain('lk-sidebar__sync--syncing'),
    )

    // Снимаем троттлинг «раз в 30 сек» — как будто последняя синхронизация
    // была давно (тест не должен зависеть от реального времени).
    useSyncMeter().lastSyncedAt.value = null
    vi.mocked(syncApi.fetchChanges).mockClear()

    document.dispatchEvent(new Event('visibilitychange'))

    expect(syncApi.fetchChanges).toHaveBeenCalledWith(0)

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('throttles the focus auto refresh when the last sync was moments ago', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-sidebar__sync').classes()).not.toContain('lk-sidebar__sync--syncing'),
    )

    // Синхронизация при монтировании только что прошла (lastSyncedAt свежий) —
    // немедленный повторный «visible» не должен дёргать API.
    vi.mocked(syncApi.fetchChanges).mockClear()

    document.dispatchEvent(new Event('visibilitychange'))

    expect(syncApi.fetchChanges).not.toHaveBeenCalled()

    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('hides the sync meter when the sidebar is collapsed', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()
    await vi.waitFor(() =>
      expect(wrapper.find('.lk-sidebar__sync').classes()).not.toContain('lk-sidebar__sync--syncing'),
    )

    await wrapper.find('.lk-topbar__burger').trigger('click')

    expect(wrapper.find('.lk-sidebar__sync').exists()).toBe(false)

    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
    createList: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))

vi.mock('@/api/syncApi', () => ({
  syncApi: {
    fetchChanges: vi.fn(),
    fetchConflicts: vi.fn(),
  },
}))
