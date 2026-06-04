import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'

import NoteCard from '@/components/notes/NoteCard'
import { useNotes } from '@/hooks/useNotes'
import type { Note } from '@/db/repositories/notesRepo'

export default function HomeScreen() {
  const { notes, isLoading } = useNotes()
  const [search, setSearch] = useState('')

  const filtered = filterNotes(notes, search)

  const handleOpen = (uuid: string): void => {
    router.push(`/notes/${uuid}`)
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Напоминания"
        onPress={() => router.push('/reminders')}
        style={({ pressed }) => [styles.remindersLink, pressed && styles.remindersLinkPressed]}
      >
        <Text style={styles.remindersLinkText}>Ближайшие напоминания</Text>
        <Text style={styles.remindersLinkArrow}>›</Text>
      </Pressable>
      <TextInput
        accessibilityLabel="Поиск заметок"
        placeholder="Поиск"
        placeholderTextColor="#9a9a9a"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => <NoteCard note={item} onPress={handleOpen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState />}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Создать заметку"
        onPress={() => router.push('/notes/new')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  )
}

function filterNotes(notes: Note[], query: string): Note[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length === 0) return notes
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(trimmed) ||
      (note.body ?? '').toLowerCase().includes(trimmed),
  )
}

const EmptyState = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>Заметок пока нет</Text>
    <Text style={styles.emptyHint}>Нажмите «+», чтобы создать первую</Text>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  remindersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  remindersLinkPressed: { opacity: 0.8 },
  remindersLinkText: { fontSize: 16, fontWeight: '600', color: '#2563eb' },
  remindersLinkArrow: { fontSize: 22, color: '#2563eb' },
  search: {
    margin: 16,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  loader: { marginTop: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 96, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  emptyHint: { fontSize: 14, color: '#71717a' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85 },
  fabIcon: { color: '#fff', fontSize: 32, lineHeight: 36 },
})
