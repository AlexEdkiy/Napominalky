<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'

import AuthCard from '@/components/auth/AuthCard.vue'
import { authApi } from '@/api/authApi'
import type { ForgotPasswordPayload } from '@/types/auth'

const email = ref('')
const successMessage = ref<string | null>(null)
const networkError = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  successMessage.value = null
  networkError.value = null

  const payload: ForgotPasswordPayload = { email: email.value }

  try {
    const result = await authApi.forgotPassword(payload)
    successMessage.value = result.message
  } catch (error) {
    if (isAxiosError(error) && error.response !== undefined) {
      networkError.value = 'Произошла ошибка. Попробуйте позже.'
    } else {
      networkError.value = 'Не удалось отправить запрос. Проверьте соединение с интернетом.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Восстановление пароля">
    <div v-if="successMessage" role="status" class="auth-status">
      {{ successMessage }}
    </div>

    <template v-else>
      <p class="auth-hint">Укажите email — мы отправим ссылку для сброса пароля.</p>

      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <p v-if="networkError" role="alert" class="auth-alert">{{ networkError }}</p>

        <div class="auth-field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>

        <button type="submit" class="auth-submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Отправка…' : 'Получить ссылку' }}
        </button>
      </form>
    </template>

    <template #footer>
      <p>
        <RouterLink class="auth-link" :to="{ name: 'login' }">Вернуться ко входу</RouterLink>
      </p>
    </template>
  </AuthCard>
</template>
