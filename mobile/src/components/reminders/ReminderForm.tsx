import React, { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import DateTimeField from '@/components/common/DateTimeField'
import QuickTimePresets from '@/components/reminders/QuickTimePresets'
import RecurrencePicker from '@/components/reminders/RecurrencePicker'
import { exportReminderToCalendar } from '@/services/systemCalendar'
import { isValidIso } from '@/utils/datetime'
import type { RecurrenceType } from '@/utils/recurrence'

export interface ReminderFormValues {
  title: string
  notes: string
  remindAt: string
  recurrence: RecurrenceType
}

interface ReminderFormProps {
  initialValues?: ReminderFormValues
  submitLabel?: string
  isSaving?: boolean
  onSubmit: (values: ReminderFormValues) => void
  onDelete?: () => void
}

const emptyValues: ReminderFormValues = {
  title: '',
  notes: '',
  remindAt: '',
  recurrence: 'none',
}

const ReminderForm: React.FC<ReminderFormProps> = ({
  initialValues,
  submitLabel = 'Сохранить',
  isSaving = false,
  onSubmit,
  onDelete,
}) => {
  const start = initialValues ?? emptyValues
  const [title, setTitle] = useState(start.title)
  const [notes, setNotes] = useState(start.notes)
  const [remindAt, setRemindAt] = useState(start.remindAt)
  const [recurrence, setRecurrence] = useState<RecurrenceType>(start.recurrence)
  const [isExporting, setIsExporting] = useState(false)

  const remindAtValid = remindAt.trim().length > 0 && isValidIso(remindAt)
  const canSubmit = title.trim().length > 0 && remindAtValid

  const handleSubmit = (): void => {
    if (!canSubmit) return
    onSubmit({ title: title.trim(), notes: notes.trim(), remindAt, recurrence })
  }

  const handleExport = async (): Promise<void> => {
    if (!canSubmit) return
    setIsExporting(true)
    const eventId = await exportReminderToCalendar({
      title: title.trim(),
      notes: notes.trim() || null,
      remind_at: remindAt,
    })
    setIsExporting(false)
    Alert.alert(
      eventId ? 'Добавлено в календарь' : 'Не удалось',
      eventId ? 'Напоминание экспортировано.' : 'Нет разрешения или произошла ошибка.',
    )
  }

  return (
    <View style={styles.container}>
      <BaseInput label="Заголовок" value={title} onChangeText={setTitle} placeholder="Заголовок" />
      <BaseInput
        label="Заметки"
        value={notes}
        onChangeText={setNotes}
        placeholder="Дополнительно"
        multiline
        style={styles.notes}
      />
      <DateTimeField
        label="Дата и время"
        value={remindAt}
        onChange={setRemindAt}
        error={remindAt.length > 0 && !remindAtValid ? 'Некорректный формат даты' : undefined}
      />
      <QuickTimePresets onSelect={setRemindAt} />
      <RecurrencePicker value={recurrence} onChange={setRecurrence} />
      <View style={styles.actions}>
        <BaseButton
          label={submitLabel}
          onPress={handleSubmit}
          loading={isSaving}
          disabled={!canSubmit}
        />
        <BaseButton
          label="Экспорт в календарь"
          variant="secondary"
          onPress={handleExport}
          loading={isExporting}
          disabled={!canSubmit}
        />
        {onDelete ? <BaseButton label="Удалить" variant="secondary" onPress={onDelete} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 16 },
  notes: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  actions: { gap: 12, marginTop: 8 },
})

export default ReminderForm
