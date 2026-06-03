import React from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

interface BaseInputProps extends TextInputProps {
  label: string
  error?: string | undefined
}

const BaseInput: React.FC<BaseInputProps> = ({ label, error, ...inputProps }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9a9a9a"
        style={[styles.input, error ? styles.inputError : null]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputError: { borderColor: '#dc2626' },
  error: { fontSize: 13, color: '#dc2626' },
})

export default BaseInput
