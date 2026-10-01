<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
import { useSyncMeter } from '@/composables/useSyncMeter'
import { isLkNavItemActive, LK_NAV_ITEMS } from '@/constants/lkNav'
import { useAuthStore } from '@/stores/authStore'
import { getUserDisplayName, getUserInitial } from '@/utils/user'

interface Props {
  collapsed: boolean
  activeTasksCount: number | null
  notesCount: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  create: [anchor: DOMRect]
}>()

const route = useRoute()
const auth = useAuthStore()
const { isSyncing, lastSyncedAt, runSync } = useSyncMeter()

const userLabel = computed(() => getUserDisplayName(auth.user))
const userInitial = computed(() => getUserInitial(auth.user))

const syncStatusLabel = computed<string>(() => {
  if (isSyncing.value) {
    return 'Синхронизация…'
  }
  if (lastSyncedAt.value) {
    const time = lastSyncedAt.value.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `Синхронизировано в ${time}`
  }
  return 'Ожидание синхронизации'
})

function badgeFor(key: 'activeTasks' | 'notes' | undefined): number | null {
  if (key === 'activeTasks') {
    return props.activeTasksCount
  }
  if (key === 'notes') {
    return props.notesCount
  }
  return null
}

// Передаём фактическое положение кнопки, чтобы поповер «Создать» на десктопе
// открывался рядом с ней (см. `LkLayout.vue`), а не в оторванном от кнопки
// месте (в макете поповер привязан к кнопке в сайдбаре).
function handleCreateClick(event: MouseEvent): void {
  emit('create', (event.currentTarget as HTMLElement).getBoundingClientRect())
}
</script>

<template>
  <aside class="lk-sidebar" :class="{ 'lk-sidebar--collapsed': collapsed }">
    <div class="lk-sidebar__navigation">
      <RouterLink :to="{ name: 'lk-dashboard' }" class="lk-sidebar__brand">
        <span class="lk-sidebar__brand-icon"><LkIcon name="bell" :size="18" /></span>
        <span v-if="!collapsed" class="lk-sidebar__brand-text">
          <span class="lk-sidebar__brand-title">Напоминалки</span>
          <span class="lk-sidebar__brand-subtitle">Личный кабинет</span>
        </span>
      </RouterLink>

      <hr class="lk-sidebar__divider" />

      <nav class="lk-sidebar__nav" aria-label="Разделы личного кабинета">
        <RouterLink
          v-for="item in LK_NAV_ITEMS"
          :key="item.routeName"
          :to="{ name: item.routeName }"
          class="lk-sidebar__link"
          :class="{ 'lk-sidebar__link--active': isLkNavItemActive(item, route.name as string) }"
        >
          <LkIcon :name="item.icon" :size="20" />
          <span v-if="!collapsed" class="lk-sidebar__label">{{ item.label }}</span>
          <span v-if="!collapsed && item.badgeKey && badgeFor(item.badgeKey) !== null" class="lk-sidebar__badge">
            {{ badgeFor(item.badgeKey) }}
          </span>
        </RouterLink>

        <RouterLink v-if="auth.isAdmin" to="/admin" class="lk-sidebar__link lk-sidebar__link--admin">
          <LkIcon name="gear" :size="20" />
          <span v-if="!collapsed" class="lk-sidebar__label">Админ-панель</span>
        </RouterLink>
      </nav>

      <button type="button" class="lk-sidebar__create" @click="handleCreateClick">
        <LkIcon name="plus" :size="18" />
        <span v-if="!collapsed">Создать</span>
      </button>
    </div>

    <div class="lk-sidebar__footer">
      <button
        v-if="!collapsed"
        type="button"
        class="lk-sidebar__sync"
        :class="{ 'lk-sidebar__sync--syncing': isSyncing }"
        aria-label="Запустить синхронизацию с сервером"
        @click="runSync"
      >
        <span class="lk-sidebar__sync-label">Синхронизация с сервером</span>
        <div class="lk-sidebar__sync-track"><div class="lk-sidebar__sync-fill" /></div>
        <span class="lk-sidebar__sync-status">{{ syncStatusLabel }}</span>
      </button>

      <RouterLink :to="{ name: 'lk-account' }" class="lk-sidebar__user">
        <img
          v-if="auth.user?.avatar"
          :src="auth.user.avatar"
          alt=""
          class="lk-sidebar__avatar lk-sidebar__avatar--photo"
        />
        <span v-else class="lk-sidebar__avatar">{{ userInitial }}</span>
        <span v-if="!collapsed" class="lk-sidebar__user-info">
          <span class="lk-sidebar__user-name">{{ userLabel }}</span>
          <span class="lk-sidebar__user-email">{{ auth.user?.email }}</span>
        </span>
        <LkIcon v-if="!collapsed" name="gear" :size="18" class="lk-sidebar__user-gear" />
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.lk-sidebar {
  --lk-sidebar-width: 256px;
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  height: 100dvh;
  flex-shrink: 0;
  width: var(--lk-sidebar-width);
  min-width: var(--lk-sidebar-width);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.25rem 1rem;
  background: linear-gradient(180deg, #0f6155 0%, #0b3f37 100%);
  color: #fff;
  transition:
    width 0.2s ease,
    min-width 0.2s ease;
  overflow: hidden;
}

.lk-sidebar--collapsed {
  --lk-sidebar-width: 84px;
  align-items: center;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.lk-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: #fff;
  padding: 0.25rem;
}

.lk-sidebar__brand-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: #e9a63c;
  color: #fff;
}

.lk-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lk-sidebar__brand-title {
  font-size: 18px;
  font-weight: 900;
  white-space: nowrap;
}

.lk-sidebar__brand-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.lk-sidebar__divider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin: 0.75rem 0;
  width: 100%;
}

.lk-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.lk-sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.72);
  white-space: nowrap;
}

.lk-sidebar__link:hover {
  background: rgba(255, 255, 255, 0.08);
}

.lk-sidebar__link--active {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  box-shadow: inset 3px 0 0 #e9a63c;
}

.lk-sidebar__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-sidebar__badge {
  min-width: 20px;
  text-align: center;
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  background: rgba(255, 255, 255, 0.18);
}

.lk-sidebar__create {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: none;
  border-radius: 10px;
  background: #e9a63c;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.lk-sidebar__create:hover {
  background: #d99a3e;
}

/* Высота меню зависит от окна; длинные разделы прокручиваются отдельно.
   При малой высоте прокручивается навигация, а аккаунт остаётся доступен. */
.lk-sidebar__navigation {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.lk-sidebar__navigation > * {
  flex-shrink: 0;
}

.lk-sidebar__footer {
  flex: none;
  width: 100%;
}

.lk-sidebar--collapsed .lk-sidebar__brand,
.lk-sidebar--collapsed .lk-sidebar__link,
.lk-sidebar--collapsed .lk-sidebar__user {
  justify-content: center;
}

.lk-sidebar__sync {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  border-radius: 10px;
}

.lk-sidebar__sync:hover {
  background: rgba(255, 255, 255, 0.06);
}

.lk-sidebar__sync:focus-visible {
  outline: 2px solid #e9a63c;
  outline-offset: 2px;
}

.lk-sidebar__sync-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.lk-sidebar__sync-status {
  color: rgba(255, 255, 255, 0.6);
}

.lk-sidebar__sync-track {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}

.lk-sidebar__sync-fill {
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: #17897a;
}

.lk-sidebar__sync--syncing .lk-sidebar__sync-fill {
  position: absolute;
  width: 40%;
  animation: lk-sync-indeterminate 1.1s ease-in-out infinite;
}

@keyframes lk-sync-indeterminate {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}

.lk-sidebar__user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.25rem;
  text-decoration: none;
  color: #fff;
  margin-top: 0.5rem;
}

.lk-sidebar__avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.lk-sidebar__avatar--photo {
  object-fit: cover;
}

.lk-sidebar__user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.lk-sidebar__user-name {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-sidebar__user-email {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-sidebar__user-gear {
  flex-shrink: 0;
  opacity: 0.75;
}
</style>
