import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

const LAST_EMAIL_KEY = 'lk_last_email'

export default function LoginScreen() {
  const { login } = useAuth()
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  const fieldErrors = getFieldErrors(login.error)
  const generalError = login.isError ? getApiErrorMessage(login.error) : null

  useEffect(() => {
    SecureStore.getItemAsync(LAST_EMAIL_KEY)
      .then((savedEmail) => {
        if (savedEmail) setEmail(savedEmail)
      })
      .catch(() => undefined)
  }, [])

  const persistRememberedEmail = (trimmedEmail: string): void => {
    if (rememberMe) {
      SecureStore.setItemAsync(LAST_EMAIL_KEY, trimmedEmail).catch(() => undefined)
    } else {
      SecureStore.deleteItemAsync(LAST_EMAIL_KEY).catch(() => undefined)
    }
  }

  const handleSubmit = (): void => {
    const trimmedEmail = email.trim()
    login.mutate(
      { email: trimmedEmail, password },
      { onSuccess: () => persistRememberedEmail(trimmedEmail) },
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          passwordToggle
          autoComplete="password"
          textContentType="password"
        />

        <View style={styles.rememberRow}>
          <Text style={[styles.rememberLabel, { color: colors.textPrimary }]}>
            Запомнить меня
          </Text>
          <Switch
            accessibilityLabel="Запомнить меня"
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ true: colors.accent }}
          />
        </View>

        <BaseButton label="Войти" onPress={handleSubmit} loading={login.isPending} />

        <Link href="/(auth)/register" style={[styles.link, { color: colors.accent }]}>
          Нет аккаунта? Зарегистрироваться
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { ...typography.h2, marginBottom: 8 },
  generalError: { ...typography.body },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberLabel: { ...typography.body },
  link: { ...typography.body, textAlign: 'center', marginTop: 8 },
})
