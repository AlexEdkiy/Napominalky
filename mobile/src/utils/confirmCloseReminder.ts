import { Alert } from 'react-native'

import { nextOccurrence, type RecurrenceType } from '@/utils/recurrence'
import { formatReminderChip } from '@/utils/datetime'

/** Минимум полей напоминания для текста подтверждения закрытия. */
export interface ClosableReminder {
  recurrence: RecurrenceType
  remindAt: string
}

/**
 * Текст подтверждения: для повторяющегося напоминания предупреждает, что
 * после закрытия в списке появится следующее вхождение (иначе закрытие
 * выглядит как «ничего не произошло» — карточка остаётся с новой датой).
 */
export const closeReminderMessage = (reminder?: ClosableReminder): string | undefined => {
  if (reminder === undefined || reminder.recurrence === 'none') return undefined
  const next = nextOccurrence(reminder.recurrence, reminder.remindAt)
  if (next === null) return undefined
  return `Напоминание повторяется: в списке появится следующее — ${formatReminderChip(next)}.`
}

/**
 * Подтверждение выполнения напоминания: нативный Alert «Закрыть напоминание?»
 * с кнопками «Отмена»/«Закрыть». onConfirm вызывается только по «Закрыть».
 * Для повторяющегося напоминания (передан reminder с recurrence != none)
 * в тексте — дата следующего вхождения. Используется в списке напоминаний
 * и на форме напоминания.
 */
export const confirmCloseReminder = (
  onConfirm: () => void,
  reminder?: ClosableReminder,
): void => {
  Alert.alert('Закрыть напоминание?', closeReminderMessage(reminder), [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Закрыть', onPress: onConfirm },
  ])
}
