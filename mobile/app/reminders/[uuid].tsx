import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import BaseButton from '@/components/common/BaseButton'
import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm'
import { useReminder, useReminders } from '@/hooks/useReminders'
import { exportReminderToCalendar } from '@/services/systemCalendar'
import { confirmCloseReminder } from '@/utils/confirmCloseReminder'

/**
 * Экспортирует сохранённое напоминание в календарь, при успехе передаёт
 * eventId в onExported (сохранение в локальное calendar_event_id) и
 * показывает результат.
 */
const exportAfterSave = async (
  values: ReminderFormValues,
  onExported: (eventId: string) => void,
): Promise<void> => {
  const eventId = await exportReminderToCalendar({
    title: values.title,
    notes: values.notes.length > 0 ? values.notes : null,
    remind_at: values.remindAt,
  })
  if (eventId !== null) onExported(eventId)
  Alert.alert(
    eventId ? 'Добавлено в календарь' : 'Не удалось',
    eventId ? 'Напоминание экспортировано.' : 'Нет разрешения или произошла ошибка.',
    [{ text: 'OK', onPress: () => router.back() }],
  )
}

export default function ReminderDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const reminderUuid = uuid ?? ''
  const { data: reminder, isLoading } = useReminder(reminderUuid)
  const { updateReminder, deleteReminder, completeReminder, setCalendarEventId } = useReminders()

  const handleSubmit = (values: ReminderFormValues): void => {
    updateReminder.mutate(
      {
        uuid: reminderUuid,
        patch: {
          title: values.title,
          remindAt: values.remindAt,
          notes: values.notes.length > 0 ? values.notes : null,
          recurrence: values.recurrence,
        },
      },
      {
        // «Сохранить» закрывает форму; при экспорте — после алерта с результатом.
        onSuccess: () => {
          // Уже экспортированное напоминание форма не помечает на экспорт.
          if (!values.exportToCalendar) {
            router.back()
            return
          }
          void exportAfterSave(values, (eventId) =>
            setCalendarEventId.mutate({ uuid: reminderUuid, calendarEventId: eventId }),
          )
        },
      },
    )
  }

  const confirmDelete = (): void => {
    Alert.alert('Удалить напоминание?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteReminder.mutate(reminderUuid, { onSuccess: () => router.back() }),
      },
    ])
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />
  }

  if (!reminder) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Напоминание не найдено</Text>
      </View>
    )
  }

  const handleComplete = (): void => {
    confirmCloseReminder(() =>
      completeReminder.mutate(reminderUuid, { onSuccess: () => router.back() }),
    )
  }

  return (
    <ReminderForm
      initialValues={{
        title: reminder.title,
        notes: reminder.notes ?? '',
        remindAt: reminder.remindAt,
        recurrence: reminder.recurrence,
        exportToCalendar: false,
        exportedToCalendar: reminder.calendarEventId != null,
      }}
      submitLabel="Сохранить"
      isSaving={updateReminder.isPending}
      onSubmit={handleSubmit}
      onDelete={confirmDelete}
      onBack={() => router.back()}
      footer={
        !reminder.isCompleted ? (
          <View style={styles.extra}>
            <BaseButton
              label="Выполнить"
              onPress={handleComplete}
              loading={completeReminder.isPending}
            />
          </View>
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { fontSize: 16, color: '#71717a' },
  extra: { paddingTop: 4, gap: 12 },
})
