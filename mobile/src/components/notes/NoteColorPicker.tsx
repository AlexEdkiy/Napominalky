import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

import type { NoteColor } from '@/db/repositories/notesRepo'
import { useTheme } from '@/theme'

interface NoteColorPickerProps {
  value: NoteColor | null
  onChange: (color: NoteColor | null) => void
}

const PALETTE: ReadonlyArray<NoteColor | null> = [
  '#ea899a',
  '#ffebb8',
  '#91d177',
  '#afdafc',
  null,
] as const

const NoteColorPicker: React.FC<NoteColorPickerProps> = ({ value, onChange }) => {
  const { colors } = useTheme()

  return (
    <View style={styles.row}>
      {PALETTE.map((color) => {
        const isActive = value === color
        const isNone = color === null
        const bgColor = isNone ? colors.surface : color

        return (
          <Pressable
            key={String(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={color ?? 'без цвета'}
            onPress={() => onChange(color)}
            style={[
              styles.swatch,
              { backgroundColor: bgColor },
              isNone && { borderWidth: 1.5, borderColor: colors.borderInput },
            ]}
          >
            {isActive && !isNone ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : null}
            {isActive && isNone ? (
              <MaterialIcons name="block" size={16} color={colors.textTertiary} />
            ) : null}
            {!isActive && isNone ? (
              <MaterialIcons name="block" size={16} color={colors.borderInput} />
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default NoteColorPicker
