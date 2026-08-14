import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import LkCommentsPopover from './LkCommentsPopover.vue'
import type { LkPopoverComment } from './LkCommentsPopover.vue'

function makeComment(overrides: Partial<LkPopoverComment> = {}): LkPopoverComment {
  return {
    uuid: 'c-1',
    author_name: 'Анна',
    body: 'Взять образец',
    created_at: '2026-03-05T14:30:00',
    ...overrides,
  }
}

function mountPopover(comments: LkPopoverComment[]) {
  return mount(LkCommentsPopover, {
    props: { comments },
    slots: { default: '<button type="button" class="trigger">💬</button>' },
  })
}

describe('LkCommentsPopover — показ и скрытие', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the tooltip after the ~250ms hover delay, not immediately', async () => {
    const wrapper = mountPopover([makeComment()])
    await wrapper.trigger('mouseenter')

    // Сразу после mouseenter панели ещё нет (задержка показа).
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)

    vi.advanceTimersByTime(250)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    // Триггер связан с панелью через aria-describedby.
    const tooltipId = wrapper.find('[role="tooltip"]').attributes('id')
    expect(wrapper.attributes('aria-describedby')).toBe(tooltipId)
  })

  it('cancels the pending show when the cursor leaves before the delay', async () => {
    const wrapper = mountPopover([makeComment()])
    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(100)
    await wrapper.trigger('mouseleave')

    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('hides after the ~150ms mouseleave grace (панель успевает поймать курсор)', async () => {
    const wrapper = mountPopover([makeComment()])
    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(250)
    await wrapper.vm.$nextTick()

    await wrapper.trigger('mouseleave')
    // В течение грейса панель ещё видна…
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    // …а возврат курсора отменяет скрытие.
    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)

    await wrapper.trigger('mouseleave')
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('shows on focusin without a delay (доступность) and hides on Esc', async () => {
    const wrapper = mountPopover([makeComment()])
    await wrapper.trigger('focusin')
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)

    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('does not open at all when there are no comments', async () => {
    const wrapper = mountPopover([])
    await wrapper.trigger('focusin')
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)

    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })
})

describe('LkCommentsPopover — содержимое', () => {
  it('renders the «КОММЕНТАРИИ · N» header first with the FULL thread size (как на макете)', async () => {
    const comments = Array.from({ length: 8 }, (_, index) => makeComment({ uuid: `c-${index}` }))
    const wrapper = mountPopover(comments)
    await wrapper.trigger('focusin')

    const header = wrapper.find('.lk-comments-popover__header')
    expect(header.exists()).toBe(true)
    // Счётчик заголовка — ПОЛНЫЙ размер треда, даже когда превью усечено до 5.
    expect(header.text()).toBe('Комментарии · 8')
    // Заголовок — первый элемент тёмного окна (над списком комментариев).
    const tooltip = wrapper.find('[role="tooltip"]')
    expect(tooltip.element.firstElementChild?.classList.contains('lk-comments-popover__header')).toBe(true)
  })

  it('renders the author, time and body of each comment', async () => {
    const wrapper = mountPopover([
      makeComment(),
      makeComment({ uuid: 'c-2', author_name: 'Пётр', body: 'Уже взял', created_at: '2026-03-06T09:05:00' }),
    ])
    await wrapper.trigger('focusin')

    const items = wrapper.findAll('.lk-comments-popover__comment')
    expect(items).toHaveLength(2)
    expect(items[0]?.find('.lk-comments-popover__author').text()).toBe('Анна')
    expect(items[0]?.find('.lk-comments-popover__time').text()).toBe('14:30 05.03.26')
    expect(items[1]?.find('.lk-comments-popover__body').text()).toBe('Уже взял')
  })

  it('shows only the 5 LAST comments plus «и ещё N» for longer threads', async () => {
    const comments = Array.from({ length: 8 }, (_, index) =>
      makeComment({ uuid: `c-${index}`, body: `Комментарий ${index}` }),
    )
    const wrapper = mountPopover(comments)
    await wrapper.trigger('focusin')

    const bodies = wrapper.findAll('.lk-comments-popover__body').map((body) => body.text())
    expect(bodies).toEqual([
      'Комментарий 3',
      'Комментарий 4',
      'Комментарий 5',
      'Комментарий 6',
      'Комментарий 7',
    ])
    expect(wrapper.find('.lk-comments-popover__more').text()).toBe('и ещё 3')
  })

  it('hides «и ещё N» when the whole thread fits into the preview', async () => {
    const wrapper = mountPopover([makeComment()])
    await wrapper.trigger('focusin')
    expect(wrapper.find('.lk-comments-popover__more').exists()).toBe(false)
  })

  it('groups comments by itemName (заголовок пункта перед его комментариями)', async () => {
    const wrapper = mountPopover([
      makeComment({ uuid: 'c-1', itemName: 'Плитка', body: 'Взять образец' }),
      makeComment({ uuid: 'c-2', itemName: 'Плитка', body: 'Уже взял' }),
      makeComment({ uuid: 'c-3', itemName: 'Затирка', body: 'Белую' }),
    ])
    await wrapper.trigger('focusin')

    // Заголовок группы появляется один раз на пункт, в порядке следования.
    const groups = wrapper.findAll('.lk-comments-popover__group').map((group) => group.text())
    expect(groups).toEqual(['Плитка', 'Затирка'])
  })

  it('renders no group headers for a flat thread (попап строки пункта)', async () => {
    const wrapper = mountPopover([makeComment(), makeComment({ uuid: 'c-2' })])
    await wrapper.trigger('focusin')
    expect(wrapper.findAll('.lk-comments-popover__group')).toHaveLength(0)
  })
})
