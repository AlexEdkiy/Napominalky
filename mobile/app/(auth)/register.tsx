import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'

import EmailVerificationNotice from '@/components/auth/EmailVerificationNotice'
import { validateRegistrationPassword } from '@/utils/registrationValidation'

import BaseButton from '@/components/common/BaseButton'
import BaseInput from '@/components/common/BaseInput'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { getApiErrorMessage, getFieldErrors } from '@/utils/apiError'

export default function RegisterScreen() {
  const { register, login } = useAuth()
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({})
  const registration = register.data
  const fieldErrors = { ...getFieldErrors(register.error), ...localErrors }
  const generalError = register.isError ? (Object.keys(fieldErrors).length ? 'Проверьте заполнение полей.' : getApiErrorMessage(register.error)) : null

  const handleSubmit = (): void => {
    const errors = validateRegistrationPassword(password, passwordConfirmation)
    setLocalErrors(errors)
    if (Object.keys(errors).length) return
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
        {registration ? <>
          <EmailVerificationNotice email={registration.email} password={password} message={registration.message} />
          {login.isError && <Text style={[styles.generalError, { color: colors.danger }]}>{getApiErrorMessage(login.error)}</Text>}
          <BaseButton label="Я подтвердил почту — войти" loading={login.isPending}
            onPress={() => login.mutate({ email: registration.email, password })} />
        </> : <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Регистрация</Text>

        {generalError ? (
          <Text style={[styles.generalError, { color: colors.danger }]}>{generalError}</Text>
        ) : null}

        <BaseInput editable={!register.isPending} label="Имя" value={name} onChangeText={setName}
          error={fieldErrors['name']?.[0]} autoComplete="name" textContentType="name" />
        <BaseInput editable={!register.isPending} label="Email" value={email} onChangeText={setEmail}
          error={fieldErrors['email']?.[0]} autoCapitalize="none"
          autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <BaseInput editable={!register.isPending} label="Пароль" value={password} onChangeText={(value) => { setPassword(value); setLocalErrors({}) }}
          error={fieldErrors['password']?.[0]} passwordToggle
          autoComplete="password-new" textContentType="newPassword" />
        <BaseInput editable={!register.isPending} label="Повтор пароля" value={passwordConfirmation}
          onChangeText={(value) => { setPasswordConfirmation(value); setLocalErrors({}) }}
          error={fieldErrors['password_confirmation']?.[0]}
          passwordToggle autoComplete="password-new" textContentType="newPassword" />

        <BaseButton
          label="Создать аккаунт"
          onPress={handleSubmit}
          loading={register.isPending}
        />

        </>}

        <Link href="/(auth)/login" style={[styles.link, { color: colors.accent }]}>
          Уже есть аккаунт? Войти
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
