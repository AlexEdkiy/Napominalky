import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
  mode: 'new' | 'existing'
  initialValues?: Partial<NoteFormValues>
  isPinned?: boolean
  isArchived?: boolean
  onAutoSave: (values: NoteFormValues) => void
  onTogglePin?: () => void
  onToggleArchive?: () => void
  onDelete?: () => void
  onSave?: () => void
  onBack?: () => void
  /** Вызывается при каждом изменении текста; передаёт isDirty (title/body) */
  onDirtyChange?: (isDirty: boolean) => void
}

const AUTOSAVE_DELAY = 800

const NoteForm: React.FC<NoteFormProps> = ({
  mode,
  initialValues,
  isPinned = false,
  onAutoSave,
  onTogglePin,
  onDelete,
  onSave,
  onBack,
  onDirtyChange,
}) => {
  const { colors } = useTheme()
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [body, setBody] = useState(initialValues?.body ?? '')
  const [color, setColor] = useState<NoteColor | null>(initialValues?.color ?? null)

  const initialTitle = useRef(initialValues?.title ?? '')
  const initialBody = useRef(initialValues?.body ?? '')
  const isTextDirty = useRef(false)

  const debouncedSave = useDebouncedCallback(onAutoSave, AUTOSAVE_DELAY)

  useEffect(() => {
    if (isTextDirty.current || color !== (initialValues?.color ?? null)) {
      debouncedSave({ title, body, color })
    }
  }, [title, body, color, debouncedSave, initialValues?.color])

  const checkTextDirty = (nextTitle: string, nextBody: string): boolean =>
    nextTitle !== initialTitle.current || nextBody !== initialBody.current

  const handleTitle = (text: string): void => {
    setTitle(text)
    const dirty = checkTextDirty(text, body)
    isTextDirty.current = dirty
    onDirtyChange?.(dirty)
  }

  const handleBody = (text: string): void => {
    setBody(text)
    const dirty = checkTextDirty(title, text)
    isTextDirty.current = dirty
    onDirtyChange?.(dirty)
  }

  const handleColor = (next: NoteColor | null): void => {
    setColor(next)
    // Цвет не считается «грязным» для цели confirm-при-выходе
    onAutoSave({ title, body, color: next })
  }

  const handleSave = (): void => {
    if (title.trim().length === 0 && body.trim().length === 0) return
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
          <SectionLabel
            text={mode === 'new' ? 'Новая заметка' : 'Заметка'}
            color={colors.textPrimary}
          />
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

        {mode === 'new' ? (
          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Сохранить"
            style={[styles.iconBtn, styles.saveBtnIcon, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}
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

      {/* Кнопка Создать — только для новой заметки */}
      {mode === 'new' ? (
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
      ) : null}

      {/* Кнопка Удалить — только для существующей заметки */}
      {mode === 'existing' && onDelete !== undefined ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Удалить заметку"
          style={({ pressed }) => [
            styles.deleteBtn,
            { borderColor: colors.danger },
            pressed && styles.deleteBtnPressed,
          ]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <SectionLabel text="Удалить заметку" color={colors.danger} />
        </Pressable>
      ) : null}
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
  saveBtnIcon: {
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 18,
    marginTop: 6,
    borderWidth: 1.5,
  },
  deleteBtnPressed: {
    opacity: 0.7,
  },
})

export default NoteForm
