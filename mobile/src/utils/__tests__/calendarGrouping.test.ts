/**
 * Покрытие логики byDay-группировки из useCalendar.
 *
 * Подход: @testing-library/react-native (RNTL) и @testing-library/react-hooks
 * в проекте НЕ установлены (см. package.json), поэтому хук useCalendar с
 * useQuery нельзя отрендерить напрямую. Приватная функция groupByDay из
 * src/hooks/useCalendar.ts не экспортируется, а выносить её в src ради теста
 * запрещено (нельзя менять исходники).
 *
 * Поэтому здесь воспроизводится ТА ЖЕ группировка через публичный ymd:
 * массив напоминаний → Map<'YYYY-MM-DD', Reminder[]> по ключу
 * ymd(new Date(remindAt)). Это проверяет контракт раскладки напоминаний по
 * дням (с учётом локальной TZ и порядка внутри дня) идентично хуку.
 */
import type { Reminder } from '@/db/repositories/remindersRepo'
import { ymd } from '../dateRange'

/** Копия приватной groupByDay из useCalendar (тот же алгоритм по ymd). */
const groupByDay = (reminders: Reminder[]): Map<string, Reminder[]> => {
  const byDay = new Map<string, Reminder[]>()
  for (const reminder of reminders) {
    const key = ymd(new Date(reminder.remindAt))
    const bucket = byDay.get(key)
    if (bucket === undefined) byDay.set(key, [reminder])
    else bucket.push(reminder)
  }
  return byDay
}

/** Фабрика напоминания с переопределяемыми полями (без any). */
const makeReminder = (overrides: Partial<Reminder>): Reminder => ({
  uuid: 'uuid',
  userId: null,
  title: 'Тест',
  notes: null,
  remindAt: '2026-06-04T10:00:00.000Z',
  recurrence: 'none',
  isCompleted: false,
  completedAt: null,
  snoozedUntil: null,
  sourceUuid: null,
  sourceType: null,
  notificationId: null,
  serverRevision: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
})

/** Локальная ISO-строка для конкретного дня/времени (стабильно к TZ окружения). */
const localIso = (
  year: number,
  month0: number,
  day: number,
  hour = 12,
): string => new Date(year, month0, day, hour, 0, 0, 0).toISOString()

describe('byDay-группировка (логика useCalendar)', () => {
  it('пустой массив → пустая Map', () => {
    const byDay = groupByDay([])
    expect(byDay.size).toBe(0)
  })

  it('раскладывает напоминания по дням remind_at', () => {
    const reminders = [
      makeReminder({ uuid: 'a', remindAt: localIso(2026, 5, 4, 9) }),
      makeReminder({ uuid: 'b', remindAt: localIso(2026, 5, 5, 9) }),
      makeReminder({ uuid: 'c', remindAt: localIso(2026, 5, 10, 9) }),
    ]

    const byDay = groupByDay(reminders)

    expect(byDay.size).toBe(3)
    expect(byDay.get('2026-06-04')?.map((r) => r.uuid)).toEqual(['a'])
    expect(byDay.get('2026-06-05')?.map((r) => r.uuid)).toEqual(['b'])
    expect(byDay.get('2026-06-10')?.map((r) => r.uuid)).toEqual(['c'])
  })

  it('складывает несколько напоминаний одного дня в один bucket (порядок сохранён)', () => {
    const reminders = [
      makeReminder({ uuid: 'a', remindAt: localIso(2026, 5, 4, 8) }),
      makeReminder({ uuid: 'b', remindAt: localIso(2026, 5, 4, 14) }),
      makeReminder({ uuid: 'c', remindAt: localIso(2026, 5, 4, 20) }),
    ]

    const byDay = groupByDay(reminders)

    expect(byDay.size).toBe(1)
    expect(byDay.get('2026-06-04')?.map((r) => r.uuid)).toEqual(['a', 'b', 'c'])
  })

  it('ключ дня согласован с локальным ymd(remindAt) для каждого напоминания', () => {
    const reminders = [
      makeReminder({ uuid: 'a', remindAt: localIso(2026, 0, 1) }),
      makeReminder({ uuid: 'b', remindAt: localIso(2026, 11, 31) }),
    ]

    const byDay = groupByDay(reminders)

    for (const reminder of reminders) {
      const key = ymd(new Date(reminder.remindAt))
      expect(byDay.get(key)?.some((r) => r.uuid === reminder.uuid)).toBe(true)
    }
  })

  it('ключ соответствует ЛОКАЛЬНОМУ дню (не UTC) — TZ-консистентность', () => {
    // remind_at построен из локальных компонентов → ключ совпадает с ymd той же
    // локальной даты, независимо от смещения окружения.
    const remindAt = localIso(2026, 5, 4, 23)
    const reminder = makeReminder({ uuid: 'late', remindAt })

    const byDay = groupByDay([reminder])
    const expectedKey = ymd(new Date(2026, 5, 4, 23))

    expect(byDay.has(expectedKey)).toBe(true)
    expect(byDay.get(expectedKey)?.[0]?.uuid).toBe('late')
  })

  it('напоминания на стыке месяцев попадают в раздельные дни', () => {
    const reminders = [
      makeReminder({ uuid: 'jun30', remindAt: localIso(2026, 5, 30) }),
      makeReminder({ uuid: 'jul01', remindAt: localIso(2026, 6, 1) }),
    ]

    const byDay = groupByDay(reminders)

    expect(byDay.get('2026-06-30')?.map((r) => r.uuid)).toEqual(['jun30'])
    expect(byDay.get('2026-07-01')?.map((r) => r.uuid)).toEqual(['jul01'])
  })
})
