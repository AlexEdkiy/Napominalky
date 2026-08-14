import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import LkBreadcrumbs from './LkBreadcrumbs.vue'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'
import { resetLkFormsForTests, useLkForms } from '@/composables/useLkForms'
import type { Note } from '@/types/note'
import type { Reminder } from '@/types/reminder'
import type { ShoppingList } from '@/types/shoppingList'

const StubView = { template: '<div />' }

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lk', name: 'lk-dashboard', component: StubView },
      { path: '/lk/tasks', name: 'lk-tasks', component: StubView },
      { path: '/lk/lists/:uuid', name: 'lk-list-detail', component: StubView },
      { path: '/lk/reminders', name: 'lk-reminders', component: StubView },
      { path: '/lk/reminders/new', name: 'lk-reminder-create', component: StubView },
      { path: '/lk/calendar', name: 'lk-calendar', component: StubView },
      { path: '/lk/notes', name: 'lk-notes', component: StubView },
      { path: '/lk/notes/:uuid', name: 'lk-note-edit', component: StubView },
    ],
  })
}

/** Хост-компонент: предоставляет «хвост» крошек, как это делает `LkLayout`. */
function makeHost(tailValue: string | null = null) {
  return defineComponent({
    props: { compact: { type: Boolean, default: false } },
    setup(props) {
      const tail = provideLkBreadcrumbTail()
      tail.value = tailValue
      return () => h(LkBreadcrumbs, { compact: props.compact })
    },
  })
}

async function mountBreadcrumbs(
  routeName: string,
  params: Record<string, string> = {},
  tailValue: string | null = null,
  compact = false,
) {
  const router = createTestRouter()
  await router.push({ name: routeName, params })
  return mount(makeHost(tailValue), { props: { compact }, global: { plugins: [router] } })
}

describe('LkBreadcrumbs', () => {
  beforeEach(() => {
    resetLkFormsForTests()
  })

  it('hides breadcrumbs entirely on the dashboard (root-only chain)', async () => {
    const wrapper = await mountBreadcrumbs('lk-dashboard')

    expect(wrapper.find('.lk-breadcrumbs').exists()).toBe(false)
  })

  it('renders "Главная / Задачи и списки" for the section top level', async () => {
    const wrapper = await mountBreadcrumbs('lk-tasks')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Главная', 'Задачи и списки'])
  })

  it('makes non-final segments clickable links and the final segment non-clickable', async () => {
    const wrapper = await mountBreadcrumbs('lk-tasks')

    const root = wrapper.find('.lk-breadcrumbs__item--link')
    expect(root.text()).toBe('Главная')
    expect(root.element.tagName).toBe('A')

    const current = wrapper.find('.lk-breadcrumbs__item--current')
    expect(current.text()).toBe('Задачи и списки')
    expect(current.element.tagName).toBe('SPAN')
  })

  it('renders a chevron (svg) separator between segments', async () => {
    const wrapper = await mountBreadcrumbs('lk-tasks')

    const separators = wrapper.findAll('.lk-breadcrumbs__sep')
    expect(separators).toHaveLength(1)
    expect(separators[0]?.element.tagName.toLowerCase()).toBe('svg')
    expect(separators[0]?.find('polyline').exists()).toBe(true)
  })

  it('appends the dynamic tail (list title) for lk-list-detail', async () => {
    const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты на неделю')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Главная', 'Задачи и списки', 'Продукты на неделю'])
    expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('Продукты на неделю')
  })

  it('shows an ellipsis for the dynamic tail while the entity is still loading', async () => {
    const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, null)

    expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('…')
  })

  it('appends the note title tail for lk-note-edit', async () => {
    const wrapper = await mountBreadcrumbs('lk-note-edit', { uuid: 'n-1' }, 'Идеи на отпуск')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Главная', 'Заметки', 'Идеи на отпуск'])
  })

  it('renders a static tail for lk-reminder-create', async () => {
    const wrapper = await mountBreadcrumbs('lk-reminder-create')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Главная', 'Задачи и списки', 'Напоминания', 'Новое напоминание'])
  })

  it('hides the section top-level chain in compact (mobile) mode but shows it on a subpage', async () => {
    const topLevel = await mountBreadcrumbs('lk-tasks', undefined, null, true)
    expect(topLevel.find('.lk-breadcrumbs').exists()).toBe(false)

    const subpage = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты', true)
    expect(subpage.find('.lk-breadcrumbs').exists()).toBe(true)
    expect(subpage.findAll('.lk-breadcrumbs__item').map((item) => item.text())).toEqual([
      'Главная',
      'Задачи и списки',
      'Продукты',
    ])
  })

  it('navigates when a clickable segment is clicked', async () => {
    const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты')
    const router = wrapper.findComponent(LkBreadcrumbs).vm.$router

    const tasksLink = wrapper.findAll('.lk-breadcrumbs__item--link').find((item) => item.text() === 'Задачи и списки')
    await tasksLink?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('lk-tasks')
  })

  describe('крошка открытой формы-модалки (useLkForms)', () => {
    const list: ShoppingList = {
      uuid: 'l-1',
      title: 'Продукты',
      type: 'goods',
      tags: [],
      items_count: 0,
      checked_items_count: 0,
      is_completed: false,
      status: 'new',
      status_label: 'Новая',
      status_is_manual: false,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    }

    const note: Note = {
      uuid: 'n-1',
      title: 'Идеи',
      body: null,
      color: null,
      is_pinned: false,
      is_archived: false,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    }

    const reminder: Reminder = {
      uuid: 'r-1',
      title: 'Позвонить',
      notes: null,
      remind_at: '2026-07-01T10:00:00Z',
      recurrence: 'none',
      is_completed: false,
      completed_at: null,
      snoozed_until: null,
      source_uuid: null,
      source_type: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    }

    async function labelsAfterOpen(open: () => void, routeName = 'lk-tasks'): Promise<string[]> {
      const wrapper = await mountBreadcrumbs(routeName)
      open()
      await flushPromises()
      return wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    }

    it('appends "Новая задача / покупка" when the task form is opened for creation', async () => {
      const labels = await labelsAfterOpen(() => useLkForms().openTaskForm())

      expect(labels).toEqual(['Главная', 'Задачи и списки', 'Новая задача / покупка'])
    })

    it('appends "Редактирование задачи / покупки" when the task form is opened with a list', async () => {
      const labels = await labelsAfterOpen(() => useLkForms().openTaskForm(list))

      expect(labels).toEqual(['Главная', 'Задачи и списки', 'Редактирование задачи / покупки'])
    })

    it('appends "Новая заметка" / "Редактирование заметки" for the note form', async () => {
      expect(await labelsAfterOpen(() => useLkForms().openNoteForm(), 'lk-notes')).toEqual([
        'Главная',
        'Заметки',
        'Новая заметка',
      ])

      resetLkFormsForTests()
      expect(await labelsAfterOpen(() => useLkForms().openNoteForm(note), 'lk-notes')).toEqual([
        'Главная',
        'Заметки',
        'Редактирование заметки',
      ])
    })

    it('appends "Новое напоминание" / "Редактирование напоминания" for the reminder form', async () => {
      expect(await labelsAfterOpen(() => useLkForms().openReminderForm(), 'lk-reminders')).toEqual([
        'Главная',
        'Задачи и списки',
        'Напоминания',
        'Новое напоминание',
      ])

      resetLkFormsForTests()
      expect(await labelsAfterOpen(() => useLkForms().openReminderForm(reminder), 'lk-reminders')).toEqual([
        'Главная',
        'Задачи и списки',
        'Напоминания',
        'Редактирование напоминания',
      ])
    })

    it('marks the form segment as the current (non-clickable) crumb, demoting the route tail', async () => {
      const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты')
      useLkForms().openTaskForm(list)
      await flushPromises()

      const current = wrapper.find('.lk-breadcrumbs__item--current')
      expect(current.text()).toBe('Редактирование задачи / покупки')
      expect(current.element.tagName).toBe('SPAN')
      // Название списка стало промежуточным сегментом без маршрута — не «текущим».
      expect(wrapper.find('.lk-breadcrumbs__item--muted').text()).toBe('Продукты')
    })

    it('removes the form segment when the form is closed', async () => {
      const wrapper = await mountBreadcrumbs('lk-tasks')
      const forms = useLkForms()
      forms.openTaskForm()
      await flushPromises()
      expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('Новая задача / покупка')

      forms.closeForm()
      await flushPromises()
      expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('Задачи и списки')
    })
  })
})
