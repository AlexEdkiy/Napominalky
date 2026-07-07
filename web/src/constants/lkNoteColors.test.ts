import { describe, expect, it } from 'vitest'

import { colorForNote } from './lkNoteColors'

/**
 * Проверяет требование дизайн-брифа фазы 4 («Заметки»): пастельный фон
 * стикера стабилен по `uuid` (детерминизм — один uuid → один цвет между
 * перерисовками) и построен из мягких тонов той же палитры, что и
 * теги/категории (amber/teal/blue/olive/lilac).
 */
describe('colorForNote', () => {
  it('returns the same color for the same uuid on repeated calls (deterministic)', () => {
    const uuid = 'a1b2c3d4-0000-0000-0000-000000000001'

    const first = colorForNote(uuid)
    const second = colorForNote(uuid)
    const third = colorForNote(uuid)

    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  it('is a pure function of uuid, independent of call order/other uuids', () => {
    const uuid = 'note-uuid-42'
    const before = colorForNote(uuid)

    colorForNote('some-other-uuid')
    colorForNote('yet-another-uuid')

    expect(colorForNote(uuid)).toEqual(before)
  })

  it('picks colors only from the brief pastel palette (amber/teal/blue/olive/lilac tones)', () => {
    const briefPalette = [
      { bg: '#f7ebd5', accent: '#c98a2b' }, // amber
      { bg: '#d8ebe4', accent: '#17897a' }, // teal
      { bg: '#dde6f3', accent: '#4067a8' }, // blue
      { bg: '#e6efd7', accent: '#6a8a37' }, // olive
      { bg: '#e6e1f5', accent: '#7b6bb0' }, // lilac
      { bg: '#d7ecec', accent: '#2b8a8a' }, // healthy teal-ish
    ]

    const uuids = Array.from({ length: 24 }, (_unused, index) => `uuid-${index}`)
    for (const uuid of uuids) {
      const color = colorForNote(uuid)
      expect(briefPalette).toContainEqual(color)
    }
  })

  it('distributes different uuids across more than one palette color', () => {
    const uuids = Array.from({ length: 12 }, (_unused, index) => `note-${index}`)
    const backgrounds = new Set(uuids.map((uuid) => colorForNote(uuid).bg))

    expect(backgrounds.size).toBeGreaterThan(1)
  })
})
