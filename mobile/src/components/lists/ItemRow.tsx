import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type {
  ItemCategory,
  ShoppingListItem,
} from '@/db/repositories/shoppingListsRepo'

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

const ItemRow: React.FC<ItemRowProps> = ({ item, onToggle, onDelete }) => {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isChecked }}
        accessibilityLabel={item.name}
        onPress={() => onToggle(item.uuid, !item.isChecked)}
        style={styles.main}
      >
        <View style={[styles.box, item.isChecked && styles.boxChecked]}>
          {item.isChecked ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <View style={styles.texts}>
          <Text
            numberOfLines={1}
            style={[styles.name, item.isChecked && styles.nameChecked]}
          >
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
        <Text style={styles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#a1a1aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 16, color: '#1a1a1a' },
  nameChecked: { textDecorationLine: 'line-through', color: '#a1a1aa' },
  category: { fontSize: 12, color: '#71717a' },
  delete: { padding: 8, marginLeft: 4 },
  deletePressed: { opacity: 0.6 },
  deleteIcon: { fontSize: 16, color: '#dc2626' },
})

export default ItemRow
