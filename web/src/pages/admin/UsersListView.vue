<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'
import { useAdminUsers } from '@/composables/useAdminUsers'
import { formatDateTime } from '@/utils/datetime'
import type { AdminUser } from '@/types/admin'

const router = useRouter()
const auth = useAuthStore()
const { users, meta, page, isLoading, error, load, nextPage, prevPage, toggleStatus } = useAdminUsers()

const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error'): void {
  if (toastTimer !== null) clearTimeout(toastTimer)
  toastMessage.value = message
  toastType.value = type
  toastTimer = setTimeout(() => { toastMessage.value = null }, 4000)
}

function handleRowClick(uuid: string): void {
  void router.push({ name: 'admin-user-detail', params: { id: uuid } })
}

function roleBadgeClass(user: AdminUser): string {
  if (user.is_super_admin) return 'badge--superadmin'
  if (user.is_admin) return 'badge--admin'
  return 'badge--user'
}

function roleLabel(user: AdminUser): string {
  if (user.is_super_admin) return 'Суперадмин'
  if (user.is_admin) return 'Админ'
  return 'Пользователь'
}

async function handleToggleStatus(event: Event, user: AdminUser): Promise<void> {
  event.stopPropagation()
  const result = await toggleStatus(user)
  if (result.ok) {
    const label = user.is_active ? 'заблокирован' : 'разблокирован'
    showToast(`Пользователь ${label}.`, 'success')
  } else {
    showToast(result.error ?? 'Ошибка.', 'error')
  }
}

onMounted(() => load(1))
</script>

<template>
  <div class="users-list">
    <header class="users-list__header">
      <h1>Пользователи</h1>
      <p v-if="meta" class="users-list__total">Всего: {{ meta.total }}</p>
    </header>

    <div
      v-if="toastMessage"
      role="status"
      :class="['toast', toastType === 'error' ? 'toast--error' : 'toast--success']"
    >
      {{ toastMessage }}
    </div>

    <p v-if="error" role="alert" class="users-list__error">{{ error }}</p>

    <p v-else-if="isLoading" class="users-list__loading" aria-live="polite">Загрузка…</p>

    <p v-else-if="users.length === 0" class="users-list__empty">Пользователей пока нет.</p>

    <template v-else>
      <div class="users-list__table-wrap" role="region" aria-label="Список пользователей">
        <table class="users-list__table">
          <thead>
            <tr>
              <th scope="col">Имя</th>
              <th scope="col">Email</th>
              <th scope="col">Статус</th>
              <th scope="col">Роль</th>
              <th scope="col">Заметок</th>
              <th scope="col">Напоминаний</th>
              <th scope="col">Списков</th>
              <th scope="col">Дата регистрации</th>
              <th v-if="auth.isSuperAdmin" scope="col">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.uuid"
              class="users-list__row"
              role="button"
              tabindex="0"
              :aria-label="`Открыть пользователя ${user.name ?? user.email}`"
              @click="handleRowClick(user.uuid)"
              @keydown.enter="handleRowClick(user.uuid)"
              @keydown.space.prevent="handleRowClick(user.uuid)"
            >
              <td>{{ user.name ?? '—' }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span
                  :class="['badge', user.is_active ? 'badge--active' : 'badge--blocked']"
                  :aria-label="user.is_active ? 'Активен' : 'Заблокирован'"
                >
                  {{ user.is_active ? 'Активен' : 'Заблокирован' }}
                </span>
              </td>
              <td>
                <span :class="['badge', roleBadgeClass(user)]">
                  {{ roleLabel(user) }}
                </span>
              </td>
              <td>{{ user.notes_count ?? '—' }}</td>
              <td>{{ user.reminders_count ?? '—' }}</td>
              <td>{{ user.lists_count ?? '—' }}</td>
              <td>{{ formatDateTime(user.created_at) }}</td>
              <td v-if="auth.isSuperAdmin" @click.stop>
                <button
                  type="button"
                  :class="['action-btn', user.is_active ? 'action-btn--block' : 'action-btn--unblock']"
                  :disabled="user.id === undefined"
                  :title="user.id === undefined ? 'Недоступно: backend не вернул id' : (user.is_active ? 'Заблокировать' : 'Разблокировать')"
                  :aria-label="user.is_active ? 'Заблокировать пользователя' : 'Разблокировать пользователя'"
                  @click="(e) => handleToggleStatus(e, user)"
                >
                  {{ user.is_active ? 'Блок.' : 'Разблок.' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="meta && meta.last_page > 1" class="users-list__pagination" aria-label="Пагинация">
        <button
          type="button"
          :disabled="page <= 1"
          class="users-list__page-btn"
          @click="prevPage"
        >
          ← Назад
        </button>
        <span class="users-list__page-info">Страница {{ page }} из {{ meta.last_page }}</span>
        <button
          type="button"
          :disabled="page >= meta.last_page"
          class="users-list__page-btn"
          @click="nextPage"
        >
          Вперёд →
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.users-list {
  max-width: 1100px;
  margin: 0 auto;
}

.users-list__header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.users-list__total {
  color: #666;
  font-size: 0.9rem;
}

.users-list__error {
  color: #c0392b;
  padding: 0.5rem 0;
}

.users-list__loading,
.users-list__empty {
  color: #666;
  padding: 1rem 0;
}

.users-list__table-wrap {
  overflow-x: auto;
}

.users-list__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.users-list__table th,
.users-list__table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e2e2;
}

.users-list__table th {
  font-weight: 600;
  background: #f8f8f8;
  white-space: nowrap;
}

.users-list__row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.users-list__row:hover,
.users-list__row:focus-visible {
  background-color: #f0f4ff;
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge--active {
  background: #d1fae5;
  color: #065f46;
}

.badge--blocked {
  background: #fee2e2;
  color: #991b1b;
}

.badge--superadmin {
  background: #ede9fe;
  color: #5b21b6;
}

.badge--admin {
  background: #dbeafe;
  color: #1e40af;
}

.badge--user {
  background: #f3f4f6;
  color: #374151;
}

.action-btn {
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn--block {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

.action-btn--unblock {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.users-list__pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
}

.users-list__page-btn {
  padding: 0.4rem 1rem;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
}

.users-list__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.users-list__page-info {
  color: #555;
  font-size: 0.9rem;
}

.toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-size: 0.9rem;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 360px;
}

.toast--success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.toast--error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
</style>
