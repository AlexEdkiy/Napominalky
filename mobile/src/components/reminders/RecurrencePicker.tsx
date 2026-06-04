import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { RECURRENCE_TYPES, type RecurrenceType } from '@/utils/recurrence'

interface RecurrencePickerProps {
  value: RecurrenceType
  onChange: (value: RecurrenceType) => void
}

const LABELS: Record<RecurrenceType, string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
}

const RecurrencePicker: React.FC<RecurrencePickerProps> = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Повтор</Text>
      <View style={styles.row}>
        {RECURRENCE_TYPES.map((type) => {
          const active = type === value
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={LABELS[type]}
              onPress={() => onChange(type)}
              style={({ pressed }) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {LABELS[type]}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pressed: { opacity: 0.8 },
  segmentLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  segmentLabelActive: { color: '#fff' },
})

export default RecurrencePicker
