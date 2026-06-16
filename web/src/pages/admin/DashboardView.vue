<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useAdminUsers } from '@/composables/useAdminUsers'

const { meta, isLoading, error, load } = useAdminUsers()

const totalUsers = computed(() => meta.value?.total ?? null)

onMounted(() => load(1))
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <h1 class="dashboard__title">Панель администратора</h1>
    </header>

    <p v-if="error" role="alert" class="dashboard__error">{{ error }}</p>

    <div class="dashboard__stats">
      <div class="stat-card" aria-label="Пользователи">
        <RouterLink :to="{ name: 'admin-users' }" class="stat-card__link">
          <div class="stat-card__body">
            <span class="stat-card__value">
              <template v-if="isLoading">…</template>
              <template v-else>{{ totalUsers ?? '—' }}</template>
            </span>
            <span class="stat-card__label">Пользователей</span>
          </div>
          <span class="stat-card__action">Перейти →</span>
        </RouterLink>
      </div>
    </div>

    <nav class="dashboard__nav" aria-label="Разделы админ-панели">
      <RouterLink :to="{ name: 'admin-users' }" class="dashboard__nav-link">
        Список пользователей
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 960px;
  margin: 0 auto;
}

.dashboard__header {
  margin-bottom: 1.5rem;
}

.dashboard__title {
  margin: 0;
  font-size: 1.75rem;
}

.dashboard__error {
  color: var(--color-error, #c0392b);
  margin-bottom: 1rem;
}

.dashboard__stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.stat-card {
  flex: 0 0 200px;
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 8px;
  background: var(--color-bg-secondary, #f5f5f5);
  overflow: hidden;
}

.stat-card__link {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  height: 100%;
}

.stat-card__link:hover {
  background: var(--color-bg, #fff);
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary, #2563eb);
  line-height: 1;
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
}

.stat-card__action {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-primary, #2563eb);
}

.dashboard__nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dashboard__nav-link {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 4px;
  text-decoration: none;
  color: var(--color-primary, #2563eb);
  max-width: 300px;
}

.dashboard__nav-link:hover {
  background: var(--color-bg-secondary, #f5f5f5);
}
</style>
