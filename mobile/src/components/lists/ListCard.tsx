import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import ProgressBar from '@/components/lists/ProgressBar'
import IconSquare from '@/components/ui/IconSquare'
import type { ShoppingList } from '@/db/repositories/shoppingListsRepo'
import { typography } from '@/theme/typography'

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
      <View style={styles.topRow}>
        <IconSquare
          icon="checkmark-circle-outline"
          bgColor="#DDF1ED"
          iconColor="#0D9488"
          size={44}
          radius={12}
        />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          <Text style={styles.counter}>{checked}/{total}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9AA6B2" />
      </View>
      <ProgressBar value={checked} total={total} color="#0D9488" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    gap: 14,
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  pressed: { opacity: 0.85 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  info: { flex: 1, gap: 3 },
  title: { ...typography.cardTitle, color: '#1B2733' },
  counter: { ...typography.bodySm, color: '#76828F' },
})

export default ListCard
