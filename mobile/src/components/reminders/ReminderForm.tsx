import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import QuickTimePresets from '@/components/reminders/QuickTimePresets'
import RecurrencePicker from '@/components/reminders/RecurrencePicker'
import { formatDateTime, isValidIso } from '@/utils/datetime'
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

  const remindAtValid = remindAt.trim().length > 0 && isValidIso(remindAt)
  const canSubmit = title.trim().length > 0 && remindAtValid

  const handleSubmit = (): void => {
    if (!canSubmit) return
    onSubmit({ title: title.trim(), notes: notes.trim(), remindAt, recurrence })
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
      <BaseInput
        label="Дата и время (ISO 8601)"
        value={remindAt}
        onChangeText={setRemindAt}
        placeholder="2026-06-04T18:00:00.000Z"
        autoCapitalize="none"
        error={remindAt.length > 0 && !remindAtValid ? 'Некорректный формат даты' : undefined}
      />
      {remindAtValid ? (
        <Text style={styles.preview}>Напомнить: {formatDateTime(remindAt)}</Text>
      ) : null}
      <QuickTimePresets onSelect={setRemindAt} />
      <RecurrencePicker value={recurrence} onChange={setRecurrence} />
      <View style={styles.actions}>
        <BaseButton
          label={submitLabel}
          onPress={handleSubmit}
          loading={isSaving}
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
  preview: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  actions: { gap: 12, marginTop: 8 },
})

export default ReminderForm
