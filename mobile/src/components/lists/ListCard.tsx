import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import ProgressBar from '@/components/lists/ProgressBar'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'

interface ListCardProps {
  list: ShoppingList
  onPress: (uuid: string) => void
}

const ListCard: React.FC<ListCardProps> = ({ list, onPress }) => {
  const title = list.title.trim().length > 0 ? list.title : 'Без названия'
  const { checkedItemsCount: checked, itemsCount: total } = list

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(list.uuid)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text style={styles.counter}>
          {checked}/{total}
        </Text>
      </View>
      <ProgressBar value={checked} total={total} />
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
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  counter: { fontSize: 14, color: '#71717a', marginLeft: 8 },
})

export default ListCard
