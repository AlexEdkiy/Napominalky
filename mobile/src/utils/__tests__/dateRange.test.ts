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
    const { startIso, endIso } = monthRange(2026, 11)
    expect(new Date(startIso)).toEqual(new Date(2026, 11, 1, 0, 0, 0, 0))
    expect(new Date(endIso)).toEqual(new Date(2027, 0, 1, 0, 0, 0, 0))
  })

  it('возвращает строки ISO 8601, разбираемые обратно в Date', () => {
    const { startIso, endIso } = monthRange(2026, 1) // февраль 2026
    expect(typeof startIso).toBe('string')
    expect(typeof endIso).toBe('string')
    expect(Number.isNaN(Date.parse(startIso))).toBe(false)
    expect(Number.isNaN(Date.parse(endIso))).toBe(false)
  })

  it('корректная граница февраля невисокосного года (28 дней)', () => {
    const { startIso, endIso } = monthRange(2026, 1) // февраль 2026 (не високосный)
    expect(new Date(startIso)).toEqual(new Date(2026, 1, 1, 0, 0, 0, 0))
    expect(new Date(endIso)).toEqual(new Date(2026, 2, 1, 0, 0, 0, 0))
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

  it('каждая ячейка — соседний день предыдущей (шаг 1 день)', () => {
    const days = getCalendarDays(2026, 6) // июль 2026
    const DAY_MS = 24 * 60 * 60 * 1000
    for (let i = 1; i < days.length; i += 1) {
      expect(sameDay(days[i]!.date, new Date(days[i - 1]!.date.getTime() + DAY_MS))).toBe(true)
    }
  })

  it('первая ячейка всегда понедельник (для месяца, начинающегося не с Пн)', () => {
    // 1 июля 2026 — среда → первая ячейка должна быть понедельником
    const days = getCalendarDays(2026, 6)
    expect(days[0]?.date.getDay()).toBe(1)
  })

  it('1-е число месяца попадает на позицию своего mondayOffset', () => {
    // 1 июля 2026 — среда → mondayOffset = 2 → 1 июля на индексе 2
    const days = getCalendarDays(2026, 6)
    const firstIndex = days.findIndex((d) => sameDay(d.date, new Date(2026, 6, 1)))
    expect(firstIndex).toBe(2)
    expect(days[firstIndex]?.inMonth).toBe(true)
    // дни до 1-го числа принадлежат предыдущему месяцу
    expect(days[0]?.inMonth).toBe(false)
    expect(days[1]?.inMonth).toBe(false)
  })

  it('последняя ячейка месяца помечена inMonth корректно и принадлежит концу/следующему месяцу', () => {
    // июль 2026 (31 день), 1-е — среда. Последний день месяца — 31 июля (пятница).
    const days = getCalendarDays(2026, 6)
    const last31 = days.find((d) => sameDay(d.date, new Date(2026, 6, 31)))
    expect(last31?.inMonth).toBe(true)
    // ячейки после 31 июля — дни августа (следующий месяц, inMonth=false)
    const lastIndex = days.findIndex((d) => sameDay(d.date, new Date(2026, 6, 31)))
    const tail = days.slice(lastIndex + 1)
    expect(tail.every((d) => !d.inMonth)).toBe(true)
    expect(tail.every((d) => d.date.getMonth() === 7)).toBe(true)
  })

  it('сетка покрывает все дни месяца ровно один раз', () => {
    const days = getCalendarDays(2026, 5) // июнь 2026 (30 дней)
    const inMonth = days.filter((d) => d.inMonth)
    expect(inMonth).toHaveLength(30)
    const uniqueDates = new Set(inMonth.map((d) => d.date.getDate()))
    expect(uniqueDates.size).toBe(30)
  })

  it('пограничный январь: добивка декабрём предыдущего года', () => {
    // 1 января 2027 — пятница → mondayOffset=4 → первые ячейки = декабрь 2026
    const days = getCalendarDays(2027, 0)
    expect(days).toHaveLength(42)
    expect(days[0]?.inMonth).toBe(false)
    expect(days[0]?.date.getFullYear()).toBe(2026)
    expect(days[0]?.date.getMonth()).toBe(11)
    expect(days[0]?.date.getDay()).toBe(1) // понедельник
  })
})

describe('sameDay', () => {
  it('true для одного дня с разным временем', () => {
    expect(sameDay(new Date(2026, 5, 4, 9), new Date(2026, 5, 4, 23))).toBe(true)
  })

  it('false для разных дней', () => {
    expect(sameDay(new Date(2026, 5, 4), new Date(2026, 5, 5))).toBe(false)
  })

  it('false при разном месяце (тот же день и год)', () => {
    expect(sameDay(new Date(2026, 4, 4), new Date(2026, 5, 4))).toBe(false)
  })

  it('false при разном годе (тот же день и месяц)', () => {
    expect(sameDay(new Date(2025, 5, 4), new Date(2026, 5, 4))).toBe(false)
  })

  it('true для двух одинаковых полночей', () => {
    expect(sameDay(new Date(2026, 5, 4, 0, 0, 0, 0), new Date(2026, 5, 4, 0, 0, 0, 0))).toBe(true)
  })
})

describe('ymd', () => {
  it('форматирует ключ дня YYYY-MM-DD с нулями', () => {
    expect(ymd(new Date(2026, 5, 4))).toBe('2026-06-04')
    expect(ymd(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('паддит одноразрядный месяц (январь → 01)', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('паддит одноразрядный день (1-е число → 01)', () => {
    expect(ymd(new Date(2026, 8, 1))).toBe('2026-09-01')
  })

  it('двухразрядные месяц и день без лишнего паддинга', () => {
    expect(ymd(new Date(2026, 9, 15))).toBe('2026-10-15')
  })

  it('игнорирует компонент времени (ключ только по дате)', () => {
    expect(ymd(new Date(2026, 5, 4, 23, 59, 59, 999))).toBe('2026-06-04')
  })
})
