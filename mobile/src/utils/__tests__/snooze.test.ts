import { snoozeUntil } from '../snooze'

// Базовая дата в локальном времени среды исполнения: 2026-06-04 14:30.
const base = new Date(2026, 5, 4, 14, 30, 0, 0)

describe('snoozeUntil', () => {
  it('добавляет 10 минут для интервала 10m', () => {
    const result = new Date(snoozeUntil('10m', base))
    expect(result.getTime() - base.getTime()).toBe(10 * 60 * 1000)
  })

  it('добавляет 1 час для интервала 1h', () => {
    const result = new Date(snoozeUntil('1h', base))
    expect(result.getTime() - base.getTime()).toBe(60 * 60 * 1000)
  })

  it('возвращает ISO-строку', () => {
    expect(snoozeUntil('10m', base)).toBe(
      new Date(base.getTime() + 10 * 60 * 1000).toISOString(),
    )
  })

  it('не мутирует базовую дату', () => {
    const snapshot = base.getTime()
    snoozeUntil('1h', base)
    expect(base.getTime()).toBe(snapshot)
  })
})
