import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import AttributeChips from '@/components/lists/AttributeChips'
import AttributeSheet, { type AttributeSheetValue } from '@/components/lists/AttributeSheet'
import type { CreateItemData } from '@/db/repositories/shoppingListsRepo'
import { serializeTags } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import {
  EMPTY_ATTRIBUTE_VALUES,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'
import type { ListType } from '@/db/repositories/shoppingListsRepo'

interface QuickAddItemProps {
  listType: ListType
  onAdd: (data: CreateItemData) => void
  autoFocus?: boolean
}

/** Композер нового пункта: имя + «+», под полем — токены/чипсы атрибутов будущего пункта. */
const QuickAddItem: React.FC<QuickAddItemProps> = ({ listType, onAdd, autoFocus = false }) => {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [attrs, setAttrs] = useState<ItemAttributeValues>(EMPTY_ATTRIBUTE_VALUES)
  const [openAttribute, setOpenAttribute] = useState<ItemAttribute | null>(null)
  const accentColor = listType === 'tasks' ? colors.amber : colors.accent
  const accentBg = listType === 'tasks' ? colors.amberBg : colors.accentSoftBg
  const placeholder = listType === 'tasks' ? 'Новая задача' : 'Добавить товар'

  const handleAdd = (): void => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd({
      name: trimmed,
      deadline: attrs.deadline,
      reminderAt: attrs.reminderAt,
      link: attrs.link,
      comment: attrs.comment,
      tags: serializeTags(attrs.tags),
    })
    setName('')
    setAttrs(EMPTY_ATTRIBUTE_VALUES)
  }

  const handleRemoveAttribute = (attribute: ItemAttribute): void => {
    setAttrs((prev) => applyAttributeValue(prev, attribute, attribute === 'tag' ? [] : null))
  }

  const handleConfirmAttribute = (value: AttributeSheetValue): void => {
    if (openAttribute === null) return
    setAttrs((prev) => applyAttributeValue(prev, openAttribute, value))
    setOpenAttribute(null)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          autoFocus={autoFocus}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderInput }]}
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

      <AttributeChips
        values={attrs}
        accentColor={accentColor}
        accentBg={accentBg}
        onOpen={setOpenAttribute}
        onRemove={handleRemoveAttribute}
      />
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        Токены можно нажать, чтобы отредактировать, или закрыть крестиком.
      </Text>

      <AttributeSheet
        attribute={openAttribute}
        currentDeadline={attrs.deadline}
        currentReminderAt={attrs.reminderAt}
        currentLink={attrs.link}
        currentComment={attrs.comment}
        currentTags={attrs.tags}
        accentColor={accentColor}
        accentBg={accentBg}
        onConfirm={handleConfirmAttribute}
        onClose={() => setOpenAttribute(null)}
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
  if (attribute === 'comment') return { ...values, comment: typeof value === 'string' ? value : null }
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
  hint: { fontSize: 11 },
})

export default QuickAddItem
