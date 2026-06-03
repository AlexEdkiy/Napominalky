import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fieldErrors = getFieldErrors(login.error)
  const generalError = login.isError ? getApiErrorMessage(login.error) : null

  const handleSubmit = (): void => {
    login.mutate({ email: email.trim(), password })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Вход</Text>

        {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

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
          autoComplete="password"
          textContentType="password"
        />

        <BaseButton label="Войти" onPress={handleSubmit} loading={login.isPending} />

        <Link href="/(auth)/register" style={styles.link}>
          Нет аккаунта? Зарегистрироваться
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  form: { gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  generalError: { fontSize: 14, color: '#dc2626' },
  link: { fontSize: 15, color: '#2563eb', textAlign: 'center', marginTop: 8 },
})
