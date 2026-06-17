import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { Note } from '@/db/repositories/notesRepo'
import { typography } from '@/theme/typography'

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
          <View style={styles.pinBadge}>
            <Ionicons
              name="pin"
              size={14}
              color="#E26A4D"
              accessibilityLabel="Закреплено"
            />
          </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    gap: 8,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    ...typography.cardTitle,
    color: '#1B2733',
    fontSize: 18,
  },
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FCE7E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  snippet: {
    ...typography.body,
    color: '#76828F',
  },
})

export default NoteCard
