import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

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
      <View
        style={[
          styles.inner,
          isSelected && styles.selected,
          isToday && !isSelected && styles.today,
        ]}
      >
        <Text
          style={[
            styles.day,
            !inMonth && styles.muted,
            isToday && !isSelected && styles.todayText,
            isSelected && styles.selectedText,
          ]}
        >
          {label}
        </Text>
      </View>
      {count > 0 ? (
        <View style={[styles.dot, isSelected && styles.dotSelected]} />
      ) : null}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  today: { borderWidth: 1.5, borderColor: '#0D9488' },
  day: { fontSize: 15, fontWeight: '500', color: '#3D4A57' },
  muted: { color: '#C3CCD6' },
  todayText: { color: '#0D9488', fontWeight: '700' },
  selectedText: { color: '#fff', fontWeight: '700' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  dotSelected: { backgroundColor: '#ffffff' },
})

export default DayCell
