<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'
import { useAdminUser } from '@/composables/useAdminUsers'
import { formatDateTime } from '@/utils/datetime'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const id = String(route.params['id'] ?? '')
const { user, isLoading, error, actionError, actionPending, load, toggleStatus, changePassword, updateRoles, removeUser } =
  useAdminUser(id)

// Toast
const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error'): void {
  if (toastTimer !== null) clearTimeout(toastTimer)
  toastMessage.value = message
  toastType.value = type
  toastTimer = setTimeout(() => { toastMessage.value = null }, 4000)
}

// Password modal
const showPasswordModal = ref(false)
const passwordForm = reactive({ password: '', passwordConfirmation: '' })
const passwordFormError = ref<string | null>(null)

function openPasswordModal(): void {
  passwordForm.password = ''
  passwordForm.passwordConfirmation = ''
  passwordFormError.value = null
  showPasswordModal.value = true
}

function closePasswordModal(): void {
  showPasswordModal.value = false
}

async function handleChangePassword(): Promise<void> {
  passwordFormError.value = null
  if (passwordForm.password.length < 8) {
    passwordFormError.value = 'Пароль должен содержать не менее 8 символов.'
    return
  }
  if (passwordForm.password !== passwordForm.passwordConfirmation) {
    passwordFormError.value = 'Пароли не совпадают.'
    return
  }
  const result = await changePassword(passwordForm.password, passwordForm.passwordConfirmation)
  if (result.ok) {
    closePasswordModal()
    showToast('Пароль успешно изменён.', 'success')
  } else {
    passwordFormError.value = result.error ?? 'Ошибка.'
  }
}

// Delete modal
const showDeleteModal = ref(false)

function openDeleteModal(): void {
  showDeleteModal.value = true
}

function closeDeleteModal(): void {
  showDeleteModal.value = false
}

async function handleDelete(): Promise<void> {
  const result = await removeUser()
  if (result.ok) {
    await router.push({ name: 'admin-users' })
  } else {
    closeDeleteModal()
    showToast(result.error ?? 'Ошибка удаления.', 'error')
  }
}

// Roles
const rolesIsAdmin = ref(false)
const rolesIsSuperAdmin = ref(false)

function syncRolesFromUser(): void {
  rolesIsAdmin.value = user.value?.is_admin ?? false
  rolesIsSuperAdmin.value = user.value?.is_super_admin ?? false
}

// When super_admin is toggled on — force admin=true
function onSuperAdminChange(): void {
  if (rolesIsSuperAdmin.value) {
    rolesIsAdmin.value = true
  }
}

// Admin can't be unchecked while super_admin is checked
function onAdminChange(): void {
  if (!rolesIsAdmin.value && rolesIsSuperAdmin.value) {
    rolesIsAdmin.value = true
  }
}

async function handleUpdateRoles(): Promise<void> {
  const result = await updateRoles(rolesIsAdmin.value, rolesIsSuperAdmin.value)
  if (result.ok) {
    showToast('Права обновлены.', 'success')
    syncRolesFromUser()
  } else {
    showToast(result.error ?? 'Ошибка обновления прав.', 'error')
    syncRolesFromUser()
  }
}

async function handleToggleStatus(): Promise<void> {
  const wasActive = user.value?.is_active
  const result = await toggleStatus()
  if (result.ok) {
    showToast(wasActive ? 'Пользователь заблокирован.' : 'Пользователь разблокирован.', 'success')
  } else {
    showToast(result.error ?? 'Ошибка изменения статуса.', 'error')
  }
}

function handleBack(): void {
  void router.push({ name: 'admin-users' })
}

// Computed flags
const canDoActions = computed(() => auth.isSuperAdmin)
const hasNumericId = computed(() => user.value?.id !== undefined)
const actionsBlocked = computed(() => !hasNumericId.value)

onMounted(async () => {
  await load()
  syncRolesFromUser()
})
</script>

<template>
  <div class="user-detail">
    <header class="user-detail__header">
      <button type="button" class="user-detail__back" @click="handleBack">
        ← Назад
      </button>
      <h1 class="user-detail__title">Пользователь</h1>
    </header>

    <!-- Toast -->
    <div
      v-if="toastMessage"
      role="status"
      :class="['toast', toastType === 'error' ? 'toast--error' : 'toast--success']"
    >
      {{ toastMessage }}
    </div>

    <p v-if="error" role="alert" class="user-detail__error">{{ error }}</p>

    <p v-else-if="isLoading" class="user-detail__loading" aria-live="polite">
      Загрузка…
    </p>

    <template v-else-if="user">
      <!-- Warning: no numeric id (backend blocker) -->
      <div v-if="canDoActions && actionsBlocked" class="user-detail__blocker" role="alert">
        Управляющие действия недоступны: сервер не вернул числовой id пользователя.
        Требуется правка бэкенда (добавить id в AdminUserResource).
      </div>

      <section class="user-detail__card" aria-label="Данные пользователя">
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
            <dt class="user-detail__label">Статус</dt>
            <dd class="user-detail__value">
              <span :class="['badge', user.is_active ? 'badge--active' : 'badge--blocked']">
                {{ user.is_active ? 'Активен' : 'Заблокирован' }}
              </span>
            </dd>
          </div>

          <div class="user-detail__field">
            <dt class="user-detail__label">Роль</dt>
            <dd class="user-detail__value">
              <span
                :class="['badge',
                  user.is_super_admin ? 'badge--superadmin' : (user.is_admin ? 'badge--admin' : 'badge--user')]"
              >
                {{ user.is_super_admin ? 'Суперадмин' : (user.is_admin ? 'Администратор' : 'Пользователь') }}
              </span>
            </dd>
          </div>

          <div class="user-detail__field">
            <dt class="user-detail__label">Синхронизация</dt>
            <dd class="user-detail__value">
              <span :class="['badge', user.sync_enabled ? 'badge--active' : 'badge--off']">
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
              <span class="counter-card__value">{{ user.notes_count ?? '—' }}</span>
              <span class="counter-card__label">Заметок</span>
            </div>
            <div class="counter-card">
              <span class="counter-card__value">{{ user.reminders_count ?? '—' }}</span>
              <span class="counter-card__label">Напоминаний</span>
            </div>
            <div class="counter-card">
              <span class="counter-card__value">{{ user.lists_count ?? '—' }}</span>
              <span class="counter-card__label">Списков</span>
            </div>
          </div>
        </div>

        <!-- Management actions (super_admin only) -->
        <section v-if="canDoActions" class="user-detail__actions" aria-label="Управление пользователем">
          <h2 class="user-detail__actions-title">Управление</h2>

          <!-- Action error from composable (inline) -->
          <p v-if="actionError" role="alert" class="action-error">{{ actionError }}</p>

          <!-- Status toggle -->
          <div class="action-row">
            <div class="action-row__info">
              <strong>Статус аккаунта</strong>
              <span class="action-row__hint">
                {{ user.is_active ? 'Аккаунт активен. Нажмите, чтобы заблокировать.' : 'Аккаунт заблокирован. Нажмите, чтобы разблокировать.' }}
              </span>
            </div>
            <button
              type="button"
              :class="['btn', user.is_active ? 'btn--danger' : 'btn--success']"
              :disabled="actionPending || actionsBlocked"
              @click="handleToggleStatus"
            >
              {{ user.is_active ? 'Заблокировать' : 'Разблокировать' }}
            </button>
          </div>

          <!-- Password change -->
          <div class="action-row">
            <div class="action-row__info">
              <strong>Пароль</strong>
              <span class="action-row__hint">Установить новый пароль для пользователя.</span>
            </div>
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="actionPending || actionsBlocked"
              @click="openPasswordModal"
            >
              Сменить пароль
            </button>
          </div>

          <!-- Roles -->
          <div class="action-row action-row--column">
            <div class="action-row__info">
              <strong>Права доступа</strong>
              <span class="action-row__hint">
                Суперадмин автоматически получает права Админа.
              </span>
            </div>
            <div class="roles-form">
              <label class="roles-form__label">
                <input
                  v-model="rolesIsAdmin"
                  type="checkbox"
                  :disabled="rolesIsSuperAdmin || actionPending || actionsBlocked"
                  @change="onAdminChange"
                />
                Администратор
              </label>
              <label class="roles-form__label">
                <input
                  v-model="rolesIsSuperAdmin"
                  type="checkbox"
                  :disabled="actionPending || actionsBlocked"
                  @change="onSuperAdminChange"
                />
                Суперадминистратор
              </label>
              <button
                type="button"
                class="btn btn--primary"
                :disabled="actionPending || actionsBlocked"
                @click="handleUpdateRoles"
              >
                Сохранить права
              </button>
            </div>
          </div>

          <!-- Delete -->
          <div class="action-row action-row--danger-zone">
            <div class="action-row__info">
              <strong>Удаление аккаунта</strong>
              <span class="action-row__hint">Действие необратимо. Потребуется подтверждение.</span>
            </div>
            <button
              type="button"
              class="btn btn--danger"
              :disabled="actionPending || actionsBlocked"
              @click="openDeleteModal"
            >
              Удалить пользователя
            </button>
          </div>
        </section>
      </section>
    </template>

    <p v-else class="user-detail__empty">Пользователь не найден.</p>

    <!-- Password modal -->
    <div v-if="showPasswordModal" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Смена пароля">
      <div class="modal">
        <h2 class="modal__title">Сменить пароль</h2>
        <p v-if="passwordFormError" role="alert" class="modal__error">{{ passwordFormError }}</p>
        <div class="modal__field">
          <label class="modal__label" for="new-password">Новый пароль</label>
          <input
            id="new-password"
            v-model="passwordForm.password"
            type="password"
            class="modal__input"
            autocomplete="new-password"
            minlength="8"
          />
        </div>
        <div class="modal__field">
          <label class="modal__label" for="confirm-password">Подтверждение пароля</label>
          <input
            id="confirm-password"
            v-model="passwordForm.passwordConfirmation"
            type="password"
            class="modal__input"
            autocomplete="new-password"
            minlength="8"
          />
        </div>
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" :disabled="actionPending" @click="closePasswordModal">
            Отмена
          </button>
          <button type="button" class="btn btn--primary" :disabled="actionPending" @click="handleChangePassword">
            {{ actionPending ? 'Сохраняем…' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDeleteModal" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Подтверждение удаления">
      <div class="modal">
        <h2 class="modal__title">Удалить пользователя?</h2>
        <p class="modal__text">
          Вы уверены, что хотите удалить пользователя
          <strong>{{ user?.name ?? user?.email }}</strong>?
          Это действие необратимо.
        </p>
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" :disabled="actionPending" @click="closeDeleteModal">
            Отмена
          </button>
          <button type="button" class="btn btn--danger" :disabled="actionPending" @click="handleDelete">
            {{ actionPending ? 'Удаляем…' : 'Да, удалить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-detail {
  max-width: 700px;
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

.user-detail__blocker {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #7d5a00;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
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

.badge--off {
  background: #f3f4f6;
  color: #374151;
}

.user-detail__counters-title,
.user-detail__actions-title {
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

.user-detail__actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-top: 1px solid var(--color-border, #e2e2e2);
  padding-top: 1rem;
}

.action-error {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 6px;
}

.action-row--column {
  flex-direction: column;
  align-items: flex-start;
}

.action-row--danger-zone {
  border-color: #fca5a5;
  background: #fff5f5;
}

.action-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.action-row__hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

.roles-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.roles-form__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.roles-form__label input:disabled {
  cursor: not-allowed;
}

.btn {
  padding: 0.45rem 1rem;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: #2563eb;
  color: #fff;
  border-color: #1d4ed8;
}

.btn--secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.btn--danger {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

.btn--success {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.modal__title {
  margin: 0 0 1rem;
  font-size: 1.2rem;
}

.modal__text {
  margin: 0 0 1.5rem;
  color: #374151;
  line-height: 1.5;
}

.modal__error {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}

.modal__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.modal__input {
  padding: 0.45rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
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
