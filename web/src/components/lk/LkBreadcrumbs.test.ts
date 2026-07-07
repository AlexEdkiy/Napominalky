import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import LkBreadcrumbs from './LkBreadcrumbs.vue'
import { provideLkBreadcrumbTail } from '@/composables/useLkBreadcrumbTail'

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
  it('hides breadcrumbs entirely on the dashboard (root-only chain)', async () => {
    const wrapper = await mountBreadcrumbs('lk-dashboard')

    expect(wrapper.find('.lk-breadcrumbs').exists()).toBe(false)
  })

  it('renders "Личный кабинет / Задачи и списки" for the section top level', async () => {
    const wrapper = await mountBreadcrumbs('lk-tasks')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Личный кабинет', 'Задачи и списки'])
  })

  it('makes non-final segments clickable links and the final segment non-clickable', async () => {
    const wrapper = await mountBreadcrumbs('lk-tasks')

    const root = wrapper.find('.lk-breadcrumbs__item--link')
    expect(root.text()).toBe('Личный кабинет')
    expect(root.element.tagName).toBe('A')

    const current = wrapper.find('.lk-breadcrumbs__item--current')
    expect(current.text()).toBe('Задачи и списки')
    expect(current.element.tagName).toBe('SPAN')
  })

  it('appends the dynamic tail (list title) for lk-list-detail', async () => {
    const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты на неделю')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Личный кабинет', 'Задачи и списки', 'Продукты на неделю'])
    expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('Продукты на неделю')
  })

  it('shows an ellipsis for the dynamic tail while the entity is still loading', async () => {
    const wrapper = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, null)

    expect(wrapper.find('.lk-breadcrumbs__item--current').text()).toBe('…')
  })

  it('appends the note title tail for lk-note-edit', async () => {
    const wrapper = await mountBreadcrumbs('lk-note-edit', { uuid: 'n-1' }, 'Идеи на отпуск')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Личный кабинет', 'Заметки', 'Идеи на отпуск'])
  })

  it('renders a static tail for lk-reminder-create', async () => {
    const wrapper = await mountBreadcrumbs('lk-reminder-create')

    const labels = wrapper.findAll('.lk-breadcrumbs__item').map((item) => item.text())
    expect(labels).toEqual(['Личный кабинет', 'Задачи и списки', 'Напоминания', 'Новое напоминание'])
  })

  it('hides the section top-level chain in compact (mobile) mode but shows it on a subpage', async () => {
    const topLevel = await mountBreadcrumbs('lk-tasks', undefined, null, true)
    expect(topLevel.find('.lk-breadcrumbs').exists()).toBe(false)

    const subpage = await mountBreadcrumbs('lk-list-detail', { uuid: 'l-1' }, 'Продукты', true)
    expect(subpage.find('.lk-breadcrumbs').exists()).toBe(true)
    expect(subpage.findAll('.lk-breadcrumbs__item').map((item) => item.text())).toEqual([
      'Личный кабинет',
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
})
