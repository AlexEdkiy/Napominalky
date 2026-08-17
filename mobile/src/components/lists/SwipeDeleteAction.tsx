import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface SwipeDeleteActionProps {
  itemName: string
  onConfirm: () => void
}

/**
 * Правое действие Swipeable строки пункта: свайп влево выдвигает красную зону
 * с кнопкой «Удалить». Сам свайп НЕ удаляет — подтверждение прямо в строке:
 * тап по кнопке (onConfirm). Смахивание строки назад — отмена.
 */
const SwipeDeleteAction: React.FC<SwipeDeleteActionProps> = ({ itemName, onConfirm }) => {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onConfirm}
      testID="item-swipe-delete"
      accessibilityRole="button"
      accessibilityLabel={`Удалить ${itemName}`}
      style={[styles.action, { backgroundColor: colors.danger }]}
    >
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <Text style={styles.label}>Удалить</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  action: {
    width: 96,
    // Радиус зеркалит wrapper строки (14): при закрытой строке зона полностью
    // скрыта под плашкой, включая скруглённые углы.
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { ...typography.bodySm, fontSize: 12, fontWeight: '700', color: '#fff' },
})

export default SwipeDeleteAction
