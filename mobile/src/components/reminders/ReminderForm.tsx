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
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ReminderDateCard from '@/components/reminders/ReminderDateCard'
import { exportReminderToCalendar } from '@/services/systemCalendar'
import { isValidIso } from '@/utils/datetime'
import { RECURRENCE_TYPES, type RecurrenceType } from '@/utils/recurrence'
import { useTheme, type ColorPalette } from '@/theme'
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
  /** Дополнительные действия экрана (напр. «Выполнить»/«Отложить» на экране редактирования). */
  footer?: React.ReactNode
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
  footer,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const start = initialValues ?? emptyValues
  const [title, setTitle] = useState(start.title)
  const [notes, setNotes] = useState(start.notes)
  const [remindAt, setRemindAt] = useState(start.remindAt)
  const [recurrence, setRecurrence] = useState<RecurrenceType>(start.recurrence)
  const [isExporting, setIsExporting] = useState(false)

  const headerTitle = initialValues === undefined
    ? 'Новое напоминание'
    : (initialValues.title.trim().length > 0 ? initialValues.title : 'Напоминание')

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
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <AboutSection
            title={title}
            notes={notes}
            onTitleChange={setTitle}
            onNotesChange={setNotes}
            colors={colors}
          />

          <WhenSection remindAt={remindAt} onChange={setRemindAt} colors={colors} />

          <RecurrenceSection value={recurrence} onChange={setRecurrence} colors={colors} />

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
    <View style={styles.recurrenceGrid}>
      {RECURRENCE_TYPES.map((type) => {
        const active = type === value
        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={RECURRENCE_LABELS[type]}
            onPress={() => onChange(type)}
            style={({ pressed }) => [
              styles.recChip,
              active
                ? { backgroundColor: colors.accent, borderColor: colors.accent, borderWidth: 1.5 }
                : { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1.5 },
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
  </View>
)

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
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
  content: { padding: 18, gap: 18, paddingBottom: 8 },
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
  recurrenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recChip: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recChipLabel: { fontSize: 15, fontWeight: '700' },
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
