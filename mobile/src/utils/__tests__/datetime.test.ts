import { formatDateTime, isValidIso } from '../datetime'

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
