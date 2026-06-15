import React from 'react'
import { StyleSheet, View } from 'react-native'

interface PinDotsProps {
  length: number
  filled: number
  shake?: boolean
}

const PinDots: React.FC<PinDotsProps> = ({ length, filled, shake = false }) => {
  return (
    <View
      style={[styles.row, shake && styles.shake]}
      accessibilityLabel={`Введено ${filled} из ${length} цифр`}
    >
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[styles.dot, i < filled && styles.dotFilled]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  shake: {
    // Нативная анимация тряски через translateX реализована в родителе через Animated
    opacity: 0.7,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#2563eb',
  },
})

export default PinDots
