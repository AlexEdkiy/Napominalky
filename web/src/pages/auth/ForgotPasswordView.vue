<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'

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
  <main class="auth">
    <h1>Забыли пароль?</h1>

    <div v-if="successMessage" role="status" class="success">
      {{ successMessage }}
    </div>

    <form v-else novalidate @submit.prevent="handleSubmit">
      <p v-if="networkError" role="alert" class="error">{{ networkError }}</p>

      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
        />
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Отправка…' : 'Получить ссылку' }}
      </button>
    </form>

    <p>
      <RouterLink :to="{ name: 'login' }">Вернуться ко входу</RouterLink>
    </p>
  </main>
</template>

<style scoped>
.auth {
  max-width: 360px;
  margin: 0 auto;
}

.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.error {
  color: #c0392b;
}

.success {
  color: #27ae60;
  margin-bottom: 1rem;
}
</style>
