import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { typography } from '@/theme/typography'
import {
  ATTRIBUTE_ICONS,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_ORDER,
  formatAttributeToken,
  isAttributeSet,
  type ItemAttribute,
  type ItemAttributeValues,
} from '@/utils/itemAttributes'

interface AttributeTokensProps {
  values: ItemAttributeValues
  accentColor: string
  accentBg: string
  /** Тап по токену — открыть шторку «Допатрибуты» (атрибут передаётся для контекста). */
  onOpen: (attribute: ItemAttribute) => void
  onRemove: (attribute: ItemAttribute) => void
}

/**
 * Ряд токенов ТОЛЬКО заполненных атрибутов (пустых чипов-кнопок нет —
 * «облегчённая форма»). Тап по токену открывает шторку «Допатрибуты»,
 * «×» удаляет атрибут. Если ни один атрибут не задан — ничего не рендерится.
 */
const AttributeTokens: React.FC<AttributeTokensProps> = ({
  values,
  accentColor,
  accentBg,
  onOpen,
  onRemove,
}) => {
  const set = ATTRIBUTE_ORDER.filter((attr) => isAttributeSet(attr, values))
  if (set.length === 0) return null

  return (
    <View style={styles.wrap}>
      {set.map((attr) => (
        <AttributeToken
          key={attr}
          attribute={attr}
          value={formatAttributeToken(attr, values)}
          accentColor={accentColor}
          accentBg={accentBg}
          onPress={() => onOpen(attr)}
          onRemove={() => onRemove(attr)}
        />
      ))}
    </View>
  )
}

// ---- AttributeToken (заданный атрибут) -------------------------------------

interface AttributeTokenProps {
  attribute: ItemAttribute
  value: string
  accentColor: string
  accentBg: string
  onPress: () => void
  onRemove: () => void
}

const AttributeToken: React.FC<AttributeTokenProps> = ({
  attribute,
  value,
  accentColor,
  accentBg,
  onPress,
  onRemove,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${ATTRIBUTE_LABELS[attribute]}: ${value}`}
    style={[styles.token, { backgroundColor: accentBg }]}
  >
    <Ionicons
      name={ATTRIBUTE_ICONS[attribute] as React.ComponentProps<typeof Ionicons>['name']}
      size={13}
      color={accentColor}
    />
    <Text numberOfLines={1} style={[styles.tokenText, { color: accentColor }]}>
      {value}
    </Text>
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Удалить ${ATTRIBUTE_LABELS[attribute].toLowerCase()}`}
      hitSlop={8}
      style={styles.tokenRemove}
    >
      <Ionicons name="close" size={13} color={accentColor} />
    </Pressable>
  </Pressable>
)

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    maxWidth: 220,
  },
  tokenText: { ...typography.bodySm, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  tokenRemove: { marginLeft: 2 },
})

export default AttributeTokens
