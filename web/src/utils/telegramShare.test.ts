import { expect, it } from 'vitest'
import { telegramShareUrl, telegramShareWebsite } from './telegramShare'

it('prepares the full plain-text draft and public website without choosing a recipient', () => {
  const text = 'Покупки & дела #1\n☑ Готово — Выполнена\n☐ Осталось + 2 🚀'
  const url = new URL(telegramShareUrl(text)!)
  expect(url.protocol).toBe('tg:')
  expect(url.hostname).toBe('msg_url')
  expect(url.searchParams.get('url')).toBe(telegramShareWebsite)
  expect(url.searchParams.get('text')).toBe(text)
  expect(Array.from(url.searchParams.keys())).toEqual(['url', 'text'])
  expect(url.hash).toBe('')
})

it('uses manual copy at the encoded URI boundary instead of truncating Cyrillic', () => {
  let text = 'Я'
  while (telegramShareUrl(text + 'Я') !== null) text += 'Я'
  const url = telegramShareUrl(text)!
  expect(url.length).toBeLessThanOrEqual(8192)
  expect(url.length).toBeGreaterThan(8186)
  expect(new URL(url).searchParams.get('text')).toBe(text)
  expect(telegramShareUrl(text + 'Я')).toBeNull()
})

it('falls back for oversized messages even when the encoded URI is short', () => {
  const text = 'a'.repeat(4096 - telegramShareWebsite.length - 1)
  expect(telegramShareUrl(text)).not.toBeNull()
  expect(telegramShareUrl(text + 'a')).toBeNull()
})

it.each(['', '  ', '\uD800'])('does not create an incomplete draft from %j', text => {
  expect(telegramShareUrl(text)).toBeNull()
})
