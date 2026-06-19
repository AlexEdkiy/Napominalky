import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import SectionLabel from '@/components/ui/SectionLabel'
import ReminderDateCard from '@/components/reminders/ReminderDateCard'
import { exportReminderToCalendar } from '@/services/systemCalendar'
import { isValidIso } from '@/utils/datetime'
import { RECURRENCE_TYPES, type RecurrenceType } from '@/utils/recurrence'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

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
  onBack?: () => void
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
}

const emptyValues: ReminderFormValues = { title: '', notes: '', remindAt: '', recurrence: 'none' }

const ReminderForm: React.FC<ReminderFormProps> = ({
  initialValues,
  submitLabel = 'Создать',
  isSaving = false,
  onSubmit,
  onDelete,
  onBack,
}) => {
  const { colors } = useTheme()
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
    <View style={styles.root}>
      {/* App bar */}
      <View style={styles.appBar}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.appBarTitle}>
          <SectionLabel text="Новое напоминание" color={colors.textPrimary} />
        </View>
        <Pressable
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Сохранить"
          disabled={isSaving}
          style={[styles.iconBtn, styles.saveBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Заголовок */}
      <SectionLabel text="Заголовок" />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Заголовок"
        placeholderTextColor={colors.textTertiary}
        style={[styles.titleInput, { backgroundColor: colors.surface, borderColor: colors.borderInput, color: colors.textPrimary }]}
        returnKeyType="next"
        accessibilityLabel="Заголовок напоминания"
      />

      {/* Заметка */}
      <SectionLabel text="Заметка" />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Дополнительно"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.borderInput, color: colors.textPrimary }]}
        textAlignVertical="top"
        accessibilityLabel="Заметка к напоминанию"
      />

      {/* Когда напомнить */}
      <SectionLabel text="Когда напомнить" />
      <ReminderDateCard value={remindAt} onChange={setRemindAt} />

      {/* Повтор */}
      <SectionLabel text="Повтор" />
      <View style={styles.recurrenceRow}>
        {RECURRENCE_TYPES.map((type) => {
          const active = type === recurrence
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={RECURRENCE_LABELS[type]}
              onPress={() => setRecurrence(type)}
              style={({ pressed }) => [
                styles.recChip,
                active
                  ? [styles.recChipActive, { backgroundColor: colors.accent }]
                  : { backgroundColor: colors.surface, borderColor: colors.borderInput, borderWidth: 1 },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.recChipLabel, { color: active ? '#FFFFFF' : colors.textPrimary }]}>
                {RECURRENCE_LABELS[type]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Создать */}
      <Pressable
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        disabled={isSaving || !canSubmit}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: colors.accent },
          (!canSubmit || isSaving) && styles.createBtnDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
        <Text style={[typography.buttonLabel, styles.createBtnLabel]}>{submitLabel}</Text>
      </Pressable>

      {/* Экспорт в календарь */}
      <Pressable
        onPress={handleExport}
        accessibilityRole="button"
        accessibilityLabel="Экспорт в календарь"
        disabled={isExporting || !canSubmit}
        style={({ pressed }) => [
          styles.exportBtn,
          { backgroundColor: colors.surface, borderColor: colors.borderInput, borderWidth: 1 },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.accent} />
        <Text style={[typography.buttonLabel, { color: colors.accentDark }]}>Экспорт в календарь</Text>
      </Pressable>

      {onDelete ? (
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Удалить" style={styles.deleteBtn}>
          <Text style={[typography.body, { color: colors.danger }]}>Удалить</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 10, padding: 16 },
  appBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  appBarTitle: { flex: 1 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderWidth: 0,
    shadowColor: '#0D9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 62,
  },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  recChip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 99 },
  recChipActive: {
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  recChipLabel: { fontSize: 14, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 18,
    marginTop: 4,
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnLabel: { color: '#FFFFFF' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 18,
  },
  deleteBtn: { alignItems: 'center', paddingVertical: 8 },
  pressed: { opacity: 0.7 },
})

export default ReminderForm
