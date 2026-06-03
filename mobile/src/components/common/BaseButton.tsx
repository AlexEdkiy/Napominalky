import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

interface BaseButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
}

const BaseButton: React.FC<BaseButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}) => {
  const isDisabled = disabled || loading
  const isPrimary = variant === 'primary'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#1a1a1a'} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: '#2563eb' },
  secondary: { backgroundColor: '#f1f5f9' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '600' },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: '#1a1a1a' },
})

export default BaseButton
