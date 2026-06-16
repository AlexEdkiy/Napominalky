<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAdminUser } from '@/composables/useAdminUsers'
import { formatDateTime } from '@/utils/datetime'

const route = useRoute()
const router = useRouter()

const id = String(route.params['id'] ?? '')
const { user, isLoading, error, load } = useAdminUser(id)

function handleBack(): void {
  void router.push({ name: 'admin-users' })
}

onMounted(load)
</script>

<template>
  <div class="user-detail">
    <header class="user-detail__header">
      <button type="button" class="user-detail__back" @click="handleBack">
        ← Назад
      </button>
      <h1 class="user-detail__title">Пользователь</h1>
    </header>

    <p v-if="error" role="alert" class="user-detail__error">{{ error }}</p>

    <p v-else-if="isLoading" class="user-detail__loading" aria-live="polite">
      Загрузка…
    </p>

    <section v-else-if="user" class="user-detail__card" aria-label="Данные пользователя">
      <dl class="user-detail__fields">
        <div class="user-detail__field">
          <dt class="user-detail__label">UUID</dt>
          <dd class="user-detail__value user-detail__value--mono">{{ user.uuid }}</dd>
        </div>

        <div class="user-detail__field">
          <dt class="user-detail__label">Имя</dt>
          <dd class="user-detail__value">{{ user.name ?? '—' }}</dd>
        </div>

        <div class="user-detail__field">
          <dt class="user-detail__label">Email</dt>
          <dd class="user-detail__value">{{ user.email }}</dd>
        </div>

        <div class="user-detail__field">
          <dt class="user-detail__label">Роль</dt>
          <dd class="user-detail__value">
            <span
              :class="['badge', user.is_admin ? 'badge--admin' : 'badge--user']"
              :aria-label="user.is_admin ? 'Администратор' : 'Пользователь'"
            >
              {{ user.is_admin ? 'Администратор' : 'Пользователь' }}
            </span>
          </dd>
        </div>

        <div class="user-detail__field">
          <dt class="user-detail__label">Синхронизация</dt>
          <dd class="user-detail__value">
            <span :class="['badge', user.sync_enabled ? 'badge--on' : 'badge--off']">
              {{ user.sync_enabled ? 'Включена' : 'Отключена' }}
            </span>
          </dd>
        </div>

        <div class="user-detail__field">
          <dt class="user-detail__label">Дата регистрации</dt>
          <dd class="user-detail__value">{{ formatDateTime(user.created_at) }}</dd>
        </div>
      </dl>

      <div class="user-detail__counters" aria-label="Статистика пользователя">
        <h2 class="user-detail__counters-title">Статистика</h2>
        <div class="user-detail__counter-grid">
          <div class="counter-card">
            <span class="counter-card__value">
              {{ user.notes_count ?? '—' }}
            </span>
            <span class="counter-card__label">Заметок</span>
          </div>
          <div class="counter-card">
            <span class="counter-card__value">
              {{ user.reminders_count ?? '—' }}
            </span>
            <span class="counter-card__label">Напоминаний</span>
          </div>
          <div class="counter-card">
            <span class="counter-card__value">
              {{ user.lists_count ?? '—' }}
            </span>
            <span class="counter-card__label">Списков</span>
          </div>
        </div>
      </div>
    </section>

    <p v-else class="user-detail__empty">Пользователь не найден.</p>
  </div>
</template>

<style scoped>
.user-detail {
  max-width: 640px;
  margin: 0 auto;
}

.user-detail__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.user-detail__back {
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 4px;
  background: none;
  color: var(--color-text, #1a1a1a);
}

.user-detail__title {
  margin: 0;
  font-size: 1.5rem;
}

.user-detail__error {
  color: var(--color-error, #c0392b);
  padding: 0.5rem 0;
}

.user-detail__loading,
.user-detail__empty {
  color: var(--color-text-secondary, #666);
  padding: 1rem 0;
}

.user-detail__card {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: var(--color-bg-secondary, #f5f5f5);
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 8px;
  padding: 1.5rem;
}

.user-detail__fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}

.user-detail__field {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 0.5rem;
  align-items: start;
}

.user-detail__label {
  font-weight: 600;
  color: var(--color-text-secondary, #666);
  font-size: 0.875rem;
}

.user-detail__value {
  margin: 0;
  color: var(--color-text, #1a1a1a);
}

.user-detail__value--mono {
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge--admin {
  background: #dbeafe;
  color: #1e40af;
}

.badge--user {
  background: #f3f4f6;
  color: #374151;
}

.badge--on {
  background: #d1fae5;
  color: #065f46;
}

.badge--off {
  background: #fee2e2;
  color: #991b1b;
}

.user-detail__counters-title {
  font-size: 1rem;
  margin: 0 0 0.75rem;
}

.user-detail__counter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.counter-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 6px;
  text-align: center;
}

.counter-card__value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary, #2563eb);
  line-height: 1;
}

.counter-card__label {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}
</style>
