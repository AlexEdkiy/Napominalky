<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  name: string
  label: string
}

const router = useRouter()
const auth = useAuthStore()

const navItems: NavItem[] = [
  { name: 'lk-notes', label: 'Заметки' },
  { name: 'lk-lists', label: 'Списки покупок' },
  { name: 'lk-reminders', label: 'Напоминания' },
  { name: 'lk-account', label: 'Аккаунт' },
]

const userLabel = computed(() => auth.user?.name ?? auth.user?.email ?? '')

onMounted(async () => {
  if (auth.user !== null) return
  try {
    await auth.fetchMe()
  } catch {
    // Профиль подгрузит конкретный раздел; навигация остаётся доступной.
  }
})

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="lk">
    <header class="lk__header">
      <RouterLink :to="{ name: 'lk-dashboard' }" class="lk__brand">
        Личный кабинет
      </RouterLink>

      <nav class="lk__nav" aria-label="Разделы личного кабинета">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="lk__link"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin" class="lk__link">
          Админ-панель
        </RouterLink>
      </nav>

      <div class="lk__user">
        <span v-if="userLabel" class="lk__username">{{ userLabel }}</span>
        <button type="button" class="lk__logout" @click="handleLogout">
          Выйти
        </button>
      </div>
    </header>

    <main class="lk__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.lk {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.lk__header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e2e2e2;
  flex-wrap: wrap;
}

.lk__brand {
  font-weight: 700;
  text-decoration: none;
  color: inherit;
}

.lk__nav {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.lk__link {
  text-decoration: none;
  color: #555;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
}

.lk__link.router-link-active {
  color: #1a1a1a;
  border-bottom-color: #2563eb;
}

.lk__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lk__username {
  color: #555;
  font-size: 0.9rem;
}

.lk__logout {
  cursor: pointer;
}

.lk__content {
  flex: 1;
  padding: 1.5rem;
}
</style>
