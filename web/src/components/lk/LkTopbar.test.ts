import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import LkTopbar from './LkTopbar.vue'

function mountTopbar(props: { title: string; todayDeadlineCount?: number | null }): VueWrapper {
  return mount(LkTopbar, {
    props,
    global: {
      // Крошки тестируются отдельно (LkBreadcrumbs.test.ts) и требуют роутер.
      stubs: { LkBreadcrumbs: { template: '<nav class="lk-topbar__breadcrumbs" />' } },
    },
  })
}

describe('LkTopbar', () => {
  it('renders only the title — подзаголовка в topbar по макету нет', () => {
    const wrapper = mountTopbar({ title: 'Задачи и списки' })
    expect(wrapper.find('h1.lk-topbar__title').text()).toBe('Задачи и списки')
    expect(wrapper.find('.lk-topbar__subtitle').exists()).toBe(false)
  })

  it('renders the burger as a chip with the sidebar-toggle icon (panel, not 3 lines) per the mockup', () => {
    const wrapper = mountTopbar({ title: 'Обзор' })
    const burger = wrapper.find('button.lk-topbar__burger')

    expect(burger.attributes('aria-label')).toBe('Свернуть/развернуть сайдбар')
    expect(burger.attributes('type')).toBe('button')

    // Иконка-панель из макета: скруглённый прямоугольник + вертикальный разделитель.
    const rect = burger.find('svg rect')
    expect(rect.exists()).toBe(true)
    expect(rect.attributes()).toMatchObject({ x: '3', y: '4', width: '18', height: '16', rx: '2.5' })
    const divider = burger.findAll('svg path').find((path) => path.attributes('d') === 'M9 4v16')
    expect(divider).toBeDefined()
  })

  it('emits toggleSidebar when the burger chip is clicked', async () => {
    const wrapper = mountTopbar({ title: 'Обзор' })

    await wrapper.find('.lk-topbar__burger').trigger('click')

    expect(wrapper.emitted('toggleSidebar')).toHaveLength(1)
  })

  it('renders the global search with the mockup placeholder and an accessible label', () => {
    const wrapper = mountTopbar({ title: 'Обзор' })
    const input = wrapper.find('.lk-topbar__search input')

    expect(input.attributes('type')).toBe('search')
    expect(input.attributes('placeholder')).toBe('Поиск по всему')
    expect(input.attributes('aria-label')).toBe('Поиск по всему')
    expect(wrapper.find('.lk-topbar__search svg').exists()).toBe(true)
  })

  it('marks the bell only when there are today deadlines and emits navigation on click', async () => {
    const wrapper = mountTopbar({ title: 'Вспомнить все!', todayDeadlineCount: 2 })
    const bell = wrapper.find('button.lk-today-bell')
    expect(bell.attributes('aria-label')).toBe('Списки с дедлайном на сегодня: 2')
    expect(bell.find('.lk-today-bell__dot').exists()).toBe(true)
    await bell.trigger('click')
    expect(wrapper.emitted('openToday')).toHaveLength(1)
    await wrapper.setProps({ todayDeadlineCount: 0 })
    expect(bell.find('.lk-today-bell__dot').exists()).toBe(false)
    await wrapper.setProps({ todayDeadlineCount: null })
    expect(bell.find('.lk-today-bell__dot').exists()).toBe(false)
    expect(bell.attributes('aria-label')).toBe('Открыть списки с дедлайном на сегодня')
  })

  it('keeps the breadcrumbs slot above the title inside the titles block', () => {
    const wrapper = mountTopbar({ title: 'Обзор' })
    const titles = wrapper.find('.lk-topbar__titles')
    const children = Array.from(titles.element.children).map((el) => el.className)

    expect(children[0]).toContain('lk-topbar__breadcrumbs')
    expect(children[1]).toContain('lk-topbar__title')
  })
})
