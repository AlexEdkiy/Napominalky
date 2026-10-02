<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'

import LkBreadcrumbs from '@/components/lk/LkBreadcrumbs.vue'
import LkTodayBell from '@/components/lk/LkTodayBell.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkSearchForm from '@/components/lk/LkSearchForm.vue'
import { useAuthStore } from '@/stores/authStore'
import { getUserInitial } from '@/utils/user'

interface Props {
  title: string
  searchQuery?: string
  subtitle: string
  todayDeadlineCount?: number | null
}

defineProps<Props>()
const emit = defineEmits<{ openToday: []; search: [query: string] }>()

const auth = useAuthStore()
const isSearchOpen = ref(false)
const searchForm = ref<InstanceType<typeof LkSearchForm> | null>(null)
const userInitial = computed(() => getUserInitial(auth.user))

function toggleSearch(): void {
  isSearchOpen.value = !isSearchOpen.value
  if (isSearchOpen.value) void nextTick(() => searchForm.value?.focus())
}
</script>

<template>
  <header class="lk-mobile-header">
    <div class="lk-mobile-header__row">
      <div class="lk-mobile-header__titles">
        <h1 class="lk-mobile-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="lk-mobile-header__subtitle">{{ subtitle }}</p>
      </div>

      <button
        type="button"
        class="lk-mobile-header__icon-btn"
        aria-label="Поиск"
        :aria-expanded="isSearchOpen"
        @click="toggleSearch"
      >
        <LkIcon name="search" :size="18" />
      </button>

      <LkTodayBell compact :count="todayDeadlineCount ?? null" @open="emit('openToday')" />

      <RouterLink :to="{ name: 'lk-account' }" class="lk-mobile-header__avatar">
        <img
          v-if="auth.user?.avatar"
          :src="auth.user.avatar"
          alt=""
          class="lk-mobile-header__avatar-photo"
        />
        <template v-else>{{ userInitial }}</template>
      </RouterLink>
    </div>

    <LkBreadcrumbs compact class="lk-mobile-header__breadcrumbs" />

    <LkSearchForm v-if="isSearchOpen" ref="searchForm" class="lk-mobile-header__search" dark :query="searchQuery ?? ''" @search="emit('search', $event); isSearchOpen = false" />
  </header>
</template>

<style scoped>
.lk-mobile-header {
  padding: 1rem 1rem 0.85rem;
  background: linear-gradient(135deg, #0f6155 0%, #0b3f37 100%);
  color: #fff;
}

.lk-mobile-header__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lk-mobile-header__titles {
  flex: 1;
  min-width: 0;
}

.lk-mobile-header__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.lk-mobile-header__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-mobile-header__icon-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-mobile-header__avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  text-decoration: none;
  overflow: hidden;
}

.lk-mobile-header__avatar-photo {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.lk-mobile-header__breadcrumbs {
  margin-top: 0.5rem;
}

.lk-mobile-header__breadcrumbs :deep(.lk-breadcrumbs__item--link) {
  color: rgba(255, 255, 255, 0.7);
}

.lk-mobile-header__breadcrumbs :deep(.lk-breadcrumbs__item--link:hover) {
  color: #fff;
}

.lk-mobile-header__breadcrumbs :deep(.lk-breadcrumbs__item--current) {
  color: #fff;
}

.lk-mobile-header__breadcrumbs :deep(.lk-breadcrumbs__sep) {
  color: rgba(255, 255, 255, 0.4);
}

.lk-mobile-header__search { margin-top: 0.75rem; }
</style>
