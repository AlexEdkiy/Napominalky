import { describe, expect, it } from 'vitest'

import { groupPlanned, overdueLabel, splitByOverdue } from './reminderGrouping'

// Среда 2026-08-19 12:00 локально: до конца недели — чт/пт/сб/вс.
const NOW = new Date(2026, 7, 19, 12, 0)

const item = (remindAt: string) => ({ remind_at: remindAt })

describe('splitByOverdue', () => {
  it('делит по remind_at < now и сортирует по возрастанию', () => {
    const { overdue, planned } = splitByOverdue(
      [
        item('2026-08-20T10:00:00'),
        item('2026-08-18T10:00:00'),
        item('2026-08-10T10:00:00'),
        item('2026-08-19T13:00:00'),
      ],
      NOW,
    )
    expect(overdue.map((i) => i.remind_at)).toEqual(['2026-08-10T10:00:00', '2026-08-18T10:00:00'])
    expect(planned.map((i) => i.remind_at)).toEqual(['2026-08-19T13:00:00', '2026-08-20T10:00:00'])
  })
})

describe('groupPlanned', () => {
  it('раскладывает по секциям Сегодня/Завтра/На этой неделе/Позже, пустые опускает', () => {
    const sections = groupPlanned(
      [
        item('2026-08-19T18:00:00'), // сегодня
        item('2026-08-20T09:00:00'), // завтра
        item('2026-08-22T09:00:00'), // суббота — эта неделя
        item('2026-08-24T09:00:00'), // следующий понедельник — позже
      ],
      NOW,
    )
    expect(sections.map((s) => s.title)).toEqual(['Сегодня', 'Завтра', 'На этой неделе', 'Позже'])
    expect(sections.map((s) => s.data.length)).toEqual([1, 1, 1, 1])
  })

  it('без сегодняшних секция «Сегодня» отсутствует', () => {
    const sections = groupPlanned([item('2026-08-20T09:00:00')], NOW)
    expect(sections.map((s) => s.title)).toEqual(['Завтра'])
  })
})

describe('overdueLabel', () => {
  it('менее суток — «просрочено сегодня»', () => {
    expect(overdueLabel('2026-08-19T09:00:00', NOW)).toBe('просрочено сегодня')
  })

  it('склоняет дни: 1 день / 2 дня / 5 дней', () => {
    expect(overdueLabel('2026-08-18T11:00:00', NOW)).toBe('просрочено на 1 день')
    expect(overdueLabel('2026-08-17T11:00:00', NOW)).toBe('просрочено на 2 дня')
    expect(overdueLabel('2026-08-14T11:00:00', NOW)).toBe('просрочено на 5 дней')
  })
})
