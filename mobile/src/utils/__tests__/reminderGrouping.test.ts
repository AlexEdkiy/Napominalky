import {
  groupPlanned,
  overdueLabel,
  splitByOverdue,
} from '@/utils/reminderGrouping'

// Фиксированный «сейчас»: четверг 11 июня 2026, 12:00 локального времени.
// Конец текущей недели — воскресенье 14 июня; следующий понедельник — 15 июня.
const NOW = new Date(2026, 5, 11, 12, 0, 0, 0)

const at = (
  y: number, m: number, d: number, h = 0, min = 0,
): { remindAt: string; id: string } => ({
  remindAt: new Date(y, m, d, h, min, 0, 0).toISOString(),
  id: `${y}-${m}-${d}-${h}-${min}`,
})

describe('splitByOverdue', () => {
  it('делит на просроченные (< now) и запланированные (>= now), сортируя по времени', () => {
    const past1 = at(2026, 5, 9, 10)
    const past2 = at(2026, 5, 11, 11, 59)
    const future1 = at(2026, 5, 11, 12, 1)
    const future2 = at(2026, 5, 20, 9)
    const { overdue, planned } = splitByOverdue([future2, past2, future1, past1], NOW)
    expect(overdue.map((r) => r.id)).toEqual([past1.id, past2.id])
    expect(planned.map((r) => r.id)).toEqual([future1.id, future2.id])
  })

  it('момент ровно now — запланированное, не просроченное', () => {
    const exact = { remindAt: NOW.toISOString() }
    const { overdue, planned } = splitByOverdue([exact], NOW)
    expect(overdue).toHaveLength(0)
    expect(planned).toHaveLength(1)
  })

  it('пустой вход — пустые массивы (счётчики 0/0)', () => {
    const { overdue, planned } = splitByOverdue([], NOW)
    expect(overdue).toHaveLength(0)
    expect(planned).toHaveLength(0)
  })
})

describe('groupPlanned — границы Сегодня/Завтра/Неделя/Позже', () => {
  it('до конца текущих суток — «Сегодня», с 00:00 завтра — «Завтра»', () => {
    const todayLate = at(2026, 5, 11, 23, 59)
    const tomorrowStart = at(2026, 5, 12, 0, 0)
    const sections = groupPlanned([tomorrowStart, todayLate], NOW)
    expect(sections.map((s) => s.title)).toEqual(['Сегодня', 'Завтра'])
    expect(sections[0]?.data.map((r) => r.id)).toEqual([todayLate.id])
    expect(sections[1]?.data.map((r) => r.id)).toEqual([tomorrowStart.id])
  })

  it('послезавтра до конца недели — «На этой неделе», следующий понедельник — «Позже»', () => {
    const saturday = at(2026, 5, 13, 9)
    const sundayLate = at(2026, 5, 14, 23, 59)
    const nextMonday = at(2026, 5, 15, 0, 0)
    const sections = groupPlanned([nextMonday, sundayLate, saturday], NOW)
    expect(sections.map((s) => s.title)).toEqual(['На этой неделе', 'Позже'])
    expect(sections[0]?.data.map((r) => r.id)).toEqual([saturday.id, sundayLate.id])
    expect(sections[1]?.data.map((r) => r.id)).toEqual([nextMonday.id])
  })

  it('пустые группы не включаются, порядок групп фиксированный', () => {
    const later = at(2026, 6, 1, 10)
    const today = at(2026, 5, 11, 18)
    const sections = groupPlanned([later, today], NOW)
    expect(sections.map((s) => s.key)).toEqual(['today', 'later'])
  })

  it('внутри группы — сортировка по возрастанию времени', () => {
    const evening = at(2026, 5, 11, 20)
    const afternoon = at(2026, 5, 11, 14)
    const sections = groupPlanned([evening, afternoon], NOW)
    expect(sections[0]?.data.map((r) => r.id)).toEqual([afternoon.id, evening.id])
  })

  it('если сегодня воскресенье, завтра — «Завтра», а не «На этой неделе»', () => {
    const sundayNow = new Date(2026, 5, 14, 12, 0, 0, 0)
    const monday = at(2026, 5, 15, 10)
    const tuesday = at(2026, 5, 16, 10)
    const sections = groupPlanned([monday, tuesday], sundayNow)
    // Понедельник (завтра) — «Завтра»; вторник — уже следующая неделя, «Позже».
    expect(sections.map((s) => s.title)).toEqual(['Завтра', 'Позже'])
  })
})

describe('overdueLabel — «просрочено на N дней» со склонением', () => {
  const label = (daysAgo: number): string => {
    const remindAt = new Date(NOW.getTime() - daysAgo * 86_400_000)
    return overdueLabel(remindAt.toISOString(), NOW)
  }

  it('менее суток — «просрочено сегодня»', () => {
    expect(label(0.5)).toBe('просрочено сегодня')
  })

  it('1 день', () => {
    expect(label(1)).toBe('просрочено на 1 день')
  })

  it('2–4 дня', () => {
    expect(label(2)).toBe('просрочено на 2 дня')
    expect(label(4)).toBe('просрочено на 4 дня')
  })

  it('5–20 дней', () => {
    expect(label(5)).toBe('просрочено на 5 дней')
    expect(label(11)).toBe('просрочено на 11 дней')
  })

  it('21 день (склонение по последней цифре)', () => {
    expect(label(21)).toBe('просрочено на 21 день')
  })

  it('дробное количество суток округляется вниз (2,9 суток → 2 дня)', () => {
    expect(label(2.9)).toBe('просрочено на 2 дня')
  })
})
