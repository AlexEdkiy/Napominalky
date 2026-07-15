<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'

import { authApi } from '@/api/authApi'
import { useSettings } from '@/composables/useSettings'
import { useAuthStore } from '@/stores/authStore'
import type { ValidationErrorResponse } from '@/types/api'
import { resizeImageToBlob } from '@/utils/image'
import { getUserDisplayName, getUserInitial } from '@/utils/user'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const router = useRouter()
const auth = useAuthStore()
const { isSyncLoading, syncError, toggleSync } = useSettings()

const isLoading = ref(false)
const error = ref<string | null>(null)

// Аватар
const fileInput = ref<HTMLInputElement | null>(null)
const avatarPreview = ref<string | null>(null)
const isAvatarBusy = ref(false)
const avatarError = ref<string | null>(null)

// Редактирование профиля (имя + e-mail)
const isEditing = ref(false)
const nameDraft = ref('')
const emailDraft = ref('')
const nameError = ref<string | null>(null)
const emailError = ref<string | null>(null)
const formError = ref<string | null>(null)
const isSaving = ref(false)

const userInitial = computed(() => getUserInitial(auth.user))
const userName = computed(() => getUserDisplayName(auth.user))
const avatarSrc = computed(() => avatarPreview.value ?? auth.user?.avatar ?? null)

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

onUnmounted(() => setPreview(null))

/** Превью — object URL ужатого фото; старый URL освобождаем при замене. */
function setPreview(url: string | null): void {
  if (avatarPreview.value !== null) {
    URL.revokeObjectURL(avatarPreview.value)
  }
  avatarPreview.value = url
}

function openFilePicker(): void {
  fileInput.value?.click()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarError.value = null
  isAvatarBusy.value = true
  try {
    const blob = await resizeImageToBlob(file)
    setPreview(URL.createObjectURL(blob))
    await auth.uploadAvatar(blob)
  } catch (err) {
    avatarError.value = extractAvatarError(err)
  } finally {
    setPreview(null)
    isAvatarBusy.value = false
  }
}

function extractAvatarError(err: unknown): string {
  if (isAxiosError<ValidationErrorResponse>(err) && err.response?.status === 422) {
    return err.response.data.errors.avatar?.[0] ?? 'Сервер отклонил изображение.'
  }
  if (err instanceof Error && !isAxiosError(err)) {
    return err.message
  }
  return 'Не удалось загрузить фото. Попробуйте позже.'
}

async function handleDeleteAvatar(): Promise<void> {
  avatarError.value = null
  isAvatarBusy.value = true
  try {
    await auth.deleteAvatar()
  } catch {
    avatarError.value = 'Не удалось удалить фото. Попробуйте позже.'
  } finally {
    isAvatarBusy.value = false
  }
}

function startEdit(): void {
  nameDraft.value = auth.user?.name ?? ''
  emailDraft.value = auth.user?.email ?? ''
  resetProfileErrors()
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
  resetProfileErrors()
}

function resetProfileErrors(): void {
  nameError.value = null
  emailError.value = null
  formError.value = null
}

/** Клиентская валидация черновиков; ошибки пишет под соответствующие поля. */
function validateDrafts(name: string, email: string): boolean {
  nameError.value = name === '' ? 'Введите имя.' : null
  if (email === '') {
    emailError.value = 'Введите e-mail.'
  } else {
    emailError.value = EMAIL_PATTERN.test(email) ? null : 'Введите корректный e-mail.'
  }
  return nameError.value === null && emailError.value === null
}

async function saveProfile(): Promise<void> {
  const name = nameDraft.value.trim()
  const email = emailDraft.value.trim()
  resetProfileErrors()
  if (!validateDrafts(name, email)) return
  isSaving.value = true
  try {
    await auth.updateProfile(name, email)
    isEditing.value = false
  } catch (err) {
    applyProfileError(err)
  } finally {
    isSaving.value = false
  }
}

/** 422 раскладывает по полям (errors.name / errors.email), прочее — общая ошибка формы. */
function applyProfileError(err: unknown): void {
  if (isAxiosError<ValidationErrorResponse>(err) && err.response?.status === 422) {
    const errors = err.response.data.errors
    nameError.value = errors.name?.[0] ?? null
    emailError.value = errors.email?.[0] ?? null
    if (nameError.value === null && emailError.value === null) {
      formError.value = 'Сервер отклонил данные профиля.'
    }
    return
  }
  formError.value = 'Не удалось сохранить профиль. Попробуйте позже.'
}

/** Переключение синхронизации; при ошибке возвращает чекбокс к значению из стора. */
async function handleSyncToggle(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  await toggleSync(input.checked)
  if (syncError.value !== null) {
    input.checked = auth.user?.sync_enabled ?? false
  }
}

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
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt="Фото профиля"
          class="account__avatar account__avatar--photo"
        />
        <span v-else class="account__avatar" aria-hidden="true">{{ userInitial }}</span>
        <div class="account__identity">
          <span class="account__name">{{ userName }}</span>
          <span class="account__email">{{ auth.user.email }}</span>
        </div>
      </header>

      <div class="account__photo-actions">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="account__file"
          aria-label="Выбрать фото профиля"
          @change="handleFileChange"
        />
        <button
          type="button"
          class="account__button account__button--small"
          :disabled="isAvatarBusy"
          @click="openFilePicker"
        >
          {{ isAvatarBusy ? 'Загрузка…' : 'Изменить фото' }}
        </button>
        <button
          v-if="auth.user.avatar"
          type="button"
          class="account__button account__button--small account__button--danger"
          :disabled="isAvatarBusy"
          @click="handleDeleteAvatar"
        >
          Удалить фото
        </button>
      </div>
      <p v-if="avatarError" role="alert" class="account__field-error">{{ avatarError }}</p>

      <dl class="account__rows">
        <template v-if="!isEditing">
          <div class="account__row account__row--name">
            <dt>Имя</dt>
            <dd class="account__name-view">
              <span>{{ auth.user.name ?? '—' }}</span>
              <button
                type="button"
                class="account__button account__button--small"
                @click="startEdit"
              >
                Редактировать
              </button>
            </dd>
          </div>
          <div class="account__row">
            <dt>Email</dt>
            <dd>{{ auth.user.email }}</dd>
          </div>
        </template>
        <div v-else class="account__row account__row--name">
          <dd class="account__name-edit">
            <form class="account__profile-form" @submit.prevent="saveProfile">
              <label class="account__field">
                <span class="account__field-label">Имя</span>
                <input
                  v-model="nameDraft"
                  type="text"
                  class="account__input"
                  aria-label="Имя"
                  maxlength="255"
                />
              </label>
              <p v-if="nameError" role="alert" class="account__field-error">{{ nameError }}</p>
              <label class="account__field">
                <span class="account__field-label">E-mail</span>
                <input
                  v-model="emailDraft"
                  type="email"
                  class="account__input"
                  aria-label="E-mail"
                  maxlength="255"
                />
              </label>
              <p v-if="emailError" role="alert" class="account__field-error">{{ emailError }}</p>
              <p v-if="formError" role="alert" class="account__field-error">{{ formError }}</p>
              <div class="account__form-actions">
                <button
                  type="submit"
                  class="account__button account__button--small account__button--primary"
                  :disabled="isSaving"
                >
                  {{ isSaving ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button
                  type="button"
                  class="account__button account__button--small"
                  :disabled="isSaving"
                  @click="cancelEdit"
                >
                  Отмена
                </button>
              </div>
            </form>
          </dd>
        </div>
        <div class="account__row">
          <dt>
            <label for="account-sync-toggle">Синхронизация</label>
          </dt>
          <dd class="account__sync">
            <span
              class="account__badge"
              :class="auth.user.sync_enabled ? 'account__badge--on' : 'account__badge--off'"
            >
              {{ auth.user.sync_enabled ? 'включена' : 'выключена' }}
            </span>
            <input
              id="account-sync-toggle"
              type="checkbox"
              role="switch"
              class="account__toggle"
              :checked="auth.user.sync_enabled"
              :disabled="isSyncLoading"
              @change="handleSyncToggle"
            />
            <p v-if="syncError" role="alert" class="account__field-error account__sync-error">
              {{ syncError }}
            </p>
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

.account__avatar--photo {
  object-fit: cover;
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

.account__photo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.85rem 0 1.1rem;
  border-bottom: 1px solid #eef1f0;
}

.account__file {
  display: none;
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

.account__row--name dd {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.account__name-view {
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.account__name-edit {
  width: 100%;
}

.account__profile-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
}

.account__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.account__field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #8a938f;
  text-align: left;
}

.account__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.account__sync {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.account__toggle {
  cursor: pointer;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  accent-color: #17897a;
}

.account__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.account__sync-error {
  flex-basis: 100%;
  margin: 0;
}

.account__input {
  flex: 1;
  min-width: 140px;
  padding: 0.45rem 0.7rem;
  border: 1px solid #d6dcd9;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #1f2622;
}

.account__input:focus-visible {
  outline: 2px solid #17897a;
  outline-offset: 1px;
}

.account__field-error {
  margin: 0.5rem 0 0;
  font-size: 0.83rem;
  font-weight: 600;
  color: #cf5b4a;
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

.account__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.account__button--small {
  padding: 0.4rem 0.85rem;
  font-size: 0.83rem;
}

.account__button--primary {
  background: #17897a;
  color: #fff;
}

.account__button--primary:hover {
  background: #0f6155;
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
