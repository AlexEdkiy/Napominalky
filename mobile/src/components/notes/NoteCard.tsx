import React from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { Note } from '@/db/repositories/notesRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface NoteCardProps {
  note: Note
  onPress: (uuid: string) => void
  onDelete?: (uuid: string) => void
}

const SNIPPET_LENGTH = 120

const NoteCard: React.FC<NoteCardProps> = ({ note, onPress, onDelete }) => {
  const { colors } = useTheme()
  const colorHex = note.color ?? null
  const snippet = (note.body ?? '').slice(0, SNIPPET_LENGTH).trim()
  const title = note.title.trim().length > 0 ? note.title : 'Без названия'

  const handleLongPress = (): void => {
    if (onDelete === undefined) return
    Alert.alert('Удалить заметку?', 'Действие нельзя отменить.', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Да',
        style: 'destructive',
        onPress: () => onDelete(note.uuid),
      },
    ])
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(note.uuid)}
      onLongPress={handleLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {colorHex !== null ? (
        <View style={[styles.colorBar, { backgroundColor: colorHex }]} />
      ) : null}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {note.isPinned ? (
            <View style={[styles.pinBadge, { backgroundColor: colors.coralSoftBg }]}>
              <Ionicons name="pin" size={14} color={colors.coral} accessibilityLabel="Закреплено" />
            </View>
          ) : null}
        </View>
        {snippet.length > 0 ? (
          <Text numberOfLines={2} style={[styles.snippet, { color: colors.textSecondary }]}>
            {snippet}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  pressed: { opacity: 0.85 },
  colorBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 18,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    ...typography.cardTitle,
    fontSize: 18,
  },
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  snippet: {
    ...typography.body,
  },
})

export default NoteCard
