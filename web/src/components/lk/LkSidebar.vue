<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import LkIcon from '@/components/lk/LkIcon.vue'
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
  create: []
}>()

const route = useRoute()
const auth = useAuthStore()

const userLabel = computed(() => getUserDisplayName(auth.user))
const userInitial = computed(() => getUserInitial(auth.user))

function badgeFor(key: 'activeTasks' | 'notes' | undefined): number | null {
  if (key === 'activeTasks') {
    return props.activeTasksCount
  }
  if (key === 'notes') {
    return props.notesCount
  }
  return null
}
</script>

<template>
  <aside class="lk-sidebar" :class="{ 'lk-sidebar--collapsed': collapsed }">
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
        <span
          v-if="!collapsed && item.badgeKey && badgeFor(item.badgeKey) !== null"
          class="lk-sidebar__badge"
        >
          {{ badgeFor(item.badgeKey) }}
        </span>
      </RouterLink>

      <RouterLink v-if="auth.isAdmin" to="/admin" class="lk-sidebar__link lk-sidebar__link--admin">
        <LkIcon name="gear" :size="20" />
        <span v-if="!collapsed" class="lk-sidebar__label">Админ-панель</span>
      </RouterLink>
    </nav>

    <button type="button" class="lk-sidebar__create" @click="emit('create')">
      <LkIcon name="plus" :size="18" />
      <span v-if="!collapsed">Создать</span>
    </button>

    <div class="lk-sidebar__spacer" />

    <div v-if="!collapsed" class="lk-sidebar__sync">
      <span class="lk-sidebar__sync-label">Синхронизация</span>
      <div class="lk-sidebar__sync-track"><div class="lk-sidebar__sync-fill" /></div>
    </div>

    <RouterLink :to="{ name: 'lk-account' }" class="lk-sidebar__user">
      <span class="lk-sidebar__avatar">{{ userInitial }}</span>
      <span v-if="!collapsed" class="lk-sidebar__user-info">
        <span class="lk-sidebar__user-name">{{ userLabel }}</span>
        <span class="lk-sidebar__user-email">{{ auth.user?.email }}</span>
      </span>
      <LkIcon v-if="!collapsed" name="gear" :size="18" class="lk-sidebar__user-gear" />
    </RouterLink>
  </aside>
</template>

<style scoped>
.lk-sidebar {
  --lk-sidebar-width: 256px;
  width: var(--lk-sidebar-width);
  min-width: var(--lk-sidebar-width);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.25rem 1rem;
  background: linear-gradient(180deg, #0f6155 0%, #0b3f37 100%);
  color: #fff;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow-x: hidden;
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

.lk-sidebar__spacer {
  flex: 1;
}

.lk-sidebar__sync {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.lk-sidebar__sync-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.lk-sidebar__sync-fill {
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: #17897a;
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
