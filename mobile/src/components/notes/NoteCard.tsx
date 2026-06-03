import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { Note } from '@/db/repositories/notesRepo'

interface NoteCardProps {
  note: Note
  onPress: (uuid: string) => void
}

const SNIPPET_LENGTH = 120

const NoteCard: React.FC<NoteCardProps> = ({ note, onPress }) => {
  const snippet = (note.body ?? '').slice(0, SNIPPET_LENGTH).trim()
  const title = note.title.trim().length > 0 ? note.title : 'Без названия'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(note.uuid)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {note.isPinned ? (
          <Text accessibilityLabel="Закреплено" style={styles.pin}>
            📌
          </Text>
        ) : null}
      </View>
      {snippet.length > 0 ? (
        <Text numberOfLines={2} style={styles.snippet}>
          {snippet}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  pin: { fontSize: 14, marginLeft: 8 },
  snippet: { fontSize: 14, color: '#52525b' },
})

export default NoteCard
