import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

export default function LoginScreen() {
  const { login } = useAuth()
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fieldErrors = getFieldErrors(login.error)
  const generalError = login.isError ? getApiErrorMessage(login.error) : null

  const handleSubmit = (): void => {
    login.mutate({ email: email.trim(), password })
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Вход</Text>

        {generalError ? (
          <Text style={[styles.generalError, { color: colors.danger }]}>{generalError}</Text>
        ) : null}

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

        <Link href="/(auth)/register" style={[styles.link, { color: colors.accent }]}>
          Нет аккаунта? Зарегистрироваться
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { gap: 16 },
  title: { ...typography.h2, marginBottom: 8 },
  generalError: { ...typography.body },
  link: { ...typography.body, textAlign: 'center', marginTop: 8 },
})
