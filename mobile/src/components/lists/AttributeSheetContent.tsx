import React, { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

import AttributeSheetPill from '@/components/lists/AttributeSheetPill'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import {
  DEADLINE_PRESETS,
  REMINDER_PRESETS,
  hasDeadlineTime,
  matchDeadlinePreset,
  resolveDeadlinePreset,
  resolveReminderPreset,
  type AttributeSheetValue,
  type DeadlinePresetKey,
  type ItemAttribute,
  type ReminderPresetKey,
} from '@/utils/itemAttributes'

const TAG_PRESETS = ['Срочно', 'Работа', 'Дом', 'Личное'] as const

/**
 * Android `@react-native-community/datetimepicker` НЕ поддерживает `mode="datetime"` —
 * дата и время выбираются последовательными шагами (сначала 'date', потом 'time').
 */
type AndroidStep = 'idle' | 'date' | 'time'

/** 'YYYY-MM-DDTHH:mm' из объекта Date (локальное время, без секунд). */
const formatLocalDateTime = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

/** Дата с временем из picked (date step) + picked (time step). */
const mergeDateAndTime = (datePart: Date, timePart: Date): Date => {
  const merged = new Date(datePart.getTime())
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0)
  return merged
}

interface SheetContentProps {
  attribute: ItemAttribute
  draft: AttributeSheetValue
  deadline: string | null
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

/** Диспетчер контента шторки по типу атрибута. */
const SheetContent: React.FC<SheetContentProps> = ({ attribute, draft, deadline, accentColor, onChange }) => {
  if (attribute === 'deadline') {
    return (
      <DeadlineContent draft={typeof draft === 'string' ? draft : null} accentColor={accentColor} onChange={onChange} />
    )
  }
  if (attribute === 'reminder') {
    return (
      <ReminderContent
        draft={typeof draft === 'string' ? draft : null}
        deadline={deadline}
        accentColor={accentColor}
        onChange={onChange}
      />
    )
  }
  if (attribute === 'link') {
    return <LinkContent draft={typeof draft === 'string' ? draft : ''} accentColor={accentColor} onChange={onChange} />
  }
  if (attribute === 'comment') {
    return <CommentContent draft={typeof draft === 'string' ? draft : ''} accentColor={accentColor} onChange={onChange} />
  }
  return <TagContent draft={Array.isArray(draft) ? draft : []} accentColor={accentColor} onChange={onChange} />
}

// ---- Deadline ----------------------------------------------------------------

interface DeadlineContentProps {
  draft: string | null
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

const DeadlineContent: React.FC<DeadlineContentProps> = ({ draft, accentColor, onChange }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [androidStep, setAndroidStep] = useState<AndroidStep>('idle')
  const [androidDraft, setAndroidDraft] = useState<Date>(new Date())
  const activePreset = matchDeadlinePreset(draft)
  const isCustom = draft !== null && activePreset === null

  const pickerValue = draft !== null ? new Date(hasDeadlineTime(draft) ? draft : `${draft}T00:00:00`) : new Date()

  const handlePreset = (key: DeadlinePresetKey): void => {
    onChange(resolveDeadlinePreset(key))
    setShowPicker(false)
    setAndroidStep('idle')
  }

  const openPicker = (): void => {
    if (Platform.OS === 'android') {
      setAndroidDraft(pickerValue)
      setAndroidStep('date')
    } else {
      setShowPicker(true)
    }
  }

  const handleIosChange = (_event: DateTimePickerEvent, picked?: Date): void => {
    if (picked === undefined) return
    onChange(formatLocalDateTime(picked))
  }

  const handleAndroidChange = (event: DateTimePickerEvent, picked?: Date): void => {
    if (event.type === 'dismissed' || picked === undefined) {
      setAndroidStep('idle')
      return
    }
    if (androidStep === 'date') {
      setAndroidDraft(picked)
      setAndroidStep('time')
      return
    }
    setAndroidStep('idle')
    onChange(formatLocalDateTime(mergeDateAndTime(androidDraft, picked)))
  }

  return (
    <View style={styles.content}>
      <View style={styles.pillsWrap}>
        {DEADLINE_PRESETS.map((preset) => (
          <AttributeSheetPill
            key={preset.key}
            label={preset.label}
            active={activePreset === preset.key}
            accentColor={accentColor}
            onPress={() => handlePreset(preset.key)}
          />
        ))}
        <AttributeSheetPill label="Выбрать дату" active={isCustom} accentColor={accentColor} onPress={openPicker} />
      </View>
      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker value={pickerValue} mode="datetime" display="spinner" onChange={handleIosChange} />
      )}
      {Platform.OS === 'android' && androidStep !== 'idle' && (
        <DateTimePicker value={androidDraft} mode={androidStep} display="default" onChange={handleAndroidChange} />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <Pressable onPress={() => setShowPicker(false)} style={styles.iosPickerDoneWrap}>
          <Text style={[styles.iosPickerDoneText, { color: accentColor }]}>Готово</Text>
        </Pressable>
      )}
    </View>
  )
}

// ---- Reminder ------------------------------------------------------------

interface ReminderContentProps {
  draft: string | null
  deadline: string | null
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

const matchReminderPreset = (draft: string | null, deadline: string | null): ReminderPresetKey | null => {
  if (draft === null) return null
  for (const preset of REMINDER_PRESETS) {
    if (resolveReminderPreset(preset.key, deadline) === draft) return preset.key
  }
  return null
}

const ReminderContent: React.FC<ReminderContentProps> = ({ draft, deadline, accentColor, onChange }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [androidStep, setAndroidStep] = useState<AndroidStep>('idle')
  const [androidDraft, setAndroidDraft] = useState<Date>(new Date())
  const activePreset = matchReminderPreset(draft, deadline)
  const isCustom = draft !== null && activePreset === null

  const handlePreset = (key: ReminderPresetKey): void => {
    onChange(resolveReminderPreset(key, deadline))
    setShowPicker(false)
    setAndroidStep('idle')
  }

  const openPicker = (): void => {
    const base = draft !== null ? new Date(draft) : new Date()
    if (Platform.OS === 'android') {
      setAndroidDraft(base)
      setAndroidStep('date')
    } else {
      setShowPicker(true)
    }
  }

  const handleIosChange = (_event: DateTimePickerEvent, picked?: Date): void => {
    if (picked === undefined) return
    onChange(picked.toISOString())
  }

  const handleAndroidChange = (event: DateTimePickerEvent, picked?: Date): void => {
    if (event.type === 'dismissed' || picked === undefined) {
      setAndroidStep('idle')
      return
    }
    if (androidStep === 'date') {
      setAndroidDraft(picked)
      setAndroidStep('time')
      return
    }
    setAndroidStep('idle')
    onChange(mergeDateAndTime(androidDraft, picked).toISOString())
  }

  return (
    <View style={styles.content}>
      <View style={styles.pillsWrap}>
        {REMINDER_PRESETS.map((preset) => (
          <AttributeSheetPill
            key={preset.key}
            label={preset.label}
            active={activePreset === preset.key}
            accentColor={accentColor}
            onPress={() => handlePreset(preset.key)}
          />
        ))}
        <AttributeSheetPill label="Своё время" active={isCustom} accentColor={accentColor} onPress={openPicker} />
      </View>
      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={draft !== null ? new Date(draft) : new Date()}
          mode="datetime"
          display="spinner"
          onChange={handleIosChange}
        />
      )}
      {Platform.OS === 'android' && androidStep !== 'idle' && (
        <DateTimePicker value={androidDraft} mode={androidStep} display="default" onChange={handleAndroidChange} />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <Pressable onPress={() => setShowPicker(false)} style={styles.iosPickerDoneWrap}>
          <Text style={[styles.iosPickerDoneText, { color: accentColor }]}>Готово</Text>
        </Pressable>
      )}
    </View>
  )
}

// ---- Link / Comment ---------------------------------------------------------

interface LinkContentProps {
  draft: string
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

const LinkContent: React.FC<LinkContentProps> = ({ draft, accentColor, onChange }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.content}>
      <TextInput
        value={draft}
        onChangeText={onChange}
        placeholder="Вставьте ссылку"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        keyboardType="url"
        autoFocus
        style={[styles.input, { borderColor: colors.borderInput, color: colors.textPrimary }]}
        accessibilityLabel="Ссылка"
        selectionColor={accentColor}
      />
    </View>
  )
}

interface CommentContentProps {
  draft: string
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

const CommentContent: React.FC<CommentContentProps> = ({ draft, accentColor, onChange }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.content}>
      <TextInput
        value={draft}
        onChangeText={onChange}
        placeholder="Добавьте заметку к задаче"
        placeholderTextColor={colors.textTertiary}
        multiline
        autoFocus
        style={[styles.input, styles.inputMulti, { borderColor: colors.borderInput, color: colors.textPrimary }]}
        accessibilityLabel="Комментарий"
        selectionColor={accentColor}
      />
    </View>
  )
}

// ---- Tag ---------------------------------------------------------------------

interface TagContentProps {
  draft: string[]
  accentColor: string
  onChange: (value: AttributeSheetValue) => void
}

const TagContent: React.FC<TagContentProps> = ({ draft, accentColor, onChange }) => {
  const { colors } = useTheme()
  const [newTag, setNewTag] = useState('')

  const toggleTag = (tag: string): void => {
    onChange(draft.includes(tag) ? draft.filter((t) => t !== tag) : [...draft, tag])
  }

  const addCustomTag = (): void => {
    const trimmed = newTag.trim()
    if (trimmed.length === 0 || draft.includes(trimmed)) return
    onChange([...draft, trimmed])
    setNewTag('')
  }

  const allPills = [...TAG_PRESETS, ...draft.filter((t) => !(TAG_PRESETS as readonly string[]).includes(t))]

  return (
    <View style={styles.content}>
      <View style={styles.pillsWrap}>
        {allPills.map((tag) => (
          <AttributeSheetPill
            key={tag}
            label={tag}
            active={draft.includes(tag)}
            accentColor={accentColor}
            onPress={() => toggleTag(tag)}
          />
        ))}
      </View>
      <View style={[styles.newTagRow, { borderColor: colors.borderInput }]}>
        <TextInput
          value={newTag}
          onChangeText={setNewTag}
          onSubmitEditing={addCustomTag}
          placeholder="＋ Новый тег"
          placeholderTextColor={colors.textTertiary}
          style={[styles.newTagInput, { color: colors.textPrimary }]}
          returnKeyType="done"
          accessibilityLabel="Новый тег"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    ...typography.body,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  newTagRow: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  newTagInput: { ...typography.bodySm, minWidth: 100 },
  iosPickerDoneWrap: { alignSelf: 'flex-end', paddingVertical: 4 },
  iosPickerDoneText: { ...typography.body, fontWeight: '700' },
})

export default SheetContent
