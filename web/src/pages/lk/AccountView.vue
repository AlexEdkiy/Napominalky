<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const isLoading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  if (auth.user !== null) return
  isLoading.value = true
  try {
    await auth.fetchMe()
  } catch {
    error.value = 'Не удалось загрузить профиль.'
  } finally {
    isLoading.value = false
  }
})

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push({ name: 'login' })
}

async function handleDeleteAccount(): Promise<void> {
  const confirmed = window.confirm(
    'Удалить аккаунт безвозвратно? Все данные будут потеряны.',
  )
  if (!confirmed) return
  try {
    await authApi.deleteAccount()
    auth.setToken(null)
    auth.setUser(null)
    await router.push({ name: 'login' })
  } catch {
    error.value = 'Не удалось удалить аккаунт. Попробуйте позже.'
  }
}
</script>

<template>
  <main class="account">
    <h1>Аккаунт</h1>

    <p v-if="isLoading">Загрузка…</p>
    <p v-else-if="error" role="alert" class="error">{{ error }}</p>

    <dl v-else-if="auth.user">
      <dt>Имя</dt>
      <dd>{{ auth.user.name ?? '—' }}</dd>
      <dt>Email</dt>
      <dd>{{ auth.user.email }}</dd>
      <dt>Синхронизация</dt>
      <dd>{{ auth.user.sync_enabled ? 'включена' : 'выключена' }}</dd>
    </dl>

    <div class="actions">
      <button type="button" @click="handleLogout">Выйти</button>
      <button type="button" class="danger" @click="handleDeleteAccount">
        Удалить аккаунт
      </button>
    </div>
  </main>
</template>

<style scoped>
.account {
  max-width: 480px;
  margin: 0 auto;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.danger {
  color: #c0392b;
}

.error {
  color: #c0392b;
}
</style>
