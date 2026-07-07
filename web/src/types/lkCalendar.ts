import type { RouteLocationRaw } from 'vue-router'

/**
 * Тип события календаря ЛК — определяет цвет/подпись (см.
 * `constants/lkCalendarColors.ts`) и происхождение записи:
 * - `reminder` — напоминание (`types/reminder.ts`);
 * - `list` — дедлайн/напоминание пункта списка покупок (`ShoppingList.type === 'goods'`);
 * - `task` — дедлайн/напоминание пункта списка дел (`ShoppingList.type === 'tasks'`).
 */
export type LkCalendarEventType = 'reminder' | 'list' | 'task'

/**
 * Унифицированное событие раздела «Календарь» — агрегация напоминаний и
 * дедлайнов/напоминаний пунктов списков покупок в один тип для отрисовки
 * сетки месяца и панели дня (см. `composables/useLkCalendar.ts`).
 */
export interface LkCalendarEvent {
  /** uuid источника, с суффиксом поля — у одного пункта может быть 2 события. */
  id: string
  title: string
  /** Ключ `YYYY-MM-DD` в локальной TZ — группировка по дню сетки. */
  dateKey: string
  /** `HH:MM`, если есть точное время; `null` — дедлайн «весь день». */
  time: string | null
  type: LkCalendarEventType
  route: RouteLocationRaw
}
