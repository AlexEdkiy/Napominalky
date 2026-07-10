import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LkNoteCard from './LkNoteCard.vue'
import { NAMED_NOTE_COLORS, colorForNote } from '@/constants/lkNoteColors'
import type { Note } from '@/types/note'

/** Конвертирует `#rrggbb` в строку `rgb(r, g, b)`, как её нормализует jsdom в inline style. */
function hexToRgb(hex: string): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    uuid: 'note-1',
    title: 'Список покупок',
    body: 'Молоко, хлеб, яйца',
    color: null,
    is_pinned: false,
    is_archived: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('LkNoteCard', () => {
  it('renders the title and the body preview when body is present', () => {
    const wrapper = mount(LkNoteCard, { props: { note: makeNote() } })

    expect(wrapper.find('.lk-note-card__title').text()).toBe('Список покупок')
    expect(wrapper.find('.lk-note-card__body').exists()).toBe(true)
    expect(wrapper.find('.lk-note-card__body').text()).toBe('Молоко, хлеб, яйца')
  })

  it('hides the body preview entirely when body is null (per brief)', () => {
    const wrapper = mount(LkNoteCard, { props: { note: makeNote({ body: null }) } })

    expect(wrapper.find('.lk-note-card__body').exists()).toBe(false)
    expect(wrapper.find('.lk-note-card__title').exists()).toBe(true)
  })

  it('falls back to the deterministic pastel background by uuid when color is null', () => {
    const note = makeNote({ uuid: 'sticker-uuid-7', color: null })
    const wrapper = mount(LkNoteCard, { props: { note } })

    // jsdom нормализует hex в inline style в rgb() — сравниваем через
    // computed-style элемента, а не строковый поиск исходного hex.
    const expectedBg = colorForNote(note.uuid).bg
    const cardEl = wrapper.find('.lk-note-card').element as HTMLElement
    expect(cardEl.style.background).toBe(hexToRgb(expectedBg))
  })

  it('paints the sticker using the real note.color when it is set (ignoring the uuid fallback)', () => {
    const note = makeNote({ uuid: 'sticker-uuid-7', color: 'coral' })
    const wrapper = mount(LkNoteCard, { props: { note } })

    const cardEl = wrapper.find('.lk-note-card').element as HTMLElement
    expect(cardEl.style.background).toBe(hexToRgb(NAMED_NOTE_COLORS.coral.bg))
    // Не совпадает с фолбэком по uuid — реальный цвет имеет приоритет.
    expect(cardEl.style.background).not.toBe(hexToRgb(colorForNote(note.uuid).bg))
  })

  it('renders the pin button as inactive (outline) when the note is not pinned', () => {
    const wrapper = mount(LkNoteCard, { props: { note: makeNote({ is_pinned: false }) } })

    const pinBtn = wrapper.find('.lk-note-card__pin')
    expect(pinBtn.classes()).not.toContain('lk-note-card__pin--active')
    expect(pinBtn.attributes('aria-pressed')).toBe('false')
    // Неактивный пин не залит акцентным цветом — иначе не видно разницы с активным.
    expect(pinBtn.attributes('style')).not.toContain('background')
  })

  it('renders the pin button as filled (visually active) when the note is pinned', () => {
    const wrapper = mount(LkNoteCard, { props: { note: makeNote({ is_pinned: true }) } })

    const pinBtn = wrapper.find('.lk-note-card__pin')
    expect(pinBtn.classes()).toContain('lk-note-card__pin--active')
    expect(pinBtn.attributes('aria-pressed')).toBe('true')
    // Активный пин заполнен акцентным цветом фона — это и есть визуальная
    // подсветка "закреплено", а не только логический aria-атрибут.
    expect(pinBtn.attributes('style')).toContain('background')
  })

  it('emits pin/archive/remove/open with the note uuid and stops propagation to the card', async () => {
    const note = makeNote({ uuid: 'note-9', is_pinned: false, is_archived: false })
    const wrapper = mount(LkNoteCard, { props: { note } })

    await wrapper.find('.lk-note-card__pin').trigger('click')
    expect(wrapper.emitted('pin')).toEqual([['note-9', true]])
    expect(wrapper.emitted('open')).toBeUndefined()

    await wrapper.find('.lk-note-card__action').trigger('click')
    expect(wrapper.emitted('archive')).toEqual([['note-9', true]])
    expect(wrapper.emitted('open')).toBeUndefined()

    await wrapper.find('.lk-note-card__action--danger').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['note-9']])
    expect(wrapper.emitted('open')).toBeUndefined()

    await wrapper.find('.lk-note-card').trigger('click')
    expect(wrapper.emitted('open')).toEqual([['note-9']])
  })

  it('shows the relative updated date in the footer', () => {
    const wrapper = mount(LkNoteCard, { props: { note: makeNote({ updated_at: new Date().toISOString() }) } })

    expect(wrapper.find('.lk-note-card__updated').text()).toContain('Сегодня')
  })
})
