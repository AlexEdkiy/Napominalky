import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface DayCellProps {
  date: Date
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  count: number
  onPress: (date: Date) => void
}

const DayCell: React.FC<DayCellProps> = ({
  date,
  inMonth,
  isToday,
  isSelected,
  count,
  onPress,
}) => {
  const label = `${date.getDate()}`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(date)}
      style={styles.cell}
    >
      <View style={[styles.inner, isSelected && styles.selected, isToday && styles.today]}>
        <Text
          style={[
            styles.day,
            !inMonth && styles.muted,
            isSelected && styles.selectedText,
          ]}
        >
          {label}
        </Text>
      </View>
      {count > 0 ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  inner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#2563eb' },
  today: { borderWidth: 1, borderColor: '#2563eb' },
  day: { fontSize: 15, color: '#1a1a1a' },
  muted: { color: '#c4c4c8' },
  selectedText: { color: '#fff', fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2563eb' },
  dotSelected: { backgroundColor: '#2563eb' },
})

export default DayCell
