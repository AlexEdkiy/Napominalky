import { useRef } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import NoteForm, { type NoteFormValues } from '@/components/notes/NoteForm'
import { useNotes } from '@/hooks/useNotes'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export default function NewNoteScreen() {
  const { colors } = useTheme()
  const { createNote, updateNote } = useNotes()
  const createdUuid = useRef<string | null>(null)

  const handleAutoSave = (values: NoteFormValues): void => {
    if (values.title.trim().length === 0 && values.body.trim().length === 0) return

    if (createdUuid.current === null) {
      createNote.mutate(
        { title: values.title, body: values.body },
        { onSuccess: (note) => (createdUuid.current = note.uuid) },
      )
      return
    }

    updateNote.mutate({ uuid: createdUuid.current, patch: values })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.screenBg }]}
    >
      <Stack.Screen
        options={{
          title: 'Новая заметка',
          headerStyle: { backgroundColor: colors.screenBg },
          headerShadowVisible: false,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        <NoteForm onAutoSave={handleAutoSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { ...typography.cardTitle, fontSize: 17 },
})
