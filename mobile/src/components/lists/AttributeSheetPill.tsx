import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'

import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'

interface AttributeSheetPillProps {
  label: string
  active: boolean
  accentColor: string
  onPress: () => void
}

/** Пилюля-пресет, используется во всех типах контента AttributeSheet. */
const AttributeSheetPill: React.FC<AttributeSheetPillProps> = ({ label, active, accentColor, onPress }) => {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[
        styles.pill,
        { borderColor: active ? accentColor : colors.borderInput, backgroundColor: active ? accentColor : '#fff' },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? '#fff' : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: { ...typography.bodySm, fontWeight: '600' },
})

export default AttributeSheetPill
