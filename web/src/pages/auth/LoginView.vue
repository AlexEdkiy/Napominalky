<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue'
import { useAuthStore } from '@/stores/authStore'
import type { ValidationErrorResponse } from '@/types/api'
import type { LoginPayload } from '@/types/auth'

/** Ключ localStorage для запоминания последнего введённого email (пароль никогда не сохраняется). */
const LAST_EMAIL_STORAGE_KEY = 'lk_last_email'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive<LoginPayload>({ email: '', password: '' })
const errors = ref<Record<string, string[]>>({})
const generalError = ref<string | null>(null)
const isSubmitting = ref(false)
const rememberMe = ref(true)

onMounted(() => {
  const savedEmail = window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)
  if (savedEmail !== null) {
    form.email = savedEmail
  }
})

function persistRememberedEmail(): void {
  if (rememberMe.value) {
    window.localStorage.setItem(LAST_EMAIL_STORAGE_KEY, form.email)
  } else {
    window.localStorage.removeItem(LAST_EMAIL_STORAGE_KEY)
  }
}

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  errors.value = {}
  generalError.value = null
  try {
    await auth.login({ email: form.email, password: form.password })
    persistRememberedEmail()
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
  // 403 — аккаунт заблокирован (is_active=false), показываем message из ответа
  if (isAxiosError(error) && error.response?.status === 403) {
    const body = error.response.data as Record<string, unknown>
    const msg = typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : 'Ваш аккаунт отключён. Обратитесь к администратору.'
    generalError.value = msg
    return
  }
  generalError.value = 'Не удалось войти. Попробуйте позже.'
}
</script>

<template>
  <AuthCard title="Вход">
    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <p v-if="generalError" role="alert" class="auth-alert">{{ generalError }}</p>

      <div class="auth-field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" required />
        <span v-if="errors.email" class="auth-field__error">{{ errors.email[0] }}</span>
      </div>

      <AuthPasswordField
        id="password"
        v-model="form.password"
        label="Пароль"
        autocomplete="current-password"
        :error="errors.password?.[0] ?? null"
      />

      <div class="form-row">
        <label class="remember-me">
          <input v-model="rememberMe" type="checkbox" />
          Запомнить меня
        </label>
        <RouterLink class="auth-link" :to="{ name: 'forgot-password' }">Забыли пароль?</RouterLink>
      </div>

      <button type="submit" class="auth-submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Вход…' : 'Войти' }}
      </button>
    </form>

    <template #footer>
      <p>
        Нет аккаунта?
        <RouterLink class="auth-link" :to="{ name: 'register' }">Зарегистрироваться</RouterLink>
      </p>
    </template>
  </AuthCard>
</template>

<style scoped>
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 14px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #1f2622;
  cursor: pointer;
}

.remember-me input {
  accent-color: #17897a;
}
</style>
