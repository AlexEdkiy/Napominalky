import { Alert } from 'react-native'

/**
 * Подтверждение выполнения напоминания: нативный Alert «Закрыть напоминание?»
 * с кнопками «Отмена»/«Закрыть». onConfirm вызывается только по «Закрыть».
 * Используется в списке напоминаний и на форме напоминания.
 */
export const confirmCloseReminder = (onConfirm: () => void): void => {
  Alert.alert('Закрыть напоминание?', undefined, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Закрыть', onPress: onConfirm },
  ])
}
