<script setup lang="ts">
import LkBreadcrumbs from '@/components/lk/LkBreadcrumbs.vue'
import LkTodayBell from '@/components/lk/LkTodayBell.vue'
import LkIcon from '@/components/lk/LkIcon.vue'
import LkSearchForm from '@/components/lk/LkSearchForm.vue'

interface Props {
  title: string
  searchQuery?: string
  todayDeadlineCount?: number | null
}

defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
  openToday: []
  search: [query: string]
}>()
</script>

<template>
  <header class="lk-topbar">
    <button
      type="button"
      class="lk-topbar__burger"
      aria-label="Свернуть/развернуть сайдбар"
      @click="emit('toggleSidebar')"
    >
      <LkIcon name="sidebar" :size="20" />
    </button>

    <div class="lk-topbar__titles">
      <LkBreadcrumbs class="lk-topbar__breadcrumbs" />
      <h1 class="lk-topbar__title">{{ title }}</h1>
    </div>

    <LkSearchForm class="lk-topbar__search" :query="searchQuery ?? ''" @search="emit('search', $event)" />

    <LkTodayBell :count="todayDeadlineCount ?? null" @open="emit('openToday')" />
  </header>
</template>

<style scoped>
.lk-topbar {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 78px;
  flex: none;
  padding: 0 30px;
  background: #fff;
  border-bottom: 1px solid #e6e9e7;
}

.lk-topbar__burger {
  width: 44px;
  height: 44px;
  flex: none;
  border: none;
  background: #f2f4f3;
  border-radius: 12px;
  color: #5a625e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lk-topbar__burger:hover {
  background: #e9edeb;
}

.lk-topbar__titles {
  flex: 1;
  min-width: 0;
}

.lk-topbar__breadcrumbs {
  margin-bottom: 3px;
}

.lk-topbar__title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #1f2622;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lk-topbar__search {
  width: 280px;
  flex: none;
}
</style>
