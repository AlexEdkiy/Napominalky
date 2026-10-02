import type { LkIconName } from '@/types/lkIcon'

/**
 * Ключ бейджа навигации: соответствует полю `useLkNavCounts()`.
 */
export type LkNavBadgeKey = 'activeTasks' | 'notes'

/**
 * Пункт навигации оболочки ЛК (сайдбар desktop / нижняя навигация mobile).
 * `relatedNames` — имена «дочерних» маршрутов раздела (не вложены в роутере
 * как children, но должны подсвечивать тот же пункт навигации).
 */
export interface LkNavItem {
  routeName: string
  relatedNames?: string[]
  label: string
  mobileLabel: string
  icon: LkIconName
  badgeKey?: LkNavBadgeKey
}

export const LK_NAV_ITEMS: LkNavItem[] = [
  {
    routeName: 'lk-dashboard',
    label: 'Вспомнить все!',
    mobileLabel: 'Главная',
    icon: 'grid',
  },
  {
    routeName: 'lk-tasks',
    relatedNames: ['lk-lists', 'lk-list-detail'],
    label: 'Задачи и списки',
    mobileLabel: 'Задачи',
    icon: 'list',
    badgeKey: 'activeTasks',
  },
  {
    routeName: 'lk-reminders',
    relatedNames: ['lk-reminder-create', 'lk-reminder-edit'],
    label: 'Напоминания',
    mobileLabel: 'Напомин.',
    icon: 'bell',
  },
  {
    routeName: 'lk-calendar',
    label: 'Календарь',
    mobileLabel: 'Календарь',
    icon: 'calendar',
  },
  {
    routeName: 'lk-notes',
    relatedNames: ['lk-note-create', 'lk-note-edit'],
    label: 'Заметки',
    mobileLabel: 'Заметки',
    icon: 'note',
    badgeKey: 'notes',
  },
]

/**
 * Заголовок + подзаголовок раздела (topbar desktop / шапка mobile).
 */
export interface LkSectionMeta {
  title: string
  subtitle: string
}

export const LK_SECTION_META: Record<string, LkSectionMeta> = {
  'lk-search': { title: 'Результаты поиска', subtitle: 'Задачи, покупки, заметки и напоминания' },
  'lk-dashboard': { title: 'Вспомнить все!', subtitle: 'Вот что запланировано' },
  'lk-tasks': {
    title: 'Задачи и списки',
    subtitle: 'Таблица дел с тегами, датами и напоминаниями',
  },
  'lk-lists': {
    title: 'Задачи и списки',
    subtitle: 'Таблица дел с тегами, датами и напоминаниями',
  },
  'lk-list-detail': {
    title: 'Задачи и списки',
    subtitle: 'Таблица дел с тегами, датами и напоминаниями',
  },
  'lk-reminders': {
    title: 'Напоминания',
    subtitle: 'Все напоминания с датой и временем',
  },
  'lk-reminder-create': {
    title: 'Напоминания',
    subtitle: 'Все напоминания с датой и временем',
  },
  'lk-reminder-edit': {
    title: 'Напоминания',
    subtitle: 'Все напоминания с датой и временем',
  },
  'lk-calendar': { title: 'Календарь', subtitle: 'Все задачи и напоминания на месяц' },
  'lk-notes': { title: 'Заметки', subtitle: 'Быстрые записи в виде стикеров' },
}

export const LK_DEFAULT_SECTION_META: LkSectionMeta = {
  title: 'Личный кабинет',
  subtitle: '',
}

/**
 * Активен ли пункт навигации для текущего маршрута (совпадение по имени
 * маршрута раздела либо по одному из «связанных» маршрутов, не вложенных
 * в роутере как children этого раздела).
 */
export function isLkNavItemActive(item: LkNavItem, routeName: string | null | undefined): boolean {
  if (typeof routeName !== 'string') {
    return false
  }
  return item.routeName === routeName || (item.relatedNames?.includes(routeName) ?? false)
}
