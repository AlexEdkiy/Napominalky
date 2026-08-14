import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkStatusBadge from './LkStatusBadge.vue'
import { LK_STATUS_COLORS, LK_STATUS_LABELS, LK_STATUS_ORDER } from '@/constants/lkStatusColors'
import type { TaskStatus } from '@/types/shoppingList'

interface MountOptions {
  status?: TaskStatus
  interactive?: boolean
  withAuto?: boolean
}

function mountBadge(options: MountOptions = {}) {
  return mount(LkStatusBadge, {
    props: {
      status: options.status ?? 'new',
      interactive: options.interactive ?? false,
      withAuto: options.withAuto ?? false,
    },
  })
}

/** Инлайн-стили сериализуются в rgb() — переводим hex палитры для сравнения. */
function hexToRgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`
}

describe('LkStatusBadge — статический бейдж', () => {
  it.each(LK_STATUS_ORDER)('renders the label and palette colors for «%s»', (status) => {
    const wrapper = mountBadge({ status })
    const pill = wrapper.find('.lk-status-badge__pill')
    expect(pill.text()).toBe(LK_STATUS_LABELS[status])
    expect(pill.attributes('style')).toContain(`background: ${hexToRgb(LK_STATUS_COLORS[status].bg)}`)
    expect(pill.attributes('style')).toContain(`color: ${hexToRgb(LK_STATUS_COLORS[status].fg)}`)
  })

  it('is not a button and has no menu when not interactive', () => {
    const wrapper = mountBadge()
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})

describe('LkStatusBadge — интерактивный режим', () => {
  it('opens a menu with the 4 statuses on click; текущий помечен aria-checked', async () => {
    const wrapper = mountBadge({ status: 'in_progress', interactive: true })
    const trigger = wrapper.find('.lk-status-badge__pill--interactive')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    const options = wrapper.findAll('[role="menuitemradio"]')
    expect(options.map((option) => option.text())).toEqual([
      'Новая',
      'В работе',
      'Отложена',
      'Выполнена',
    ])
    expect(options[1]?.attributes('aria-checked')).toBe('true')
    // Без withAuto пункта «Авто» нет (у пунктов задач автоматики нет).
    expect(wrapper.text()).not.toContain('Авто')
  })

  it('adds the «Авто» item for a task (withAuto) and emits select: auto', async () => {
    const wrapper = mountBadge({ status: 'done', interactive: true, withAuto: true })
    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')

    const auto = wrapper.find('.lk-status-badge__option--auto')
    expect(auto.text()).toBe('Авто')
    await auto.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['auto']])
    // Меню закрылось после выбора.
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('emits select with the chosen status and closes the menu', async () => {
    const wrapper = mountBadge({ status: 'new', interactive: true })
    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')

    await wrapper.findAll('[role="menuitemradio"]')[3]?.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['done']])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('Escape closes ONLY the menu: событие гасится и не доходит до window (модалка выше не закроется)', async () => {
    const wrapper = mountBadge({ status: 'new', interactive: true })
    const windowListener = vi.fn()
    window.addEventListener('keydown', windowListener)
    try {
      await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)

      // Реальное нажатие всплывает через document к window — бейдж должен
      // погасить его на document, закрыв только меню.
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
      expect(windowListener).not.toHaveBeenCalled()

      // Меню закрыто (слушатель снят) — Esc свободно доходит до window.
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(windowListener).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('keydown', windowListener)
    }
  })

  it('closes the menu on Escape and on an outside click', async () => {
    const wrapper = mountBadge({ status: 'new', interactive: true })
    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.find('.lk-status-badge__pill--interactive').trigger('click')
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
