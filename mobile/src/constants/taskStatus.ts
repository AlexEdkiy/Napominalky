/**
 * Статусы задач и пунктов задач — зеркало backend-enum TaskStatus.
 * Применяются ТОЛЬКО к спискам type='tasks' и их пунктам; для goods
 * статусы игнорируются (там остаётся is_checked «куплено»).
 */
export type TaskStatus = 'new' | 'in_progress' | 'postponed' | 'done'

/** Порядок отображения статусов в меню выбора. */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'new',
  'in_progress',
  'postponed',
  'done',
]

/** Русские подписи статусов (единые с веб/бэкендом). */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  postponed: 'Отложена',
  done: 'Выполнена',
}

/** true только для завершающего статуса. */
export const isDone = (status: TaskStatus): boolean => status === 'done'

/** Type guard: произвольное значение → TaskStatus. */
export const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' && (TASK_STATUS_ORDER as readonly string[]).includes(value)

/** Нормализация «сырого» значения (БД/сервер) к валидному статусу. */
export const normalizeTaskStatus = (value: unknown): TaskStatus =>
  isTaskStatus(value) ? value : 'new'

/**
 * Статус после переключения чекбокса (инвариант done ⇔ is_checked):
 * checked=true → 'done'; checked=false → 'done' сбрасывается в 'new',
 * остальные статусы сохраняются.
 */
export const forChecked = (checked: boolean, current: TaskStatus): TaskStatus => {
  if (checked) return 'done'
  return current === 'done' ? 'new' : current
}
