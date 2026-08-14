import type { TaskStatus } from '@/types/shoppingList'

/** Пара цветов pill-бейджа статуса (как у тегов, см. `lkTagColors.ts`). */
export interface LkStatusColor {
  bg: string
  fg: string
}

/** Русские подписи статусов задачи/пункта (fallback к `status_label` сервера). */
export const LK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  postponed: 'Отложена',
  done: 'Выполнена',
}

/**
 * Цвета бейджей статусов — тона той же палитры, что и теги (`lkTagColors.ts`):
 * new — синий («Личное»), in_progress — amber («Счета»), postponed — lilac
 * («Работа»), done — зелёный («Покупки»).
 */
export const LK_STATUS_COLORS: Record<TaskStatus, LkStatusColor> = {
  new: { bg: '#dde6f3', fg: '#4067a8' },
  in_progress: { bg: '#f7ebd5', fg: '#c98a2b' },
  postponed: { bg: '#e6e1f5', fg: '#7b6bb0' },
  done: { bg: '#d8ebe4', fg: '#17897a' },
}

/** Порядок статусов для сортировки колонки СТАТУС и пунктов меню бейджа. */
export const LK_STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'postponed', 'done']
