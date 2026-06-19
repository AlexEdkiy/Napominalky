import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

import type { NoteColor } from '@/db/repositories/notesRepo'
import { useTheme } from '@/theme'

interface NoteColorPickerProps {
  value: NoteColor | null
  onChange: (color: NoteColor | null) => void
}

interface ColorOption {
  key: NoteColor | null
  getColor: (accent: string, coral: string, amber: string, purple: string) => string
}

const COLOR_OPTIONS: readonly ColorOption[] = [
  { key: 'teal', getColor: (a) => a },
  { key: 'coral', getColor: (_, c) => c },
  { key: 'amber', getColor: (_, _c, a) => a },
  { key: 'purple', getColor: (_, _c, _a, p) => p },
  { key: null, getColor: () => '' },
] as const

const NoteColorPicker: React.FC<NoteColorPickerProps> = ({ value, onChange }) => {
  const { colors } = useTheme()

  const resolveHex = (opt: ColorOption): string => {
    if (opt.key === null) return colors.surface
    return opt.getColor(colors.accent, colors.coral, colors.amber, colors.purple)
  }

  return (
    <View style={styles.row}>
      {COLOR_OPTIONS.map((opt) => {
        const hex = resolveHex(opt)
        const isActive = value === opt.key
        const isNone = opt.key === null

        return (
          <Pressable
            key={String(opt.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.key ?? 'без цвета'}
            onPress={() => onChange(opt.key)}
            style={[
              styles.swatch,
              { backgroundColor: hex },
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
