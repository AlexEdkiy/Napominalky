import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import LkLayout from './LkLayout.vue'
import { notesApi } from '@/api/notesApi'
import { shoppingListsApi } from '@/api/shoppingListsApi'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/auth'

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

async function mountLayout(routeName = 'lk-dashboard') {
  const router = createTestRouter()
  await router.push({ name: routeName })
  const wrapper = mount(TestHost, { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LkLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('renders the desktop sidebar with all 4 navigation sections', async () => {
    stubMatchMedia(true)
    const wrapper = await mountLayout()

    expect(wrapper.find('.lk-sidebar').exists()).toBe(true)
    expect(wrapper.find('.lk-bottom-nav').exists()).toBe(false)
    expect(wrapper.text()).toContain('Обзор')
    expect(wrapper.text()).toContain('Задачи и списки')
    expect(wrapper.text()).toContain('Календарь')
    expect(wrapper.text()).toContain('Заметки')

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
    expect(wrapper.text()).not.toContain('Задачи и списки')

    vi.unstubAllGlobals()
  })
})

vi.mock('@/api/shoppingListsApi', () => ({
  shoppingListsApi: {
    fetchLists: vi.fn(),
  },
}))

vi.mock('@/api/notesApi', () => ({
  notesApi: {
    fetchNotes: vi.fn(),
  },
}))
