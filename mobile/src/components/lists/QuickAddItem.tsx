import React, { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import AttributesSheet from '@/components/lists/AttributesSheet'
import AttributeTokens from '@/components/lists/AttributeTokens'
import type { CreateItemData, ListType } from '@/db/repositories/shoppingListsRepo'
import { serializeTags } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import {
  ATTRIBUTE_ORDER,
  EMPTY_ATTRIBUTE_VALUES,
  isAttributeSet,
  type AttributeSheetValue,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'

interface QuickAddItemProps {
  listType: ListType
  onAdd: (data: CreateItemData) => void
  autoFocus?: boolean
}

/**
 * Композер нового пункта («облегчённая форма»): имя + иконка «допатрибуты»
 * ВНУТРИ поля (открывает единую шторку AttributesSheet) + «+». Под полем —
 * токены только заполненных атрибутов; пустых чипов-кнопок нет. На иконке —
 * жёлтая точка-индикатор, если хоть один атрибут задан.
 */
const QuickAddItem: React.FC<QuickAddItemProps> = ({ listType, onAdd, autoFocus = false }) => {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [attrs, setAttrs] = useState<ItemAttributeValues>(EMPTY_ATTRIBUTE_VALUES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const accentBg = listType === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const placeholder = listType === 'tasks' ? 'Новая задача' : 'Добавить товар'
  const hasAttrs = ATTRIBUTE_ORDER.some((attr) => isAttributeSet(attr, attrs))

  const handleAdd = (): void => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd({
      name: trimmed,
      deadline: attrs.deadline,
      reminderAt: attrs.reminderAt,
      link: attrs.link,
      tags: serializeTags(attrs.tags),
    })
    setName('')
    setAttrs(EMPTY_ATTRIBUTE_VALUES)
  }

  const handleRemoveAttribute = (attribute: ItemAttribute): void => {
    setAttrs((prev) => applyAttributeValue(prev, attribute, attribute === 'tag' ? [] : null))
  }

  const handleChangeAttribute = (attribute: ItemAttribute, value: AttributeSheetValue): void => {
    setAttrs((prev) => applyAttributeValue(prev, attribute, value))
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.inputRow}>
        <View style={[styles.inputWrap, { borderColor: colors.borderInput }]}>
          <TextInput
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoFocus={autoFocus}
            style={[styles.input, { color: colors.textPrimary }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Допатрибуты"
            onPress={() => setSheetOpen(true)}
            hitSlop={6}
            style={styles.attrsBtn}
          >
            <Ionicons name="options-outline" size={20} color={colors.textTertiary} />
            {hasAttrs && (
              <View
                testID="quick-add-attributes-dot"
                style={[styles.dot, { backgroundColor: colors.amber }]}
              />
            )}
          </Pressable>
        </View>
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

      <AttributeTokens
        values={attrs}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={() => setSheetOpen(true)}
        onRemove={handleRemoveAttribute}
      />

      <AttributesSheet
        visible={sheetOpen}
        values={attrs}
        accentColor={accentColor}
        accentBg={accentBg}
        onChangeAttribute={handleChangeAttribute}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  )
}

const applyAttributeValue = (
  values: ItemAttributeValues,
  attribute: ItemAttribute,
  value: AttributeSheetValue,
): ItemAttributeValues => {
  if (attribute === 'deadline') return { ...values, deadline: typeof value === 'string' ? value : null }
  if (attribute === 'reminder') return { ...values, reminderAt: typeof value === 'string' ? value : null }
  if (attribute === 'link') return { ...values, link: typeof value === 'string' ? value : null }
  return { ...values, tags: Array.isArray(value) ? value : [] }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  attrsBtn: { padding: 4 },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
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
