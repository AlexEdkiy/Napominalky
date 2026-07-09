<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import LkIcon from '@/components/lk/LkIcon.vue'
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
const isPasswordVisible = ref(false)

onMounted(() => {
  const savedEmail = window.localStorage.getItem(LAST_EMAIL_STORAGE_KEY)
  if (savedEmail !== null) {
    form.email = savedEmail
  }
})

function togglePasswordVisibility(): void {
  isPasswordVisible.value = !isPasswordVisible.value
}

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
        <div class="password-input">
          <input
            id="password"
            v-model="form.password"
            :type="isPasswordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            required
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
            @click="togglePasswordVisibility"
          >
            <LkIcon :name="isPasswordVisible ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
        <span v-if="errors.password" class="error">{{ errors.password[0] }}</span>
      </div>

      <label class="remember-me">
        <input v-model="rememberMe" type="checkbox" />
        Запомнить меня
      </label>

      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Вход…' : 'Войти' }}
      </button>
    </form>

    <p>
      <RouterLink :to="{ name: 'forgot-password' }">Забыли пароль?</RouterLink>
    </p>

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

.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input input {
  flex: 1;
  padding-right: 2.4rem;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  border: none;
  background: none;
  color: #6b716e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #1f2622;
  cursor: pointer;
}
</style>
