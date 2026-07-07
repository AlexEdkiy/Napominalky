import { describe, expect, it } from 'vitest'

import { parseTags } from './tags'

describe('parseTags', () => {
  it('returns [] for null/undefined (no tags)', () => {
    expect(parseTags(null)).toEqual([])
    expect(parseTags(undefined)).toEqual([])
  })

  it('parses a JSON array string into a string array', () => {
    expect(parseTags('["Покупки","Дом"]')).toEqual(['Покупки', 'Дом'])
  })

  it('returns [] for an empty string', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags('   ')).toEqual([])
  })

  it('returns [] for malformed JSON instead of throwing', () => {
    expect(parseTags('{not valid json')).toEqual([])
  })

  it('returns [] when the JSON parses to something other than an array', () => {
    expect(parseTags('{"a":1}')).toEqual([])
    expect(parseTags('"Покупки"')).toEqual([])
    expect(parseTags('42')).toEqual([])
  })

  it('passes through an already-parsed array as-is (defensive against contract changes)', () => {
    expect(parseTags(['Важное', 'Звонки'])).toEqual(['Важное', 'Звонки'])
  })

  it('filters out non-string entries from an array', () => {
    expect(parseTags(['Важное', 42, null, 'Звонки'])).toEqual(['Важное', 'Звонки'])
  })

  it('returns [] for unsupported types (number, boolean, object)', () => {
    expect(parseTags(42)).toEqual([])
    expect(parseTags(true)).toEqual([])
    expect(parseTags({ tags: ['x'] })).toEqual([])
  })
})
