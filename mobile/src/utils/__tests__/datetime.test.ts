import {
  formatDateTime,
  formatDeadlineChip,
  formatDeadlineDisplay,
  formatRelativeReminder,
  formatUpdatedAt,
  isReminderUrgent,
  isValidIso,
} from '../datetime'

describe('isValidIso', () => {
  it('принимает корректную ISO-строку', () => {
    expect(isValidIso('2026-06-04T18:00:00.000Z')).toBe(true)
  })

  it('отвергает мусор', () => {
    expect(isValidIso('не дата')).toBe(false)
  })
})

describe('formatDateTime', () => {
  it('форматирует локальную дату как дд.мм.гггг чч:мм', () => {
    const local = new Date(2026, 5, 4, 18, 5, 0, 0)
    expect(formatDateTime(local.toISOString())).toBe('04.06.2026 18:05')
  })

  it('возвращает исходную строку для невалидного входа', () => {
    expect(formatDateTime('xxx')).toBe('xxx')
  })
})

describe('formatRelativeReminder', () => {
  it('возвращает «Сегодня · ЧЧ:ММ» для сегодняшней даты', () => {
    const now = new Date()
    now.setHours(15, 0, 0, 0)
    const result = formatRelativeReminder(now.toISOString())
    expect(result).toBe('Сегодня · 15:00')
  })

  it('возвращает «Завтра · ЧЧ:ММ» для завтрашней даты', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 30, 0, 0)
    const result = formatRelativeReminder(tomorrow.toISOString())
    expect(result).toBe('Завтра · 10:30')
  })

  it('возвращает «D мес · ЧЧ:ММ» для даты, отличной от сегодня/завтра', () => {
    const date = new Date()
    date.setDate(date.getDate() + 10)
    date.setHours(14, 30, 0, 0)
    const result = formatRelativeReminder(date.toISOString())
    expect(result).toMatch(/^\d{1,2} \S+ · 14:30$/)
    expect(result).toContain(`${date.getDate()} `)
  })

  it('добавляет год для даты не текущего года', () => {
    const date = new Date(2099, 6, 10, 9, 5, 0, 0)
    expect(formatRelativeReminder(date.toISOString())).toBe('10 июл 2099 · 09:05')
  })

  it('возвращает исходную строку для невалидного входа', () => {
    expect(formatRelativeReminder('bad')).toBe('bad')
  })
})

describe('isReminderUrgent', () => {
  it('true для уже прошедшей даты', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    expect(isReminderUrgent(past)).toBe(true)
  })

  it('false для даты через 2 дня', () => {
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString()
    expect(isReminderUrgent(future)).toBe(false)
  })

  it('false для невалидного входа', () => {
    expect(isReminderUrgent('nope')).toBe(false)
  })
})

describe('formatUpdatedAt', () => {
  it('форматирует как «Изменено дд.мм.гггг»', () => {
    const date = new Date(2026, 5, 19, 12, 0, 0).toISOString()
    expect(formatUpdatedAt(date)).toBe('Изменено 19.06.2026')
  })

  it('возвращает пустую строку для невалидного входа', () => {
    expect(formatUpdatedAt('bad')).toBe('')
  })
})

describe('formatDeadlineChip', () => {
  it('форматирует YYYY-MM-DD как «до D мес»', () => {
    // 2026-07-05
    const result = formatDeadlineChip('2026-07-05')
    expect(result).toMatch(/до \d+ .+/)
    expect(result).toContain('до 5')
  })

  it('возвращает исходную строку для невалидного входа', () => {
    expect(formatDeadlineChip('not-a-date')).toBe('not-a-date')
  })

  it('форматирует ISO 8601 дату', () => {
    // конкретная дата: 2026-07-01
    const result = formatDeadlineChip('2026-07-01T00:00:00.000Z')
    expect(result).toMatch(/^до \d+ .+$/)
  })
})

describe('formatDeadlineDisplay', () => {
  it('форматирует YYYY-MM-DD без времени (обратная совместимость)', () => {
    const currentYear = new Date().getFullYear()
    expect(formatDeadlineDisplay(`${currentYear}-07-10`)).toBe('10 июл')
  })

  it('форматирует дедлайн с временем (YYYY-MM-DDTHH:mm) как «D мес, чч:мм»', () => {
    const currentYear = new Date().getFullYear()
    expect(formatDeadlineDisplay(`${currentYear}-07-10T14:30`)).toBe('10 июл, 14:30')
  })

  it('добавляет год для дедлайна не текущего года', () => {
    expect(formatDeadlineDisplay('2099-07-10T09:05')).toBe('10 июл 2099, 09:05')
  })

  it('возвращает исходную строку для невалидного входа', () => {
    expect(formatDeadlineDisplay('not-a-date')).toBe('not-a-date')
  })
})
