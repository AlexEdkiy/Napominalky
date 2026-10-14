<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { authApi } from '@/api/authApi'
const props = defineProps<{ email: string; password: string; message?: string }>()
const pending = ref(false)
const feedback = ref('')
async function resend(): Promise<void> {
  pending.value = true
  feedback.value = ''
  try { feedback.value = (await authApi.resendVerification({ email: props.email, password: props.password })).message }
  catch (error) {
    feedback.value = isAxiosError<{ message: string }>(error)
      ? error.response?.data.message ?? 'Не удалось отправить письмо. Проверьте подключение и попробуйте снова.'
      : 'Не удалось отправить письмо. Попробуйте позже.'
  } finally { pending.value = false }
}
</script>
<template>
  <section class="auth-form" aria-label="Подтверждение почты">
    <h2>Подтвердите почту</h2>
    <p>{{ email }}</p>
    <p>{{ message ?? 'Откройте письмо, подтвердите почту по ссылке, затем вернитесь и войдите.' }}</p>
    <p>Проверьте папку «Спам». Ссылка действует 60 минут.</p>
    <p v-if="feedback" role="status">{{ feedback }}</p>
    <button type="button" class="auth-submit" :disabled="pending" @click="resend">
      {{ pending ? 'Отправка…' : 'Отправить письмо повторно' }}
    </button>
  </section>
</template>
