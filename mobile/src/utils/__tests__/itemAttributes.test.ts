import {
  DEADLINE_PRESETS,
  EMPTY_ATTRIBUTE_VALUES,
  REMINDER_PRESETS,
  formatAttributeToken,
  formatDeadlineToken,
  formatLinkToken,
  formatReminderToken,
  isAttributeSet,
  matchDeadlinePreset,
  resolveDeadlinePreset,
  resolveReminderPreset,
  type ItemAttributeValues,
} from '../itemAttributes'

describe('isAttributeSet', () => {
  it('false для всех атрибутов на пустых values', () => {
    expect(isAttributeSet('deadline', EMPTY_ATTRIBUTE_VALUES)).toBe(false)
    expect(isAttributeSet('reminder', EMPTY_ATTRIBUTE_VALUES)).toBe(false)
    expect(isAttributeSet('link', EMPTY_ATTRIBUTE_VALUES)).toBe(false)
    expect(isAttributeSet('comment', EMPTY_ATTRIBUTE_VALUES)).toBe(false)
    expect(isAttributeSet('tag', EMPTY_ATTRIBUTE_VALUES)).toBe(false)
  })

  it('true когда значение задано', () => {
    const values: ItemAttributeValues = {
      deadline: '2026-07-10',
      reminderAt: '2026-07-09T09:00:00.000Z',
      link: 'https://a.com',
      comment: 'note',
      tags: ['срочно'],
    }
    expect(isAttributeSet('deadline', values)).toBe(true)
    expect(isAttributeSet('reminder', values)).toBe(true)
    expect(isAttributeSet('link', values)).toBe(true)
    expect(isAttributeSet('comment', values)).toBe(true)
    expect(isAttributeSet('tag', values)).toBe(true)
  })
})

describe('formatDeadlineToken', () => {
  it('«Сегодня» для сегодняшней даты', () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    expect(formatDeadlineToken(`${y}-${m}-${d}`)).toBe('Сегодня')
  })

  it('форматированная дата для произвольного дня', () => {
    const future = new Date(Date.now() + 30 * 86_400_000)
    const y = future.getFullYear()
    const m = String(future.getMonth() + 1).padStart(2, '0')
    const d = String(future.getDate()).padStart(2, '0')
    const result = formatDeadlineToken(`${y}-${m}-${d}`)
    expect(result).not.toBe('Сегодня')
    expect(result).not.toBe('Завтра')
  })
})

describe('formatReminderToken', () => {
  it('«За 10 минут» для момента через ~10 минут', () => {
    const iso = new Date(Date.now() + 9 * 60_000).toISOString()
    expect(formatReminderToken(iso)).toBe('За 10 минут')
  })

  it('«За 1 час» для момента через ~1 час', () => {
    const iso = new Date(Date.now() + 55 * 60_000).toISOString()
    expect(formatReminderToken(iso)).toBe('За 1 час')
  })

  it('дд мес чч:мм для дальнего будущего', () => {
    const iso = new Date(Date.now() + 5 * 86_400_000).toISOString()
    const result = formatReminderToken(iso)
    expect(result).toMatch(/^\d{2} [а-я]+ \d{2}:\d{2}$/)
  })
})

describe('formatLinkToken (домен из ссылки)', () => {
  it('извлекает hostname из полного URL', () => {
    expect(formatLinkToken('https://example.com/path?x=1')).toBe('example.com')
  })

  it('извлекает hostname без указанной схемы', () => {
    expect(formatLinkToken('example.com/path')).toBe('example.com')
  })

  it('возвращает исходную строку для невалидного значения', () => {
    expect(formatLinkToken('не ссылка')).toBe('не ссылка')
  })
})

describe('formatAttributeToken', () => {
  it('comment → «Есть заметка»', () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, comment: 'Взять свежее' }
    expect(formatAttributeToken('comment', values)).toBe('Есть заметка')
  })

  it('tag → теги через запятую', () => {
    const values: ItemAttributeValues = { ...EMPTY_ATTRIBUTE_VALUES, tags: ['срочно', 'дом'] }
    expect(formatAttributeToken('tag', values)).toBe('срочно, дом')
  })
})

describe('resolveDeadlinePreset / matchDeadlinePreset', () => {
  it('пресеты покрывают все ключи DEADLINE_PRESETS', () => {
    for (const preset of DEADLINE_PRESETS) {
      const resolved = resolveDeadlinePreset(preset.key)
      expect(resolved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('matchDeadlinePreset распознаёт «Сегодня»', () => {
    const today = resolveDeadlinePreset('today')
    expect(matchDeadlinePreset(today)).toBe('today')
  })

  it('matchDeadlinePreset возвращает null для произвольной даты', () => {
    expect(matchDeadlinePreset('2099-12-31')).toBeNull()
  })

  it('matchDeadlinePreset возвращает null для null', () => {
    expect(matchDeadlinePreset(null)).toBeNull()
  })
})

describe('resolveReminderPreset', () => {
  it('без дедлайна считает смещение от «сейчас», результат в будущем', () => {
    for (const preset of REMINDER_PRESETS) {
      const iso = resolveReminderPreset(preset.key, null)
      expect(new Date(iso).getTime()).toBeGreaterThan(Date.now())
    }
  })

  it('с дедлайном считает от 09:00 дедлайна минус смещение', () => {
    const iso = resolveReminderPreset('1h', '2026-09-10')
    const date = new Date(iso)
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8) // сентябрь
    expect(date.getDate()).toBe(10)
    expect(date.getHours()).toBe(8)
  })

  it('не падает для некорректной строки дедлайна', () => {
    expect(() => resolveReminderPreset('10m', 'не дата')).not.toThrow()
  })
})
