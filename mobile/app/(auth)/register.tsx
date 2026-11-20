import LanguageSelector from '@/components/settings/LanguageSelector'
import { t, useLanguage } from '@/i18n'
import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

export default function RegisterScreen() {
  useLanguage()
  const { register } = useAuth()
  const { colors } = useTheme()
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
      style={[styles.container, { backgroundColor: colors.screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <LanguageSelector />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('Регистрация')}</Text>

        {generalError ? (
          <Text style={[styles.generalError, { color: colors.danger }]}>{generalError}</Text>
        ) : null}

        <BaseInput label={t('Имя')} value={name} onChangeText={setName}
          error={fieldErrors['name']?.[0]} autoComplete="name" textContentType="name" />
        <BaseInput label="Email" value={email} onChangeText={setEmail}
          error={fieldErrors['email']?.[0]} autoCapitalize="none"
          autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <BaseInput label={t('Пароль')} value={password} onChangeText={setPassword}
          error={fieldErrors['password']?.[0]} secureTextEntry
          autoComplete="password-new" textContentType="newPassword" />
        <BaseInput label={t('Повтор пароля')} value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          error={fieldErrors['password_confirmation']?.[0]}
          secureTextEntry autoComplete="password-new" textContentType="newPassword" />

        <BaseButton
          label={t('Создать аккаунт')}
          onPress={handleSubmit}
          loading={register.isPending}
        />

        <Link href="/(auth)/login" style={[styles.link, { color: colors.accent }]}>
          {t('Уже есть аккаунт? Войти')}
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
  link: { ...typography.body, textAlign: 'center', marginTop: 8 },
})
