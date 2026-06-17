import React from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native'
import { typography } from '@/theme/typography'

interface BaseButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
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
  const isDanger = variant === 'danger'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primary,
        isDanger && styles.dangerBtn,
        !isPrimary && !isDanger && styles.secondary,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#0D9488'} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && styles.primaryLabel,
            isDanger && styles.dangerLabel,
            !isPrimary && !isDanger && styles.secondaryLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFF3F6',
  },
  dangerBtn: {
    backgroundColor: '#FCE9E5',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { ...typography.buttonLabel },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: '#0D9488' },
  dangerLabel: { color: '#D9583C' },
})

export default BaseButton
