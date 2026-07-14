<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useSettings } from '@/composables/useSettings'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Theme } from '@/stores/settingsStore'

const auth = useAuthStore()
const settings = useSettingsStore()
const { isSyncLoading, syncError, toggleSync, setTheme, toggleNotifications } = useSettings()

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'system', label: 'Системная' },
]

function handleThemeChange(value: Theme): void {
  setTheme(value)
}

async function handleSyncToggle(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  await toggleSync(input.checked)
}

function handleNotificationsToggle(event: Event): void {
  const input = event.target as HTMLInputElement
  toggleNotifications(input.checked)
}
</script>

<template>
  <main class="settings">
    <h1 class="settings__title">Настройки</h1>

    <!-- Тема -->
    <section class="settings__section" aria-labelledby="theme-heading">
      <h2 id="theme-heading" class="settings__section-title">Тема оформления</h2>
      <fieldset class="settings__fieldset">
        <legend class="sr-only">Выбор темы</legend>
        <label
          v-for="option in themeOptions"
          :key="option.value"
          class="settings__radio-label"
        >
          <input
            type="radio"
            name="theme"
            :value="option.value"
            :checked="settings.theme === option.value"
            class="settings__radio"
            @change="handleThemeChange(option.value)"
          />
          {{ option.label }}
        </label>
      </fieldset>
    </section>

    <!-- Синхронизация -->
    <section class="settings__section" aria-labelledby="sync-heading">
      <h2 id="sync-heading" class="settings__section-title">Синхронизация</h2>
      <div class="settings__toggle-row">
        <label for="sync-toggle" class="settings__toggle-label">
          Синхронизация с мобильным приложением
        </label>
        <input
          id="sync-toggle"
          type="checkbox"
          role="switch"
          class="settings__toggle"
          :checked="auth.user?.sync_enabled ?? false"
          :disabled="isSyncLoading || auth.user === null"
          aria-describedby="sync-status"
          @change="handleSyncToggle"
        />
      </div>
      <p
        v-if="isSyncLoading"
        id="sync-status"
        class="settings__status"
        aria-live="polite"
      >
        Сохранение…
      </p>
      <p
        v-else-if="syncError"
        id="sync-status"
        class="settings__error"
        role="alert"
      >
        {{ syncError }}
      </p>
      <p v-else id="sync-status" class="settings__hint">
        Текущий статус: {{ auth.user?.sync_enabled ? 'включена' : 'выключена' }}
      </p>
    </section>

    <!-- Уведомления -->
    <section class="settings__section" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" class="settings__section-title">Уведомления</h2>
      <div class="settings__toggle-row">
        <label for="notifications-toggle" class="settings__toggle-label">
          Показывать уведомления в браузере
        </label>
        <input
          id="notifications-toggle"
          type="checkbox"
          role="switch"
          class="settings__toggle"
          :checked="settings.notificationsEnabled"
          @change="handleNotificationsToggle"
        />
      </div>
      <p class="settings__hint">
        Настройка сохраняется локально в браузере.
      </p>
    </section>

    <!-- Ссылка на аккаунт -->
    <section class="settings__section">
      <RouterLink :to="{ name: 'lk-account' }" class="settings__account-link">
        Управление аккаунтом
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.settings {
  max-width: 560px;
  margin: 0 auto;
}

.settings__title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1f2622;
}

.settings__section {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.settings__section-title {
  margin: 0 0 0.9rem;
  font-size: 1rem;
  font-weight: 700;
  color: #1f2622;
}

.settings__fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.settings__radio-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  color: #1f2622;
}

.settings__radio {
  cursor: pointer;
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #17897a;
}

.settings__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings__toggle-label {
  flex: 1;
  color: #1f2622;
}

.settings__toggle {
  cursor: pointer;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  accent-color: #17897a;
}

.settings__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.settings__hint {
  margin: 0.6rem 0 0;
  font-size: 0.875rem;
  color: #8a938f;
}

.settings__status {
  margin: 0.6rem 0 0;
  font-size: 0.875rem;
  color: #6b716e;
}

.settings__error {
  margin: 0.6rem 0 0;
  font-size: 0.875rem;
  color: #cf5b4a;
}

.settings__account-link {
  color: #17897a;
  font-weight: 600;
  text-decoration: none;
}

.settings__account-link:hover {
  text-decoration: underline;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
