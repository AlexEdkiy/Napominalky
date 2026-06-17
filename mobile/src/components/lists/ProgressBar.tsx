import React from 'react'
import { StyleSheet, View } from 'react-native'

interface ProgressBarProps {
  value: number
  total: number
  color?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, total, color = '#0D9488' }) => {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0
  const percent = `${Math.round(ratio * 100)}%` as const

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: percent, backgroundColor: color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#EFF3F6',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 99 },
})

export default ProgressBar
