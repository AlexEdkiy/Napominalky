import React from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { typography } from '@/theme/typography'

interface BaseInputProps extends TextInputProps {
  label: string
  error?: string | undefined
}

const BaseInput: React.FC<BaseInputProps> = ({ label, error, ...inputProps }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label.toUpperCase()}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor="#9AA6B2"
      style={[styles.input, error ? styles.inputError : null]}
      {...inputProps}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
)

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    ...typography.inputLabel,
    color: '#9AA6B2',
  },
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
  inputError: { borderColor: '#D9583C' },
  error: { ...typography.bodySm, color: '#D9583C' },
})

export default BaseInput
