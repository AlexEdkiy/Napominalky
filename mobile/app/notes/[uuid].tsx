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
import { router, Stack, useLocalSearchParams } from 'expo-router'

import NoteForm, { type NoteFormValues } from '@/components/notes/NoteForm'
import { useNote, useNotes } from '@/hooks/useNotes'

export default function NoteDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const noteUuid = uuid ?? ''
  const { data: note, isLoading } = useNote(noteUuid)
  const { updateNote, deleteNote, togglePin, toggleArchive } = useNotes()

  const handleAutoSave = (values: NoteFormValues): void => {
    updateNote.mutate({ uuid: noteUuid, patch: values })
  }

  const confirmDelete = (): void => {
    Alert.alert('Удалить заметку?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteNote.mutate(noteUuid, { onSuccess: () => router.back() }),
      },
    ])
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />
  }

  if (!note) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Заметка не найдена</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Заметка' }} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <NoteForm
          initialValues={{ title: note.title, body: note.body ?? '' }}
          isPinned={note.isPinned}
          isArchived={note.isArchived}
          onAutoSave={handleAutoSave}
          onTogglePin={() => togglePin.mutate({ uuid: noteUuid, value: !note.isPinned })}
          onToggleArchive={() => toggleArchive.mutate({ uuid: noteUuid, value: !note.isArchived })}
          onDelete={confirmDelete}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { marginTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { fontSize: 16, color: '#71717a' },
})
