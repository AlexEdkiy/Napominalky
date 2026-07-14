<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthPasswordField from '@/components/auth/AuthPasswordField.vue'
import { authApi } from '@/api/authApi'
import type { ValidationErrorResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()

// Ссылку из письма часто копируют из HTML-тела (в т.ч. из laravel.log при MAIL=log),
// где `&` закодирован как `&amp;`. Тогда браузер отдаёт параметр под ключом `amp;email`
// и обычный `email` теряется. Читаем оба варианта, чтобы ссылка работала в любом случае.
function readQueryParam(key: string): string | null {
  const direct = route.query[key]
  if (typeof direct === 'string' && direct.length > 0) return direct
  const ampEncoded = route.query[`amp;${key}`]
  if (typeof ampEncoded === 'string' && ampEncoded.length > 0) return ampEncoded
  return null
}

const token = computed(() => readQueryParam('token'))

const email = computed(() => readQueryParam('email'))

const hasValidParams = computed(() => token.value !== null && email.value !== null)

const password = ref('')
const passwordConfirmation = ref('')
const fieldErrors = ref<Record<string, string[]>>({})
const tokenError = ref<string | null>(null)
const generalError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const passwordMinLength = 8

const clientError = computed<string | null>(() => {
  if (password.value.length > 0 && password.value.length < passwordMinLength) {
    return `Пароль должен содержать не менее ${passwordMinLength} символов.`
  }
  if (passwordConfirmation.value.length > 0 && password.value !== passwordConfirmation.value) {
    return 'Пароли не совпадают.'
  }
  return null
})

const isFormValid = computed(() =>
  password.value.length >= passwordMinLength &&
  password.value === passwordConfirmation.value
)

async function handleSubmit(): Promise<void> {
  if (!isFormValid.value || !token.value || !email.value) return

  isSubmitting.value = true
  fieldErrors.value = {}
  tokenError.value = null
  generalError.value = null

  try {
    const result = await authApi.resetPassword({
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    successMessage.value = result.message
    setTimeout(() => {
      router.push({ name: 'login' })
    }, 2000)
  } catch (error) {
    handleError(error)
  } finally {
    isSubmitting.value = false
  }
}

function handleError(error: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(error) && error.response?.status === 422) {
    const errors = error.response.data.errors
    if (errors['token'] !== undefined && errors['token'].length > 0) {
      tokenError.value = 'Ссылка недействительна или устарела. Запросите новую.'
      return
    }
    fieldErrors.value = errors
    return
  }
  generalError.value = 'Не удалось сбросить пароль. Попробуйте позже.'
}
</script>

<template>
  <AuthCard title="Новый пароль">
    <div v-if="!hasValidParams" role="alert" class="auth-alert">
      <p>Ссылка для сброса пароля недействительна или устарела.</p>
      <p>
        <RouterLink class="auth-link" :to="{ name: 'forgot-password' }">
          Запросить новую ссылку
        </RouterLink>
      </p>
    </div>

    <div v-else-if="successMessage" role="status" class="auth-status">
      <p>{{ successMessage }}</p>
      <p>Сейчас вы будете перенаправлены на страницу входа…</p>
    </div>

    <form v-else class="auth-form" novalidate @submit.prevent="handleSubmit">
      <p v-if="tokenError" role="alert" class="auth-alert">
        {{ tokenError }}
        <RouterLink class="auth-link" :to="{ name: 'forgot-password' }">
          Запросить новую ссылку
        </RouterLink>
      </p>

      <p v-if="generalError" role="alert" class="auth-alert">{{ generalError }}</p>

      <div class="auth-field">
        <label for="email">Email</label>
        <input
          id="email"
          :value="email"
          type="email"
          autocomplete="email"
          readonly
        />
      </div>

      <AuthPasswordField
        id="password"
        v-model="password"
        label="Новый пароль"
        autocomplete="new-password"
        :error="fieldErrors['password']?.[0] ?? null"
      />

      <AuthPasswordField
        id="password_confirmation"
        v-model="passwordConfirmation"
        label="Повторите пароль"
        autocomplete="new-password"
      />

      <p v-if="clientError" class="auth-error">{{ clientError }}</p>

      <button type="submit" class="auth-submit" :disabled="isSubmitting || !isFormValid">
        {{ isSubmitting ? 'Сохранение…' : 'Установить новый пароль' }}
      </button>
    </form>

    <template #footer>
      <p v-if="hasValidParams && !successMessage">
        <RouterLink class="auth-link" :to="{ name: 'login' }">Вернуться ко входу</RouterLink>
      </p>
    </template>
  </AuthCard>
</template>
