import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import type { ItemCategory } from '@/db/repositories/shoppingListsRepo'

interface QuickAddItemProps {
  onAdd: (name: string, category: ItemCategory) => void
}

interface CategoryOption {
  value: ItemCategory
  label: string
}

const CATEGORIES: readonly CategoryOption[] = [
  { value: 'products', label: 'Продукты' },
  { value: 'household', label: 'Хозтовары' },
  { value: 'pharmacy', label: 'Аптека' },
  { value: 'other', label: 'Прочее' },
]

const QuickAddItem: React.FC<QuickAddItemProps> = ({ onAdd }) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ItemCategory>('products')

  const handleAdd = (): void => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd(trimmed, category)
    setName('')
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Название товара"
          placeholder="Добавить товар"
          placeholderTextColor="#9a9a9a"
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить товар"
          onPress={handleAdd}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addIcon}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {CATEGORIES.map((option) => {
          const active = option.value === category
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => setCategory(option.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10, padding: 16, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  addIcon: { color: '#fff', fontSize: 28, lineHeight: 30 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#f4f4f5',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipLabel: { fontSize: 13, color: '#52525b' },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
})

export default QuickAddItem
