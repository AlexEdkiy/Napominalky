<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName, getUserInitial } from '@/utils/user'

const router = useRouter()
const auth = useAuthStore()

const isLoading = ref(false)
const error = ref<string | null>(null)

const userInitial = computed(() => getUserInitial(auth.user))
const userName = computed(() => getUserDisplayName(auth.user))

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
    <h1 class="account__title">Аккаунт</h1>

    <p v-if="isLoading" class="account__state" aria-live="polite">Загрузка…</p>
    <p v-else-if="error" role="alert" class="account__state account__state--error">
      {{ error }}
    </p>

    <section v-else-if="auth.user" class="account__card" aria-label="Профиль">
      <header class="account__head">
        <span class="account__avatar" aria-hidden="true">{{ userInitial }}</span>
        <div class="account__identity">
          <span class="account__name">{{ userName }}</span>
          <span class="account__email">{{ auth.user.email }}</span>
        </div>
      </header>

      <dl class="account__rows">
        <div class="account__row">
          <dt>Имя</dt>
          <dd>{{ auth.user.name ?? '—' }}</dd>
        </div>
        <div class="account__row">
          <dt>Email</dt>
          <dd>{{ auth.user.email }}</dd>
        </div>
        <div class="account__row">
          <dt>Синхронизация</dt>
          <dd>
            <span
              class="account__badge"
              :class="auth.user.sync_enabled ? 'account__badge--on' : 'account__badge--off'"
            >
              {{ auth.user.sync_enabled ? 'включена' : 'выключена' }}
            </span>
          </dd>
        </div>
      </dl>
    </section>

    <div class="account__actions">
      <button type="button" class="account__button" @click="handleLogout">Выйти</button>
      <button
        type="button"
        class="account__button account__button--danger"
        @click="handleDeleteAccount"
      >
        Удалить аккаунт
      </button>
    </div>
  </main>
</template>

<style scoped>
.account {
  max-width: 560px;
  margin: 0 auto;
}

.account__title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1f2622;
}

.account__state {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  color: #6b716e;
}

.account__state--error {
  color: #cf5b4a;
  background: #fbe3df;
}

.account__card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
}

.account__head {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid #eef1f0;
}

.account__avatar {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #d8ebe4;
  color: #0f6155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 800;
}

.account__identity {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.account__name {
  font-weight: 700;
  color: #1f2622;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__email {
  font-size: 0.85rem;
  color: #8a938f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__rows {
  margin: 0;
}

.account__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid #eef1f0;
}

.account__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.account__row dt {
  color: #8a938f;
  font-size: 0.9rem;
}

.account__row dd {
  margin: 0;
  color: #1f2622;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.account__badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.account__badge--on {
  background: #d8ebe4;
  color: #0f6155;
}

.account__badge--off {
  background: #eef1f0;
  color: #6b716e;
}

.account__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.account__button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 10px;
  background: #eef1f0;
  color: #5a625e;
  font-weight: 600;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.account__button:hover {
  background: #e3e8e6;
}

.account__button--danger {
  background: #fbe3df;
  color: #cf5b4a;
}

.account__button--danger:hover {
  background: #f6d3cd;
}

.account__button:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .account__actions .account__button {
    flex: 1;
  }
}
</style>
