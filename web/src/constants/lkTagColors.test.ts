import { describe, expect, it } from 'vitest'

import { colorForTag } from './lkTagColors'

describe('colorForTag', () => {
  it('returns the exact named color from the design brief palette', () => {
    expect(colorForTag('Покупки')).toEqual({ bg: '#d8ebe4', fg: '#17897a' })
    expect(colorForTag('Важное')).toEqual({ bg: '#f6dfda', fg: '#cf5b4a' })
  })

  it('returns a stable color for an unknown tag name (deterministic hash)', () => {
    const first = colorForTag('Отпуск')
    const second = colorForTag('Отпуск')
    expect(first).toEqual(second)
  })

  it('returns a color object with bg/fg for any string, never throwing', () => {
    expect(colorForTag('')).toHaveProperty('bg')
    expect(colorForTag('')).toHaveProperty('fg')
  })
})
