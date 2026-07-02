import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'
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

interface AttributeChipsProps {
  values: ItemAttributeValues
  accentColor: string
  accentBg: string
  onOpen: (attribute: ItemAttribute) => void
  onRemove: (attribute: ItemAttribute) => void
}

/**
 * Ряд ТОКЕНОВ (заданные атрибуты) + ряд ЧИПСОВ (доступные, ещё не заданные).
 * Тап по токену/чипсу открывает контекстную шторку (onOpen); «×» на токене
 * удаляет атрибут (onRemove).
 */
const AttributeChips: React.FC<AttributeChipsProps> = ({
  values,
  accentColor,
  accentBg,
  onOpen,
  onRemove,
}) => {
  const set = ATTRIBUTE_ORDER.filter((attr) => isAttributeSet(attr, values))
  const available = ATTRIBUTE_ORDER.filter((attr) => !isAttributeSet(attr, values))

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
      {available.map((attr) => (
        <AttributeChip
          key={attr}
          attribute={attr}
          accentColor={accentColor}
          onPress={() => onOpen(attr)}
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

// ---- AttributeChip (доступный, незаданный атрибут) --------------------------

interface AttributeChipProps {
  attribute: ItemAttribute
  accentColor: string
  onPress: () => void
}

const AttributeChip: React.FC<AttributeChipProps> = ({ attribute, accentColor, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Добавить: ${ATTRIBUTE_LABELS[attribute]}`}
    style={[styles.chip, { borderColor: '#f0e2c8' }]}
  >
    <Ionicons
      name={ATTRIBUTE_ICONS[attribute] as React.ComponentProps<typeof Ionicons>['name']}
      size={13}
      color={accentColor}
    />
    <Text style={[styles.chipText, { color: accentColor }]}>{ATTRIBUTE_LABELS[attribute]}</Text>
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.4,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  chipText: { ...typography.bodySm, fontSize: 12, fontWeight: '700' },
})

export default AttributeChips
