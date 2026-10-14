<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import AuthCard from '@/components/auth/AuthCard.vue'
import { authApi } from '@/api/authApi'
const route = useRoute()
const pending = ref(false)
const success = ref(false)
const message = ref('')
const signedPath = computed(() => typeof route.query.verification === 'string' ? route.query.verification : '')
async function confirm(): Promise<void> {
  pending.value = true
  message.value = ''
  try {
    message.value = (await authApi.verifyEmail(signedPath.value)).message
    success.value = true
  } catch (error) {
    message.value = isAxiosError<{ message: string }>(error)
      ? error.response?.data.message ?? 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
      : 'Ссылка недействительна. Запросите новое письмо на экране входа.'
  } finally { pending.value = false }
}
</script>
<template>
  <AuthCard title="Подтверждение почты">
    <div class="auth-form">
      <p v-if="message" role="status">{{ message }}</p>
      <template v-if="!success">
        <p>Нажмите кнопку, чтобы завершить регистрацию в «Напоминалках».</p>
        <button class="auth-submit" :disabled="pending" @click="confirm">{{ pending ? 'Подтверждение…' : 'Подтвердить почту' }}</button>
      </template>
      <p v-else>Теперь можно вернуться в мобильное приложение или войти на сайте.</p>
      <RouterLink class="auth-link" :to="{ name: 'login' }">Перейти ко входу</RouterLink>
    </div>
  </AuthCard>
</template>
