import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import type {
  ItemCategory,
  ShoppingListItem,
} from '@/db/repositories/shoppingListsRepo'
import { typography } from '@/theme/typography'

interface ItemRowProps {
  item: ShoppingListItem
  onToggle: (uuid: string, checked: boolean) => void
  onDelete: (uuid: string) => void
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  products: 'Продукты',
  household: 'Хозтовары',
  pharmacy: 'Аптека',
  other: 'Прочее',
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onToggle, onDelete }) => (
  <View style={styles.row}>
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.isChecked }}
      accessibilityLabel={item.name}
      onPress={() => onToggle(item.uuid, !item.isChecked)}
      style={styles.main}
    >
      <Ionicons
        name={item.isChecked ? 'checkbox' : 'square-outline'}
        size={24}
        color={item.isChecked ? '#0D9488' : '#9AA6B2'}
      />
      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.name, item.isChecked && styles.nameChecked]}>
          {item.name}
        </Text>
        <Text style={styles.category}>{CATEGORY_LABELS[item.category]}</Text>
      </View>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Удалить ${item.name}`}
      onPress={() => onDelete(item.uuid)}
      style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
    >
      <Ionicons name="close-circle-outline" size={20} color="#D9583C" />
    </Pressable>
  </View>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 56,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  texts: { flex: 1, gap: 2 },
  name: { ...typography.body, color: '#1B2733' },
  nameChecked: { textDecorationLine: 'line-through', color: '#9AA6B2' },
  category: { ...typography.bodySm, color: '#76828F' },
  delete: { padding: 8, marginLeft: 4 },
  deletePressed: { opacity: 0.6 },
})

export default ItemRow
