import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { typography } from '@/theme/typography'

interface BaseInputProps extends TextInputProps {
  label: string
  error?: string | undefined
  /** Показывает кнопку-«глаз» справа, переключающую видимость пароля. */
  passwordToggle?: boolean
}

const BaseInput: React.FC<BaseInputProps> = ({
  label,
  error,
  passwordToggle,
  secureTextEntry,
  ...inputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const resolvedSecureTextEntry = passwordToggle ? !isPasswordVisible : secureTextEntry

  const togglePasswordVisibility = (): void => setIsPasswordVisible((prev) => !prev)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#9AA6B2"
          style={[
            styles.input,
            passwordToggle ? styles.inputWithIcon : null,
            error ? styles.inputError : null,
          ]}
          secureTextEntry={resolvedSecureTextEntry}
          {...inputProps}
        />
        {passwordToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
            hitSlop={12}
            style={styles.toggleButton}
            onPress={togglePasswordVisibility}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9AA6B2"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    ...typography.inputLabel,
    color: '#9AA6B2',
  },
  inputWrapper: { justifyContent: 'center' },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#E6ECF1',
    borderRadius: 16,
    paddingHorizontal: 16,
    ...typography.cardTitle,
    fontSize: 16,
    fontWeight: '500',
    color: '#1B2733',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: { paddingRight: 48 },
  inputError: { borderColor: '#D9583C' },
  toggleButton: {
    position: 'absolute',
    right: 8,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...typography.bodySm, color: '#D9583C' },
})

export default BaseInput
