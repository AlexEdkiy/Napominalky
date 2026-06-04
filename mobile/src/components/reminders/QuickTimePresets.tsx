import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { inOneHour, thisEvening, tomorrowMorning } from '@/utils/quickTime'

interface QuickTimePresetsProps {
  onSelect: (iso: string) => void
}

interface Preset {
  key: string
  label: string
  compute: () => string
}

const PRESETS: readonly Preset[] = [
  { key: 'in-one-hour', label: 'Через час', compute: inOneHour },
  { key: 'this-evening', label: 'Вечером', compute: thisEvening },
  { key: 'tomorrow-morning', label: 'Завтра утром', compute: tomorrowMorning },
]

const QuickTimePresets: React.FC<QuickTimePresetsProps> = ({ onSelect }) => {
  return (
    <View style={styles.row}>
      {PRESETS.map((preset) => (
        <Pressable
          key={preset.key}
          accessibilityRole="button"
          accessibilityLabel={preset.label}
          onPress={() => onSelect(preset.compute())}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.label}>{preset.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, fontWeight: '500', color: '#2563eb' },
})

export default QuickTimePresets
