import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

export default function RegisterScreen() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const fieldErrors = getFieldErrors(register.error)
  const generalError = register.isError ? getApiErrorMessage(register.error) : null

  const handleSubmit = (): void => {
    register.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
    })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Регистрация</Text>

        {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

        <BaseInput
          label="Имя"
          value={name}
          onChangeText={setName}
          error={fieldErrors['name']?.[0]}
          autoComplete="name"
          textContentType="name"
        />
        <BaseInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors['email']?.[0]}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <BaseInput
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors['password']?.[0]}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
        />
        <BaseInput
          label="Повтор пароля"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          error={fieldErrors['password_confirmation']?.[0]}
          secureTextEntry
          autoComplete="password-new"
          textContentType="newPassword"
        />

        <BaseButton
          label="Создать аккаунт"
          onPress={handleSubmit}
          loading={register.isPending}
        />

        <Link href="/(auth)/login" style={styles.link}>
          Уже есть аккаунт? Войти
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  generalError: { fontSize: 14, color: '#dc2626' },
  link: { fontSize: 15, color: '#2563eb', textAlign: 'center', marginTop: 8 },
})
