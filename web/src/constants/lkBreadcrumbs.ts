/**
 * Один сегмент цепочки хлебных крошек ЛК. `routeName` определён у всех
 * сегментов, КРОМЕ последнего (текущая страница) — компонент `LkBreadcrumbs`
 * всегда рендерит последний элемент цепочки некликабельным независимо от
 * того, задан ли для него маршрут.
 */
export interface LkBreadcrumbItem {
  label: string
  routeName?: string
}

// Первая крошка по макету — «Главная» (ведёт на Обзор ЛК, lk-dashboard).
const ROOT: LkBreadcrumbItem = { label: 'Главная', routeName: 'lk-dashboard' }
const TASKS: LkBreadcrumbItem = { label: 'Задачи и списки', routeName: 'lk-tasks' }
const REMINDERS: LkBreadcrumbItem = { label: 'Напоминания', routeName: 'lk-reminders' }
const CALENDAR: LkBreadcrumbItem = { label: 'Календарь', routeName: 'lk-calendar' }
const NOTES: LkBreadcrumbItem = { label: 'Заметки', routeName: 'lk-notes' }

/**
 * Статические цепочки по имени маршрута. Для маршрутов с динамическим
 * хвостом (см. `DYNAMIC_TAIL_ROUTES`) сюда входит только «родительская»
 * часть — сам хвост дописывает `buildLkBreadcrumbs`.
 */
const CHAINS: Record<string, LkBreadcrumbItem[]> = {
  'lk-dashboard': [ROOT],
  'lk-tasks': [ROOT, TASKS],
  'lk-lists': [ROOT, TASKS],
  'lk-list-detail': [ROOT, TASKS],
  'lk-reminders': [ROOT, TASKS, REMINDERS],
  'lk-reminder-create': [ROOT, TASKS, REMINDERS, { label: 'Новое напоминание' }],
  'lk-reminder-edit': [ROOT, TASKS, REMINDERS],
  'lk-calendar': [ROOT, CALENDAR],
  'lk-notes': [ROOT, NOTES],
  'lk-note-create': [ROOT, NOTES, { label: 'Новая заметка' }],
  'lk-note-edit': [ROOT, NOTES],
  'lk-account': [ROOT, { label: 'Аккаунт' }],
  'lk-settings': [ROOT, { label: 'Настройки' }],
  'lk-sync': [ROOT, { label: 'Синхронизация' }],
}

/**
 * Маршруты, чей последний сегмент — название уже загруженной сущности
 * (список покупок / заметка / напоминание), а не статический текст.
 */
const DYNAMIC_TAIL_ROUTES = new Set(['lk-list-detail', 'lk-note-edit', 'lk-reminder-edit'])

export function isLkBreadcrumbDynamicTailRoute(routeName: string | null | undefined): boolean {
  return typeof routeName === 'string' && DYNAMIC_TAIL_ROUTES.has(routeName)
}

/**
 * Строит цепочку крошек для текущего маршрута. `dynamicTail` — заголовок
 * сущности из уже загруженных данных страницы (см. `useLkBreadcrumbTail`);
 * пока он `null` на маршруте с динамическим хвостом — показывает «…»,
 * не дублируя родительский сегмент и не делая лишних запросов.
 */
/** Тип открытой формы-модалки ЛК (см. `useLkForms`) для крошки формы. */
export type LkFormBreadcrumbKind = 'task' | 'note' | 'reminder'

/**
 * Метки крошки открытой формы-модалки по макету: создание/редактирование
 * задачи-покупки, заметки, напоминания. Сегмент дописывается компонентом
 * `LkBreadcrumbs` ПОВЕРХ цепочки маршрута, пока модалка открыта.
 */
const FORM_SEGMENT_LABELS: Record<LkFormBreadcrumbKind, { create: string; edit: string }> = {
  task: { create: 'Новая задача / покупка', edit: 'Редактирование задачи / покупки' },
  note: { create: 'Новая заметка', edit: 'Редактирование заметки' },
  reminder: { create: 'Новое напоминание', edit: 'Редактирование напоминания' },
}

export function lkFormBreadcrumbLabel(kind: LkFormBreadcrumbKind, isEdit: boolean): string {
  return isEdit ? FORM_SEGMENT_LABELS[kind].edit : FORM_SEGMENT_LABELS[kind].create
}

export function buildLkBreadcrumbs(
  routeName: string | null | undefined,
  dynamicTail: string | null,
): LkBreadcrumbItem[] {
  if (typeof routeName !== 'string') {
    return [ROOT]
  }
  const base = CHAINS[routeName] ?? [ROOT]
  if (isLkBreadcrumbDynamicTailRoute(routeName)) {
    return [...base, { label: dynamicTail ?? '…' }]
  }
  return base
}
