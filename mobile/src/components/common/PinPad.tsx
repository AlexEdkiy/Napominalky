import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const PIN_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

type PinKey = (typeof PIN_DIGITS)[number]

interface PinPadProps {
  onPress: (key: string) => void
  onDelete: () => void
  disabled?: boolean
}

const PinPad: React.FC<PinPadProps> = ({ onPress, onDelete, disabled = false }) => {
  const handleKey = (key: PinKey): void => {
    if (disabled) return
    if (key === 'del') {
      onDelete()
    } else if (key !== '') {
      onPress(key)
    }
  }

  return (
    <View style={styles.grid} accessibilityLabel="Цифровая клавиатура">
      {PIN_DIGITS.map((key, index) => (
        <PinKey key={index} value={key} onPress={handleKey} disabled={disabled} />
      ))}
    </View>
  )
}

interface PinKeyProps {
  value: PinKey
  onPress: (key: PinKey) => void
  disabled: boolean
}

const PinKey: React.FC<PinKeyProps> = ({ value, onPress, disabled }) => {
  if (value === '') {
    return <View style={styles.keyPlaceholder} />
  }

  const label = value === 'del' ? '⌫' : value
  const accessLabel = value === 'del' ? 'Удалить' : `Цифра ${value}`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(value)}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed, disabled && styles.keyDisabled]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    gap: 12,
  },
  keyPlaceholder: {
    width: 80,
    height: 80,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: '#e2e8f0' },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontSize: 24, fontWeight: '600', color: '#1a1a1a' },
})

export default PinPad
