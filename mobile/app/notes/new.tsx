import { useRef } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'

import NoteForm, { type NoteFormValues } from '@/components/notes/NoteForm'
import { useNotes } from '@/hooks/useNotes'
import { useTheme } from '@/theme'

export default function NewNoteScreen() {
  const { colors } = useTheme()
  const { createNote, updateNote } = useNotes()
  const createdUuid = useRef<string | null>(null)
  const creating = useRef(false)

  const handleAutoSave = (values: NoteFormValues): void => {
    if (values.title.trim().length === 0 && values.body.trim().length === 0) return

    if (createdUuid.current === null) {
      if (creating.current) return
      creating.current = true
      createNote.mutate(
        { title: values.title, body: values.body, color: values.color ?? null },
        {
          onSuccess: (note) => {
            createdUuid.current = note.uuid
          },
          onSettled: () => {
            creating.current = false
          },
        },
      )
      return
    }

    updateNote.mutate({ uuid: createdUuid.current, patch: values })
  }

  const handleSave = (): void => {
    router.back()
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.screenBg }]}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <NoteForm
          mode="new"
          onAutoSave={handleAutoSave}
          onSave={handleSave}
          onBack={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
})
