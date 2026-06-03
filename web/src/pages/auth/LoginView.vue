<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { useAuthStore } from '@/stores/authStore'
import type { ValidationErrorResponse } from '@/types/api'
import type { LoginPayload } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive<LoginPayload>({ email: '', password: '' })
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  errors.value = {}
  generalError.value = null
  try {
    await auth.login({ email: form.email, password: form.password })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/lk'
    await router.push(redirect)
  } catch (error) {
    handleError(error)
  } finally {
    isSubmitting.value = false
  }
}

function handleError(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    errors.value = error.response.data.errors
    return
  }
  if (isAxiosError(error) && error.response?.status === 401) {
    generalError.value = 'Неверный email или пароль.'
    return
  }
  generalError.value = 'Не удалось войти. Попробуйте позже.'
}
</script>

<template>
  <main class="auth">
    <h1>Вход</h1>

    <form novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="error">{{ generalError }}</p>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" required />
        <span v-if="errors.email" class="error">{{ errors.email[0] }}</span>
      </div>

      <div class="field">
        <label for="password">Пароль</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
        />
        <span v-if="errors.password" class="error">{{ errors.password[0] }}</span>
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Вход…' : 'Войти' }}
      </button>
    </form>

    <p>
      Нет аккаунта?
      <RouterLink :to="{ name: 'register' }">Зарегистрироваться</RouterLink>
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
</style>
