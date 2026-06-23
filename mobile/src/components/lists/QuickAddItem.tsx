import React, { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type { ListType } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'

interface QuickAddItemProps {
  listType: ListType
  onAdd: (name: string) => void
  autoFocus?: boolean
}

const QuickAddItem: React.FC<QuickAddItemProps> = ({ listType, onAdd, autoFocus = false }) => {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const placeholder = listType === 'tasks' ? 'Новая задача' : 'Добавить товар'

  const handleAdd = (): void => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
        autoFocus={autoFocus}
        style={[
          styles.input,
          { color: colors.textPrimary, borderColor: colors.borderInput },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить"
        onPress={handleAdd}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: accentColor },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
})

export default QuickAddItem
