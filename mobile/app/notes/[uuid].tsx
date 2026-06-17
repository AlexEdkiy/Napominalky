import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import NoteForm, { type NoteFormValues } from '@/components/notes/NoteForm'
import { useNote, useNotes } from '@/hooks/useNotes'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

export default function NoteDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const { colors } = useTheme()
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
    return (
      <View style={[styles.center, { backgroundColor: colors.screenBg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (!note) {
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.screenBg },
          headerShadowVisible: false,
          headerTitle: 'Заметка',
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.textPrimary,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сохранить"
              onPress={() => handleAutoSave({ title: note.title, body: note.body ?? '' })}
              style={styles.saveBtn}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />
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
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { ...typography.body },
  headerTitle: { ...typography.cardTitle, fontSize: 17 },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
})
