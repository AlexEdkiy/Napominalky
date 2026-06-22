import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import IconSquare from '@/components/ui/IconSquare'
import type { ShoppingList, ListType } from '@/db/repositories/shoppingListsRepo'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface ListCardProps {
  list: ShoppingList
  onPress: (uuid: string) => void
  nearestDeadline?: string | null
}

interface TypeConfig {
  icon: React.ComponentProps<typeof Ionicons>['name']
  bgColor: string
  iconColor: string
  label: string
  dotColor: string
}

const useTypeConfig = (type: ListType): TypeConfig => {
  const { colors } = useTheme()
  if (type === 'tasks') {
    return {
      icon: 'checkbox-outline',
      bgColor: colors.amberBg,
      iconColor: colors.amber,
      label: 'сделано',
      dotColor: colors.amber,
    }
  }
  return {
    icon: 'bag-handle-outline',
    bgColor: colors.accentSoftBg,
    iconColor: colors.accent,
    label: 'куплено',
    dotColor: colors.accent,
  }
}

const ListCard: React.FC<ListCardProps> = ({ list, onPress, nearestDeadline }) => {
  const { colors } = useTheme()
  const title = list.title.trim().length > 0 ? list.title : 'Без названия'
  const { checkedItemsCount: checked, itemsCount: total } = list
  const cfg = useTypeConfig(list.type)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(list.uuid)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <IconSquare
        icon={cfg.icon}
        bgColor={cfg.bgColor}
        iconColor={cfg.iconColor}
        size={40}
        radius={10}
      />
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {checked}/{total} {cfg.label}
        </Text>
        {nearestDeadline != null && (
          <View style={[styles.deadlineChip, { backgroundColor: colors.amberBg }]}>
            <Ionicons name="time-outline" size={11} color={colors.amber} />
            <Text style={[styles.deadlineText, { color: colors.amber }]}>
              {nearestDeadline}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 0,
  },
  pressed: { opacity: 0.8 },
  info: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600' },
  counter: { ...typography.bodySm },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  deadlineText: { ...typography.bodySm, fontSize: 11, fontWeight: '600' },
})

export default ListCard
