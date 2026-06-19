import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'

import SectionLabel from '@/components/ui/SectionLabel'
import NoteColorPicker from '@/components/notes/NoteColorPicker'
import type { NoteColor } from '@/db/repositories/notesRepo'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export interface NoteFormValues {
  title: string
  body: string
  color?: NoteColor | null
}

interface NoteFormProps {
  initialValues?: Partial<NoteFormValues>
  isPinned?: boolean
  isArchived?: boolean
  onAutoSave: (values: NoteFormValues) => void
  onTogglePin?: () => void
  onToggleArchive?: () => void
  onDelete?: () => void
  onSave?: () => void
  onBack?: () => void
}

const AUTOSAVE_DELAY = 800

const NoteForm: React.FC<NoteFormProps> = ({
  initialValues,
  isPinned = false,
  onAutoSave,
  onTogglePin,
  onSave,
  onBack,
}) => {
  const { colors } = useTheme()
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [body, setBody] = useState(initialValues?.body ?? '')
  const [color, setColor] = useState<NoteColor | null>(initialValues?.color ?? null)
  const isDirty = useRef(false)
  const debouncedSave = useDebouncedCallback(onAutoSave, AUTOSAVE_DELAY)

  useEffect(() => {
    if (isDirty.current) debouncedSave({ title, body, color })
  }, [title, body, color, debouncedSave])

  const handleTitle = (text: string): void => {
    isDirty.current = true
    setTitle(text)
  }

  const handleBody = (text: string): void => {
    isDirty.current = true
    setBody(text)
  }

  const handleColor = (next: NoteColor | null): void => {
    isDirty.current = true
    setColor(next)
  }

  const handleSave = (): void => {
    if (title.trim().length === 0 && body.trim().length === 0) return
    // Явное сохранение по кнопке: сбрасываем отложенный (debounced) автосейв,
    // чтобы быстрая заметка не потерялась при немедленном переходе назад.
    onAutoSave({ title, body, color })
    onSave?.()
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
          <SectionLabel text="Новая заметка" color={colors.textPrimary} />
        </View>

        <Pressable
          onPress={onTogglePin}
          accessibilityRole="button"
          accessibilityLabel={isPinned ? 'Открепить' : 'Закрепить'}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            isPinned && { backgroundColor: colors.accentSoftBg },
          ]}
        >
          <Ionicons name="pin" size={20} color={isPinned ? colors.accent : colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Сохранить"
          style={[styles.iconBtn, styles.saveBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Заголовок */}
      <SectionLabel text="Заголовок" />
      <TextInput
        value={title}
        onChangeText={handleTitle}
        placeholder="Заголовок"
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.titleInput,
          { backgroundColor: colors.surface, borderColor: colors.borderInput, color: colors.textPrimary },
        ]}
        returnKeyType="next"
        accessibilityLabel="Заголовок заметки"
      />

      {/* Текст */}
      <SectionLabel text="Текст" />
      <TextInput
        value={body}
        onChangeText={handleBody}
        placeholder="Начните писать…"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[
          styles.bodyInput,
          { backgroundColor: colors.surface, borderColor: colors.borderInput, color: colors.textPrimary },
        ]}
        textAlignVertical="top"
        accessibilityLabel="Текст заметки"
      />

      {/* Цвет метки */}
      <SectionLabel text="Цвет метки" />
      <NoteColorPicker value={color} onChange={handleColor} />

      {/* Кнопка Создать */}
      <Pressable
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="Создать заметку"
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: colors.accent },
          pressed && styles.createBtnPressed,
        ]}
      >
        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
        <SectionLabel text="Создать" color="#FFFFFF" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
    padding: 16,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  appBarTitle: {
    flex: 1,
  },
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
    paddingVertical: 15,
    fontSize: 18,
    fontWeight: '700',
  },
  bodyInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 18,
    marginTop: 6,
    shadowColor: '#0D9488',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  createBtnPressed: {
    opacity: 0.85,
  },
})

export default NoteForm
