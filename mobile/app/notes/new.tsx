import { useRef } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import NoteForm, { type NoteFormValues } from '@/components/notes/NoteForm'
import { useNotes } from '@/hooks/useNotes'

export default function NewNoteScreen() {
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
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Новая заметка' }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <NoteForm onAutoSave={handleAutoSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
})
