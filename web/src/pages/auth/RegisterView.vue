<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import { useAuthStore } from '@/stores/authStore'
import type { ValidationErrorResponse } from '@/types/api'
import type { RegisterPayload } from '@/types/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive<RegisterPayload>({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  errors.value = {}
  generalError.value = null
  try {
    await auth.register({ ...form })
    await router.push('/lk')
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
  generalError.value = 'Не удалось зарегистрироваться. Попробуйте позже.'
}
</script>

<template>
  <main class="auth">
    <h1>Регистрация</h1>

    <form novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="error">{{ generalError }}</p>

      <div class="field">
        <label for="name">Имя</label>
        <input id="name" v-model="form.name" type="text" autocomplete="name" required />
        <span v-if="errors.name" class="error">{{ errors.name[0] }}</span>
      </div>

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
          autocomplete="new-password"
          required
        />
        <span v-if="errors.password" class="error">{{ errors.password[0] }}</span>
      </div>

      <div class="field">
        <label for="password_confirmation">Повторите пароль</label>
        <input
          id="password_confirmation"
          v-model="form.password_confirmation"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Регистрация…' : 'Зарегистрироваться' }}
      </button>
    </form>

    <p>
      Уже есть аккаунт?
      <RouterLink :to="{ name: 'login' }">Войти</RouterLink>
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
