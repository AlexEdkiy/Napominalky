import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { usePreventRemove } from '@react-navigation/core'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import NoteForm from '@/components/notes/NoteForm'
import type { NoteColor } from '@/db/repositories/notesRepo'
import { useNote, useNotes } from '@/hooks/useNotes'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export default function NoteDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const noteUuid = uuid ?? ''
  const { data: note, isLoading } = useNote(noteUuid)
  const { updateNote, deleteNote, togglePin } = useNotes()
  const [isTextDirty, setIsTextDirty] = useState(false)

  // Track current text in ref (NOT autosaved — only saved on explicit "Да")
  const currentTitleRef = useRef<string>('')
  const currentBodyRef = useRef<string>('')

  const handleTextChange = useCallback((title: string, body: string): void => {
    currentTitleRef.current = title
    currentBodyRef.current = body
  }, [])

  const handleColorChange = useCallback(
    (color: NoteColor | null): void => {
      updateNote.mutate({ uuid: noteUuid, patch: { color } })
    },
    [noteUuid, updateNote],
  )

  const confirmDelete = useCallback((): void => {
    Alert.alert('Удалить заметку?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteNote.mutate(noteUuid, { onSuccess: () => router.back() }),
      },
    ])
  }, [noteUuid, deleteNote])

  usePreventRemove(isTextDirty, () => {
    Alert.alert('Сохранить изменения?', '', [
      {
        text: 'Нет',
        style: 'destructive',
        // Exit WITHOUT saving text
        onPress: () => {
          setIsTextDirty(false)
          router.back()
        },
      },
      {
        text: 'Да',
        style: 'default',
        // Save current text then exit
        onPress: () => {
          updateNote.mutate(
            {
              uuid: noteUuid,
              patch: { title: currentTitleRef.current, body: currentBodyRef.current },
            },
            {
              onSettled: () => {
                setIsTextDirty(false)
                router.back()
              },
            },
          )
        },
      },
    ])
  })

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.screenBg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (note === null || note === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: colors.screenBg }]}>
        <Text style={[styles.missing, { color: colors.textSecondary }]}>
          Заметка не найдена
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.screenBg }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      >
        <NoteForm
          mode="existing"
          autoSaveText={false}
          initialValues={{ title: note.title, body: note.body ?? '', color: note.color }}
          isPinned={note.isPinned}
          onAutoSave={() => {
            // autoSaveText=false: this is only called for color via fallback;
            // color is handled by onColorChange, so this is a no-op.
          }}
          onColorChange={handleColorChange}
          onTextChange={handleTextChange}
          onTogglePin={() => togglePin.mutate({ uuid: noteUuid, value: !note.isPinned })}
          onDelete={confirmDelete}
          onBack={() => router.back()}
          onDirtyChange={setIsTextDirty}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...typography.body },
})
