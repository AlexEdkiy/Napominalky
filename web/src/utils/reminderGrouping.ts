/**
 * Чистая логика страницы «Напоминания» ЛК (порт мобильного
 * mobile/src/utils/reminderGrouping.ts на snake_case API-модели):
 * разбивка активных напоминаний на просроченные/запланированные,
 * группировка запланированных по секциям Сегодня / Завтра / На этой
 * неделе / Позже и подпись «просрочено на N дней». Неделя начинается
 * с понедельника. Текущий момент `now` передаётся параметром — для
 * тестируемости.
 */

const MS_PER_DAY = 86_400_000
const DAYS_IN_WEEK = 7

/** Минимальный контракт элемента: достаточно даты срабатывания. */
interface HasRemindAt {
  remind_at: string
}

/** Результат разбивки активных напоминаний относительно `now`. */
export interface OverdueSplit<T extends HasRemindAt> {
  overdue: T[]
  planned: T[]
}

/** Ключ группы запланированных напоминаний. */
export type PlannedGroupKey = 'today' | 'tomorrow' | 'week' | 'later'

/** Секция списка: заголовок группы + напоминания по возрастанию времени. */
export interface PlannedSection<T extends HasRemindAt> {
  key: PlannedGroupKey
  title: string
  data: T[]
}

const GROUP_TITLES: Record<PlannedGroupKey, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'На этой неделе',
  later: 'Позже',
}

const GROUP_ORDER: PlannedGroupKey[] = ['today', 'tomorrow', 'week', 'later']

const remindTime = (item: HasRemindAt): number => new Date(item.remind_at).getTime()

const sortByRemindAt = <T extends HasRemindAt>(items: T[]): T[] =>
  [...items].sort((a, b) => remindTime(a) - remindTime(b))

/** Начало дня now + days (локальное время). */
const startOfDayPlus = (now: Date, days: number): Date =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)

/** Смещение дня недели от понедельника (Пн=0 … Вс=6). */
const mondayOffset = (date: Date): number => (date.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK

/**
 * Разбивает напоминания на просроченные (remind_at < now) и запланированные
 * (remind_at >= now). Обе части отсортированы по возрастанию remind_at.
 */
export function splitByOverdue<T extends HasRemindAt>(items: T[], now: Date): OverdueSplit<T> {
  const overdue: T[] = []
  const planned: T[] = []
  for (const item of sortByRemindAt(items)) {
    if (remindTime(item) < now.getTime()) {
      overdue.push(item)
    } else {
      planned.push(item)
    }
  }
  return { overdue, planned }
}

function classify(date: Date, now: Date): PlannedGroupKey {
  const tomorrowStart = startOfDayPlus(now, 1)
  const dayAfterStart = startOfDayPlus(now, 2)
  // Начало следующей недели (следующий понедельник 00:00, локально).
  const nextWeekStart = startOfDayPlus(now, DAYS_IN_WEEK - mondayOffset(now))
  if (date < tomorrowStart) {
    return 'today'
  }
  if (date < dayAfterStart) {
    return 'tomorrow'
  }
  if (date < nextWeekStart) {
    return 'week'
  }
  return 'later'
}

/**
 * Группирует запланированные напоминания в секции Сегодня / Завтра /
 * На этой неделе / Позже. Пустые секции опускаются, внутри — сортировка
 * по возрастанию remind_at. «На этой неделе» — от послезавтра до конца
 * текущей недели; если послезавтра уже в следующей неделе, секция пуста.
 */
export function groupPlanned<T extends HasRemindAt>(planned: T[], now: Date): PlannedSection<T>[] {
  const buckets: Record<PlannedGroupKey, T[]> = { today: [], tomorrow: [], week: [], later: [] }
  for (const item of sortByRemindAt(planned)) {
    buckets[classify(new Date(item.remind_at), now)].push(item)
  }
  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    title: GROUP_TITLES[key],
    data: buckets[key],
  }))
}

/** «N день» / «N дня» / «N дней». */
function pluralizeDays(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} дней`
  }
  if (mod10 === 1) {
    return `${count} день`
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} дня`
  }
  return `${count} дней`
}

/**
 * Подпись просрочки: «просрочено на N дней» (N — целые сутки между now и
 * remind_at); менее суток — «просрочено сегодня».
 */
export function overdueLabel(remindAtIso: string, now: Date): string {
  const elapsedDays = Math.floor((now.getTime() - new Date(remindAtIso).getTime()) / MS_PER_DAY)
  if (elapsedDays < 1) {
    return 'просрочено сегодня'
  }
  return `просрочено на ${pluralizeDays(elapsedDays)}`
}
