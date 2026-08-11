import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useNavigation, usePreventRemove } from '@react-navigation/core'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ReminderDateCard from '@/components/reminders/ReminderDateCard'
import { isValidIso } from '@/utils/datetime'
import { RECURRENCE_TYPES, type RecurrenceType } from '@/utils/recurrence'
import { useTheme, type ColorPalette } from '@/theme'
import { typography } from '@/theme/typography'

export interface ReminderFormValues {
  title: string
  notes: string
  remindAt: string
  recurrence: RecurrenceType
  exportToCalendar: boolean
}

interface ReminderFormProps {
  initialValues?: ReminderFormValues
  submitLabel?: string
  isSaving?: boolean
  onSubmit: (values: ReminderFormValues) => void
  onDelete?: () => void
  onBack?: () => void
  /** Дополнительные действия экрана (напр. «Выполнить»/«Отложить» на экране редактирования). */
  footer?: React.ReactNode
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
}

const emptyValues: ReminderFormValues = {
  title: '',
  notes: '',
  remindAt: '',
  recurrence: 'none',
  exportToCalendar: false,
}

/** Диалог при уходе с несохранёнными изменениями. */
const confirmLeave = (canSave: boolean, onSave: () => void, onDiscard: () => void): void => {
  if (canSave) {
    Alert.alert('Сохранить изменения?', 'Есть несохранённые изменения.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Не сохранять', style: 'destructive', onPress: onDiscard },
      { text: 'Сохранить', onPress: onSave },
    ])
    return
  }
  Alert.alert('Сохранить изменения?', 'Заполните заголовок и дату, чтобы сохранить.', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Не сохранять', style: 'destructive', onPress: onDiscard },
  ])
}

const ReminderForm: React.FC<ReminderFormProps> = ({
  initialValues,
  submitLabel = 'Создать',
  isSaving = false,
  onSubmit,
  onDelete,
  onBack,
  footer,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const start = initialValues ?? emptyValues
  const [title, setTitle] = useState(start.title)
  const [notes, setNotes] = useState(start.notes)
  const [remindAt, setRemindAt] = useState(start.remindAt)
  const [recurrence, setRecurrence] = useState<RecurrenceType>(start.recurrence)
  const [exportToCalendar, setExportToCalendar] = useState(start.exportToCalendar)
  const [baseline, setBaseline] = useState(start)

  const headerTitle = initialValues === undefined
    ? 'Новое напоминание'
    : (initialValues.title.trim().length > 0 ? initialValues.title : 'Напоминание')

  const remindAtValid = remindAt.trim().length > 0 && isValidIso(remindAt)
  const canSubmit = title.trim().length > 0 && remindAtValid

  // Экспорт в календарь не влияет на dirty: он не хранится на сервере.
  const isDirty =
    title !== baseline.title ||
    notes !== baseline.notes ||
    remindAt !== baseline.remindAt ||
    recurrence !== baseline.recurrence

  const handleSubmit = (): void => {
    if (!canSubmit) return
    setBaseline({ title, notes, remindAt, recurrence, exportToCalendar })
    onSubmit({ title: title.trim(), notes: notes.trim(), remindAt, recurrence, exportToCalendar })
  }

  usePreventRemove(isDirty, ({ data }) => {
    const leave = (): void => navigation.dispatch(data.action)
    confirmLeave(
      canSubmit,
      () => {
        handleSubmit()
        leave()
      },
      leave,
    )
  })

  return (
    <View style={[styles.root, { backgroundColor: colors.screenBg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {headerTitle}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <AboutSection
            title={title}
            notes={notes}
            onTitleChange={setTitle}
            onNotesChange={setNotes}
            colors={colors}
          />

          <WhenSection remindAt={remindAt} onChange={setRemindAt} colors={colors} />

          <RecurrenceSection value={recurrence} onChange={setRecurrence} colors={colors} />

          <ExportCalendarCheckbox
            checked={exportToCalendar}
            onToggle={() => setExportToCalendar((value) => !value)}
            colors={colors}
          />

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Удалить"
              style={styles.deleteBtn}
            >
              <Text style={[typography.body, { color: colors.danger }]}>Удалить</Text>
            </Pressable>
          ) : null}

          {footer}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.screenBg, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Pressable
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            disabled={isSaving || !canSubmit}
            style={({ pressed }) => [
              styles.createBtn,
              { backgroundColor: canSubmit && !isSaving ? colors.accent : colors.textFaint },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={[typography.buttonLabel, styles.createBtnLabel]}>{submitLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ---- Секции -----------------------------------------------------------------

interface SectionHeadingProps {
  dotColor: string
  title: string
  colors: ColorPalette
  testID?: string
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ dotColor, title, colors, testID }) => (
  <View style={styles.sectionHeading}>
    <View testID={testID} style={[styles.dot, { backgroundColor: dotColor }]} />
    <Text style={[typography.cardTitle, styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
  </View>
)

interface FieldLabelProps {
  text: string
  color: string
}

const FieldLabel: React.FC<FieldLabelProps> = ({ text, color }) => (
  <Text style={[typography.inputLabel, styles.fieldLabel, { color }]}>{text}</Text>
)

interface AboutSectionProps {
  title: string
  notes: string
  onTitleChange: (value: string) => void
  onNotesChange: (value: string) => void
  colors: ColorPalette
}

const AboutSection: React.FC<AboutSectionProps> = ({ title, notes, onTitleChange, onNotesChange, colors }) => (
  <View style={styles.section}>
    <SectionHeading dotColor={colors.accent} title="О чём напомнить" colors={colors} testID="dot-about" />
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.fieldBlock}>
        <FieldLabel text="ЗАГОЛОВОК" color={colors.textTertiary} />
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Например, Стирка"
          placeholderTextColor={colors.textTertiary}
          style={[styles.titleInput, { color: colors.textPrimary }]}
          returnKeyType="next"
          accessibilityLabel="Заголовок напоминания"
        />
      </View>
      <View testID="about-card-divider" style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
      <View style={styles.fieldBlock}>
        <FieldLabel text="ЗАМЕТКА" color={colors.textTertiary} />
        <TextInput
          value={notes}
          onChangeText={onNotesChange}
          placeholder="Добавьте детали"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.notesInput, { color: colors.textSecondary }]}
          textAlignVertical="top"
          accessibilityLabel="Заметка к напоминанию"
        />
      </View>
    </View>
  </View>
)

interface WhenSectionProps {
  remindAt: string
  onChange: (iso: string) => void
  colors: ColorPalette
}

const WhenSection: React.FC<WhenSectionProps> = ({ remindAt, onChange, colors }) => (
  <View style={styles.section}>
    <SectionHeading dotColor={colors.amber} title="Когда напомнить" colors={colors} testID="dot-when" />
    <ReminderDateCard value={remindAt} onChange={onChange} />
  </View>
)

interface RecurrenceSectionProps {
  value: RecurrenceType
  onChange: (value: RecurrenceType) => void
  colors: ColorPalette
}

const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({ value, onChange, colors }) => (
  <View style={styles.section}>
    <SectionHeading dotColor={colors.accent} title="Повтор" colors={colors} testID="dot-recurrence" />
    <View accessibilityRole="radiogroup" testID="recurrence-row" style={styles.recurrenceRow}>
      {RECURRENCE_TYPES.map((type) => (
        <RecurrenceOption
          key={type}
          type={type}
          active={type === value}
          onSelect={onChange}
          colors={colors}
        />
      ))}
    </View>
  </View>
)

interface RecurrenceOptionProps {
  type: RecurrenceType
  active: boolean
  onSelect: (value: RecurrenceType) => void
  colors: ColorPalette
}

const RecurrenceOption: React.FC<RecurrenceOptionProps> = ({ type, active, onSelect, colors }) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    accessibilityLabel={RECURRENCE_LABELS[type]}
    onPress={() => onSelect(type)}
    style={({ pressed }) => [styles.recOption, pressed && styles.pressed]}
  >
    <View style={[styles.radioOuter, { borderColor: active ? colors.accent : colors.borderInput }]}>
      {active ? (
        <View testID={`radio-dot-${type}`} style={[styles.radioInner, { backgroundColor: colors.accent }]} />
      ) : null}
    </View>
    <Text
      numberOfLines={2}
      style={[styles.recOptionLabel, { color: active ? colors.accentDark : colors.textSecondary }]}
    >
      {RECURRENCE_LABELS[type]}
    </Text>
  </Pressable>
)

interface ExportCalendarCheckboxProps {
  checked: boolean
  onToggle: () => void
  colors: ColorPalette
}

const ExportCalendarCheckbox: React.FC<ExportCalendarCheckboxProps> = ({ checked, onToggle, colors }) => (
  <Pressable
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel="Добавить в календарь"
    style={({ pressed }) => [
      styles.exportRow,
      { backgroundColor: colors.surface, borderColor: colors.borderInput },
      pressed && styles.pressed,
    ]}
  >
    <View
      testID="export-checkbox-box"
      style={[
        styles.checkboxBox,
        checked
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { borderColor: colors.borderInput },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
    </View>
    <View style={styles.exportTexts}>
      <Text style={[typography.buttonLabel, { color: colors.textPrimary }]}>Добавить в календарь</Text>
      <Text style={[styles.exportHint, { color: colors.textTertiary }]}>
        Экспорт произойдёт после сохранения
      </Text>
    </View>
    <Ionicons name="calendar-outline" size={20} color={colors.accent} />
  </Pressable>
)

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
  },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8, gap: 18 },
  section: { gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  fieldBlock: { paddingVertical: 12, gap: 4 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.7 },
  titleInput: { fontSize: 17, fontWeight: '700', padding: 0 },
  divider: { height: 1 },
  notesInput: { fontSize: 15, minHeight: 56, padding: 0 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  recOption: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  recOptionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  bottomBar: { paddingHorizontal: 18, paddingTop: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  createBtnLabel: { color: '#FFFFFF' },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportTexts: { flex: 1, gap: 2 },
  exportHint: { fontSize: 12 },
  deleteBtn: { alignItems: 'center', paddingVertical: 8 },
  pressed: { opacity: 0.7 },
})

export default ReminderForm
