<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue'
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
  <AuthCard title="Регистрация">
    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="auth-alert">{{ generalError }}</p>

      <div class="auth-field">
        <label for="name">Имя</label>
        <input id="name" v-model="form.name" type="text" autocomplete="name" required />
        <span v-if="errors.name" class="auth-field__error">{{ errors.name[0] }}</span>
      </div>

      <div class="auth-field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" required />
        <span v-if="errors.email" class="auth-field__error">{{ errors.email[0] }}</span>
      </div>

      <AuthPasswordField
        id="password"
        v-model="form.password"
        label="Пароль"
        autocomplete="new-password"
        :error="errors.password?.[0] ?? null"
      />

      <AuthPasswordField
        id="password_confirmation"
        v-model="form.password_confirmation"
        label="Повторите пароль"
        autocomplete="new-password"
      />

      <button type="submit" class="auth-submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Регистрация…' : 'Зарегистрироваться' }}
      </button>
    </form>

    <template #footer>
      <p>
        Уже есть аккаунт?
        <RouterLink class="auth-link" :to="{ name: 'login' }">Войти</RouterLink>
      </p>
    </template>
  </AuthCard>
</template>
