import {
  getCalendarDays,
  monthRange,
  sameDay,
  ymd,
} from '../dateRange'

describe('monthRange', () => {
  it('возвращает границы месяца [1-е 00:00; 1-е след. месяца 00:00)', () => {
    const { startIso, endIso } = monthRange(2026, 5) // июнь 2026
    expect(new Date(startIso)).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0))
    expect(new Date(endIso)).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
  })

  it('декабрь переходит на январь следующего года', () => {
    const { endIso } = monthRange(2026, 11)
    expect(new Date(endIso)).toEqual(new Date(2027, 0, 1, 0, 0, 0, 0))
  })
})

describe('getCalendarDays', () => {
  it('возвращает сетку 42 дня (6×7)', () => {
    expect(getCalendarDays(2026, 5)).toHaveLength(42)
  })

  it('начинается с понедельника недели первого числа', () => {
    // 1 июня 2026 — понедельник, значит первая ячейка = 1 июня
    const days = getCalendarDays(2026, 5)
    expect(days[0]?.date.getDay()).toBe(1) // Monday
    expect(sameDay(days[0]!.date, new Date(2026, 5, 1))).toBe(true)
  })

  it('добивает предыдущим месяцем, когда 1-е не понедельник', () => {
    // 1 июля 2026 — среда; первая ячейка = понедельник 29 июня
    const days = getCalendarDays(2026, 6)
    expect(days[0]?.inMonth).toBe(false)
    expect(sameDay(days[0]!.date, new Date(2026, 5, 29))).toBe(true)
  })

  it('помечает inMonth корректно для дней текущего месяца', () => {
    const days = getCalendarDays(2026, 5)
    const june10 = days.find((d) => sameDay(d.date, new Date(2026, 5, 10)))
    expect(june10?.inMonth).toBe(true)
  })
})

describe('sameDay', () => {
  it('true для одного дня с разным временем', () => {
    expect(sameDay(new Date(2026, 5, 4, 9), new Date(2026, 5, 4, 23))).toBe(true)
  })

  it('false для разных дней', () => {
    expect(sameDay(new Date(2026, 5, 4), new Date(2026, 5, 5))).toBe(false)
  })
})

describe('ymd', () => {
  it('форматирует ключ дня YYYY-MM-DD с нулями', () => {
    expect(ymd(new Date(2026, 5, 4))).toBe('2026-06-04')
    expect(ymd(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})
