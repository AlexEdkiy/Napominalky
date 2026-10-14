import { useMutation } from '@tanstack/react-query'
import { StyleSheet, Text, View } from 'react-native'
import { authApi } from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton'
import { useTheme } from '@/theme'
import { typography } from '@/theme/typography'
import { getApiErrorMessage } from '@/utils/apiError'

interface Props { email: string; password: string; message?: string }

export default function EmailVerificationNotice({ email, password, message }: Props) {
  const { colors } = useTheme()
  const resend = useMutation({ mutationFn: () => authApi.resendVerification({ email, password }) })
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Подтвердите почту</Text>
      <Text style={[styles.body, { color: colors.textPrimary }]}>{email}</Text>
      <Text style={[styles.body, { color: colors.textPrimary }]}>
        {message ?? 'Откройте письмо, перейдите по ссылке и подтвердите почту. Затем вернитесь и нажмите «Войти».'}
      </Text>
      <Text style={[styles.body, { color: colors.textPrimary }]}>Проверьте также папку «Спам». Ссылка действует 60 минут.</Text>
      {resend.data && <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{resend.data.message}</Text>}
      {resend.isError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{getApiErrorMessage(resend.error)}</Text>}
      <BaseButton label="Отправить письмо повторно" variant="secondary" loading={resend.isPending} onPress={() => resend.mutate()} />
    </View>
  )
}
const styles = StyleSheet.create({ container: { gap: 12 }, title: typography.h2, body: typography.body })
