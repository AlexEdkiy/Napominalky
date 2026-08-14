import { describe, expect, it } from 'vitest'

import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_ORDER,
  attributeValuesFromItem,
  formatAttributeToken,
  formatDeadlineToken,
  formatLinkToken,
  formatReminderToken,
  hasDeadlineTime,
  isAttributeSet,
  isValidLink,
  type ItemAttributeValues,
} from './itemAttributes'
import type { ShoppingListItem } from '@/types/shoppingList'

// Фиксированный «сейчас» — тесты НЕ зависят от реальной текущей даты.
const NOW = new Date('2026-07-15T12:00:00')

const emptyValues: ItemAttributeValues = {
  deadline: null,
  reminderAt: null,
  link: null,
  tags: [],
}

describe('ATTRIBUTE_ORDER / ATTRIBUTE_LABELS', () => {
  it('keeps the order without «Комментарий» (тред — не атрибут): Дедлайн, Напоминание, Ссылка, Тег', () => {
    expect(ATTRIBUTE_ORDER).toEqual(['deadline', 'reminder', 'link', 'tag'])
    expect(ATTRIBUTE_ORDER.map((attr) => ATTRIBUTE_LABELS[attr])).toEqual([
      'Дедлайн',
      'Напоминание',
      'Ссылка',
      'Тег',
    ])
    // 'comment' исключён из атрибутов целиком.
    expect(ATTRIBUTE_ORDER).not.toContain('comment')
  })
})

describe('attributeValuesFromItem', () => {
  it('maps snake_case item fields into attribute values', () => {
    const item = {
      deadline: '2026-07-20',
      reminder_at: '2026-07-20T09:00:00Z',
      link: 'https://example.com',
      tags: ['Дом'],
    } as unknown as ShoppingListItem

    // legacy `comment` в values больше не попадает (тред — не атрибут).
    expect(attributeValuesFromItem(item)).toEqual({
      deadline: '2026-07-20',
      reminderAt: '2026-07-20T09:00:00Z',
      link: 'https://example.com',
      tags: ['Дом'],
    })
  })
})

describe('isAttributeSet', () => {
  it('returns false for every attribute of an empty values set', () => {
    for (const attribute of ATTRIBUTE_ORDER) {
      expect(isAttributeSet(attribute, emptyValues)).toBe(false)
    }
  })

  it('detects each set attribute independently', () => {
    expect(isAttributeSet('deadline', { ...emptyValues, deadline: '2026-07-20' })).toBe(true)
    expect(isAttributeSet('reminder', { ...emptyValues, reminderAt: '2026-07-20T09:00:00Z' })).toBe(true)
    expect(isAttributeSet('link', { ...emptyValues, link: 'https://a.ru' })).toBe(true)
    expect(isAttributeSet('tag', { ...emptyValues, tags: ['Дом'] })).toBe(true)
  })

  it('treats empty strings as not set', () => {
    expect(isAttributeSet('link', { ...emptyValues, link: '' })).toBe(false)
  })
})

describe('hasDeadlineTime', () => {
  it('distinguishes date-only deadlines from ones with an explicit time', () => {
    expect(hasDeadlineTime('2026-07-20')).toBe(false)
    expect(hasDeadlineTime('2026-07-20T18:30:00')).toBe(true)
  })
})

describe('formatDeadlineToken', () => {
  it('formats today / tomorrow relative to the injected now', () => {
    expect(formatDeadlineToken('2026-07-15', NOW)).toBe('Сегодня')
    expect(formatDeadlineToken('2026-07-16', NOW)).toBe('Завтра')
  })

  it('formats other dates as «дд мес» within the current year and adds the year otherwise', () => {
    expect(formatDeadlineToken('2026-07-20', NOW)).toBe('20 июл')
    expect(formatDeadlineToken('2027-01-05', NOW)).toBe('5 янв 2027')
  })

  it('appends the time when the deadline carries one', () => {
    expect(formatDeadlineToken('2026-07-15T18:30:00', NOW)).toBe('Сегодня, 18:30')
  })

  it('returns the raw string for an unparseable date', () => {
    expect(formatDeadlineToken('not-a-date', NOW)).toBe('not-a-date')
  })
})

describe('formatReminderToken', () => {
  it('formats the reminder moment as «дд мес чч:мм» in the local zone', () => {
    expect(formatReminderToken('2026-07-20T09:05:00', NOW)).toBe('20 июл 09:05')
  })

  it('returns the raw string for an unparseable date', () => {
    expect(formatReminderToken('oops', NOW)).toBe('oops')
  })
})

describe('formatLinkToken', () => {
  it('extracts the hostname, adding https:// when the scheme is missing', () => {
    expect(formatLinkToken('https://www.ozon.ru/product/123')).toBe('www.ozon.ru')
    expect(formatLinkToken('market.yandex.ru/item')).toBe('market.yandex.ru')
  })
})

describe('formatAttributeToken', () => {
  it('formats every attribute type', () => {
    const values: ItemAttributeValues = {
      deadline: '2026-07-20',
      reminderAt: '2026-07-21T10:00:00',
      link: 'https://example.com/page',
      tags: ['Дом', 'Важное'],
    }
    expect(formatAttributeToken('deadline', values, NOW)).toBe('20 июл')
    expect(formatAttributeToken('reminder', values, NOW)).toBe('21 июл 10:00')
    expect(formatAttributeToken('link', values, NOW)).toBe('example.com')
    expect(formatAttributeToken('tag', values, NOW)).toBe('Дом, Важное')
  })

  it('returns empty strings when the attribute is not set', () => {
    expect(formatAttributeToken('deadline', emptyValues, NOW)).toBe('')
    expect(formatAttributeToken('reminder', emptyValues, NOW)).toBe('')
    expect(formatAttributeToken('link', emptyValues, NOW)).toBe('')
    expect(formatAttributeToken('tag', emptyValues, NOW)).toBe('')
  })
})

describe('isValidLink', () => {
  it('accepts URLs with and without a scheme', () => {
    expect(isValidLink('https://ozon.ru/product')).toBe(true)
    expect(isValidLink('ozon.ru/product')).toBe(true)
    expect(isValidLink('localhost:5173')).toBe(true)
  })

  it('rejects empty strings, bare words and strings with spaces', () => {
    expect(isValidLink('')).toBe(false)
    expect(isValidLink('   ')).toBe(false)
    expect(isValidLink('просто текст')).toBe(false)
    expect(isValidLink('слово')).toBe(false)
  })
})
