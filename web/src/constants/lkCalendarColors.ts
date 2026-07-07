import type { LkCalendarEventType } from '@/types/lkCalendar'

/**
 * Цвет + подпись типа события календаря (см. design-бриф фазы 3): teal —
 * списки покупок, amber — напоминания, blue — дела (списки типа `tasks`).
 */
export interface LkCalendarEventColor {
  label: string
  color: string
  background: string
}

export const LK_CALENDAR_EVENT_COLORS: Record<LkCalendarEventType, LkCalendarEventColor> = {
  list: { label: 'Списки', color: '#17897a', background: '#d8ebe4' },
  reminder: { label: 'Напоминания', color: '#c98a2b', background: '#f7ebd5' },
  task: { label: 'Дела', color: '#4067a8', background: '#dde6f3' },
}

/** Порядок вывода легенды типов событий. */
export const LK_CALENDAR_EVENT_LEGEND_ORDER: LkCalendarEventType[] = ['list', 'reminder', 'task']
