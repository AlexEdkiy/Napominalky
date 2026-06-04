import React from 'react'
import { StyleSheet, View } from 'react-native'

interface ProgressBarProps {
  value: number
  total: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, total }) => {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0
  const percent = `${Math.round(ratio * 100)}%` as const

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: percent }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e4e4e7',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#16a34a' },
})

export default ProgressBar
